import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  ANALYTICS_PORT: Joi.number().default(3007),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
});
