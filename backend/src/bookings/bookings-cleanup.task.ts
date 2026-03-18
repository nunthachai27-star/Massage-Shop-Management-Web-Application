import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SupabaseService } from "../supabase/supabase.service";
import { LineNotifyService } from "../line-notify/line-notify.service";

@Injectable()
export class BookingsCleanupTask {
  private readonly logger = new Logger(BookingsCleanupTask.name);

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
