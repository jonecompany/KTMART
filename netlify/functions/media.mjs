import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const STORE = 'ktmart-media';
const MAX_BYTES = 3_000_000;
const allowed = new Set(['image/jpeg','image/png','image/webp']);
const json = (data, status=200) => new Response(JSON.stringify(data), { status, headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store'} });

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const actual = req.headers.get('x-admin-key') || '';
  if (!expected || !actual) return false;
  const a=Buffer.from(actual), b=Buffer.from(expected);
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}

export default async (req) => {
  const store = getStore({ name: STORE, consistency: 'strong' });
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const id = url.searchParams.get('id') || '';
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) return new Response('Not found', { status: 404 });
    const entry = await store.getWithMetadata(id, { type: 'arrayBuffer', consistency: 'strong' });
    if (!entry?.data) return new Response('Not found', { status: 404 });
    return new Response(entry.data, {
      status: 200,
      headers: {
        'content-type': entry.metadata?.contentType || 'image/jpeg',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff'
      }
    });
  }

  if (req.method !== 'POST') return json({ ok:false, message:'Method not allowed' },405);
  if (!process.env.ADMIN_PASSWORD) return json({ ok:false, code:'PASSWORD_NOT_SET', message:'Netlify 환경변수 ADMIN_PASSWORD를 먼저 설정해주세요.' },503);
  if (!authorized(req)) return json({ ok:false, message:'관리자 비밀번호가 올바르지 않습니다.' },401);

  let body; try { body=await req.json(); } catch { return json({ok:false,message:'요청 형식 오류'},400); }
  const type=String(body.type||'image/jpeg');
  if(!allowed.has(type)) return json({ok:false,message:'JPG, PNG, WEBP 이미지만 가능합니다.'},400);
  const base64=String(body.base64||'').replace(/^data:[^;]+;base64,/, '');
  let buf; try { buf=Buffer.from(base64,'base64'); } catch { return json({ok:false,message:'이미지 데이터 오류'},400); }
  if(!buf.length || buf.length>MAX_BYTES) return json({ok:false,message:'이미지는 3MB 이하로 업로드해주세요.'},413);
  const ext=type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
  const id=`${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await store.set(id, buf, { metadata:{ contentType:type, originalName:String(body.name||'image').slice(0,160), uploadedAt:new Date().toISOString() } });
  return json({ok:true,id,url:`/.netlify/functions/media?id=${encodeURIComponent(id)}`});
};
