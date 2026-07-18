import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@minedu/common';
import { firstValueFrom } from 'rxjs';

interface CreateUserProfilePayload {
  authUserId: string;
  email: string;
  fullName: string;
  role: Role;
}

@Injectable()
export class UsersClientService {
  private readonly logger = new Logger(UsersClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createProfile(payload: CreateUserProfilePayload): Promise<void> {
    const baseUrl = this.configService.get<string>('USERS_SERVICE_INTERNAL_URL');
    const internalKey = this.configService.get<string>('INTERNAL_API_KEY');

    await firstValueFrom(
      this.httpService.post(`${baseUrl}/internal`, payload, {
        headers: { 'x-internal-key': internalKey },
      }),
    );
    this.logger.log(`Profile created in Users service for ${payload.email}`);
  }
}
