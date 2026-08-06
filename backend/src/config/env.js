import 'dotenv/config';

const env = {
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',

  // OpenRouteService
  ORS_API_KEY: process.env.ORS_API_KEY || '',
  ORS_BASE_URL: process.env.ORS_BASE_URL || 'https://api.openrouteservice.org',

  // AI Service
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',

  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',

  // Dispatch
  DISPATCH_RADIUS_KM: parseInt(process.env.DISPATCH_RADIUS_KM || '5', 10),
  GPS_FLUSH_INTERVAL_SEC: parseInt(process.env.GPS_FLUSH_INTERVAL_SEC || '60', 10),
  ROUTE_CACHE_TTL_SEC: parseInt(process.env.ROUTE_CACHE_TTL_SEC || '86400', 10),
};

export default env;
