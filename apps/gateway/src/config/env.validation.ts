import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  GATEWAY_PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string().required(),
  RATE_LIMIT_MAX: Joi.number().default(100),
  AUTH_SERVICE_URL: Joi.string().uri().required(),
  USERS_SERVICE_URL: Joi.string().uri().required(),
  STORAGE_SERVICE_URL: Joi.string().uri().optional(),
  NOTIFICATIONS_SERVICE_URL: Joi.string().uri().optional(),
  REPORTS_SERVICE_URL: Joi.string().uri().optional(),
  CLASSROOM_SERVICE_URL: Joi.string().uri().optional(),
  ANALYTICS_SERVICE_URL: Joi.string().uri().optional(),
  AI_SERVICE_URL: Joi.string().uri().optional(),
  ACCESSIBILITY_SERVICE_URL: Joi.string().uri().optional(),
  DASHBOARD_SERVICE_URL: Joi.string().uri().optional(),
});
