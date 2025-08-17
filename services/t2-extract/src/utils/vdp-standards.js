/**
 * VDP Standards Enforcement Utility
 * Ensures all VDP files have required fields before storage
 * Prevents null/undefined values in critical BigQuery fields
 */

export function enforceVdpStandards(vdp, reqBody, opts = {}) {
  const out = {...(vdp || {})};
  
  // 1) content_id 확보 - 다중 소스에서 추출
  const fromMeta = reqBody?.meta?.content_id || reqBody?.content_id || reqBody?.contentId;
  const fromVdp  = out.content_id || out.video_id;
  const fromUrl  = (reqBody?.canonical_url || reqBody?.source_url || reqBody?.url || '')
                   .match(/[?&]v=([A-Za-z0-9_-]{6,})|shorts\/([A-Za-z0-9_-]{6,})/);
  const fromUrlId = (fromUrl && (fromUrl[1] || fromUrl[2])) || null;

  out.content_id = fromMeta || fromVdp || fromUrlId || 'unknown';

  // 2) platform 정규화 - YouTube Shorts → youtube 등
  const platRaw = reqBody?.meta?.platform || reqBody?.platform || out?.metadata?.platform || 'unknown';
  const normalized = String(platRaw).toLowerCase();
  const display = (normalized === 'youtube shorts' ? 'youtube' : normalized);
  out.metadata = {...(out.metadata || {}), platform: display};

  // 3) content_key 생성 - 글로벌 유니크 키
  out.content_key = out.content_key || `${display}:${out.content_id}`;

  // 4) 로드 타임스탬프/날짜 - BigQuery 파티셔닝용
  const ts = new Date().toISOString();
  out.load_timestamp = out.load_timestamp || ts;
  out.load_date = out.load_date || ts.substring(0,10);

  return out;
}