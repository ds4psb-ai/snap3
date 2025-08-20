import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('TikTok 다운로드 요청:', url);

    const result = await resolveTikTok(url);
    
    if (result.kind === 'download') {
      // 비디오 파일 다운로드 (프록시 방식)
      const videoResponse = await fetch(result.fileUrl!, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.tiktok.com/',
          'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'video',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
          'Range': 'bytes=0-', // Range 요청으로 CDN 최적화
        }
      });

      if (!videoResponse.ok) {
        throw new Error('비디오 파일을 가져올 수 없습니다.');
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      
      return new NextResponse(videoBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="tiktok_${Date.now()}.mp4"`,
          'Content-Length': videoBuffer.byteLength.toString(),
          'Accept-Ranges': 'bytes',
        },
      });
    } else {
      // 임베드 정보 반환
      return NextResponse.json({
        kind: 'embed',
        embed: result.embed,
        meta: result.meta
      });
    }

  } catch (error) {
    console.error('TikTok 다운로드 오류:', error);
    return NextResponse.json(
      { error: `다운로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

// 백오프 및 재시도 로직
async function withBackoff<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === maxRetries - 1) throw e;
      const delay = 500 * Math.pow(2, i); // 지수 백오프
      console.log(`TikTok API 재시도 ${i + 1}/${maxRetries}, ${delay}ms 대기`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('TikTok API: 최대 재시도 횟수 초과');
}

// 공개 콘텐츠 사전 검증
function isPrivateOrInvalid(url: string): boolean {
  // TikTok URL 패턴 검증
  const tiktokPatterns = [
    /^https:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
    /^https:\/\/(vm|vt)\.tiktok\.com\/[\w.-]+/,
  ];
  
  const isValidTikTokUrl = tiktokPatterns.some(pattern => pattern.test(url));
  if (!isValidTikTokUrl) {
    console.log('유효하지 않은 TikTok URL:', url);
    return true;
  }
  
  return false;
}

// TIKWM API 클라이언트 (개선된 버전)
async function tikwmResolve(tiktokUrl: string): Promise<{
  kind: 'download' | 'embed';
  videoId?: string;
  fileUrl?: string;
  embed?: any;
  meta?: any;
}> {
  console.log('TIKWM.COM API 시도...');
  
  const response = await fetch('https://www.tikwm.com/api/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://www.tikwm.com',
      'Referer': 'https://www.tikwm.com/',
    },
    body: JSON.stringify({ url: tiktokUrl })
  });

  if (!response.ok) {
    throw new Error(`TIKWM HTTP ${response.status}`);
  }

  const data = await response.json();
  
  // 구체적인 에러 코드 처리
  if (data?.code !== 0 || !data?.data) {
    throw new Error(`TIKWM code ${data?.code} msg ${data?.msg}`);
  }

  const tikwmData = data.data;
  
  // 노워터마크 비디오 우선, 없으면 HD, 마지막으로 워터마크 버전
  const videoUrl = tikwmData.hdplay || tikwmData.play || tikwmData.wmplay;
  
  if (videoUrl) {
    console.log('TIKWM.COM API: 비디오 URL 발견 (노워터마크):', videoUrl);
    return {
      kind: 'download',
      videoId: tikwmData.id,
      fileUrl: videoUrl
    };
  }

  throw new Error('TIKWM에서 비디오 URL을 찾을 수 없습니다.');
}

