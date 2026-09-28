import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlanSnapshot } from '../data/planSnapshot';
import { PlanRepository } from '../data/planRepository';
import { OneDriveProvider } from '../storage/onedriveProvider';
import { createOneDriveAuthorization, exchangeOneDriveCode } from '../storage/onedriveAuth';
import type { StorageProvider } from '../storage/provider';
import { StorageProviderError } from '../storage/provider';
import { WebDavProvider } from '../storage/webdavProvider';
import { runSync } from './engine';

export type SyncProviderType = 'none' | 'onedrive' | 'webdav';
export type SyncStatus = 'disconnected' | 'ready' | 'syncing' | 'synced' | 'offline' | 'reauthorize' | 'error';

const DEVICE_KEY = 'planflow_device_id';
const TOKEN_KEY = 'planflow_onedrive_access_token';
const TOKEN_EXPIRY_KEY = 'planflow_onedrive_token_expiry';
const OAUTH_STATE_KEY = 'planflow_onedrive_oauth_state';
const OAUTH_VERIFIER_KEY = 'planflow_onedrive_oauth_verifier';

const deviceId = () => {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
};

const clientId = () => import.meta.env.VITE_ONEDRIVE_CLIENT_ID?.trim() ?? '';
const redirectUri = () => import.meta.env.VITE_ONEDRIVE_REDIRECT_URI?.trim() || `${window.location.origin}${window.location.pathname}`;

export function useCloudSync(
  snapshot: PlanSnapshot,
  importSnapshot: (snapshot: PlanSnapshot) => Promise<void>
) {
  const repositoryRef = useRef(new PlanRepository());
  const snapshotRef = useRef(snapshot);
  const [providerType, setProviderType] = useState<SyncProviderType>(() => sessionStorage.getItem(TOKEN_KEY) ? 'onedrive' : 'none');
  const [status, setStatus] = useState<SyncStatus>('disconnected');
  const [passphrase, setPassphrase] = useState('');
  const [webdavEndpoint, setWebdavEndpoint] = useState('');
  const [webdavUsername, setWebdavUsername] = useState('');
  const [webdavPassword, setWebdavPassword] = useState('');
  const [webdavUseRelay, setWebdavUseRelay] = useState(false);
  const [oneDriveToken, setOneDriveToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [automatic, setAutomatic] = useState(false);
  const syncingRef = useRef(false);
  const lastSyncedFingerprintRef = useRef<string | null>(null);

  snapshotRef.current = snapshot;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state || !clientId()) return;
    const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY) ?? '';
    const verifier = sessionStorage.getItem(OAUTH_VERIFIER_KEY) ?? '';
    exchangeOneDriveCode({
      clientId: clientId(), redirectUri: redirectUri(), code, state, expectedState, verifier
    }).then(token => {
      sessionStorage.setItem(TOKEN_KEY, token.accessToken);
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(token.expiresAt));
      sessionStorage.removeItem(OAUTH_STATE_KEY);
      sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
      setOneDriveToken(token.accessToken);
      setProviderType('onedrive');
      setStatus('ready');
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, '', cleanUrl);
    }).catch(reason => {
      setError(reason instanceof Error ? reason.message : 'OneDrive 授权失败');
      setStatus('error');
    });
  }, []);

  const connectOneDrive = useCallback(async () => {
    if (!clientId()) {
      setError('尚未配置 VITE_ONEDRIVE_CLIENT_ID');
      setStatus('error');
      return;
    }
    const auth = await createOneDriveAuthorization({ clientId: clientId(), redirectUri: redirectUri() });
    sessionStorage.setItem(OAUTH_STATE_KEY, auth.state);
    sessionStorage.setItem(OAUTH_VERIFIER_KEY, auth.verifier);
    window.location.assign(auth.url);
  }, []);

  const provider = useCallback((): StorageProvider => {
    if (providerType === 'onedrive') {
      const expiry = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) ?? '0');
      if (!oneDriveToken || (expiry && Date.now() >= expiry)) {
        throw new StorageProviderError('authentication_required', 'OneDrive 会话已过期，请重新连接');
      }
      return new OneDriveProvider({ accessToken: oneDriveToken });
    }
    if (providerType === 'webdav') {
      if (!webdavEndpoint || !webdavUsername || !webdavPassword) {
        throw new StorageProviderError('invalid_configuration', '请填写完整的 WebDAV 地址、用户名和应用密码');
      }
      return new WebDavProvider({
        endpoint: webdavEndpoint,
        username: webdavUsername,
        appPassword: webdavPassword,
        useRelay: webdavUseRelay
      });
    }
    throw new StorageProviderError('invalid_configuration', '请先选择并连接同步存储');
  }, [oneDriveToken, providerType, webdavEndpoint, webdavPassword, webdavUseRelay, webdavUsername]);

  const syncNow = useCallback(async (skipFirstConfirmation = false) => {
    if (syncingRef.current) return;
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }
    if (!passphrase.trim()) {
      setError('请输入同步口令');
      setStatus('error');
      return;
    }
    syncingRef.current = true;
    setStatus('syncing');
    setError(null);
    try {
      const existing = await repositoryRef.current.loadSyncPayload();
      if (!existing && !skipFirstConfirmation && !window.confirm('首次同步会合并本机与网盘数据。请确认已经保存同步口令和本地备份。是否继续？')) {
        setStatus('ready');
        return;
      }
      const result = await runSync({
        snapshot: snapshotRef.current,
        payload: existing,
        deviceId: deviceId(),
        passphrase,
        provider: provider()
      });
      await repositoryRef.current.saveSyncPayload(result.payload);
      await importSnapshot(result.snapshot);
      lastSyncedFingerprintRef.current = JSON.stringify(result.snapshot);
      setLastSyncedAt(new Date().toLocaleString());
      setAutomatic(true);
      setStatus('synced');
    } catch (reason) {
      if (reason instanceof StorageProviderError && reason.code === 'authentication_required') setStatus('reauthorize');
      else if (!navigator.onLine) setStatus('offline');
      else setStatus('error');
      setError(reason instanceof Error ? reason.message : '同步失败');
    } finally {
      syncingRef.current = false;
    }
  }, [importSnapshot, passphrase, provider]);

  useEffect(() => {
    if (!automatic) return;
    if (JSON.stringify(snapshot) === lastSyncedFingerprintRef.current) return;
    const timer = window.setTimeout(() => { void syncNow(true); }, 2000);
    return () => window.clearTimeout(timer);
  }, [automatic, snapshot, syncNow]);

  useEffect(() => {
    const resume = () => { if (automatic) void syncNow(true); };
    const visible = () => { if (document.visibilityState === 'visible') resume(); };
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [automatic, syncNow]);

  const disconnect = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    setOneDriveToken('');
    setWebdavPassword('');
    setProviderType('none');
    setAutomatic(false);
    setStatus('disconnected');
    setError(null);
  }, []);

  return {
    providerType, setProviderType, status, passphrase, setPassphrase,
    webdavEndpoint, setWebdavEndpoint, webdavUsername, setWebdavUsername,
    webdavPassword, setWebdavPassword, webdavUseRelay, setWebdavUseRelay,
    oneDriveConfigured: Boolean(clientId()), oneDriveConnected: Boolean(oneDriveToken),
    connectOneDrive, disconnect, syncNow, lastSyncedAt, error
  };
}

export type CloudSyncController = ReturnType<typeof useCloudSync>;
