import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DASHBOARD_PORT: Joi.number().default(3010),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  INTERNAL_API_KEY: Joi.string().required(),
  CLASSROOM_SERVICE_INTERNAL_URL: Joi.string().uri().required(),
  ANALYTICS_SERVICE_INTERNAL_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
});
