import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthUser } from '../../generated/prisma';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() req: { user: AuthUser }) {
    return this.authService.login(req.user);
  }
}
