import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../apps/reports/src/app.module';
import { TEST_TOKENS } from './helpers';

describe('Reports Service (Integration)', () => {
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
          expect(res.body.service).toBe('reports');
        });
    });
  });

  describe('Reports', () => {
    it('/ (GET) should return reports list for admin', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${TEST_TOKENS.admin}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/ (GET) should return reports list for directivo', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${TEST_TOKENS.directivo}`)
        .expect(200);
    });

    it('/ (GET) should reject without auth', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(401);
    });

    it('/ (GET) should reject docente role', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${TEST_TOKENS.docente}`)
        .expect(403);
    });

    it('/generate (POST) should reject missing period fields', () => {
      return request(app.getHttpServer())
        .post('/generate')
        .set('Authorization', `Bearer ${TEST_TOKENS.admin}`)
        .send({})
        .expect(400);
    });
  });
});