// SSSTik 클라이언트 (동적 폼 액션 발견)
async function ssstikResolve(tiktokUrl: string): Promise<{
  kind: 'download' | 'embed';
  videoId?: string;
  fileUrl?: string;
  embed?: any;
  meta?: any;
}> {
  console.log('SSSTIK.IO API 시도...');
  
  try {
    // Step 1: 홈페이지에서 폼 액션 동적 발견
    const homeResponse = await fetch('https://ssstik.io/', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    
    if (!homeResponse.ok) {
      throw new Error(`SSSTik 홈페이지 ${homeResponse.status}`);
    }
    
    const homeHtml = await homeResponse.text();
    const $home = cheerio.load(homeHtml);
    
    // 동적으로 폼 액션 발견 (하드코딩 방지)
    const form = $home('form[action][method]').first();
    const action = form.attr('action') || '/';
    const postUrl = new URL(action, homeResponse.url).toString();
    
    console.log('SSSTik 폼 액션 발견:', postUrl);

    // Step 2: TikTok URL 제출
    const postResponse = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://ssstik.io',
        'Referer': 'https://ssstik.io/',
      },
      body: `id=${encodeURIComponent(tiktokUrl)}`
    });

    if (!postResponse.ok) {
      throw new Error(`SSSTik POST ${postResponse.status}`);
    }

    // Step 3: 결과 페이지에서 다운로드 링크 파싱
    const resultHtml = await postResponse.text();
    const $ = cheerio.load(resultHtml);
    
    const items: Array<{label: string, url: string, quality: string}> = [];
    
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href') || '';
      const text = $(element).text().trim().toLowerCase();
      
      if (href.includes('.mp4')) {
        const isHD = /hd|server|without\s*watermark/.test(text);
        items.push({
          label: isHD ? 'No Watermark (HD)' : 'No Watermark',
          url: new URL(href, postResponse.url).toString(),
          quality: isHD ? 'HD' : 'orig'
        });
      } else if (href.includes('.mp3') || /mp3|audio/.test(text)) {
        items.push({
          label: 'MP3 (Audio only)',
          url: new URL(href, postResponse.url).toString(),
          quality: 'audio'
        });
      }
    });

    // 최고 품질 비디오 선택
    const bestVideo = items.find(item => item.quality === 'HD') || 
                     items.find(item => item.quality === 'orig');
    
    if (bestVideo) {
      console.log('SSSTIK.IO API: 비디오 URL 발견:', bestVideo.url);
      return {
        kind: 'download',
        videoId: extractVideoId(tiktokUrl),
        fileUrl: bestVideo.url
      };
    }

    throw new Error('SSSTik에서 비디오 URL을 찾을 수 없습니다.');
    
  } catch (error) {
    console.log('SSSTik API 실패:', error);
    throw error;
  }
}

// TikTok URL 해결 (개선된 오케스트레이터)
async function resolveTikTok(url: string): Promise<{
  kind: 'download' | 'embed';
  videoId?: string;
  fileUrl?: string;
  embed?: any;
  meta?: any;
}> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('유효하지 않은 TikTok URL입니다.');
  }

  console.log('TikTok video ID:', videoId);

  // 1) 공개 콘텐츠 사전 검증
  if (isPrivateOrInvalid(url)) {
    return {
      kind: 'embed',
      embed: {
        embedUrl: `https://www.tiktok.com/embed/${videoId}`,
        embedHtml: `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}">`
      },
      meta: {
        videoId: videoId,
        message: '비공개 콘텐츠이거나 유효하지 않은 URL입니다.',
        downloadLinks: []
      }
    };
  }

  // 2) TIKWM API 시도 (백오프 로직 포함)
  try {
    const result = await withBackoff(() => tikwmResolve(url));
    if (result.kind === 'download') {
      return result;
    }
  } catch (error) {
    console.log('TIKWM API 실패:', error);
  }

  // 3) SSSTik API fallback (백오프 로직 포함)
  try {
    const result = await withBackoff(() => ssstikResolve(url));
    if (result.kind === 'download') {
      return result;
    }
  } catch (error) {
    console.log('SSSTik API 실패:', error);
  }

  // 4) 최후의 방법: 서드파티 다운로드 사이트 링크 제공
  return {
    kind: 'embed',
    embed: {
      embedUrl: `https://www.tiktok.com/embed/${videoId}`,
      embedHtml: `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}">`
    },
    meta: {
      videoId: videoId,
      message: '모든 서드파티 API에서 다운로드에 실패했습니다. 직접 다운로드 사이트를 이용해주세요.',
      downloadLinks: [
        {
          name: 'TIKWM.COM',
          url: `https://www.tikwm.com/?url=${encodeURIComponent(url)}`
        },
        {
          name: 'SSSTIK.IO',
          url: `https://ssstik.io/abc?url=${encodeURIComponent(url)}`
        },
        {
          name: 'SnapTik',
          url: `https://snaptik.app/?url=${encodeURIComponent(url)}`
        },
        {
          name: 'TikMate',
          url: `https://tikmate.online/?url=${encodeURIComponent(url)}`
        }
      ]
    }
  };
}

// URL에서 video ID 추출 (단축 링크 포함)
function extractVideoId(url: string): string | null {
  // 단축 링크 정규화
  if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
    // 단축 링크는 실제 URL로 리다이렉트되므로 그대로 사용
    return null; // 실제 구현에서는 리다이렉트 처리 필요
  }
  
  // 일반 TikTok URL에서 video ID 추출
  const patterns = [
    /\/video\/(\d+)/,
    /\/@[^\/]+\/video\/(\d+)/,
    /\/v\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}
