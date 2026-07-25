import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3004),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  INTERNAL_API_KEY: Joi.string().required(),
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  SMTP_FROM: Joi.string().email().required(),
  FRONTEND_URL: Joi.string().uri().required(),
});
