import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EVENTS, JwtPayload, RedisPubSubService, Role } from '@minedu/common';
import * as bcrypt from 'bcryptjs';
import { AuthUser } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { UsersClientService } from '../users-client/users-client.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersClient: UsersClientService,
    private readonly redisPubSub: RedisPubSubService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.authUser.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const authUser = await this.prisma.authUser.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
    });

    await this.usersClient.createProfile({
      authUserId: authUser.id,
      email: authUser.email,
      fullName: dto.fullName,
      role: dto.role,
    });

    try {
      await this.redisPubSub.publish(EVENTS.USER_CREATED, {
        authUserId: authUser.id,
        email: authUser.email,
        fullName: dto.fullName,
        role: dto.role,
      });
    } catch (error) {
      this.logger.warn(`No se pudo publicar ${EVENTS.USER_CREATED}: ${(error as Error).message}`);
    }

    return this.buildAuthResponse(authUser);
  }

  async validateCredentials(email: string, password: string): Promise<AuthUser | null> {
    const authUser = await this.prisma.authUser.findUnique({ where: { email } });
    if (!authUser || !authUser.isActive) {
      return null;
    }
    const passwordMatches = await bcrypt.compare(password, authUser.passwordHash);
    return passwordMatches ? authUser : null;
  }

  login(authUser: AuthUser) {
    return this.buildAuthResponse(authUser);
  }

  private buildAuthResponse(authUser: AuthUser) {
    const payload: JwtPayload = {
      sub: authUser.id,
      email: authUser.email,
      role: authUser.role as unknown as Role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: authUser.id, email: authUser.email, role: authUser.role },
    };
  }
}
