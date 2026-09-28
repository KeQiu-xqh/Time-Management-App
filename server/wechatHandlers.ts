import type { LoginSessionService } from './loginSessionStore.js';
import { deriveUserId, parseWechatTextMessage, signAppSession, verifyAppSession, verifyWechatSignature } from './wechatSecurity.js';

const noStore = { 'Cache-Control': 'no-store' };
const json = (value: unknown, status = 200, headers?: HeadersInit) => Response.json(value, { status, headers: { ...noStore, ...headers } });

export async function createSessionResponse(service: LoginSessionService) {
  return json(await service.create(), 201);
}

export async function pollSessionResponse(request: Request, service: LoginSessionService, cookieSecret: string) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const secret = url.searchParams.get('secret') ?? '';
  const state = await service.poll(id, secret);
  if (state.status !== 'verified') return json({ status: state.status });
  const userId = await service.consume(id, secret);
  if (!userId) return json({ status: 'expired' });
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const token = await signAppSession(userId, cookieSecret, expiresAt);
  return json({ status: 'signed_in', userId }, 200, {
    'Set-Cookie': `planflow_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
  });
}

export async function meResponse(request: Request, cookieSecret: string) {
  const cookie = request.headers.get('Cookie') ?? '';
  const token = cookie.split(';').map(item => item.trim()).find(item => item.startsWith('planflow_session='))?.slice(17) ?? '';
  const session = await verifyAppSession(token, cookieSecret);
  return session ? json({ signedIn: true, userId: session.userId }) : json({ signedIn: false }, 401);
}

export const logoutResponse = () => json({ ok: true }, 200, {
  'Set-Cookie': 'planflow_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
});

const cdata = (value: string) => value.replace(/]]>/g, '');

export async function webhookResponse(
  request: Request,
  service: LoginSessionService,
  config: { token: string; userSecret: string }
) {
  const url = new URL(request.url);
  const timestamp = url.searchParams.get('timestamp') ?? '';
  const nonce = url.searchParams.get('nonce') ?? '';
  const signature = url.searchParams.get('signature') ?? '';
  if (!verifyWechatSignature(config.token, timestamp, nonce, signature)) return new Response('invalid signature', { status: 403 });
  if (request.method === 'GET') return new Response(url.searchParams.get('echostr') ?? '', { headers: noStore });
  const length = Number(request.headers.get('Content-Length') ?? '0');
  if (length > 65_536) return new Response('too large', { status: 413 });
  const message = parseWechatTextMessage(await request.text());
  if (!message) return new Response('success', { headers: noStore });
  const code = message.content.trim();
  const verified = /^\d{6}$/.test(code) && await service.verifyCode(code, deriveUserId(message.fromUserName, config.userSecret));
  const content = verified ? '登录成功，请返回网页继续。' : '验证码无效或已过期，请在网页重新获取。';
  const xml = `<xml><ToUserName><![CDATA[${cdata(message.fromUserName)}]]></ToUserName><FromUserName><![CDATA[${cdata(message.toUserName)}]]></FromUserName><CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${content}]]></Content></xml>`;
  return new Response(xml, { headers: { ...noStore, 'Content-Type': 'application/xml; charset=utf-8' } });
}
