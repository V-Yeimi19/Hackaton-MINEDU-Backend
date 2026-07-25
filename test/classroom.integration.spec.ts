import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../apps/classroom/src/app.module';
import { TEST_TOKENS } from './helpers';

describe('Classroom Service (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET) should return status ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.service).toBe('classroom');
        });
    });
  });

  describe('Classrooms (new model)', () => {
    let classroomId: string;

    it('/classrooms (POST) should create a classroom with gradeLevel', () => {
      return request(app.getHttpServer())
        .post('/classrooms')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .send({
          name: 'Aula 4A',
          gradeLevel: '4to Primaria',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe('Aula 4A');
          expect(res.body.gradeLevel).toBe('4to Primaria');
          expect(res.body.teacherId).toBe('test-teacher-id');
          classroomId = res.body.id;
        });
    });

    it('/classrooms (POST) should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/classrooms')
        .send({ name: 'Test', gradeLevel: '1ro' })
        .expect(401);
    });

    it('/classrooms (POST) should reject familiar role', () => {
      return request(app.getHttpServer())
        .post('/classrooms')
        .set('Authorization', `Bearer ${TEST_TOKENS.familiar}`)
        .send({ name: 'Test', gradeLevel: '1ro' })
        .expect(403);
    });

    it('/classrooms (GET) should return classrooms', () => {
      return request(app.getHttpServer())
        .get('/classrooms')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/classrooms/:id (GET) should return one classroom', () => {
      return request(app.getHttpServer())
        .get(`/classrooms/${classroomId}`)
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(classroomId);
          expect(res.body.courses).toBeDefined();
        });
    });
  });

  describe('Courses (new model: course inside classroom)', () => {
    let classroomId: string;
    let courseId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/classrooms')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .send({
          name: 'Aula para cursos',
          gradeLevel: '3ro Primaria',
        });
      classroomId = res.body.id;
    });

    it('/courses (POST) should create a course inside a classroom', () => {
      return request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .send({
          name: 'Matematicas',
          classroomId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe('Matematicas');
          expect(res.body.classroom?.id).toBe(classroomId);
          courseId = res.body.id;
        });
    });

    it('/courses (POST) should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/courses')
        .send({ name: 'Test', classroomId: 'fake' })
        .expect(401);
    });

    it('/courses (POST) should reject familiar role', () => {
      return request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${TEST_TOKENS.familiar}`)
        .send({ name: 'Test', classroomId: 'fake' })
        .expect(403);
    });

    it('/courses (GET) should return courses', () => {
      return request(app.getHttpServer())
        .get('/courses')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/courses/:id (GET) should return one course with classroom', () => {
      return request(app.getHttpServer())
        .get(`/courses/${courseId}`)
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(courseId);
          expect(res.body.classroom).toBeDefined();
        });
    });
  });

  describe('Students (FAMILIAR creates children)', () => {
    let studentId: string;

    it('/students (POST) should create a student as familiar', () => {
      return request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${TEST_TOKENS.familiar}`)
        .send({
          fullName: 'Maria Perez',
          birthDate: '2015-03-15',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.fullName).toBe('Maria Perez');
          expect(res.body.familiarId).toBe('test-familiar-id');
          studentId = res.body.id;
        });
    });

    it('/students (POST) should reject docente role', () => {
      return request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .send({ fullName: 'Test' })
        .expect(403);
    });

    it('/students (GET) should return familiar students', () => {
      return request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${TEST_TOKENS.familiar}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/students/:id (GET) should return one student', () => {
      return request(app.getHttpServer())
        .get(`/students/${studentId}`)
        .set('Authorization', `Bearer ${TEST_TOKENS.familiar}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(studentId);
        });
    });
  });
});
