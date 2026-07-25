import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

interface UserCreatedPayload {
  authUserId: string;
  email: string;
  fullName: string;
  role: string;
}

interface InvitationCreatedPayload {
  id: string;
  token: string;
  type: string;
  email: string;
  institutionId?: string;
  classroomId?: string;
  createdBy: string;
  institutionName?: string;
  classroomName?: string;
}

interface InvitationAcceptedPayload {
  invitationId: string;
  type: string;
  usedBy: string;
  createdBy: string;
  email: string;
}

@Injectable()
export class EventsSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(EventsSubscriberService.name);

  constructor(
    private readonly redisPubSub: RedisPubSubService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit(): void {
    this.redisPubSub.subscribe<UserCreatedPayload>(EVENTS.USER_CREATED, async (payload) => {
      await this.notificationsService.enqueue({
        userId: payload.authUserId,
        type: 'welcome',
        title: 'Bienvenido a la plataforma MINEDU',
        message: `Hola ${payload.fullName}, tu cuenta fue creada correctamente.`,
      });
      this.logger.log(`Notificación de bienvenida encolada para ${payload.email}`);
    });

    this.redisPubSub.subscribe<InvitationCreatedPayload>(
      EVENTS.INVITATION_CREATED,
      async (payload) => {
        if (payload.type === 'TEACHER_TO_INSTITUTION') {
          await this.emailService.sendTeacherInvitation({
            to: payload.email,
            directorName: 'El director',
            institutionName: payload.institutionName ?? 'la institución',
            token: payload.token,
          });
          this.logger.log(`Email de invitación docente enviado a ${payload.email}`);
        } else if (payload.type === 'FAMILY_TO_CLASSROOM') {
          await this.emailService.sendFamilyInvitation({
            to: payload.email,
            teacherName: 'Su docente',
            classroomName: payload.classroomName ?? 'el aula',
            token: payload.token,
          });
          this.logger.log(`Email de invitación familiar enviado a ${payload.email}`);
        }
      },
    );

    this.redisPubSub.subscribe<InvitationAcceptedPayload>(
      EVENTS.INVITATION_ACCEPTED,
      async (payload) => {
        await this.notificationsService.enqueue({
          userId: payload.createdBy,
          type: 'invitation_accepted',
          title: 'Invitación aceptada',
          message: `Una invitación que enviaste fue aceptada.`,
          payload: {
            invitationId: payload.invitationId,
            type: payload.type,
            usedBy: payload.usedBy,
          },
        });
        this.logger.log(`Notificación de invitación aceptada encolada para ${payload.createdBy}`);
      },
    );
  }
}
