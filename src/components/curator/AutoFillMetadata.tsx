'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, CheckCircle, XCircle } from 'lucide-react';

interface Metadata {
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count?: number;
  author: string;
  upload_date: string;
  hashtags: string[];
  source: string;
  source_url: string;
  extracted_at: string;
  extractor: string;
}

interface AutoFillMetadataProps {
  onMetadataExtracted: (metadata: Metadata) => void;
  platform: 'instagram' | 'tiktok';
}

export function AutoFillMetadata({ onMetadataExtracted, platform }: AutoFillMetadataProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedMetadata, setExtractedMetadata] = useState<Metadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractionTime, setExtractionTime] = useState<number | null>(null);

  const extractMetadata = async () => {
    if (!url.trim()) {
      setError('URL을 입력해주세요');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedMetadata(null);
    setExtractionTime(null);

    const startTime = Date.now();

    try {
      const response = await fetch('/api/extract-social-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          platform
        })
      });

      const data = await response.json();
      const endTime = Date.now();
      setExtractionTime(endTime - startTime);

      if (data.success) {
        setExtractedMetadata(data.metadata);
        onMetadataExtracted(data.metadata);
        console.log('✅ 메타데이터 추출 성공:', data);
      } else {
        setError(data.message || '메타데이터 추출에 실패했습니다');
        console.error('❌ 메타데이터 추출 실패:', data);
      }
    } catch (error) {
      const endTime = Date.now();
      setExtractionTime(endTime - startTime);
      setError(error instanceof Error ? error.message : '네트워크 오류가 발생했습니다');
      console.error('❌ API 호출 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
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

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          자동 메타데이터 추출
          <Badge variant="outline" className="ml-auto">
            {platform === 'instagram' ? 'Instagram' : 'TikTok'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL 입력 */}
        <div className="space-y-2">
          <Label htmlFor="url">콘텐츠 URL</Label>
          <div className="flex gap-2">
            <Input
              id="url"
              type="url"
              placeholder={`${platform === 'instagram' ? 'Instagram' : 'TikTok'} URL을 입력하세요`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
            <Button
              onClick={extractMetadata}
              disabled={isLoading || !url.trim()}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  추출 중...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  추출
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 추출 성공 메시지 */}
        {extractedMetadata && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              메타데이터 추출 완료! ({extractionTime}ms)
            </AlertDescription>
          </Alert>
        )}

        {/* 추출된 메타데이터 표시 */}
        {extractedMetadata && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">조회수</Label>
                <div className="text-2xl font-bold">
                  {formatNumber(extractedMetadata.view_count)}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">좋아요</Label>
                <div className="text-2xl font-bold text-red-500">
                  {formatNumber(extractedMetadata.like_count)}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">댓글</Label>
                <div className="text-2xl font-bold text-blue-500">
                  {formatNumber(extractedMetadata.comment_count)}
                </div>
              </div>
              {extractedMetadata.share_count !== undefined && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">공유</Label>
                  <div className="text-2xl font-bold text-green-500">
                    {formatNumber(extractedMetadata.share_count)}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">작성자</Label>
              <div className="text-lg font-semibold">
                {extractedMetadata.author}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">업로드 날짜</Label>
              <div className="text-sm text-gray-600">
                {formatDate(extractedMetadata.upload_date)}
              </div>
            </div>

            {extractedMetadata.hashtags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">해시태그</Label>
                <div className="flex flex-wrap gap-1">
                  {extractedMetadata.hashtags.slice(0, 10).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {extractedMetadata.hashtags.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{extractedMetadata.hashtags.length - 10}개 더
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex justify-between text-xs text-gray-500">
                <span>추출 소스: {extractedMetadata.source}</span>
                <span>추출 시간: {formatDate(extractedMetadata.extracted_at)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 성능 정보 */}
        {extractionTime && (
          <div className="text-xs text-gray-500 text-center">
            추출 시간: {extractionTime}ms | 
            소스: {extractedMetadata?.source || 'N/A'} | 
            추출기: {extractedMetadata?.extractor || 'N/A'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
