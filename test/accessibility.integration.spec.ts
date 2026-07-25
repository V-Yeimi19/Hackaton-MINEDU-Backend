import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../apps/accessibility/src/app.module';
import { TEST_TOKENS } from './helpers';

describe('Accessibility Service (Integration)', () => {
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
          expect(res.body.service).toBe('accessibility');
        });
    });
  });

  describe('Accessibility Jobs', () => {
    it('/jobs (GET) should return jobs list', () => {
      return request(app.getHttpServer())
        .get('/jobs')
        .set('Authorization', `Bearer ${TEST_TOKENS.especialista}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/jobs (GET) should reject without auth', () => {
      return request(app.getHttpServer())
        .get('/jobs')
        .expect(401);
    });

    it('/jobs (GET) should reject student role', () => {
      return request(app.getHttpServer())
        .get('/jobs')
        .set('Authorization', `Bearer ${TEST_TOKENS.estudiante}`)
        .expect(403);
    });

    it('/process (POST) should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/process')
        .send({ fileId: 'test', fileName: 'test.pdf', fileType: 'application/pdf' })
        .expect(401);
    });
  });
});
