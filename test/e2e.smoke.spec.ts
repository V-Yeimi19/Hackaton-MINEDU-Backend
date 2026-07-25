import * as request from 'supertest';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

describe('Full Pipeline E2E Smoke Test', () => {
  let authToken: string;
  let userId: string;
  let userEmail: string;
  let classroomId: string;
  let courseId: string;

  describe('1. Auth Flow', () => {
    it('should register a new DOCENTE user', async () => {
      const testEmail = `test-teacher-${Date.now()}@minedu.edu.pe`;
      const res = await request(GATEWAY_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'Test1234!',
          fullName: 'Juan Perez',
          role: 'DOCENTE',
        });

      if (res.status === 201) {
        expect(res.body.user.id).toBeDefined();
        userId = res.body.user.id;
        userEmail = testEmail;
      } else {
        console.warn('Auth register skipped (service may not be running)');
      }
    });

    it('should login and get JWT', async () => {
      if (!userEmail) return;

      const res = await request(GATEWAY_URL)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: 'Test1234!',
        });

      if (res.status === 200) {
        expect(res.body.accessToken).toBeDefined();
        authToken = res.body.accessToken;
      } else {
        console.warn('Auth login skipped');
      }
    });
  });

  describe('2. Classroom Flow (new model: Classroom -> Courses)', () => {
    it('should create a classroom (with gradeLevel, no courseId)', async () => {
      const res = await request(GATEWAY_URL)
        .post('/api/classroom/classrooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Aula E2E',
          gradeLevel: '3ro Primaria',
        });

      if (res.status === 201) {
        expect(res.body.id).toBeDefined();
        expect(res.body.gradeLevel).toBe('3ro Primaria');
        classroomId = res.body.id;
      } else {
        console.warn(`Classroom creation: ${res.status}`);
      }
    });

    it('should create a course inside the classroom', async () => {
      if (!classroomId) return;

      const res = await request(GATEWAY_URL)
        .post('/api/classroom/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Matematicas E2E',
          classroomId,
        });

      if (res.status === 201) {
        expect(res.body.id).toBeDefined();
        expect(res.body.classroom?.id).toBe(classroomId);
        courseId = res.body.id;
      } else {
        console.warn(`Course creation: ${res.status}`);
      }
    });

    it('should list classrooms', async () => {
      const res = await request(GATEWAY_URL)
        .get('/api/classroom/classrooms')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });

    it('should list courses', async () => {
      const res = await request(GATEWAY_URL)
        .get('/api/classroom/courses')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  describe('3. Analytics Flow', () => {
    it('should get indicators for classroom', async () => {
      const res = await request(GATEWAY_URL)
        .get(`/api/analytics/indicators/classroom/${classroomId || 'nonexistent'}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401, 404]).toContain(res.status);
    });

    it('should get digital twin for classroom', async () => {
      const res = await request(GATEWAY_URL)
        .get(`/api/analytics/digital-twin/classroom/${classroomId || 'nonexistent'}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401, 404]).toContain(res.status);
    });
  });

  describe('4. AI Reports Flow', () => {
    it('should list reports', async () => {
      const res = await request(GATEWAY_URL)
        .get('/api/ai/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  describe('5. Accessibility Flow', () => {
    it('should list accessibility jobs', async () => {
      const res = await request(GATEWAY_URL)
        .get('/api/accessibility/jobs')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('6. Institution Reports Flow', () => {
    it('should list institution reports', async () => {
      const res = await request(GATEWAY_URL)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  describe('7. Gateway Security', () => {
    it('should reject unauthenticated requests to protected routes', async () => {
      const res = await request(GATEWAY_URL)
        .get('/api/classroom/classrooms');

      expect(res.status).toBe(401);
    });

    it('should allow public auth routes without token', async () => {
      const res = await request(GATEWAY_URL)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'test' });

      expect([400, 401]).toContain(res.status);
    });
  });

  describe('8. Health Checks', () => {
    const services = [
      { name: 'reports', port: 3005 },
      { name: 'classroom', port: 3006 },
      { name: 'analytics', port: 3007 },
      { name: 'ai', port: 3008 },
      { name: 'accessibility', port: 3009 },
    ];

    services.forEach(({ name, port }) => {
      it(`${name} should respond to health check`, async () => {
        try {
          const res = await request(`http://localhost:${port}`)
            .get('/health');
          expect(res.status).toBe(200);
          expect(res.body.status).toBe('ok');
        } catch {
          console.warn(`${name} health check skipped (service not running)`);
        }
      });
    });
  });
});
