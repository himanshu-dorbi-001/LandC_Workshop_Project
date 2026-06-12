import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT:            parseInt(process.env.PORT || '3000', 10),
  NODE_ENV:        process.env.NODE_ENV || 'development',
  DB_HOST:         process.env.DB_HOST || 'localhost',
  DB_PORT:         parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER:         process.env.DB_USER || 'root',
  DB_PASSWORD:     process.env.DB_PASSWORD || '',
  DB_NAME:         process.env.DB_NAME || 'prm_tool',
  JWT_SECRET:      process.env.JWT_SECRET || 'fallback_secret',
  JWT_EXPIRES_IN:  process.env.JWT_EXPIRES_IN || '8h',
  GEMMA_API_URL:   process.env.GEMMA_API_URL || 'http://164.52.211.238/api/generate',
  GEMMA_MODEL:     process.env.GEMMA_MODEL   || 'gemma3:12b-it-q8_0',
  SMTP_HOST:       process.env.SMTP_HOST     || 'smtp.gmail.com',
  SMTP_PORT:       parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE:     process.env.SMTP_SECURE   === 'true',
  SMTP_USER:       process.env.SMTP_USER     || '',
  SMTP_PASS:       process.env.SMTP_PASS     || '',
  EMAIL_FROM:      process.env.EMAIL_FROM    || 'PRM Tool <noreply@prm-tool.local>',
} as const;
