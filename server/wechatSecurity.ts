import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const safeEqual = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

export function verifyWechatSignature(token: string, timestamp: string, nonce: string, signature: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed) || Math.abs(nowSeconds - parsed) > 300) return false;
  const expected = createHash('sha1').update([token, timestamp, nonce].sort().join('')).digest('hex');
  return safeEqual(expected, signature);
}

const xmlValue = (xml: string, tag: string) => {
  const match = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\\/${tag}>`));
  return match ? (match[1] ?? match[2] ?? '').trim() : '';
};

export function parseWechatTextMessage(xml: string) {
  if (xml.length > 65_536 || /<!DOCTYPE|<!ENTITY/i.test(xml)) return null;
  if (xmlValue(xml, 'MsgType') !== 'text') return null;
  const fromUserName = xmlValue(xml, 'FromUserName');
  const toUserName = xmlValue(xml, 'ToUserName');
  const content = xmlValue(xml, 'Content');
  const createTime = Number(xmlValue(xml, 'CreateTime'));
  if (!fromUserName || !toUserName || !content || !Number.isFinite(createTime)) return null;
  return { fromUserName, toUserName, content, createTime };
}

export function deriveUserId(openid: string, secret: string) {
  return `wx_${createHmac('sha256', secret).update(openid).digest('base64url').slice(0, 32)}`;
}

export async function signAppSession(userId: string, secret: string, expiresAt: number) {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export async function verifyAppSession(token: string, secret: string, now = Math.floor(Date.now() / 1000)) {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqual(expected, signature)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { userId?: unknown; expiresAt?: unknown };
    if (typeof parsed.userId !== 'string' || typeof parsed.expiresAt !== 'number' || parsed.expiresAt < now) return null;
    return { userId: parsed.userId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}
