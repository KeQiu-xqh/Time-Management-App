import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

export interface ResolvedAddress {
  address: string;
  family: number;
}

export type AddressResolver = (hostname: string) => Promise<ResolvedAddress[]>;

export function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0];
  if (normalized.startsWith('::ffff:')) return isPrivateAddress(normalized.slice(7));
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split('.').map(Number);
    return a === 0
      || a === 10
      || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  if (isIP(normalized) === 6) {
    return normalized === '::'
      || normalized === '::1'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || /^fe[89ab]/.test(normalized);
  }
  return true;
}

const defaultResolver: AddressResolver = async hostname => lookup(hostname, { all: true, verbatim: true });

export async function assertWebDavTarget(value: string, resolve: AddressResolver = defaultResolver): Promise<URL> {
  let target: URL;
  try {
    target = new URL(value);
  } catch {
    throw new Error('WebDAV 目标地址无效');
  }
  if (target.protocol !== 'https:') throw new Error('WebDAV 目标必须使用 HTTPS');
  if (target.port && target.port !== '443') throw new Error('WebDAV 安全转发只允许 443 端口');
  if (target.username || target.password) throw new Error('WebDAV 目标地址不能包含凭据');
  const literalIp = isIP(target.hostname) !== 0;
  if (target.hostname.toLowerCase() === 'localhost' || (literalIp && isPrivateAddress(target.hostname))) {
    throw new Error('WebDAV 目标地址不允许访问本机或内网');
  }
  const addresses = await resolve(target.hostname);
  if (addresses.length === 0 || addresses.some(item => isPrivateAddress(item.address))) {
    throw new Error('WebDAV 域名解析到了内网地址');
  }
  return target;
}
