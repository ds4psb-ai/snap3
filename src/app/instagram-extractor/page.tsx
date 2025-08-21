'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  MessageCircle, 
  MessageSquare,
  Share2, 
  Eye, 
  Calendar, 
  User, 
  Hash, 
  Clock,
  Users,
  Download,
  ExternalLink
} from 'lucide-react';

interface InstagramMetadata {
  content_id: string;
  platform: string;
  metadata: {
    platform: string;
    source_url: string;
    video_origin: string;
    cta_types: string[];
    original_sound: boolean;
    hashtags: string[];
    top_comments: Array<{
      username: string;
      text: string;
      like_count: number;
      timestamp: string;
    }>;
    view_count: number | null;
    like_count: number;
    comment_count: number;
    share_count: number;
    upload_date: string;
    title: string;
    thumbnail_url: string;
    width: number;
    height: number;
    author?: {
      username: string;
      display_name: string;
      verified: boolean;
      followers: number;
    };
    is_video?: boolean;
  };
  scraped_data?: any;
  oembed_data?: any;
  source: string;
  error?: string;
  meta?: {
    downloadLinks?: Array<{
      name: string;
      url: string;
    }>;
    message?: string;
  };
}

interface TikTokMetadata {
  id: string;
  title: string;
  author: string;
  upload_date: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  hashtags: string[];
  top_comments: Array<{
    author: string;
    text: string;
    like_count: number;
  }>;
  thumbnail_url: string;
  duration: number;
  followers: number;
  scraped_data: any;
  source: string;
  error?: string;
  meta?: {
    downloadLinks?: Array<{
      name: string;
      url: string;
    }>;
    message?: string;
  };
}

