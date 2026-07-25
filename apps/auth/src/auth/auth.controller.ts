import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { InternalKeyGuard, JwtAuthGuard, Role, Roles, RolesGuard } from '@minedu/common';
import { AuthUser } from '../../generated/prisma';
import { AuthService } from './auth.service';
import { ChangeRoleDto } from './dto/change-role.dto';
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':authUserId/role')
  changeRole(@Param('authUserId') authUserId: string, @Body() dto: ChangeRoleDto) {
    return this.authService.changeRole(authUserId, dto.role);
  }

  @UseGuards(InternalKeyGuard)
  @Post('internal/register')
  internalRegister(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
