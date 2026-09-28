import { createHmac, randomBytes, randomInt, randomUUID } from 'node:crypto';

export interface LoginSessionStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

interface StoredValue { value: string; expiresAt: number }

export class MemoryLoginSessionStore implements LoginSessionStore {
  private values = new Map<string, StoredValue>();
  constructor(private readonly now: () => number = () => Math.floor(Date.now() / 1000)) {}
  async get(key: string) {
    const item = this.values.get(key);
    if (!item || item.expiresAt <= this.now()) { this.values.delete(key); return null; }
    return item.value;
  }
  async set(key: string, value: string, ttlSeconds: number) { this.values.set(key, { value, expiresAt: this.now() + ttlSeconds }); }
  async delete(key: string) { this.values.delete(key); }
}

type SessionState = { status: 'pending' | 'verified' | 'consumed'; pollHash: string; expiresAt: number; userId?: string };

export class LoginSessionService {
  private readonly ttl = 300;
  constructor(private readonly store: LoginSessionStore, private readonly secret: string, private readonly now: () => number = () => Math.floor(Date.now() / 1000)) {}
  private hash(value: string) { return createHmac('sha256', this.secret).update(value).digest('base64url'); }
  async create() {
    const sessionId = randomUUID();
    const pollSecret = randomBytes(32).toString('base64url');
    let code = '';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = String(randomInt(100000, 1000000));
      if (!await this.store.get(`code:${this.hash(candidate)}`)) { code = candidate; break; }
    }
    if (!code) throw new Error('暂时无法生成登录验证码');
    const expiresAt = this.now() + this.ttl;
    const session: SessionState = { status: 'pending', pollHash: this.hash(pollSecret), expiresAt };
    await this.store.set(`session:${sessionId}`, JSON.stringify(session), this.ttl);
    await this.store.set(`code:${this.hash(code)}`, sessionId, this.ttl);
    return { sessionId, pollSecret, code, expiresAt };
  }
  private async session(sessionId: string): Promise<SessionState | null> {
    const raw = await this.store.get(`session:${sessionId}`);
    if (!raw) return null;
    try { return JSON.parse(raw) as SessionState; } catch { return null; }
  }
  async verifyCode(code: string, userId: string) {
    const codeKey = `code:${this.hash(code.trim())}`;
    const sessionId = await this.store.get(codeKey);
    if (!sessionId) return false;
    const session = await this.session(sessionId);
    if (!session || session.status !== 'pending' || session.expiresAt <= this.now()) return false;
    session.status = 'verified'; session.userId = userId;
    await this.store.set(`session:${sessionId}`, JSON.stringify(session), Math.max(1, session.expiresAt - this.now()));
    await this.store.delete(codeKey);
    return true;
  }
  async poll(sessionId: string, pollSecret: string) {
    const session = await this.session(sessionId);
    if (!session || session.expiresAt <= this.now() || session.pollHash !== this.hash(pollSecret)) return { status: 'expired' as const };
    return session.userId ? { status: session.status, userId: session.userId } : { status: session.status };
  }
  async consume(sessionId: string, pollSecret: string) {
    const session = await this.session(sessionId);
    if (!session || session.status !== 'verified' || !session.userId || session.pollHash !== this.hash(pollSecret)) return null;
    session.status = 'consumed';
    await this.store.set(`session:${sessionId}`, JSON.stringify(session), Math.max(1, session.expiresAt - this.now()));
    return session.userId;
  }
}
