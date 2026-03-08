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

  async changePin(therapistId: number, currentPin: string, newPin: string) {
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      throw new UnauthorizedException("PIN must be exactly 4 digits");
    }

    // Verify current PIN
    const { data: therapist } = await this.supabase.getClient()
      .from("therapists")
      .select("id, pin")
      .eq("id", therapistId)
      .eq("is_active", true)
      .single();

    if (!therapist || therapist.pin !== currentPin) {
      throw new UnauthorizedException("Current PIN is incorrect");
    }

    // Check new PIN not already used by another therapist
    const { data: existing } = await this.supabase.getClient()
      .from("therapists")
      .select("id")
      .eq("pin", newPin)
      .eq("is_active", true)
      .neq("id", therapistId)
      .single();

    if (existing) {
      throw new UnauthorizedException("This PIN is already in use");
    }

    // Update PIN
    const { error } = await this.supabase.getClient()
      .from("therapists")
      .update({ pin: newPin })
      .eq("id", therapistId);

    if (error) throw error;
    return { message: "PIN changed successfully" };
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
