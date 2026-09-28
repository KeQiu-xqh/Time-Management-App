import type { SyncPayload } from './records';

const DEFAULT_ITERATIONS = 310_000;
const MIN_ITERATIONS = 1_000;

export interface EncryptionOptions {
  iterations?: number;
}

export interface EncryptedEnvelopeV1 {
  format: 'planflow-encrypted';
  version: 1;
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const validBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!value || !validBase64.test(value)) throw new Error('加密文件包含无效编码');
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const assertPassphrase = (passphrase: string) => {
  if (!passphrase.trim()) throw new Error('同步口令不能为空');
};

const assertIterations = (iterations: number) => {
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS) {
    throw new Error('PBKDF2 迭代次数不安全');
  }
};

const deriveKey = async (passphrase: string, salt: Uint8Array, iterations: number) => {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const isSyncPayload = (value: unknown): value is SyncPayload => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SyncPayload>;
  return candidate.schemaVersion === 1
    && Number.isFinite(candidate.clock)
    && Array.isArray(candidate.records);
};

const parseEnvelope = (bundle: string): EncryptedEnvelopeV1 => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bundle);
  } catch {
    throw new Error('加密文件格式无效');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('加密文件格式无效');
  const envelope = parsed as Partial<EncryptedEnvelopeV1>;
  if (envelope.format !== 'planflow-encrypted'
    || envelope.version !== 1
    || envelope.kdf !== 'PBKDF2-SHA-256'
    || typeof envelope.iterations !== 'number'
    || typeof envelope.salt !== 'string'
    || typeof envelope.iv !== 'string'
    || typeof envelope.ciphertext !== 'string') {
    throw new Error('不支持的加密文件版本');
  }
  assertIterations(envelope.iterations);
  return envelope as EncryptedEnvelopeV1;
};

export async function encryptPayload(
  payload: SyncPayload,
  passphrase: string,
  options: EncryptionOptions = {}
): Promise<string> {
  assertPassphrase(passphrase);
  if (!isSyncPayload(payload)) throw new Error('同步数据格式无效');
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  assertIterations(iterations);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const envelope: EncryptedEnvelopeV1 = {
    format: 'planflow-encrypted',
    version: 1,
    kdf: 'PBKDF2-SHA-256',
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  };
  return JSON.stringify(envelope);
}

export async function decryptPayload(bundle: string, passphrase: string): Promise<SyncPayload> {
  assertPassphrase(passphrase);
  const envelope = parseEnvelope(bundle);
  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  if (salt.byteLength !== 16 || iv.byteLength !== 12) throw new Error('加密文件参数无效');

  const key = await deriveKey(passphrase, salt, envelope.iterations);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      base64ToBytes(envelope.ciphertext)
    );
  } catch {
    throw new Error('同步口令错误或加密文件已损坏');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error('解密后的同步数据格式无效');
  }
  if (!isSyncPayload(payload)) throw new Error('不支持的同步数据版本');
  return payload;
}
