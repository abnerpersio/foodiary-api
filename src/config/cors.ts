import { Env } from './env';

export const corsConfig = {
  origins: Env.allowedOrigins,
  headers: 'Content-Type,Authorization',
  methods: 'GET,POST,PUT,PATCH,OPTIONS,DELETE',
};
