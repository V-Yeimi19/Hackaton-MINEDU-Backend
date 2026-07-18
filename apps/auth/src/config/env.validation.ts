import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  AUTH_PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.number().default(86400),
  USERS_SERVICE_INTERNAL_URL: Joi.string().uri().required(),
  INTERNAL_API_KEY: Joi.string().required(),
});
