import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class BedsService {
  constructor(private supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from("beds")
      .select("*")
      .order("id");
    if (error) throw error;
    return data;
  }

  async updateStatus(
    id: number,
    status: string,
    currentBookingId?: number | null,
  ) {
    const update: any = { status };
    if (currentBookingId !== undefined)
      update.current_booking_id = currentBookingId;
    const { data, error } = await this.supabase
      .getClient()
      .from("beds")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException("Bed not found");
    return data;
  }
}
