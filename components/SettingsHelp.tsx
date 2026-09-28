import React, { useState } from 'react';
import { Cloud, Database, HelpCircle, MessageCircle, ShieldCheck, X } from 'lucide-react';

export const SettingsHelp: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/70 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800">账号与数据使用说明</p>
          <p className="mt-1 text-xs text-gray-500">第一次使用同步前，建议先阅读。</p>
        </div>
        <button
          type="button"
          aria-label={open ? '收起使用说明' : '打开使用说明'}
          aria-expanded={open}
          aria-controls="settings-help-panel"
          onClick={() => setOpen(value => !value)}
          className="grid h-10 w-10 flex-none place-items-center rounded-full border border-indigo-200 bg-white text-indigo-600 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {open ? <X size={18} /> : <HelpCircle size={20} />}
        </button>
      </div>

      {open && (
        <div id="settings-help-panel" className="absolute inset-x-0 top-[calc(100%+8px)] z-30 max-h-[calc(100dvh-160px)] space-y-3 overflow-y-auto rounded-2xl border border-indigo-100 bg-white p-4 text-xs leading-5 text-gray-600 shadow-2xl shadow-indigo-200/50">
          <article className="flex gap-3 rounded-xl bg-white/90 p-3 ring-1 ring-gray-100">
            <Database className="mt-0.5 flex-none text-indigo-500" size={17} />
            <div><h4 className="font-bold text-gray-800">本地保存与备份</h4><p>日程默认保存在当前浏览器中。清除浏览器数据或更换设备前，请先导出备份；“恢复备份”会覆盖当前数据。</p></div>
          </article>
          <article className="flex gap-3 rounded-xl bg-white/90 p-3 ring-1 ring-gray-100">
            <Cloud className="mt-0.5 flex-none text-blue-500" size={17} />
            <div><h4 className="font-bold text-gray-800">跨端同步</h4><p>可选择 OneDrive 或自己的 WebDAV。两端必须输入完全相同的同步加密口令；口令不会上传，也无法找回。首次同步前请先导出备份。</p></div>
          </article>
          <article className="flex gap-3 rounded-xl bg-white/90 p-3 ring-1 ring-gray-100">
            <MessageCircle className="mt-0.5 flex-none text-emerald-500" size={17} />
            <div><h4 className="font-bold text-gray-800">微信登录</h4><p>站点开通后，点击登录、扫描公众号二维码并把页面显示的验证码发送给公众号。登录仅用于识别账户，日程正文仍由同步口令加密。</p></div>
          </article>
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-800"><ShieldCheck className="mt-0.5 flex-none" size={15} />OneDrive 和微信显示“尚未开通”时，需要站点管理员完成对应平台配置；这不是你的浏览器故障。</p>
        </div>
      )}
    </section>
  );
};
