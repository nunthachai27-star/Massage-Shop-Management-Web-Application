import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

@Injectable()
export class BookingsService {
  constructor(private supabase: SupabaseService) {}

  async findAll(status?: string, date?: string) {
    let query = this.supabase
      .getClient()
      .from("bookings")
      .select("*, services(*), therapists(*), customers(*), beds(*)")
      .order("start_time", { ascending: true });

    if (status) query = query.eq("status", status);
    if (date) {
      query = query
        .gte("start_time", `${date}T00:00:00`)
        .lte("start_time", `${date}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async findOne(id: number) {
    const { data, error } = await this.supabase
      .getClient()
      .from("bookings")
      .select("*, services(*), therapists(*), customers(*), beds(*)")
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

    // 4. Find available bed
    const { data: availableBed } = await client
      .from("beds")
      .select("*")
      .eq("status", "available")
      .limit(1)
      .single();

    if (!availableBed) {
      throw new BadRequestException("No beds available at this time");
    }

    // 5. Create booking
    const { data: booking, error } = await client
      .from("bookings")
      .insert({
        customer_id: customer.id,
        service_id: dto.service_id,
        therapist_id: dto.therapist_id,
        bed_id: availableBed.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "booked",
      })
      .select("*, services(*), therapists(*), customers(*), beds(*)")
      .single();
    if (error) throw error;

    // 6. Create payment (pending)
    await client.from("payments").insert({
      booking_id: booking.id,
      amount: service.price,
      method: "cash",
      status: "pending",
    });

    // 7. Update bed
    await client
      .from("beds")
      .update({ status: "reserved", current_booking_id: booking.id })
      .eq("id", availableBed.id);

    return booking;
  }

  async updateStatus(id: number, newStatus: string) {
    const client = this.supabase.getClient();

    const { data: booking } = await client
      .from("bookings")
      .select("*, beds(*)")
      .eq("id", id)
      .single();
    if (!booking) throw new NotFoundException("Booking not found");

    // Update booking status
    const { data: updated, error } = await client
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", id)
      .select("*, services(*), therapists(*), customers(*), beds(*)")
      .single();
    if (error) throw error;

    // Side effects based on status change
    switch (newStatus) {
      case "in_service":
        await client
          .from("beds")
          .update({ status: "in_service" })
          .eq("id", booking.bed_id);
        await client
          .from("therapists")
          .update({ status: "busy" })
          .eq("id", booking.therapist_id);
        break;
      case "completed":
        await client
          .from("beds")
          .update({ status: "cleaning" })
          .eq("id", booking.bed_id);
        await client
          .from("therapists")
          .update({ status: "available" })
          .eq("id", booking.therapist_id);
        break;
      case "checkout":
        await client
          .from("beds")
          .update({ status: "available", current_booking_id: null })
          .eq("id", booking.bed_id);
        break;
      case "cancelled":
        await client
          .from("beds")
          .update({ status: "available", current_booking_id: null })
          .eq("id", booking.bed_id);
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
