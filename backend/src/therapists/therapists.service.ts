import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { CreateTherapistDto } from "./dto/create-therapist.dto";
import { UpdateTherapistDto } from "./dto/update-therapist.dto";

@Injectable()
export class TherapistsService {
  constructor(private supabase: SupabaseService) {}

  async findAll(status?: string) {
    let query = this.supabase
      .getClient()
      .from("therapists")
      .select("*")
      .eq("is_active", true)
      .order("id");
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async findOne(id: number) {
    const { data, error } = await this.supabase
      .getClient()
      .from("therapists")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new NotFoundException("Therapist not found");
    return data;
  }

  async create(dto: CreateTherapistDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from("therapists")
      .insert(dto)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: number, dto: UpdateTherapistDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from("therapists")
      .update(dto)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException("Therapist not found");
    return data;
  }

  async updateStatus(id: number, status: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("therapists")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException("Therapist not found");
    return data;
  }

  async remove(id: number) {
    const { error } = await this.supabase
      .getClient()
      .from("therapists")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
    return { message: "Therapist deleted" };
  }
}
