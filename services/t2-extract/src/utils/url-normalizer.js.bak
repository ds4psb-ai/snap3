// url-normalizer.js
import { parse as parseUrl } from 'node:url';

const YT_ID = /([A-Za-z0-9_-]{11})/; // YouTube 11-char ID (Google 문서 근거)
const IG_CODE = /([A-Za-z0-9_-]+)/;   // Instagram shortcode (reel/p/tv 경로)
const TT_ID = /(\d{8,26})/;           // TikTok numeric video id (자릿수 유연)

async function expandIfShort(url, maxHops = 5) {
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(current, { method: 'GET', redirect: 'manual' });
    // 3xx면 Location 따라감
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = new URL(res.headers.get('location'), current).toString();
      current = next;
      continue;
    }
    break;
  }
  return current;
}

export async function normalizeSocialUrl(input) {
  if (!input || typeof input !== 'string') throw new Error('URL이 비어있습니다');
  let url = input.trim();
  const lower = url.toLowerCase();

  // 1) TikTok 단축링크면 확장
  if (/(?:^|\.)tiktok\.com\/(vm|vt)\//i.test(lower)) {
    url = await expandIfShort(url); // HTTP 리다이렉트로 최종 URL 확보
  }

  const u = new URL(url);
  const host = u.hostname.toLowerCase();
  const path = u.pathname.replace(/\/+$/, '');     // 끝 슬래시 제거
  const qs = u.searchParams;

  // 2) TikTok
  if (host.includes('tiktok.com')) {
    // 형식 A: /@username/video/{id}
    let m = path.match(/\/@[^/]+\/video\/(\d+)/);
    // 형식 B: ?item_id={id}
    if (!m) m = qs.get('item_id') ? [null, qs.get('item_id')] : null;
    // 형식 C: /embed/{id}, /v/{id}.html 등
    if (!m) m = path.match(/\/embed\/(\d+)/);
    if (!m) m = path.match(/\/v\/(\d+)\.html/);

    if (!m || !m[1] || !TT_ID.test(m[1])) {
      throw new Error('유효한 TikTok 영상 ID를 찾지 못했습니다');
    }
    const id = m[1];

    // username은 최종 URL에서만 신뢰 (있으면 반영)
    const user = (path.match(/\/@([^/]+)\/video\//) || [])[1] || null;
    const canonicalUrl = user
      ? `https://www.tiktok.com/@${user}/video/${id}`
      : `https://www.tiktok.com/@tiktok/video/${id}`; // 사용자명 미확정 시 대체 포맷

    return {
      platform: 'tiktok',
      id,
      canonicalUrl,
      originalUrl: input,
      expandedUrl: url
    };
  }

  // 3) Instagram (reel/p/tv만 인정)
  if (host.includes('instagram.com')) {
    let type = null, code = null;
    const reel = path.match(/\/reel\/([A-Za-z0-9_-]+)/);
    const post = path.match(/\/p\/([A-Za-z0-9_-]+)/);
    const tv   = path.match(/\/tv\/([A-Za-z0-9_-]+)/);
    if (reel) { type = 'reel'; code = reel[1]; }
    else if (post) { type = 'p'; code = post[1]; }
    else if (tv) { type = 'tv'; code = tv[1]; }

    if (!code || !IG_CODE.test(code)) {
      throw new Error('유효한 Instagram 미디어 코드를 찾지 못했습니다');
    }

    // 정책: Reels면 /reel/{code}/ 로 표준화, Post면 /p/{code}/, IGTV면 /tv/{code}/
    const canonicalUrl = `https://www.instagram.com/${type === 'p' ? 'p' : (type === 'tv' ? 'tv' : 'reel')}/${code}/`;

    return {
      platform: 'instagram',
      id: code,              // shortcode가 사실상의 ID 역할
      canonicalUrl,
      originalUrl: input,
      expandedUrl: url
    };
  }

  // 4) YouTube (shorts/watch/ youtu.be/embed 모두 허용 → watch로 통일)
  if (host.includes('youtube.com') || host === 'youtu.be') {
    let id = null;
    if (host === 'youtu.be') {
      id = (path.match(/\/([A-Za-z0-9_-]{11})$/) || [])[1];
    } else {
      id = u.searchParams.get('v') ||
           (path.match(/\/shorts\/([A-Za-z0-9_-]{11})/) || [])[1] ||
           (path.match(/\/embed\/([A-Za-z0-9_-]{11})/) || [])[1];
    }
    if (!id || !YT_ID.test(id)) {
      throw new Error('유효한 YouTube 영상 ID(11자)를 찾지 못했습니다');
    }
    const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;
    return {
      platform: 'youtube',
      id,
      canonicalUrl,
      originalUrl: input,
      expandedUrl: url
    };
  }

  throw new Error(`지원하지 않는 도메인: ${host}`);
}