import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherInvitationDto } from './dto/create-teacher-invitation.dto';
import { CreateFamilyInvitationDto } from './dto/create-family-invitation.dto';
import { AcceptTeacherInvitationDto, AcceptFamilyInvitationDto } from './dto/accept-invitation.dto';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
  ) {}

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  async createTeacherInvitation(dto: CreateTeacherInvitationDto, directorId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: dto.institutionId },
    });
    if (!institution) {
      throw new NotFoundException('Institución no encontrada');
    }
    if (institution.directorId !== directorId) {
      throw new ForbiddenException('No tienes permiso para invitar a esta institución');
    }

    const invitation = await this.prisma.invitation.create({
      data: {
        type: 'TEACHER_TO_INSTITUTION',
        token: this.generateToken(),
        email: dto.email,
        institutionId: dto.institutionId,
        createdBy: directorId,
      },
    });

    try {
      await this.pubsub.publish(EVENTS.INVITATION_CREATED, {
        ...invitation,
        institutionName: institution.name,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento INVITATION_CREATED', err);
    }

    return invitation;
  }

  async createFamilyInvitation(dto: CreateFamilyInvitationDto, teacherId: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: dto.classroomId },
    });
    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
    }
    if (classroom.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permiso para invitar a esta aula');
    }

    const invitation = await this.prisma.invitation.create({
      data: {
        type: 'FAMILY_TO_CLASSROOM',
        token: this.generateToken(),
        email: dto.email,
        classroomId: dto.classroomId,
        createdBy: teacherId,
      },
    });

    try {
      await this.pubsub.publish(EVENTS.INVITATION_CREATED, {
        ...invitation,
        classroomName: classroom.name,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento INVITATION_CREATED', err);
    }

    return invitation;
  }

  async acceptTeacherInvitation(dto: AcceptTeacherInvitationDto, teacherId: string, userEmail: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if (invitation.type !== 'TEACHER_TO_INSTITUTION') {
      throw new BadRequestException('Tipo de invitación inválido');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('La invitación ya fue utilizada o revocada');
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestException('La invitación ha expirado');
    }
    if (invitation.email !== userEmail) {
      throw new ForbiddenException('El email de tu cuenta no coincide con la invitación');
    }

    const alreadyMember = await this.prisma.institutionTeacher.findUnique({
      where: {
        institutionId_teacherId: {
          institutionId: invitation.institutionId!,
          teacherId,
        },
      },
    });
    if (alreadyMember) {
      throw new ConflictException('Ya eres miembro de esta institución');
    }

    await this.prisma.institutionTeacher.create({
      data: {
        institutionId: invitation.institutionId!,
        teacherId,
        invitationId: invitation.id,
      },
    });

    await this.prisma.classroom.updateMany({
      where: {
        teacherId,
        institutionId: null,
      },
      data: {
        institutionId: invitation.institutionId,
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        usedBy: teacherId,
        usedAt: new Date(),
      },
    });

    try {
      await this.pubsub.publish(EVENTS.INVITATION_ACCEPTED, {
        invitationId: invitation.id,
        type: invitation.type,
        usedBy: teacherId,
        createdBy: invitation.createdBy,
        email: invitation.email,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento INVITATION_ACCEPTED', err);
    }

    return { message: 'Invitación aceptada correctamente' };
  }

  async acceptFamilyInvitation(dto: AcceptFamilyInvitationDto, familiarId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if (invitation.type !== 'FAMILY_TO_CLASSROOM') {
      throw new BadRequestException('Tipo de invitación inválido');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('La invitación ya fue utilizada o revocada');
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestException('La invitación ha expirado');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    if (student.familiarId !== familiarId) {
      throw new ForbiddenException('No tienes permiso para inscribir este estudiante');
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: invitation.classroomId!,
          studentId: dto.studentId,
        },
      },
    });
    if (existingEnrollment) {
      throw new ConflictException('El estudiante ya está matriculado en esta aula');
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        classroomId: invitation.classroomId!,
        studentId: dto.studentId,
        familiarId,
        invitationId: invitation.id,
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        usedBy: familiarId,
        usedAt: new Date(),
      },
    });

    try {
      await this.pubsub.publish(EVENTS.ENROLLMENT_CREATED, {
        ...enrollment,
        classroomName: (await this.prisma.classroom.findUnique({ where: { id: invitation.classroomId! } }))?.name,
      });
      await this.pubsub.publish(EVENTS.INVITATION_ACCEPTED, {
        invitationId: invitation.id,
        type: invitation.type,
        usedBy: familiarId,
        createdBy: invitation.createdBy,
        email: invitation.email,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando eventos de aceptación', err);
    }

    return enrollment;
  }

  async findPendingByInstitution(institutionId: string, userId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution || institution.directorId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta institución');
    }
    return this.prisma.invitation.findMany({
      where: {
        institutionId,
        type: 'TEACHER_TO_INSTITUTION',
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingByClassroom(classroomId: string, teacherId: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom || classroom.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes acceso a esta aula');
    }
    return this.prisma.invitation.findMany({
      where: {
        classroomId,
        type: 'FAMILY_TO_CLASSROOM',
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if (invitation.createdBy !== userId) {
      throw new ForbiddenException('No tienes permiso para revocar esta invitación');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden revocar invitaciones pendientes');
    }
    return this.prisma.invitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.invitation.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        institution: true,
        classroom: true,
      },
    });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }
    return invitation;
  }
}
