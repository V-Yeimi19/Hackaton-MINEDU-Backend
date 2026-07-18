import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  USERS_PORT: Joi.number().default(3002),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  INTERNAL_API_KEY: Joi.string().required(),
});
