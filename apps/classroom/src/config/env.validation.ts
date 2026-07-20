import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  CLASSROOM_PORT: Joi.number().default(3006),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
});
