import * as Joi from 'joi';

export const varsSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  PORT: Joi.number().port().default(5000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  CORS_ORIGINS: Joi.string().required(),
  API_PREFIX: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
});