export default function SocialMediaExtractor() {
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [instagramMetadata, setInstagramMetadata] = useState<InstagramMetadata | null>(null);
  const [tiktokMetadata, setTiktokMetadata] = useState<TikTokMetadata | null>(null);
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const [instagramError, setInstagramError] = useState('');
  const [tiktokError, setTiktokError] = useState('');
  const [instagramDownloading, setInstagramDownloading] = useState(false);
  const [tiktokDownloading, setTiktokDownloading] = useState(false);

  const extractInstagramMetadata = async () => {
    if (!instagramUrl.trim()) {
      setInstagramError('URL을 입력해주세요.');
      return;
    }

    setInstagramLoading(true);
    setInstagramError('');
    setInstagramMetadata(null);

    try {
      const response = await fetch('/api/instagram/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: instagramUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '메타데이터 추출에 실패했습니다.');
      }

      setInstagramMetadata(data);
    } catch (error) {
      setInstagramError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setInstagramLoading(false);
    }
  };

  const downloadInstagramVideo = async () => {
    if (!instagramUrl.trim()) {
      setInstagramError('URL을 입력해주세요.');
      return;
    }

    setInstagramError('');
    setInstagramDownloading(true);

    try {
      const response = await fetch('/api/instagram/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: instagramUrl }),
      });

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        // JSON 응답 (임베드 정보 또는 에러)
        const data = await response.json();
        
                 if (data.kind === 'embed') {
           // 다운로드 실패: 임베드 정보와 서드파티 링크 표시
           setInstagramError(data.meta?.message || 'Instagram 비디오 다운로드에 실패했습니다.');
           if (data.meta?.downloadLinks) {
             console.log('Instagram 서드파티 다운로드 링크:', data.meta.downloadLinks);
           }
           return;
        } else if (data.error) {
          throw new Error(data.error);
        }
      } else if (contentType && contentType.includes('video/')) {
        // 비디오 파일 응답 (소유/인증된 콘텐츠)
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `instagram_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

                 // 성공 메시지 표시
         setInstagramError('');
         console.log('Instagram 영상 다운로드 성공 (워터마크 없는 원본)');
      } else {
        throw new Error(`예상치 못한 응답 형식 (${contentType})`);
      }

    } catch (error) {
      console.error('Instagram 다운로드 오류:', error);
      setInstagramError(`다운로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setInstagramDownloading(false);
    }
  };

  const extractTikTokMetadata = async () => {
    if (!tiktokUrl.trim()) {
      setTiktokError('URL을 입력해주세요.');
      return;
    }

    setTiktokLoading(true);
    setTiktokError('');
    setTiktokMetadata(null);

    try {
      const response = await fetch('/api/tiktok/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: tiktokUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '메타데이터 추출에 실패했습니다.');
      }

      setTiktokMetadata(data.metadata);
    } catch (error) {
      setTiktokError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setTiktokLoading(false);
    }
  };

  const downloadTikTokVideo = async () => {
    if (!tiktokUrl.trim()) {
      setTiktokError('URL을 입력해주세요.');
      return;
    }

    setTiktokError('');
    setTiktokDownloading(true);

    try {
      const response = await fetch('/api/tiktok/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: tiktokUrl }),
      });

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        // JSON 응답 (임베드 정보 또는 에러)
        const data = await response.json();
        
                 if (data.kind === 'embed') {
           // 다운로드 실패: 임베드 정보와 서드파티 링크 표시
           setTiktokError(data.meta?.message || 'TikTok 비디오 다운로드에 실패했습니다.');
           if (data.meta?.downloadLinks) {
             console.log('TikTok 서드파티 다운로드 링크:', data.meta.downloadLinks);
           }
           return;
        } else if (data.error) {
          throw new Error(data.error);
        }
      } else if (contentType && contentType.includes('video/')) {
        // 비디오 파일 응답 (Data Portability API)
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tiktok_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

                 // 성공 메시지 표시
         setTiktokError('');
         console.log('TikTok 영상 다운로드 성공 (워터마크 없는 원본)');
      } else {
        throw new Error(`예상치 못한 응답 형식 (${contentType})`);
      }

    } catch (error) {
      console.error('TikTok 다운로드 오류:', error);
      setTiktokError(`다운로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setTiktokDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">소셜미디어 메타데이터 추출기 & 다운로더</h1>
        <p className="text-center text-muted-foreground">
          Instagram과 TikTok 링크에서 메타데이터를 추출하고 워터마크 없는 영상을 다운로드합니다
        </p>
      </div>

      <Tabs defaultValue="instagram" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
        </TabsList>

        <TabsContent value="instagram" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Instagram 메타데이터 추출 & 다운로드
              </CardTitle>
              <CardDescription>
                Instagram Reels 또는 포스트 URL을 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.instagram.com/p/..."
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && extractInstagramMetadata()}
                />
                <Button 
                  onClick={extractInstagramMetadata} 
                  disabled={instagramLoading}
                  className="min-w-[120px]"
                >
                  {instagramLoading ? '추출 중...' : '메타데이터 추출'}
                </Button>
                <Button 
                  onClick={downloadInstagramVideo} 
                  disabled={instagramDownloading || !instagramUrl.trim()}
                  variant="outline"
                  className="min-w-[120px]"
                >
                  {instagramDownloading ? '다운로드 중...' : '영상 다운로드'}
                </Button>
              </div>

              {instagramError && (
                <Alert variant="destructive">
                  <AlertDescription>{instagramError}</AlertDescription>
                </Alert>
              )}
              
              {/* 서드파티 다운로드 링크 */}
              {instagramMetadata?.meta?.downloadLinks && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">서드파티 다운로드 사이트</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    직접 다운로드가 제한되어 다음 사이트들을 이용해보세요:
                  </p>
                  <div className="space-y-2">
                    {instagramMetadata.meta.downloadLinks.map((link: any, index: number) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm transition-colors"
                      >
                        📥 {link.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {instagramMetadata && (
                <div className="space-y-6">
                  {instagramMetadata.source === 'fallback' && (
                    <Alert>
                      <AlertDescription>
                        Fallback 모드 Instagram API 접근이 제한되어 예시 데이터를 표시합니다. 
                        실제 데이터는 Instagram Graph API가 필요합니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  {instagramMetadata.source === 'web_scraping' && (
                    <Alert>
                      <AlertDescription>
                        Web Scraping Success - 공개 웹페이지에서 데이터를 성공적으로 추출했습니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">기본 정보</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">작성자:</span>
                          <span>
                            {instagramMetadata?.metadata?.author 
                              ? (instagramMetadata.metadata.author.display_name || instagramMetadata.metadata.author.username)
                              : 'Unknown'
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">업로드:</span>
                          <span>{formatDate(instagramMetadata?.metadata?.upload_date || new Date().toISOString())}</span>
                        </div>
                        {instagramMetadata?.metadata?.thumbnail_url && (
                          <div className="flex items-center gap-2">
                            <Download className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">썸네일:</span>
                            <a 
                              href={instagramMetadata.metadata.thumbnail_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              보기
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">통계</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {instagramMetadata?.metadata?.view_count && instagramMetadata.metadata.view_count > 0 && (
                            <div className="text-center p-4 bg-muted rounded-lg">
                              <Eye className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                              <p className="text-2xl font-bold">{instagramMetadata.metadata.view_count.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">조회수</p>
                            </div>
                          )}
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <Heart className="w-6 h-6 mx-auto mb-2 text-red-500" />
                            <p className="text-2xl font-bold">{instagramMetadata?.metadata?.like_count?.toLocaleString() || '0'}</p>
                            <p className="text-sm text-muted-foreground">좋아요</p>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <MessageCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                            <p className="text-2xl font-bold">{instagramMetadata?.metadata?.comment_count?.toLocaleString() || '0'}</p>
                            <p className="text-sm text-muted-foreground">댓글</p>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <Share2 className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                            <p className="text-2xl font-bold">{instagramMetadata?.metadata?.share_count?.toLocaleString() || '0'}</p>
                            <p className="text-sm text-muted-foreground">공유</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {instagramMetadata?.metadata?.hashtags && instagramMetadata.metadata.hashtags.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">해시태그</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {instagramMetadata.metadata.hashtags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">주요 댓글</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {instagramMetadata?.metadata?.top_comments && instagramMetadata.metadata.top_comments.length > 0 ? (
                        <div className="space-y-3">
                          {instagramMetadata.metadata.top_comments.slice(0, 5).map((comment, index) => (
                            <div key={index} className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{comment.username}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(comment.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm">{comment.text}</p>
                              {comment.like_count > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Heart className="w-3 h-3 text-red-500" />
                                  <span className="text-xs text-muted-foreground">{comment.like_count}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-4 text-muted-foreground">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>댓글을 불러올 수 없습니다</p>
                          <p className="text-xs mt-1">Instagram의 보안 정책으로 인해 댓글 추출이 제한됩니다</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">원본 데이터</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                        {JSON.stringify(instagramMetadata, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiktok" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                TikTok 메타데이터 추출 & 다운로드
              </CardTitle>
              <CardDescription>
                TikTok 비디오 URL을 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.tiktok.com/@username/video/..."
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && extractTikTokMetadata()}
                />
                <Button 
                  onClick={extractTikTokMetadata} 
                  disabled={tiktokLoading}
                  className="min-w-[120px]"
                >
                  {tiktokLoading ? '추출 중...' : '메타데이터 추출'}
                </Button>
                <Button 
                  onClick={downloadTikTokVideo} 
                  disabled={tiktokDownloading || !tiktokUrl.trim()}
                  variant="outline"
                  className="min-w-[120px]"
                >
                  {tiktokDownloading ? '다운로드 중...' : '영상 다운로드'}
                </Button>
              </div>

                              {tiktokError && (
                  <Alert variant="destructive">
                    <AlertDescription>{tiktokError}</AlertDescription>
                  </Alert>
                )}
                
                {/* 서드파티 다운로드 링크 */}
                {tiktokMetadata?.meta?.downloadLinks && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">서드파티 다운로드 사이트</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      직접 다운로드가 제한되어 다음 사이트들을 이용해보세요:
                    </p>
                    <div className="space-y-2">
                      {tiktokMetadata.meta.downloadLinks.map((link: any, index: number) => (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm transition-colors"
                        >
                          📥 {link.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              {tiktokMetadata && (
                <div className="space-y-6">
                  {tiktokMetadata.source === 'fallback' && (
                    <Alert>
                      <AlertDescription>
                        Fallback 모드 TikTok API 접근이 제한되어 예시 데이터를 표시합니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  {tiktokMetadata.source === 'web_scraping' && (
                    <Alert>
                      <AlertDescription>
                        Web Scraping Success - 공개 웹페이지에서 데이터를 성공적으로 추출했습니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">기본 정보</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">작성자:</span>
                          <span>{tiktokMetadata.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">업로드:</span>
                          <span>{formatDate(tiktokMetadata.upload_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">길이:</span>
                          <span>{formatDuration(tiktokMetadata.duration)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">팔로워:</span>
                          <span>{tiktokMetadata.followers?.toLocaleString() || '수동 입력'}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">통계</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <Eye className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                            <p className="text-2xl font-bold">{tiktokMetadata.view_count.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">조회수</p>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <Heart className="w-6 h-6 mx-auto mb-2 text-red-500" />
                            <p className="text-2xl font-bold">{tiktokMetadata.like_count.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">좋아요</p>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <MessageCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                            <p className="text-2xl font-bold">{tiktokMetadata.comment_count.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">댓글</p>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <Share2 className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                            <p className="text-2xl font-bold">{tiktokMetadata.share_count.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">공유</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {tiktokMetadata.hashtags && tiktokMetadata.hashtags.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">해시태그</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {tiktokMetadata.hashtags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">주요 댓글</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {tiktokMetadata.top_comments && tiktokMetadata.top_comments.length > 0 ? (
                        <div className="space-y-3">
                          {tiktokMetadata.top_comments.slice(0, 5).map((comment, index) => (
                            <div key={index} className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{comment.author}</span>
                              </div>
                              <p className="text-sm">{comment.text}</p>
                              {comment.like_count > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Heart className="w-3 h-3 text-red-500" />
                                  <span className="text-xs text-muted-foreground">{comment.like_count}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-4 text-muted-foreground">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>댓글을 불러올 수 없습니다</p>
                          <p className="text-xs mt-1">TikTok의 보안 정책으로 인해 댓글 추출이 제한됩니다</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">원본 데이터</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                        {JSON.stringify(tiktokMetadata, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
