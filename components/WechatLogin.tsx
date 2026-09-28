import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, MessageCircle } from 'lucide-react';
import type { WechatLoginController } from '../auth/useWechatLogin';

export const WechatLogin: React.FC<{ login: WechatLoginController }> = ({ login }) => {
  const [, refresh] = useState(0);
  useEffect(() => {
    if (login.status !== 'waiting') return;
    const timer = window.setInterval(() => refresh(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [login.status]);
  const seconds = login.expiresAt ? Math.max(0, login.expiresAt - Math.floor(Date.now() / 1000)) : 0;
  const qrUrl = import.meta.env.VITE_WECHAT_QR_URL?.trim();

  return (
    <section>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500"><MessageCircle size={16} />微信账户</h3>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        {login.status === 'signed_in' ? (
          <div className="flex items-center justify-between gap-3">
            <div><p className="font-bold text-emerald-800">微信已登录</p><p className="text-xs text-emerald-600">账户 {login.userId?.slice(-8)}</p></div>
            <button onClick={() => void login.logout()} className="flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-bold text-emerald-700"><LogOut size={16} />退出</button>
          </div>
        ) : login.status === 'waiting' ? (
          <div className="text-center">
            {qrUrl ? <img src={qrUrl} alt="微信公众号二维码" className="mx-auto mb-3 h-36 w-36 rounded-xl bg-white object-contain p-2 shadow-sm" /> : <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">尚未配置公众号二维码 VITE_WECHAT_QR_URL</p>}
            <p className="text-xs text-gray-500">关注公众号后发送验证码</p>
            <p className="my-2 font-mono text-3xl font-black tracking-[0.25em] text-emerald-700">{login.code}</p>
            <p className="text-xs text-gray-400">{seconds} 秒后失效</p>
          </div>
        ) : (
          <button onClick={() => void login.start()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#07C160] px-4 text-sm font-bold text-white"><LogIn size={17} />微信扫码登录</button>
        )}
        {login.error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">{login.error}</p>}
      </div>
    </section>
  );
};
