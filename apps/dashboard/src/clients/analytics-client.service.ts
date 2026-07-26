import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AnalyticsClientService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get baseUrl() {
    return this.config.get<string>('ANALYTICS_SERVICE_INTERNAL_URL');
  }

  private get headers() {
    return { 'x-internal-key': this.config.get<string>('INTERNAL_API_KEY') };
  }

  async getIndicatorsByClassroom(classroomId: string): Promise<any[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/internal/indicators/classroom/${classroomId}`, {
        headers: this.headers,
      }),
    );
    return data;
  }

  async getRiskByClassroom(classroomId: string): Promise<any[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/internal/risk/classroom/${classroomId}`, {
        headers: this.headers,
      }),
    );
    return data;
  }
}
