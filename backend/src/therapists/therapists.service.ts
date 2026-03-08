import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { CreateTherapistDto } from "./dto/create-therapist.dto";
import { UpdateTherapistDto } from "./dto/update-therapist.dto";

@Injectable()
export class TherapistsService {
  constructor(private supabase: SupabaseService) {}

  private readonly publicColumns = "id, name_th, name_en, skills, rating, status, image, experience, is_active, created_at";

  async findAll(status?: string) {
    let query = this.supabase
      .getClient()
      .from("therapists")
      .select(this.publicColumns)
      .eq("is_active", true)
      .order("id");
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async findAllIncludingInactive() {
    const { data, error } = await this.supabase
      .getClient()
      .from("therapists")
      .select(this.publicColumns)
      .order("id");
    if (error) throw error;
    return data;
  }

  async reactivate(id: number) {
    const { data, error } = await this.supabase
      .getClient()
      .from("therapists")
      .update({ is_active: true, status: "offline" })
      .eq("id", id)
      .select(this.publicColumns)
      .single();
    if (error || !data) throw new NotFoundException("Therapist not found");
    return data;
  }

  async findOne(id: number) {
    const { data, error } = await this.supabase
      .getClient()
      .from("therapists")
      .select(this.publicColumns)
      .eq("id", id)
      .single();
    if (error || !data) throw new NotFoundException("Therapist not found");
    return data;
  }

  private async checkPinUnique(pin: string, excludeId?: number) {
    if (!pin) return;
    const { data } = await this.supabase
      .getClient()
      .from("therapists")
      .select("id")
      .eq("pin", pin);
    const conflict = data?.find((t: { id: number }) => t.id !== excludeId);
    if (conflict) throw new BadRequestException("PIN is already in use");
  }

  async create(dto: CreateTherapistDto) {
    if (dto.pin) await this.checkPinUnique(dto.pin);
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
    if (dto.pin) await this.checkPinUnique(dto.pin, id);
    const { data, error } = await this.supabase
      .getClient()
      .from("therapists")
      .update(dto)
      .eq("id", id)
      .select(this.publicColumns)
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
      .select(this.publicColumns)
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
