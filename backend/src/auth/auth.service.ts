import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { SupabaseService } from "../supabase/supabase.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwtService: JwtService,
  ) {}

  async pinLogin(pin: string) {
    const { data: therapist } = await this.supabase.getClient()
      .from("therapists")
      .select("id, name_th, name_en, status")
      .eq("pin", pin)
      .eq("is_active", true)
      .single();

    if (!therapist) {
      throw new UnauthorizedException("Invalid PIN");
    }

    const token = this.jwtService.sign({
      id: therapist.id,
      name: therapist.name_th,
      role: "therapist",
    });

    return { access_token: token, user: therapist };
  }

  async ownerLogin(username: string, password: string) {
    const { data: staff } = await this.supabase.getClient()
      .from("staff")
      .select("id, username, password_hash, role, name")
      .eq("username", username)
      .single();

    if (!staff) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, staff.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.jwtService.sign({
      id: staff.id,
      name: staff.name,
      role: staff.role,
    });

    return {
      access_token: token,
      user: { id: staff.id, username: staff.username, name: staff.name, role: staff.role },
    };
  }
}
