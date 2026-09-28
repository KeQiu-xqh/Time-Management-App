import { useCallback, useEffect, useState } from 'react';

export type WechatLoginStatus = 'unknown' | 'signed_out' | 'waiting' | 'signed_in' | 'unavailable' | 'error';

interface PendingSession { sessionId: string; pollSecret: string; code: string; expiresAt: number }

export function useWechatLogin() {
  const [status, setStatus] = useState<WechatLoginStatus>('unknown');
  const [pending, setPending] = useState<PendingSession | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/wechat/me', { credentials: 'include' })
      .then(async response => {
        if (response.status === 503) return { signedIn: false, unavailable: true };
        return response.ok ? response.json() : { signedIn: false };
      })
      .then(result => {
        if (result.signedIn) { setUserId(result.userId); setStatus('signed_in'); }
        else if (result.unavailable) setStatus('unavailable');
        else setStatus('signed_out');
      })
      .catch(() => setStatus('signed_out'));
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/auth/wechat/session', { method: 'POST', credentials: 'include' });
      const result = await response.json();
      if (response.status === 503) {
        setStatus('unavailable');
        return;
      }
      if (!response.ok) throw new Error(result.error || '无法创建微信登录验证码');
      setPending(result);
      setStatus('waiting');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '微信登录服务不可用');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (status !== 'waiting' || !pending) return;
    let active = true;
    const poll = async () => {
      if (!active || document.visibilityState !== 'visible') return;
      if (Date.now() >= pending.expiresAt * 1000) { setError('验证码已过期，请重新获取'); setStatus('error'); return; }
      try {
        const query = new URLSearchParams({ id: pending.sessionId, secret: pending.pollSecret });
        const response = await fetch(`/api/auth/wechat/status?${query}`, { credentials: 'include' });
        const result = await response.json();
        if (result.status === 'signed_in') { setUserId(result.userId); setPending(null); setStatus('signed_in'); }
        if (result.status === 'expired') { setError('验证码已过期，请重新获取'); setStatus('error'); }
      } catch { setError('网络不稳定，正在等待重试'); }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, [pending, status]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/wechat/logout', { method: 'POST', credentials: 'include' });
    setUserId(null); setPending(null); setError(null); setStatus('signed_out');
  }, []);

  return { status, code: pending?.code ?? null, expiresAt: pending?.expiresAt ?? null, userId, error, start, logout };
}

export type WechatLoginController = ReturnType<typeof useWechatLogin>;
