# WeChat Official-Account Code Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let mainland-China users sign in by scanning/following a WeChat official account and sending a one-time six-digit code, without storing schedule data in the login backend.

**Architecture:** Vercel Functions create five-minute login sessions in Upstash Redis, validate WeChat callback signatures, consume text codes once, and issue an HttpOnly signed session cookie. The React settings UI creates a login session and polls with a separate high-entropy poll secret; raw openids, verification codes, and secrets never reach the browser or logs.

**Tech Stack:** TypeScript, Vercel Node Functions, Web Crypto/Node crypto, Upstash Redis REST, React.

---

### Task 1: WeChat signature, safe XML parsing, and signed sessions

**Files:**
- Create: `server/wechatSecurity.ts`
- Test: `tests/wechatSecurity.test.mjs`

- [ ] Write failing tests for SHA-1 signature verification, stale timestamps, XML containing a normal text message, rejection of DOCTYPE/entity input, stable HMAC user IDs, signed cookie round-trip, tampered cookie rejection, and expiry.
- [ ] Run `node --import tsx --test tests/wechatSecurity.test.mjs`; expect failure because the module does not exist.
- [ ] Implement the following API. Use timing-safe comparison, reject callbacks outside a five-minute window, accept only the fields required from text messages, and never expose raw openid.

```ts
export function verifyWechatSignature(token: string, timestamp: string, nonce: string, signature: string, nowSeconds?: number): boolean;
export function parseWechatTextMessage(xml: string): { fromUserName: string; toUserName: string; content: string; createTime: number } | null;
export function deriveUserId(openid: string, secret: string): string;
export async function signAppSession(userId: string, secret: string, expiresAt: number): Promise<string>;
export async function verifyAppSession(token: string, secret: string, now?: number): Promise<{ userId: string; expiresAt: number } | null>;
```
- [ ] Run `npm test`; expect all tests to pass.
- [ ] Commit with `git commit -m "feat: add WeChat login security primitives"`.

### Task 2: Ephemeral login session store

**Files:**
- Create: `server/loginSessionStore.ts`
- Create: `server/upstashLoginSessionStore.ts`
- Test: `tests/loginSessionStore.test.mjs`

- [ ] Write failing contract tests covering five-minute TTL, poll-secret hashing, code lookup, pending-to-verified transition, one-time consumption, duplicate-code rejection, and expiry.
- [ ] Run `node --import tsx --test tests/loginSessionStore.test.mjs`; expect failure because the store does not exist.
- [ ] Define the following contract and implement the state machine in `LoginSessionService`. Add a memory adapter for tests and an Upstash REST adapter using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; all keys must have TTL and values must contain only hashes/status/pseudonymous user IDs.

```ts
export interface LoginSessionStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}
export class LoginSessionService {
  create(): Promise<{ sessionId: string; pollSecret: string; code: string; expiresAt: number }>;
  verifyCode(code: string, userId: string): Promise<boolean>;
  poll(sessionId: string, pollSecret: string): Promise<{ status: 'pending' | 'verified' | 'consumed' | 'expired'; userId?: string }>;
  consume(sessionId: string, pollSecret: string): Promise<string | null>;
}
```
- [ ] Run `npm test`; expect all tests to pass.
- [ ] Commit with `git commit -m "feat: add ephemeral WeChat login sessions"`.

### Task 3: Vercel login and webhook functions

**Files:**
- Create: `api/auth/wechat/session.ts`
- Create: `api/auth/wechat/status.ts`
- Create: `api/auth/wechat/me.ts`
- Create: `api/auth/wechat/logout.ts`
- Create: `api/wechat/webhook.ts`
- Test: `tests/wechatApi.test.mjs`

- [ ] Write failing handler tests for session creation, missing configuration, pending polling, verified cookie issuance, replay rejection, GET webhook verification, invalid signatures, non-text messages, and successful text-code verification.
- [ ] Run `node --import tsx --test tests/wechatApi.test.mjs`; expect failure because handlers do not exist.
- [ ] Implement Web `Request`/`Response` handlers with named HTTP exports and shared dependency factories:

```ts
export async function POST(request: Request): Promise<Response>;
export async function GET(request: Request): Promise<Response>;
```

Set `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`, return `Cache-Control: no-store`, cap callback bodies at 64 KiB, and return a minimal WeChat text response without logging message content.
- [ ] Run `npm test`; expect all tests to pass.
- [ ] Commit with `git commit -m "feat: add WeChat verification-code API"`.

### Task 4: WeChat login settings UI

**Files:**
- Create: `auth/useWechatLogin.ts`
- Create: `components/WechatLogin.tsx`
- Modify: `components/SettingsModal.tsx`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] Implement the following controller states. Create sessions on demand, poll every two seconds until success/expiry, stop polling when hidden or unmounted, and support logout.

```ts
export type WechatLoginStatus = 'unknown' | 'signed_out' | 'waiting' | 'signed_in' | 'error';
export interface WechatLoginController {
  status: WechatLoginStatus;
  code: string | null;
  expiresAt: number | null;
  userId: string | null;
  error: string | null;
  start(): Promise<void>;
  logout(): Promise<void>;
}
```
- [ ] Show the official-account QR image from `VITE_WECHAT_QR_URL`, the six-digit code, countdown, signed-in state, and actionable configuration/error text. Keep every touch target at least 44 px.
- [ ] Add these configuration names without values: `VITE_WECHAT_QR_URL`, `WECHAT_TOKEN`, `APP_USER_HMAC_SECRET`, `SESSION_COOKIE_SECRET`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`.
- [ ] Document the WeChat server callback URL, plaintext message mode requirement for v1, environment variables, five-minute TTL, no-SMS boundary, and free-quota fail-closed behavior.
- [ ] Run `npx tsc --noEmit`, `npm test`, `npm run build`, and `git diff --check`; expect all checks to pass.
- [ ] Commit with `git commit -m "feat: add WeChat official-account login UI"`.
