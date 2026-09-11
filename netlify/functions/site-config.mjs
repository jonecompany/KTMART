import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const STORE = 'ktmart-admin';
const CURRENT = 'current';
const MAX_BYTES = 1_500_000;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
    'x-content-type-options': 'nosniff'
  }
});

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const actual = req.headers.get('x-admin-key') || '';
  if (!expected || !actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function cleanConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('설정 형식이 올바르지 않습니다.');
  const copy = JSON.parse(JSON.stringify(input));
  copy.savedAt = new Date().toISOString();
  copy.schemaVersion = 1;
  return copy;
}

export default async (req) => {
  const store = getStore({ name: STORE, consistency: 'strong' });

  if (req.method === 'GET') {
    const current = await store.get(CURRENT, { type: 'json', consistency: 'strong' });
    return json(current || {});
  }

  if (req.method !== 'POST') return json({ ok: false, message: 'Method not allowed' }, 405);
  if (!process.env.ADMIN_PASSWORD) return json({ ok: false, code: 'PASSWORD_NOT_SET', message: 'Netlify 환경변수 ADMIN_PASSWORD를 먼저 설정해주세요.' }, 503);
  if (!authorized(req)) return json({ ok: false, message: '관리자 비밀번호가 올바르지 않습니다.' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, message: '요청 형식이 올바르지 않습니다.' }, 400); }
  const action = body?.action || 'save';

  if (action === 'login') return json({ ok: true });

  if (action === 'save') {
    let config;
    try { config = cleanConfig(body.config); } catch (e) { return json({ ok: false, message: e.message }, 400); }
    const serialized = JSON.stringify(config);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_BYTES) return json({ ok: false, message: '설정 데이터가 너무 큽니다. 이미지 파일은 업로드 기능을 이용해주세요.' }, 413);

    const previous = await store.get(CURRENT, { type: 'json', consistency: 'strong' });
    if (previous && Object.keys(previous).length) {
      const backupKey = `backups/${Date.now()}`;
      await store.setJSON(backupKey, previous);
      const listed = await store.list({ prefix: 'backups/' });
      const keys = (listed.blobs || []).map(x => x.key).sort().reverse();
      await Promise.all(keys.slice(20).map(k => store.delete(k)));
    }
    await store.setJSON(CURRENT, config);
    return json({ ok: true, savedAt: config.savedAt });
  }

  if (action === 'reset') {
    const previous = await store.get(CURRENT, { type: 'json', consistency: 'strong' });
    if (previous && Object.keys(previous).length) await store.setJSON(`backups/${Date.now()}`, previous);
    await store.delete(CURRENT);
    return json({ ok: true });
  }

  if (action === 'backups') {
    const listed = await store.list({ prefix: 'backups/' });
    const backups = (listed.blobs || []).map(x => ({ key: x.key, time: Number(x.key.split('/')[1]) || 0 })).sort((a,b)=>b.time-a.time).slice(0,20);
    return json({ ok: true, backups });
  }

  if (action === 'restore') {
    const key = String(body.key || '');
    if (!/^backups\/\d+$/.test(key)) return json({ ok: false, message: '백업 키가 올바르지 않습니다.' }, 400);
    const backup = await store.get(key, { type: 'json', consistency: 'strong' });
    if (!backup) return json({ ok: false, message: '백업을 찾을 수 없습니다.' }, 404);
    const current = await store.get(CURRENT, { type: 'json', consistency: 'strong' });
    if (current) await store.setJSON(`backups/${Date.now()}`, current);
    backup.savedAt = new Date().toISOString();
    await store.setJSON(CURRENT, backup);
    return json({ ok: true, savedAt: backup.savedAt });
  }

  return json({ ok: false, message: '지원하지 않는 작업입니다.' }, 400);
};
