import type { LoginSessionStore } from './loginSessionStore.js';

export class UpstashLoginSessionStore implements LoginSessionStore {
  constructor(private readonly url: string, private readonly token: string, private readonly fetcher: typeof fetch = fetch) {}
  private async command(parts: Array<string | number>) {
    const response = await this.fetcher(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(parts)
    });
    const result = await response.json() as { result?: unknown; error?: string };
    if (!response.ok || result.error) throw new Error('登录临时存储不可用');
    return result.result;
  }
  async get(key: string) { const value = await this.command(['GET', key]); return typeof value === 'string' ? value : null; }
  async set(key: string, value: string, ttlSeconds: number) { await this.command(['SET', key, value, 'EX', ttlSeconds]); }
  async delete(key: string) { await this.command(['DEL', key]); }
}

export const loginSessionStoreFromEnv = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('登录临时存储尚未配置');
  return new UpstashLoginSessionStore(url, token);
};
