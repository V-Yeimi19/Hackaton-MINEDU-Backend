import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../apps/analytics/src/app.module';
import { TEST_TOKENS, TEST_INTERNAL_KEY } from './helpers';

describe('Analytics Service (Integration)', () => {
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
          expect(res.body.service).toBe('analytics');
        });
    });
  });

  describe('Internal Endpoints', () => {
    it('/internal/indicators/classroom/:id (GET) should return indicators', () => {
      return request(app.getHttpServer())
        .get('/internal/indicators/classroom/nonexistent')
        .set('x-internal-key', TEST_INTERNAL_KEY)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/internal/risk/classroom/:id (GET) should return risks', () => {
      return request(app.getHttpServer())
        .get('/internal/risk/classroom/nonexistent')
        .set('x-internal-key', TEST_INTERNAL_KEY)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/internal/indicators/classroom/:id (GET) should reject without internal key', () => {
      return request(app.getHttpServer())
        .get('/internal/indicators/classroom/nonexistent')
        .expect(401);
    });
  });

  describe('Recommendation Rules', () => {
    it('should generate correct recommendation for both attendance and grade issues', () => {
      const { buildRecommendation } = require('../apps/analytics/src/recommendation/recommendation.rules');
      const result = buildRecommendation(['attendance_below_threshold', 'grade_below_threshold']);
      expect(result.type).toBe('urgent_intervention');
      expect(result.message).toContain('asistencia y calificación');
    });

    it('should generate teacher_alert for attendance only', () => {
      const { buildRecommendation } = require('../apps/analytics/src/recommendation/recommendation.rules');
      const result = buildRecommendation(['attendance_below_threshold']);
      expect(result.type).toBe('teacher_alert');
    });

    it('should generate differentiated_activity for grade only', () => {
      const { buildRecommendation } = require('../apps/analytics/src/recommendation/recommendation.rules');
      const result = buildRecommendation(['grade_below_threshold']);
      expect(result.type).toBe('differentiated_activity');
    });

    it('should generate suspicion_neurodivergence for neurodivergence reason', () => {
      const { buildRecommendation } = require('../apps/analytics/src/recommendation/recommendation.rules');
      const result = buildRecommendation(['suspicion_neurodivergence']);
      expect(result.type).toBe('neurodivergence_screening');
    });
  });

  describe('Risk Rules', () => {
    it('should return NONE when no risk factors', () => {
      const { calculateRiskLevel } = require('../apps/analytics/src/risk/risk.rules');
      const result = calculateRiskLevel({ attendanceRate: 0.95, avgGrade: 15 });
      expect(result.level).toBe('NONE');
      expect(result.reasons).toHaveLength(0);
    });

    it('should return LOW for mild attendance issue', () => {
      const { calculateRiskLevel } = require('../apps/analytics/src/risk/risk.rules');
      const result = calculateRiskLevel({ attendanceRate: 0.75, avgGrade: 15 });
      expect(result.level).toBe('LOW');
      expect(result.reasons).toContain('attendance_below_threshold');
    });

    it('should return MEDIUM for both attendance and grade issues', () => {
      const { calculateRiskLevel } = require('../apps/analytics/src/risk/risk.rules');
      const result = calculateRiskLevel({ attendanceRate: 0.75, avgGrade: 10 });
      expect(result.level).toBe('MEDIUM');
      expect(result.reasons).toHaveLength(2);
    });

    it('should return HIGH for critical issues', () => {
      const { calculateRiskLevel } = require('../apps/analytics/src/risk/risk.rules');
      const result = calculateRiskLevel({ attendanceRate: 0.5, avgGrade: 7 });
      expect(result.level).toBe('HIGH');
      expect(result.reasons).toHaveLength(2);
    });
  });
});
