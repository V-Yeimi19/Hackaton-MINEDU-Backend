import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { teacherInvitationTemplate } from './templates/teacher-invitation';
import { familyInvitationTemplate } from './templates/family-invitation';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private from: string;
  private frontendUrl: string;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT') ?? 587,
      secure: config.get<boolean>('SMTP_SECURE') ?? false,
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
    this.from = config.get<string>('SMTP_FROM') ?? '';
    this.frontendUrl = config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  async sendTeacherInvitation(data: {
    to: string;
    directorName: string;
    institutionName: string;
    token: string;
  }): Promise<void> {
    const url = `${this.frontendUrl}/invitations/${data.token}`;
    const html = teacherInvitationTemplate({
      directorName: data.directorName,
      institutionName: data.institutionName,
      url,
    });

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: data.to,
        subject: `Invitación a ${data.institutionName} - Plataforma MINEDU`,
        html,
      });
      this.logger.log(`Email de invitación docente enviado a ${data.to}`);
    } catch (err) {
      this.logger.error(`Error enviando email a ${data.to}`, err);
    }
  }

  async sendFamilyInvitation(data: {
    to: string;
    teacherName: string;
    classroomName: string;
    token: string;
  }): Promise<void> {
    const url = `${this.frontendUrl}/invitations/${data.token}`;
    const html = familyInvitationTemplate({
      teacherName: data.teacherName,
      classroomName: data.classroomName,
      url,
    });

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: data.to,
        subject: `Invitación al aula ${data.classroomName} - Plataforma MINEDU`,
        html,
      });
      this.logger.log(`Email de invitación familiar enviado a ${data.to}`);
    } catch (err) {
      this.logger.error(`Error enviando email a ${data.to}`, err);
    }
  }
}
