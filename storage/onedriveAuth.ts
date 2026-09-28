const AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const SCOPES = 'openid profile offline_access Files.ReadWrite.AppFolder';

type FetchBoundary = typeof fetch;

const base64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const randomToken = (bytes = 32) => base64Url(crypto.getRandomValues(new Uint8Array(bytes)));

export interface OneDriveAuthorizationOptions {
  clientId: string;
  redirectUri: string;
  state?: string;
  verifier?: string;
}

export async function createOneDriveAuthorization(options: OneDriveAuthorizationOptions) {
  if (!options.clientId.trim()) throw new Error('缺少 OneDrive Client ID');
  const state = options.state ?? randomToken();
  const verifier = options.verifier ?? randomToken(48);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: options.clientId,
    response_type: 'code',
    redirect_uri: options.redirectUri,
    response_mode: 'query',
    scope: SCOPES,
    state,
    code_challenge: base64Url(new Uint8Array(digest)),
    code_challenge_method: 'S256'
  }).toString();
  return { url: url.toString(), state, verifier };
}

export interface OneDriveToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface ExchangeCodeOptions {
  clientId: string;
  redirectUri: string;
  code: string;
  state: string;
  expectedState: string;
  verifier: string;
  fetch?: FetchBoundary;
}

export async function exchangeOneDriveCode(options: ExchangeCodeOptions): Promise<OneDriveToken> {
  if (!options.state || options.state !== options.expectedState) throw new Error('OneDrive 登录状态校验失败');
  const fetcher = options.fetch ?? fetch;
  const body = new URLSearchParams({
    client_id: options.clientId,
    grant_type: 'authorization_code',
    code: options.code,
    redirect_uri: options.redirectUri,
    code_verifier: options.verifier,
    scope: SCOPES
  });
  const response = await fetcher(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok || typeof result.access_token !== 'string') {
    throw new Error(typeof result.error_description === 'string' ? result.error_description : 'OneDrive 授权失败');
  }
  return {
    accessToken: result.access_token,
    refreshToken: typeof result.refresh_token === 'string' ? result.refresh_token : undefined,
    expiresAt: Date.now() + (typeof result.expires_in === 'number' ? result.expires_in : 3600) * 1000
  };
}
