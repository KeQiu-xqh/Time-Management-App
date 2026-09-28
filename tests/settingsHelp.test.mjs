import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('settings expose an accessible collapsible usage guide', async () => {
  const [settings, help] = await Promise.all([
    read('../components/SettingsModal.tsx'),
    read('../components/SettingsHelp.tsx').catch(() => ''),
  ]);

  assert.match(settings, /<SettingsHelp\s*\/\s*>/);
  assert.match(help, /aria-expanded=/);
  assert.match(help, /aria-controls="settings-help-panel"/);
  assert.match(help, /本地保存与备份/);
  assert.match(help, /跨端同步/);
  assert.match(help, /微信登录/);
  assert.match(help, /同步加密口令/);
  assert.match(help, /settings-help-panel[^>]*className="[^"]*absolute[^"]*z-30/);
});

test('account UI does not expose deployment variable names to end users', async () => {
  const [sync, wechat] = await Promise.all([
    read('../components/SyncSettings.tsx'),
    read('../components/WechatLogin.tsx'),
  ]);

  assert.doesNotMatch(sync, /部署环境尚未配置 VITE_ONEDRIVE_CLIENT_ID/);
  assert.doesNotMatch(wechat, /尚未配置公众号二维码 VITE_WECHAT_QR_URL/);
  assert.match(sync, /站点尚未开通 OneDrive 同步/);
  assert.match(wechat, /站点尚未开通微信登录/);
});
