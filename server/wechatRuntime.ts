import { LoginSessionService } from './loginSessionStore.js';
import { loginSessionStoreFromEnv } from './upstashLoginSessionStore.js';

export const runtime = () => {
  const hashSecret = process.env.LOGIN_CODE_HMAC_SECRET || process.env.APP_USER_HMAC_SECRET;
  if (!hashSecret) throw new Error('登录验证码密钥尚未配置');
  return new LoginSessionService(loginSessionStoreFromEnv(), hashSecret);
};

export const requiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 尚未配置`);
  return value;
};

export const unavailable = (error: unknown) => Response.json(
  { error: error instanceof Error ? error.message : '登录服务不可用' },
  { status: 503, headers: { 'Cache-Control': 'no-store' } }
);
