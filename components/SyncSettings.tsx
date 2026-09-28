import React from 'react';
import { Cloud, CloudOff, HardDrive, LogIn, LogOut, RefreshCw } from 'lucide-react';
import type { CloudSyncController } from '../sync/useCloudSync';

const statusText = {
  disconnected: '未连接', ready: '已连接，等待同步', syncing: '正在同步…', synced: '已同步',
  offline: '离线，稍后自动重试', reauthorize: '授权已过期', error: '同步失败'
};

export const SyncSettings: React.FC<{ sync: CloudSyncController }> = ({ sync }) => (
  <section>
    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
      <Cloud size={16} />账户与同步
    </h3>
    <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => sync.setProviderType('onedrive')} className={`rounded-xl border p-3 text-sm font-bold ${sync.providerType === 'onedrive' ? 'border-indigo-500 bg-white text-indigo-600' : 'border-gray-200 bg-white text-gray-500'}`}>OneDrive</button>
        <button onClick={() => sync.setProviderType('webdav')} className={`rounded-xl border p-3 text-sm font-bold ${sync.providerType === 'webdav' ? 'border-indigo-500 bg-white text-indigo-600' : 'border-gray-200 bg-white text-gray-500'}`}>WebDAV</button>
      </div>

      {sync.providerType === 'onedrive' && (
        <div className="space-y-2">
          {!sync.oneDriveConfigured && <p className="rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-700">站点尚未开通 OneDrive 同步。你仍可使用本地备份；开通方法见页面顶部的使用说明。</p>}
          <button onClick={() => void sync.connectOneDrive()} disabled={!sync.oneDriveConfigured} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            <LogIn size={16} />{sync.oneDriveConnected ? '重新授权 OneDrive' : '连接 OneDrive'}
          </button>
        </div>
      )}

      {sync.providerType === 'webdav' && (
        <div className="space-y-2">
          <input value={sync.webdavEndpoint} onChange={event => sync.setWebdavEndpoint(event.target.value)} placeholder="https://dav.example.com/path/planflow-sync-v1.bin" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm" />
          <input value={sync.webdavUsername} onChange={event => sync.setWebdavUsername(event.target.value)} placeholder="用户名" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm" />
          <input type="password" value={sync.webdavPassword} onChange={event => sync.setWebdavPassword(event.target.value)} placeholder="应用专用密码（不会保存）" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={sync.webdavUseRelay} onChange={event => sync.setWebdavUseRelay(event.target.checked)} />网盘不支持浏览器跨域时使用安全转发</label>
        </div>
      )}

      {sync.providerType !== 'none' && (
        <div className="space-y-2 border-t border-indigo-100 pt-3">
          <input type="password" value={sync.passphrase} onChange={event => sync.setPassphrase(event.target.value)} placeholder="同步加密口令（忘记后无法恢复）" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={() => void sync.syncNow()} disabled={sync.status === 'syncing'} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><RefreshCw size={16} className={sync.status === 'syncing' ? 'animate-spin' : ''} />立即同步</button>
            <button aria-label="断开同步" onClick={sync.disconnect} className="rounded-xl border border-gray-200 bg-white px-3 text-gray-500"><LogOut size={16} /></button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500">
        {sync.status === 'offline' || sync.status === 'error' ? <CloudOff size={14} /> : <HardDrive size={14} />}
        <span>{statusText[sync.status]}{sync.lastSyncedAt ? ` · ${sync.lastSyncedAt}` : ''}</span>
      </div>
      {sync.error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{sync.error}</p>}
    </div>
  </section>
);
