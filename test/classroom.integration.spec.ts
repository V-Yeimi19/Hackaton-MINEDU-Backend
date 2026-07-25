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

  describe('Courses', () => {
    let courseId: string;

    it('/courses (POST) should create a course', () => {
      return request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .send({
          name: 'Matematicas',
          gradeLevel: '3ro Primaria',
          teacherId: 'teacher-001',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe('Matematicas');
          courseId = res.body.id;
        });
    });

    it('/courses (POST) should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/courses')
        .send({ name: 'Test', gradeLevel: '1ro', teacherId: 't1' })
        .expect(401);
    });

    it('/courses (POST) should reject student role', () => {
      return request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${TEST_TOKENS.estudiante}`)
        .send({ name: 'Test', gradeLevel: '1ro', teacherId: 't1' })
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

    it('/courses/:id (GET) should return one course', () => {
      return request(app.getHttpServer())
        .get(`/courses/${courseId}`)
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(courseId);
        });
    });
  });

  describe('Classrooms', () => {
    let classroomId: string;
    let courseId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .send({
          name: 'Ciencias',
          gradeLevel: '4to Primaria',
          teacherId: 'teacher-002',
        });
      courseId = res.body.id;
    });

    it('/classrooms (POST) should create a classroom', () => {
      return request(app.getHttpServer())
        .post('/classrooms')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .send({
          name: 'Aula 4A',
          courseId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          classroomId = res.body.id;
        });
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
        });
    });
  });
});
