'use client';

import { useState, useEffect } from 'react';
import { 
  Instagram, 
  Youtube, 
  Music, 
  Link, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Eye,
  Heart,
  MessageSquare,
  Download,
  RefreshCw
} from 'lucide-react';

interface SocialMetadata {
  content_id: string;
  views: number;
  likes: number;
  comments: number;
  top_comments: string[];
  extraction_time: string;
  platform: string;
  author?: string;
  upload_date?: string;
  hashtags?: string[];
}

interface PlatformWizardProps {
  onMetadataExtracted?: (metadata: SocialMetadata) => void;
  onError?: (error: string) => void;
}

export default function PlatformWizard({ 
  onMetadataExtracted, 
  onError 
}: PlatformWizardProps) {
  const [url, setUrl] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'success' | 'failed'>('idle');
  const [metadata, setMetadata] = useState<SocialMetadata | null>(null);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // 수동 입력 필드들
  const [uploadDate, setUploadDate] = useState<string>('');
  const [manualComments, setManualComments] = useState<string[]>(['', '', '', '', '']);

  // URL 입력 시 플랫폼 자동 감지
  useEffect(() => {
    if (url) {
      const detectedPlatform = detectPlatform(url);
      setPlatform(detectedPlatform);
      
      if (detectedPlatform !== 'unknown') {
        // 자동으로 메타데이터 추출 시작
        handleExtractMetadata();
      }
    }
  }, [url]);

  const detectPlatform = (url: string): string => {
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';  
    if (url.includes('youtube.com')) return 'youtube';
    return 'unknown';
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-5 h-5" />;
      case 'tiktok': return <Music className="w-5 h-5" />;
      case 'youtube': return <Youtube className="w-5 h-5" />;
      default: return <Link className="w-5 h-5" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'text-pink-600 bg-pink-50 border-pink-200';
      case 'tiktok': return 'text-black bg-gray-50 border-gray-200';
      case 'youtube': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const extractMetadata = async (url: string, platform: string): Promise<SocialMetadata> => {
    const response = await fetch('/api/extract-social-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, platform })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '메타데이터 추출 실패');
    }

    // API 응답을 SocialMetadata 형식으로 변환
    const data = result.data;
    return {
      content_id: data.content_id,
      views: data.view_count || 0,
      likes: data.like_count || 0,
      comments: data.comment_count || 0,
      top_comments: data.top_comments || [],
      extraction_time: new Date().toISOString(),
      platform: data.platform || platform,
      author: data.author,
      upload_date: data.upload_date,
      hashtags: data.hashtags || []
    };
  };

  const handleExtractMetadata = async () => {
    if (!url || platform === 'unknown') {
      setError('유효한 URL을 입력해주세요');
      return;
    }

    setExtractionStatus('extracting');
    setError('');

    try {
      const extractedMetadata = await extractMetadata(url, platform);
      setMetadata(extractedMetadata);
      setExtractionStatus('success');
      
      // 업로드 날짜 자동 채우기
      if (extractedMetadata.upload_date) {
        setUploadDate(extractedMetadata.upload_date.split('T')[0]); // YYYY-MM-DD 형식으로 변환
      }
      
      if (onMetadataExtracted) {
        onMetadataExtracted(extractedMetadata);
      }
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      setExtractionStatus('failed');
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      
      if (onError) {
        onError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      }
    }
  };

  const handleManualMode = () => {
    setManualMode(true);
    setExtractionStatus('idle');
    setError('');
  };

  const handleRetry = () => {
    setExtractionStatus('idle');
    setError('');
    setManualMode(false);
    handleExtractMetadata();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform Wizard</h2>
        <p className="text-gray-600">
          URL을 입력하면 자동으로 메타데이터를 추출하여 폼을 채워드립니다
        </p>
      </div>

      {/* URL 입력 섹션 */}
      <div className="mb-6">
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
          소셜 미디어 URL
        </label>
        <div className="flex space-x-2">
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://instagram.com/p/ABC123 또는 https://tiktok.com/@user/video/123"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleExtractMetadata}
            disabled={extractionStatus === 'extracting' || !url}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {extractionStatus === 'extracting' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>추출 중...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>추출</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 플랫폼 감지 결과 */}
      {platform && platform !== 'unknown' && (
        <div className={`mb-4 p-3 rounded-lg border ${getPlatformColor(platform)}`}>
          <div className="flex items-center space-x-2">
            {getPlatformIcon(platform)}
            <span className="font-medium">
              {platform === 'instagram' ? 'Instagram' : 
               platform === 'tiktok' ? 'TikTok' : 
               platform === 'youtube' ? 'YouTube' : 'Unknown'} 감지됨
            </span>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
          <div className="mt-2 flex space-x-2">
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              재시도
            </button>
            <button
              onClick={handleManualMode}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              수동 입력
            </button>
          </div>
        </div>
      )}

      {/* 추출 상태 표시 */}
      {extractionStatus === 'extracting' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-blue-700">메타데이터 추출 중...</span>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            잠시만 기다려주세요. 보통 5초 이내에 완료됩니다.
          </p>
        </div>
      )}

      {/* 성공 메시지 */}
      {extractionStatus === 'success' && metadata && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700 font-medium">메타데이터 추출 완료!</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            추출 시간: {new Date(metadata.extraction_time).toLocaleString()}
          </p>
        </div>
      )}

      {/* 추출된 메타데이터 표시 */}
      {metadata && extractionStatus === 'success' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">추출된 메타데이터</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">조회수</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {formatNumber(metadata.views)}
              </span>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-700">좋아요</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {formatNumber(metadata.likes)}
              </span>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">댓글</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {formatNumber(metadata.comments)}
              </span>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Link className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">콘텐츠 ID</span>
              </div>
              <span className="text-sm font-mono text-gray-900">
                {metadata.content_id}
              </span>
            </div>
          </div>

          {/* 상위 댓글 표시 */}
          {metadata.top_comments && metadata.top_comments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-md font-semibold text-gray-900 mb-2">상위 댓글</h4>
              <div className="space-y-2">
                {metadata.top_comments.slice(0, 3).map((comment, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 추가 정보 */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {metadata.author && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">작성자</span>
                <p className="text-blue-900">{metadata.author}</p>
              </div>
            )}
            
            {metadata.upload_date && (
              <div className="p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-700">업로드 날짜</span>
                <p className="text-green-900">
                  {new Date(metadata.upload_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 수동 입력 모드 */}
      {manualMode && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="text-yellow-700 font-medium">수동 입력 모드</span>
          </div>
          <p className="text-sm text-yellow-600 mb-3">
            자동 추출에 실패했습니다. 아래 필드에 수동으로 입력해주세요.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">조회수</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">좋아요</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">댓글</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* 수동 입력 섹션 */}
      {(extractionStatus === 'success' || manualMode) && (platform === 'instagram' || platform === 'tiktok') && (
        <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">추가 정보 입력</h3>
          
          {/* 업로드 날짜 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              업로드 날짜 {extractionStatus === 'success' && uploadDate && (
                <span className="text-green-600 text-xs">(자동 추출됨)</span>
              )}
            </label>
            <input
              type="date"
              value={uploadDate}
              onChange={(e) => setUploadDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 베스트 댓글 5개 입력 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              베스트 댓글 (최대 5개)
            </label>
            <div className="space-y-3">
              {manualComments.map((comment, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500 w-6">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => {
                      const newComments = [...manualComments];
                      newComments[index] = e.target.value;
                      setManualComments(newComments);
                    }}
                    placeholder={`${index + 1}번째 베스트 댓글을 입력하세요`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * 댓글은 자동 추출되지 않으므로 수동으로 입력해주세요
            </p>
          </div>

          {/* 제출 버튼 */}
          <div className="mt-6">
            <button
              onClick={() => {
                console.log('폼 데이터:', {
                  url,
                  platform,
                  uploadDate,
                  manualComments: manualComments.filter(c => c.trim()),
                  metadata
                });
                alert('데이터가 저장되었습니다!');
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              저장하기
            </button>
          </div>
        </div>
      )}

      {/* 성능 정보 */}
      {extractionStatus === 'success' && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">성능 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">추출 시간:</span>
              <span className="ml-2 font-medium text-gray-900">
                {metadata ? new Date(metadata.extraction_time).toLocaleTimeString() : '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">플랫폼:</span>
              <span className="ml-2 font-medium text-gray-900 capitalize">
                {metadata?.platform || '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">상태:</span>
              <span className="ml-2 font-medium text-green-600">성공</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
