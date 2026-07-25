import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../apps/ai/src/app.module';
import { TEST_TOKENS } from './helpers';

describe('AI Service (Integration)', () => {
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
          expect(res.body.service).toBe('ai');
        });
    });
  });

  describe('Reports', () => {
    it('/reports (GET) should return reports list', () => {
      return request(app.getHttpServer())
        .get('/reports')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/reports (GET) should reject without auth', () => {
      return request(app.getHttpServer())
        .get('/reports')
        .expect(401);
    });

    it('/reports (GET) should reject student role', () => {
      return request(app.getHttpServer())
        .get('/reports')
        .set('Authorization', `Bearer ${TEST_TOKENS.estudiante}`)
        .expect(403);
    });
  });
});
