import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ClassroomClientService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get baseUrl() {
    return this.config.get<string>('CLASSROOM_SERVICE_INTERNAL_URL');
  }

  private get headers() {
    return { 'x-internal-key': this.config.get<string>('INTERNAL_API_KEY') };
  }

  async getAllInstitutions(): Promise<any[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/internal/institutions`, { headers: this.headers }),
    );
    return data;
  }

  async getInstitutionsByDirector(directorId: string): Promise<any[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/internal/institutions/director/${directorId}`, {
        headers: this.headers,
      }),
    );
    return data;
  }

  async getAllClassrooms(): Promise<any[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/internal/classrooms`, { headers: this.headers }),
    );
    return data;
  }

  async getClassroom(id: string): Promise<any> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/internal/classroom/${id}`, { headers: this.headers }),
    );
    return data;
  }

  async getAllStudents(): Promise<any[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/internal/students`, { headers: this.headers }),
    );
    return data;
  }

  async getStudentsByFamiliar(familiarId: string): Promise<any[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/internal/students/familiar/${familiarId}`, {
        headers: this.headers,
      }),
    );
    return data;
  }

  async getCompetenciesByStudent(studentId: string): Promise<any[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/internal/competencies/student/${studentId}`, {
        headers: this.headers,
      }),
    );
    return data;
  }
}
