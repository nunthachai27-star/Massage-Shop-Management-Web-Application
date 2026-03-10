import { Controller, Post, Patch, Body } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { PinLoginDto } from "./dto/pin-login.dto";
import { OwnerLoginDto } from "./dto/owner-login.dto";
import { Public } from "./decorators/public.decorator";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("pin-login")
  pinLogin(@Body() dto: PinLoginDto) {
    return this.authService.pinLogin(dto.pin);
  }

  @Public()
  @Post("owner-login")
  ownerLogin(@Body() dto: OwnerLoginDto) {
    return this.authService.ownerLogin(dto.username, dto.password);
  }

  @Public()
  @Post("owner-pin-login")
  ownerPinLogin(@Body() dto: PinLoginDto) {
    return this.authService.ownerPinLogin(dto.pin);
  }

  @Patch("change-pin")
  changePin(@Body() body: { therapist_id: number; current_pin: string; new_pin: string }) {
    return this.authService.changePin(body.therapist_id, body.current_pin, body.new_pin);
  }
}
