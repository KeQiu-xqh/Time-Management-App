import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertWebDavTarget, isPrivateAddress } from '../server/webdavTarget.ts';

test('private and local IP ranges are rejected', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.1.1', '192.168.1.1', '169.254.1.1', '::1', 'fc00::1', 'fe80::1']) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  assert.equal(isPrivateAddress('8.8.8.8'), false);
  assert.equal(isPrivateAddress('2606:4700:4700::1111'), false);
});

test('target validation requires HTTPS on port 443 and public DNS results', async () => {
  const publicResolver = async () => [{ address: '8.8.8.8', family: 4 }];
  const privateResolver = async () => [{ address: '10.0.0.2', family: 4 }];

  assert.equal((await assertWebDavTarget('https://dav.example.com/file', publicResolver)).hostname, 'dav.example.com');
  await assert.rejects(assertWebDavTarget('http://dav.example.com/file', publicResolver), /HTTPS/);
  await assert.rejects(assertWebDavTarget('https://dav.example.com:8443/file', publicResolver), /443/);
  await assert.rejects(assertWebDavTarget('https://localhost/file', publicResolver), /目标地址/);
  await assert.rejects(assertWebDavTarget('https://dav.example.com/file', privateResolver), /内网/);
});
