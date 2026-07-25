import * as jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'dev-secret-change-me';

export function generateTestToken(payload: {
  sub: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });
}

export const TEST_TOKENS = {
  admin: generateTestToken({ sub: 'test-admin-id', email: 'admin@test.com', role: 'ADMIN' }),
  docente: generateTestToken({ sub: 'test-teacher-id', email: 'teacher@test.com', role: 'DOCENTE' }),
  directivo: generateTestToken({ sub: 'test-directivo-id', email: 'directivo@test.com', role: 'DIRECTIVO' }),
  familiar: generateTestToken({ sub: 'test-familiar-id', email: 'familiar@test.com', role: 'FAMILIAR' }),
};

export const TEST_INTERNAL_KEY = 'dev-internal-key';
