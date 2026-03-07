import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class CustomersService {
  constructor(private supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from("customers")
      .select("*")
      .order("id");
    if (error) throw error;
    return data;
  }

  async findOrCreate(name: string, phone: string) {
    // Check if customer exists
    const { data: existing } = await this.supabase
      .getClient()
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .single();

    if (existing) {
      // Increment visit count
      await this.supabase
        .getClient()
        .from("customers")
        .update({ visit_count: existing.visit_count + 1 })
        .eq("id", existing.id);
      return { ...existing, visit_count: existing.visit_count + 1 };
    }

    // Create new
    const { data, error } = await this.supabase
      .getClient()
      .from("customers")
      .insert({ name, phone, visit_count: 1 })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
