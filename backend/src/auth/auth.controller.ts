import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type {
  AuthResponse,
  LoginInput,
  LogoutInput,
  RefreshInput,
} from './auth.types.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() input: LoginInput): Promise<AuthResponse> {
    return this.authService.login(input);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() input: RefreshInput): Promise<AuthResponse> {
    return this.authService.refresh(input.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() input: LogoutInput): Promise<void> {
    await this.authService.logout(input.refreshToken);
  }
}
