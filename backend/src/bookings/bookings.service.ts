import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { LineNotifyService } from "../line-notify/line-notify.service";

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private supabase: SupabaseService,
    private lineNotify: LineNotifyService,
  ) {}

  async findAll(status?: string, date?: string) {
    const client = this.supabase.getClient();
    const baseSelect = "*, services(*), therapists(*), customers(*), beds!bookings_bed_id_fkey(*)";

    let query = client
      .from("bookings")
      .select(baseSelect)
      .order("start_time", { ascending: true });

    if (status) query = query.eq("status", status);
    if (date) {
      query = query
        .gte("start_time", `${date}T00:00:00`)
        .lte("start_time", `${date}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Also fetch stuck bookings (in_service/completed from previous day only)
    if (date && !status) {
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const { data: stuck, error: stuckError } = await client
        .from("bookings")
        .select(baseSelect)
        .or("status.eq.in_service,status.eq.completed")
        .gte("start_time", `${yesterdayStr}T00:00:00`)
        .lt("start_time", `${date}T00:00:00`)
        .order("start_time", { ascending: true });

      if (!stuckError && stuck && stuck.length > 0) {
        return [...stuck, ...(data || [])];
      }
    }

    return data;
  }

  async findOne(id: number) {
    const { data, error } = await this.supabase
      .getClient()
      .from("bookings")
      .select("*, services(*), therapists(*), customers(*), beds!bookings_bed_id_fkey(*)")
      .eq("id", id)
      .single();
    if (error || !data) throw new NotFoundException("Booking not found");
    return data;
  }

  async create(dto: CreateBookingDto) {
    const client = this.supabase.getClient();

    // 1. Find or create customer
    const { data: existingCustomer } = await client
      .from("customers")
      .select("*")
      .eq("phone", dto.phone)
      .maybeSingle();

    let customer;
    if (existingCustomer) {
      await client
        .from("customers")
        .update({
          visit_count: existingCustomer.visit_count + 1,
          name: dto.customer_name,
        })
        .eq("id", existingCustomer.id);
      customer = existingCustomer;
    } else {
      const { data } = await client
        .from("customers")
        .insert({ name: dto.customer_name, phone: dto.phone, visit_count: 1 })
        .select()
        .single();
      customer = data;
    }

    // 2. Get service for duration and price
    const { data: service } = await client
      .from("services")
      .select("*")
      .eq("id", dto.service_id)
      .single();
    if (!service) throw new NotFoundException("Service not found");

    const startTime = new Date(dto.start_time);
    const endTime = new Date(startTime.getTime() + service.duration * 60000);

    // 3. Check therapist availability
    const { data: conflicts } = await client
      .from("bookings")
      .select("id")
      .eq("therapist_id", dto.therapist_id)
      .not("status", "in", '("cancelled","checkout")')
      .lt("start_time", endTime.toISOString())
      .gt("end_time", startTime.toISOString());

    if (conflicts && conflicts.length > 0) {
      throw new BadRequestException(
        "Therapist is not available at this time",
      );
    }

    // 4. Create booking (bed can be assigned at booking time or at check-in)
    const { data: booking, error } = await client
      .from("bookings")
      .insert({
        customer_id: customer.id,
        customer_name: dto.customer_name,
        phone: dto.phone,
        service_id: dto.service_id,
        therapist_id: dto.therapist_id,
        bed_id: dto.bed_id || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "booked",
        customer_gender: dto.customer_gender || null,
      })
      .select("*, services(*), therapists(*), customers(*), beds!bookings_bed_id_fkey(*)")
      .single();
    if (error) throw error;

    // 5. Reserve bed if assigned at booking time
    if (dto.bed_id) {
      await client
        .from("beds")
        .update({ status: "reserved", current_booking_id: booking.id })
        .eq("id", dto.bed_id);
    }

    // 6. Create payment (pending)
    await client.from("payments").insert({
      booking_id: booking.id,
      amount: service.price,
      method: dto.payment_method || "cash",
      status: "pending",
    });

    return booking;
  }

  async updateStatus(id: number, newStatus: string, bedId?: number) {
    const client = this.supabase.getClient();

    const { data: booking } = await client
      .from("bookings")
      .select("*, beds!bookings_bed_id_fkey(*)")
      .eq("id", id)
      .single();
    if (!booking) throw new NotFoundException("Booking not found");

    // Build update payload
    const updatePayload: Record<string, unknown> = { status: newStatus };

    // Assign bed at check-in (when moving to in_service with a bed_id)
    if (newStatus === "in_service" && bedId) {
      updatePayload.bed_id = bedId;
    }

    // Update booking
    const { data: updated, error } = await client
      .from("bookings")
      .update(updatePayload)
      .eq("id", id)
      .select("*, services(*), therapists(*), customers(*), beds!bookings_bed_id_fkey(*)")
      .single();
    if (error) throw error;

    const effectiveBedId = bedId || booking.bed_id;

    // Side effects based on status change
    switch (newStatus) {
      case "in_service":
        if (effectiveBedId) {
          await client
            .from("beds")
            .update({ status: "in_service", current_booking_id: id })
            .eq("id", effectiveBedId);
        }
        await client
          .from("therapists")
          .update({ status: "busy" })
          .eq("id", booking.therapist_id);

        // Send Line notification for service start
        try {
          const therapistName = updated.therapists?.name_th || updated.therapists?.name_en || "-";
          const serviceName = updated.services?.name_th || updated.services?.name_en || "-";
          const bedName = updated.beds?.name || (effectiveBedId ? `ห้อง ${effectiveBedId}` : "-");
          const { data: payment } = await client
            .from("payments")
            .select("method, amount")
            .eq("booking_id", id)
            .maybeSingle();
          const methodMap: Record<string, string> = { cash: "เงินสด", transfer: "โอน", bank_transfer: "โอน", credit_card: "บัตรเครดิต" };
          const payMethod = payment ? (methodMap[payment.method] || payment.method) : "-";
          const amount = payment ? `${payment.amount} ฿` : "-";
          const fmt = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
          const startTime = updated.start_time ? fmt(updated.start_time) : "-";
          const endTime = updated.end_time ? fmt(updated.end_time) : "-";
          const genderNote = updated.customer_gender === "female" ? "\n👩 ลูกค้าผู้หญิง" : "";
          await this.lineNotify.send(
            `🔵 เริ่มบริการ\n👩‍⚕️ ${therapistName}\n💆 ${serviceName}\n🛏️ ${bedName}\n⏰ ${startTime} - ${endTime} น.\n💳 ${payMethod}\n💰 ${amount}${genderNote}`,
          );
        } catch (e) {
          this.logger.warn(`Failed to send Line in_service notification: ${e.message}`);
        }
        break;
      case "completed":
        if (effectiveBedId) {
          await client
            .from("beds")
            .update({ status: "available", current_booking_id: null })
            .eq("id", effectiveBedId);
        }
        await client
          .from("therapists")
          .update({ status: "available" })
          .eq("id", booking.therapist_id);
        break;
      case "checkout":
        if (effectiveBedId) {
          await client
            .from("beds")
            .update({ status: "available", current_booking_id: null })
            .eq("id", effectiveBedId);
        }
        // Release therapist if coming from in_service (e.g. stuck bookings)
        if (booking.status === "in_service" && booking.therapist_id) {
          await client
            .from("therapists")
            .update({ status: "available" })
            .eq("id", booking.therapist_id);
        }
        // Auto-confirm the associated payment
        {
          const { data: payment } = await client
            .from("payments")
            .select("id")
            .eq("booking_id", id)
            .eq("status", "pending")
            .maybeSingle();
          if (payment) {
            await client
              .from("payments")
              .update({ status: "confirmed", paid_at: new Date().toISOString() })
              .eq("id", payment.id);
          }
        }
        break;
      case "cancelled":
        if (effectiveBedId) {
          await client
            .from("beds")
            .update({ status: "available", current_booking_id: null })
            .eq("id", effectiveBedId);
        }
        if (booking.therapist_id) {
          await client
            .from("therapists")
            .update({ status: "available" })
            .eq("id", booking.therapist_id);
        }
        break;
    }

    return updated;
  }

  async updateDetails(id: number, updates: { therapist_id?: number; service_id?: number; bed_id?: number; customer_gender?: string }) {
    const client = this.supabase.getClient();

    const { data: booking } = await client
      .from("bookings")
      .select("*, services(*), therapists(*)")
      .eq("id", id)
      .single();
    if (!booking) throw new NotFoundException("Booking not found");

    // Keep old names for Line notification comparison
    const oldTherapistName = booking.therapists?.name_th || booking.therapists?.name_en || "-";
    const oldServiceName = booking.services?.name_th || booking.services?.name_en || "-";

    const payload: Record<string, unknown> = {};
    if (updates.customer_gender) payload.customer_gender = updates.customer_gender;
    if (updates.therapist_id) payload.therapist_id = updates.therapist_id;
    if (updates.service_id) {
      const { data: service } = await client
        .from("services")
        .select("*")
        .eq("id", updates.service_id)
        .single();
      if (!service) throw new NotFoundException("Service not found");
      payload.service_id = updates.service_id;
      // Recalculate end_time based on new service duration
      const startTime = new Date(booking.start_time);
      payload.end_time = new Date(startTime.getTime() + service.duration * 60000).toISOString();
      // Update payment amount
      await client
        .from("payments")
        .update({ amount: service.price })
        .eq("booking_id", id);
    }
    if (updates.bed_id) {
      // Release old bed
      if (booking.bed_id && booking.bed_id !== updates.bed_id) {
        await client
          .from("beds")
          .update({ status: "available", current_booking_id: null })
          .eq("id", booking.bed_id);
      }
      // Assign new bed
      payload.bed_id = updates.bed_id;
      await client
        .from("beds")
        .update({ status: booking.status === "in_service" ? "in_service" : "reserved", current_booking_id: id })
        .eq("id", updates.bed_id);
    }

    if (Object.keys(payload).length === 0) return booking;

    // Update old therapist to available, new therapist to busy (if in_service)
    if (updates.therapist_id && updates.therapist_id !== booking.therapist_id && booking.status === "in_service") {
      await client.from("therapists").update({ status: "available" }).eq("id", booking.therapist_id);
      await client.from("therapists").update({ status: "busy" }).eq("id", updates.therapist_id);
    }

    const { data: updated, error } = await client
      .from("bookings")
      .update(payload)
      .eq("id", id)
      .select("*, services(*), therapists(*), customers(*), beds!bookings_bed_id_fkey(*)")
      .single();
    if (error) throw error;

    // Send Line notification if therapist or service changed
    try {
      const therapistChanged = updates.therapist_id && updates.therapist_id !== booking.therapist_id;
      const serviceChanged = updates.service_id && updates.service_id !== booking.service_id;

      if (therapistChanged || serviceChanged) {
        const therapistName = updated.therapists?.name_th || updated.therapists?.name_en || "-";
        const newServiceName = updated.services?.name_th || updated.services?.name_en || "-";
        const bedName = updated.beds?.name || "-";
        const fmt = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
        const startTime = updated.start_time ? fmt(updated.start_time) : "-";
        const endTime = updated.end_time ? fmt(updated.end_time) : "-";

        const { data: payment } = await client
          .from("payments")
          .select("method, amount")
          .eq("booking_id", id)
          .maybeSingle();
        const methodMap: Record<string, string> = { cash: "เงินสด", transfer: "โอน", bank_transfer: "โอน", credit_card: "บัตรเครดิต" };
        const payMethod = payment ? (methodMap[payment.method] || payment.method) : "-";
        const amount = payment ? `${payment.amount} ฿` : "-";

        const lines = [`🔵 เริ่มบริการ (แก้ไขรายการ)`];

        if (therapistChanged) {
          lines.push(`👩‍⚕️ ${oldTherapistName} → ${therapistName}`);
        } else {
          lines.push(`👩‍⚕️ ${therapistName}`);
        }

        if (serviceChanged) {
          lines.push(`💆 ${oldServiceName} → ${newServiceName}`);
        } else {
          lines.push(`💆 ${newServiceName}`);
        }

        lines.push(`🛏️ ${bedName}`);
        lines.push(`⏰ ${startTime} - ${endTime} น.`);
        lines.push(`💳 ${payMethod}`);
        lines.push(`💰 ${amount}`);
        if (updated.customer_gender === "female") {
          lines.push(`👩 ลูกค้าผู้หญิง`);
        }

        await this.lineNotify.send(lines.join("\n"));
      }
    } catch (e) {
      this.logger.warn(`Failed to send Line edit notification: ${e.message}`);
    }

    return updated;
  }

  async getAvailableSlots(
    therapistId: number,
    date: string,
    duration: number = 60,
  ) {
    const client = this.supabase.getClient();

    // Get existing bookings for this therapist on this date
    const { data: bookings } = await client
      .from("bookings")
      .select("start_time, end_time")
      .eq("therapist_id", therapistId)
      .not("status", "in", '("cancelled","checkout")')
      .gte("start_time", `${date}T00:00:00`)
      .lte("start_time", `${date}T23:59:59`);

    // Generate hourly slots from 09:00 to 17:00
    const slots: { time: string; available: boolean }[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      const slotStart = new Date(
        `${date}T${hour.toString().padStart(2, "0")}:00:00`,
      );
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      const hasConflict = bookings?.some((b) => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return slotStart < bEnd && slotEnd > bStart;
      });

      slots.push({
        time: `${hour.toString().padStart(2, "0")}:00`,
        available: !hasConflict,
      });
    }

    return slots;
  }
}
