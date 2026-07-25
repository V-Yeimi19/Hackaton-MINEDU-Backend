import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  ACCESSIBILITY_PORT: Joi.number().default(3009),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  INTERNAL_API_KEY: Joi.string().required(),
  GROQ_API_KEY: Joi.string().required(),
  STORAGE_SERVICE_INTERNAL_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
});
