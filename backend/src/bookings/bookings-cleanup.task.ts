import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SupabaseService } from "../supabase/supabase.service";
import { LineNotifyService } from "../line-notify/line-notify.service";

@Injectable()
export class BookingsCleanupTask {
  private readonly logger = new Logger(BookingsCleanupTask.name);
  private remindedBookingIds = new Set<number>();

  constructor(
    private supabase: SupabaseService,
    private lineNotify: LineNotifyService,
  ) {}

  /** Runs every day at midnight (Bangkok time: UTC+7 → 17:00 UTC) */
  @Cron("0 17 * * *")
  async handleMidnightCleanup() {
    this.logger.log("Running midnight stuck-booking cleanup...");
    await this.cleanupStuckBookings();
  }

  /** Also runs at 6 AM Bangkok (23:00 UTC previous day) as a safety net */
  @Cron("0 23 * * *")
  async handleMorningCleanup() {
    this.logger.log("Running morning stuck-booking cleanup...");
    await this.cleanupStuckBookings();
  }

  /** Runs every 5 minutes to check for overtime bookings */
  @Cron("*/5 * * * *")
  async handleOvertimeReminder() {
    const client = this.supabase.getClient();
    const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();

    const { data: overtime, error } = await client
      .from("bookings")
      .select("id, customer_name, end_time, beds!bookings_bed_id_fkey(name), services(name_th), therapists(name_th)")
      .eq("status", "in_service")
      .lt("end_time", tenMinAgo);

    if (error || !overtime || overtime.length === 0) return;

    // Filter out already-reminded bookings
    const newOvertime = overtime.filter((b) => !this.remindedBookingIds.has(b.id));
    if (newOvertime.length === 0) return;

    this.logger.log(`Found ${newOvertime.length} overtime booking(s), sending reminder...`);

    const lines = [`🔔 แจ้งเตือนอัตโนมัติ: เกินเวลา 10 นาที กรุณากดจบบริการ`];
    for (const b of newOvertime) {
      const therapist = (b.therapists as any)?.name_th || "-";
      const service = (b.services as any)?.name_th || "-";
      const bed = (b.beds as any)?.name || "-";
      const endTime = new Date(b.end_time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
      lines.push(`━━━━━━━━━━━━━━━`);
      lines.push(`👩‍⚕️ ${therapist}`);
      lines.push(`💆 ${service} | 🛏️ ${bed}`);
      lines.push(`👤 ${b.customer_name || "-"}`);
      lines.push(`⏰ สิ้นสุด ${endTime} น.`);
      this.remindedBookingIds.add(b.id);
    }

    try {
      await this.lineNotify.send(lines.join("\n"));
    } catch (e) {
      this.logger.warn(`Failed to send overtime reminder: ${e.message}`);
    }

    // Clean up old IDs (keep only recent ones to prevent memory leak)
    if (this.remindedBookingIds.size > 200) {
      const idsToKeep = overtime.map((b) => b.id);
      this.remindedBookingIds = new Set(idsToKeep);
    }
  }

  async cleanupStuckBookings() {
    const client = this.supabase.getClient();

    // Find bookings that are still in_service or completed where end_time has passed
    const now = new Date().toISOString();
    const { data: stuckBookings, error } = await client
      .from("bookings")
      .select("id, status, bed_id, therapist_id, customer_name, services(name_th, name_en), therapists(name_th, name_en)")
      .in("status", ["in_service", "completed"])
      .lt("end_time", now);

    if (error) {
      this.logger.error(`Failed to query stuck bookings: ${error.message}`);
      return;
    }

    if (!stuckBookings || stuckBookings.length === 0) {
      this.logger.log("No stuck bookings found.");
      return;
    }

    this.logger.log(`Found ${stuckBookings.length} stuck booking(s). Cleaning up...`);

    const cleanedNames: string[] = [];

    for (const booking of stuckBookings) {
      try {
        // Update booking to checkout
        await client
          .from("bookings")
          .update({ status: "checkout" })
          .eq("id", booking.id);

        // Release bed
        if (booking.bed_id) {
          await client
            .from("beds")
            .update({ status: "available", current_booking_id: null })
            .eq("id", booking.bed_id);
        }

        // Release therapist
        if (booking.therapist_id) {
          await client
            .from("therapists")
            .update({ status: "available" })
            .eq("id", booking.therapist_id);
        }

        // Confirm pending payment
        const { data: payment } = await client
          .from("payments")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("status", "pending")
          .maybeSingle();

        if (payment) {
          await client
            .from("payments")
            .update({ status: "confirmed", paid_at: new Date().toISOString() })
            .eq("id", payment.id);
        }

        const therapistName = (booking.therapists as any)?.name_th || (booking.therapists as any)?.name_en || "-";
        cleanedNames.push(`#${booking.id} ${booking.customer_name || ""} (${therapistName})`);
        this.logger.log(`Cleaned up booking #${booking.id}`);
      } catch (e) {
        this.logger.error(`Failed to cleanup booking #${booking.id}: ${e.message}`);
      }
    }

    // Send Line notification summary
    if (cleanedNames.length > 0) {
      try {
        const msg = `🔄 ระบบอัตโนมัติ: Checkout ${cleanedNames.length} รายการค้าง\n${cleanedNames.join("\n")}`;
        await this.lineNotify.send(msg);
      } catch (e) {
        this.logger.warn(`Failed to send cleanup Line notification: ${e.message}`);
      }
    }
  }
}
