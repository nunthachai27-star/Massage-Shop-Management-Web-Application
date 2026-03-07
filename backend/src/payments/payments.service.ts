import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(private supabase: SupabaseService) {}

  async getByBooking(bookingId: number) {
    const { data, error } = await this.supabase
      .getClient()
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .single();
    if (error || !data) throw new NotFoundException("Payment not found");
    return data;
  }

  async create(dto: CreatePaymentDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from("payments")
      .insert({
        booking_id: dto.booking_id,
        amount: dto.amount,
        method: dto.method,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async confirm(id: number) {
    const { data, error } = await this.supabase
      .getClient()
      .from("payments")
      .update({ status: "confirmed", paid_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException("Payment not found");
    return data;
  }
}
