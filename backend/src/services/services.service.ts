import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";

@Injectable()
export class ServicesService {
  constructor(private supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("id");
    if (error) throw error;
    return data;
  }

  async findOne(id: number) {
    const { data, error } = await this.supabase
      .getClient()
      .from("services")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new NotFoundException("Service not found");
    return data;
  }

  async create(dto: CreateServiceDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from("services")
      .insert(dto)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: number, dto: UpdateServiceDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from("services")
      .update(dto)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException("Service not found");
    return data;
  }

  async remove(id: number) {
    const { error } = await this.supabase
      .getClient()
      .from("services")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
    return { message: "Service deleted" };
  }
}
