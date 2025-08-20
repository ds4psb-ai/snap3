import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('Instagram 다운로드 요청:', url);

    const result = await resolveInstagram(url);
    
    if (result.kind === 'download') {
      // 비디오 파일 다운로드
      const videoResponse = await fetch(result.mediaUrl!, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.instagram.com/',
          'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'video',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
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
          'Content-Disposition': `attachment; filename="instagram_${Date.now()}.mp4"`,
          'Content-Length': videoBuffer.byteLength.toString(),
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
    console.error('Instagram 다운로드 오류:', error);
    return NextResponse.json(
      { error: `다운로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}

// Instagram URL 해결 (정교한 서버 사이드 스크레이핑)
async function resolveInstagram(url: string): Promise<{
  kind: 'download' | 'embed';
  mediaId?: string;
  mediaUrl?: string;
  embed?: any;
  meta?: any;
}> {
  const shortcode = extractShortcode(url);
  if (!shortcode) {
    throw new Error('유효하지 않은 Instagram URL입니다.');
  }

  console.log('Instagram shortcode:', shortcode);

  // 1. FastVideoSave.net 방식 - 정교한 GraphQL API 호출
  try {
    // 먼저 Instagram 메인 페이지에 접속하여 세션 쿠키 획득
    const mainPageResponse = await fetch('https://www.instagram.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
      }
    });

    // 쿠키 추출 및 세션 유지
    const cookies = mainPageResponse.headers.get('set-cookie');
    console.log('Instagram 메인 페이지 쿠키 획득:', cookies ? '성공' : '실패');

    // Instagram GraphQL API 직접 호출 (FastVideoSave.net 방식)
    const graphqlUrl = 'https://www.instagram.com/graphql/query/';
    const variables = {
      shortcode: shortcode,
      child_comment_count: 3,
      fetch_comment_count: 40,
      parent_comment_count: 24,
      has_threaded_comments: false
    };
    
    const queryParams = new URLSearchParams({
      query_hash: '9f8827793ef34641b2fb195d4d41151c',
      variables: JSON.stringify(variables)
    });

    const graphqlResponse = await fetch(`${graphqlUrl}?${queryParams}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `https://www.instagram.com/p/${shortcode}/`,
        'Origin': 'https://www.instagram.com',
        'X-ASBD-ID': '129477',
        'X-IG-WWW-Claim': '0',
        'X-CSRFToken': 'missing',
        'X-Instagram-AJAX': '100663296',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        ...(cookies && { 'Cookie': cookies })
      }
    });

    if (graphqlResponse.ok) {
      const graphqlData = await graphqlResponse.json();
      const media = graphqlData?.data?.shortcode_media;
      
      if (media?.video_url) {
        console.log('FastVideoSave 방식: GraphQL API에서 video_url 발견:', media.video_url);
        return {
          kind: 'download',
          mediaId: media.id,
          mediaUrl: media.video_url
        };
      }
      
      if (media?.video_versions && media.video_versions.length > 0) {
        const bestVersion = media.video_versions.sort((a: any, b: any) => {
          const aRes = (a.width || 0) * (a.height || 0);
          const bRes = (b.width || 0) * (b.height || 0);
          return bRes - aRes;
        })[0];
        
        console.log('FastVideoSave 방식: GraphQL API에서 video_versions 발견:', bestVersion.url);
        return {
          kind: 'download',
          mediaId: media.id,
          mediaUrl: bestVersion.url
        };
      }
    }
  } catch (e) {
    console.log('FastVideoSave 방식 실패:', e);
  }

  // 2. SnapInsta.to 방식 - 정교한 페이지 스크레이핑
  try {
    const pageUrl = `https://www.instagram.com/p/${shortcode}/`;
    const pageResponse = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Referer': 'https://www.instagram.com/',
      }
    });

    if (pageResponse.ok) {
      const html = await pageResponse.text();
      console.log('SnapInsta 방식: Instagram 페이지 로드 성공, HTML 길이:', html.length);
      
      // 1. window._sharedData에서 비디오 URL 추출
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});<\/script>/);
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);
          const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
          
          if (media?.video_url) {
            console.log('SnapInsta 방식: window._sharedData에서 video_url 발견:', media.video_url);
            return {
              kind: 'download',
              mediaId: media.id,
              mediaUrl: media.video_url
            };
          }
          
          if (media?.video_versions && media.video_versions.length > 0) {
            const bestVersion = media.video_versions.sort((a: any, b: any) => {
              const aRes = (a.width || 0) * (a.height || 0);
              const bRes = (b.width || 0) * (b.height || 0);
              return bRes - aRes;
            })[0];
            
            console.log('SnapInsta 방식: window._sharedData에서 video_versions 발견:', bestVersion.url);
            return {
              kind: 'download',
              mediaId: media.id,
              mediaUrl: bestVersion.url
            };
          }
        } catch (e) {
          console.log('SnapInsta 방식: window._sharedData 파싱 실패:', e);
        }
      }

      // 2. __additionalDataLoaded에서 비디오 URL 추출
      const additionalDataMatch = html.match(/window\.__additionalDataLoaded\s*\(\s*[^,]+,\s*({.+?})\s*\)/);
      if (additionalDataMatch) {
        try {
          const additionalData = JSON.parse(additionalDataMatch[1]);
          const media = additionalData?.graphql?.shortcode_media;
          
          if (media?.video_url) {
            console.log('SnapInsta 방식: __additionalDataLoaded에서 video_url 발견:', media.video_url);
            return {
              kind: 'download',
              mediaId: media.id,
              mediaUrl: media.video_url
            };
          }
        } catch (e) {
          console.log('SnapInsta 방식: __additionalDataLoaded 파싱 실패:', e);
        }
      }

      // 3. 정규식 패턴으로 비디오 URL 직접 추출 (고급 패턴)
      const videoPatterns = [
        /"video_url":"([^"]+)"/g,
        /"playback_url":"([^"]+)"/g,
        /"src":"([^"]*\.mp4[^"]*)"/g,
        /"contentUrl":"([^"]*\.mp4[^"]*)"/g,
        /"url":"([^"]*\.mp4[^"]*)"/g,
        /"videoUrl":"([^"]+)"/g,
      ];

      for (const pattern of videoPatterns) {
        const matches = [...html.matchAll(pattern)];
        for (const match of matches) {
          if (match[1] && match[1].includes('.mp4')) {
            const videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
            console.log('SnapInsta 방식: 정규식 패턴에서 비디오 URL 발견:', videoUrl);
            return {
              kind: 'download',
              mediaId: shortcode,
              mediaUrl: videoUrl
            };
          }
        }
      }
    }
  } catch (e) {
    console.log('SnapInsta 방식 실패:', e);
  }

  // 3. 대체 방법 - Instagram 내부 API 엔드포인트 직접 호출
  try {
    const apiEndpoints = [
      `https://www.instagram.com/api/v1/media/${shortcode}/info/`,
      `https://www.instagram.com/api/v1/media/${shortcode}/info/?__a=1&__d=dis`,
      `https://www.instagram.com/api/v1/media/${shortcode}/info/?__a=1&__d=dis&__user=0&__req=1&__hs=0&dpr=1`,
    ];

    for (const apiUrl of apiEndpoints) {
      try {
        const apiResponse = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `https://www.instagram.com/p/${shortcode}/`,
            'Origin': 'https://www.instagram.com',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
          }
        });

        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          const media = apiData?.items?.[0];
          
          if (media?.video_versions && media.video_versions.length > 0) {
            const bestVersion = media.video_versions.sort((a: any, b: any) => {
              const aRes = (a.width || 0) * (a.height || 0);
              const bRes = (b.width || 0) * (b.height || 0);
              return bRes - aRes;
            })[0];
            
            console.log('대체 방식: Instagram API에서 video_versions 발견:', bestVersion.url);
            return {
              kind: 'download',
              mediaId: media.id,
              mediaUrl: bestVersion.url
            };
          }
        }
      } catch (e) {
        console.log(`대체 방식: API 엔드포인트 ${apiUrl} 실패:`, e);
        continue;
      }
    }
  } catch (e) {
    console.log('대체 방식 실패:', e);
  }

  // 4. 최후의 방법: 서드파티 다운로드 사이트 링크 제공
  try {
    const oembedUrl = `https://www.instagram.com/oembed/?url=https://www.instagram.com/p/${shortcode}/`;
    const oembedResponse = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });

    if (oembedResponse.ok) {
      const oembedData = await oembedResponse.json();
      console.log('oEmbed 데이터:', oembedData);
      
      return {
        kind: 'embed',
        embed: oembedData,
        meta: {
          title: oembedData.title,
          author: oembedData.author_name,
          thumbnail: oembedData.thumbnail_url,
          width: oembedData.width,
          height: oembedData.height,
          message: 'Instagram의 보안 정책으로 인해 직접 다운로드가 제한됩니다.',
          downloadLinks: [
            {
              name: 'FastVideoSave.net',
              url: `https://fastvideosave.net/?url=${encodeURIComponent(`https://www.instagram.com/p/${shortcode}/`)}`
            },
            {
              name: 'SnapInsta.to',
              url: `https://snapinsta.to/en/instagram-reels-downloader?url=${encodeURIComponent(`https://www.instagram.com/p/${shortcode}/`)}`
            }
          ]
        }
      };
    }
  } catch (e) {
    console.log('oEmbed API 시도 실패:', e);
  }

  // 5. 완전 실패 시 기본 정보와 다운로드 링크 제공
  return {
    kind: 'embed',
    embed: {
      title: `Instagram Post ${shortcode}`,
      author_name: 'Unknown',
      thumbnail_url: '',
      width: 540,
      height: 540
    },
    meta: {
      title: `Instagram Post ${shortcode}`,
      author: 'Unknown',
      thumbnail: '',
      width: 540,
      height: 540,
      message: 'Instagram의 보안 정책으로 인해 직접 다운로드가 제한됩니다.',
      downloadLinks: [
        {
          name: 'FastVideoSave.net',
          url: `https://fastvideosave.net/?url=${encodeURIComponent(`https://www.instagram.com/p/${shortcode}/`)}`
        },
        {
          name: 'SnapInsta.to',
          url: `https://snapinsta.to/en/instagram-reels-downloader?url=${encodeURIComponent(`https://www.instagram.com/p/${shortcode}/`)}`
        }
      ]
    }
  };
}

// URL에서 shortcode 추출
function extractShortcode(url: string): string | null {
  const match = url.match(/\/p\/([^\/\?]+)/) || url.match(/\/reel\/([^\/\?]+)/);
  return match ? match[1] : null;
}
