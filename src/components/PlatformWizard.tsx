'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, Youtube, Instagram, Music, Loader2 } from 'lucide-react';

interface PlatformConfig {
  name: string;
  icon: React.ReactNode;
  required: string[];
  autoProcess: string;
  validation: string;
  guidance: string;
  color: string;
}

interface SocialMetadata {
  content_id: string;
  views: number;
  likes: number;
  comments: number;
  top_comments: string[];
  video_url?: string;
  extraction_time: string;
}

interface PlatformWizardProps {
  onPlatformSelect: (platform: string) => void;
  onValidationComplete: (platform: string, isValid: boolean) => void;
  onMetadataExtracted: (platform: string, metadata: SocialMetadata) => void;
}

const platformConfigs: Record<string, PlatformConfig> = {
  youtube: {
    name: 'YouTube',
    icon: <Youtube className="w-5 h-5" />,
    required: ['source_url'],
    autoProcess: 'yt-dlp 진행 표시',
    validation: 'URL 형식 검증',
    guidance: 'YouTube URL을 입력하면 자동으로 메타데이터를 추출합니다.',
    color: 'bg-red-50 border-red-200 text-red-800'
  },
  instagram: {
    name: 'Instagram',
    icon: <Instagram className="w-5 h-5" />,
    required: ['uploaded_gcs_uri'],
    validation: 'gsutil stat API 프록시',
    guidance: '워터마크 없는 비디오 파일이 필요합니다.',
    autoProcess: 'Instagram 메타데이터 추출',
    color: 'bg-pink-50 border-pink-200 text-pink-800'
  },
  tiktok: {
    name: 'TikTok',
    icon: <Music className="w-5 h-5" />,
    required: ['uploaded_gcs_uri'],
    validation: 'TIKWM.COM + SSSTIK.IO 이중 백업',
    guidance: '공개 계정의 콘텐츠만 지원됩니다.',
    autoProcess: 'TikTok 메타데이터 추출',
    color: 'bg-black border-gray-300 text-gray-800'
  }
};

export default function PlatformWizard({ onPlatformSelect, onValidationComplete, onMetadataExtracted }: PlatformWizardProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'success' | 'failed'>('idle');
  const [extractedMetadata, setExtractedMetadata] = useState<SocialMetadata | null>(null);

  const validateUrl = async (platform: string, url: string) => {
    if (!url.trim()) {
      setValidationStatus('invalid');
      setValidationMessage('URL을 입력해주세요.');
      return false;
    }

    setValidationStatus('validating');
    setValidationMessage('URL을 검증하는 중...');

    try {
      // 플랫폼별 URL 검증
      const isValid = await validatePlatformUrl(platform, url);
      
      if (isValid) {
        setValidationStatus('valid');
        setValidationMessage(`${platformConfigs[platform].name} URL이 유효합니다.`);
        onValidationComplete(platform, true);
        return true;
      } else {
        setValidationStatus('invalid');
        setValidationMessage('유효하지 않은 URL입니다.');
        onValidationComplete(platform, false);
        return false;
      }
    } catch (error) {
      setValidationStatus('invalid');
      setValidationMessage('URL 검증 중 오류가 발생했습니다.');
      onValidationComplete(platform, false);
      return false;
    }
  };

  const validatePlatformUrl = async (platform: string, url: string): Promise<boolean> => {
    // 플랫폼별 URL 패턴 검증
    const patterns = {
      youtube: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
      instagram: /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/.+/,
      tiktok: /^(https?:\/\/)?(www\.)?(tiktok\.com|vm\.tiktok\.com)\/.+/
    };

    const pattern = patterns[platform as keyof typeof patterns];
    if (!pattern) return false;

    return pattern.test(url);
  };

  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatform(platform);
    setInputUrl('');
    setValidationStatus('idle');
    setValidationMessage('');
    onPlatformSelect(platform);
  };

  const handleUrlSubmit = async () => {
    if (!selectedPlatform || !inputUrl.trim()) return;
    
    const isValid = await validateUrl(selectedPlatform, inputUrl);
    if (isValid) {
      // 자동 메타데이터 추출 시작
      await extractSocialMetadata();
    }
  };

  const extractSocialMetadata = async () => {
    setExtractionStatus('extracting');
    
    try {
      const response = await fetch('/api/extract-social-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: inputUrl, 
          platform: selectedPlatform 
        })
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        setExtractedMetadata(result.data);
        setExtractionStatus('success');
        onMetadataExtracted(selectedPlatform, result.data);
      } else {
        setExtractionStatus('failed');
        console.error('메타데이터 추출 실패:', result.error);
      }
    } catch (error) {
      setExtractionStatus('failed');
      console.error('메타데이터 추출 API 오류:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">플랫폼별 인제스트 마법사</h2>
        <p className="text-gray-600">원하는 플랫폼을 선택하고 URL을 입력하면 자동으로 처리됩니다.</p>
      </div>

      {/* 플랫폼 선택 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">1. 플랫폼 선택</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(platformConfigs).map(([key, config]) => (
            <button
              key={key}
              onClick={() => handlePlatformSelect(key)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedPlatform === key
                  ? `${config.color} border-current shadow-md`
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                {config.icon}
                <span className="font-medium">{config.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 플랫폼별 안내 */}
      {selectedPlatform && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">2. 플랫폼 안내</h3>
          <div className={`p-4 rounded-lg ${platformConfigs[selectedPlatform].color}`}>
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-2">{platformConfigs[selectedPlatform].name} 처리 안내</h4>
                <ul className="text-sm space-y-1">
                  <li>• <strong>필수 항목:</strong> {platformConfigs[selectedPlatform].required.join(', ')}</li>
                  <li>• <strong>자동 처리:</strong> {platformConfigs[selectedPlatform].autoProcess}</li>
                  <li>• <strong>검증:</strong> {platformConfigs[selectedPlatform].validation}</li>
                  <li>• <strong>안내:</strong> {platformConfigs[selectedPlatform].guidance}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* URL 입력 및 검증 */}
      {selectedPlatform && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">3. URL 입력</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-2">
                {platformConfigs[selectedPlatform].name} URL
              </label>
              <div className="flex space-x-2">
                <input
                  id="url-input"
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder={`${platformConfigs[selectedPlatform].name} URL을 입력하세요`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleUrlSubmit}
                  disabled={!inputUrl.trim() || validationStatus === 'validating'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {validationStatus === 'validating' ? '검증 중...' : '검증'}
                </button>
              </div>
            </div>

            {/* 검증 결과 */}
            {validationStatus !== 'idle' && (
              <div className={`p-3 rounded-md ${
                validationStatus === 'valid' 
                  ? 'bg-green-50 border border-green-200' 
                  : validationStatus === 'invalid'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {validationStatus === 'validating' && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                  {validationStatus === 'valid' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {validationStatus === 'invalid' && <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span className={`text-sm ${
                    validationStatus === 'valid' ? 'text-green-800' : 
                    validationStatus === 'invalid' ? 'text-red-800' : 'text-blue-800'
                  }`}>
                    {validationMessage}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 메타데이터 추출 상태 */}
      {validationStatus === 'valid' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">4. 메타데이터 추출</h3>
          
          {/* 추출 진행 상태 */}
          {extractionStatus === 'extracting' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <h4 className="font-medium text-blue-800">메타데이터 추출 중</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {platformConfigs[selectedPlatform].autoProcess}가 진행 중입니다...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 추출 성공 */}
          {extractionStatus === 'success' && extractedMetadata && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-800 mb-3">메타데이터 추출 완료</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">콘텐츠 ID:</span>
                      <span className="ml-2 text-gray-900">{extractedMetadata.content_id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">작성자:</span>
                      <span className="ml-2 text-gray-900">{extractedMetadata.author || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">조회수:</span>
                      <span className="ml-2 text-gray-900">{extractedMetadata.views.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">좋아요:</span>
                      <span className="ml-2 text-gray-900">{extractedMetadata.likes.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">댓글수:</span>
                      <span className="ml-2 text-gray-900">{extractedMetadata.comments.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">추출 시간:</span>
                      <span className="ml-2 text-gray-900">{new Date(extractedMetadata.extraction_time).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 해시태그 */}
                  {extractedMetadata.hashtags && extractedMetadata.hashtags.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-700">해시태그:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {extractedMetadata.hashtags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 상위 댓글 */}
                  {extractedMetadata.top_comments && extractedMetadata.top_comments.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-700">인기 댓글:</span>
                      <div className="mt-2 space-y-1">
                        {extractedMetadata.top_comments.slice(0, 3).map((comment, index) => (
                          <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {comment}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 추출 실패 */}
          {extractionStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <h4 className="font-medium text-red-800">메타데이터 추출 실패</h4>
                  <p className="text-sm text-red-700 mt-1">
                    다시 시도하거나 수동으로 메타데이터를 입력해주세요.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VDP 처리 시작 */}
      {extractionStatus === 'success' && extractedMetadata && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">5. VDP 빅데이터 적재</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Info className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-800">VDP 파이프라인 준비</h4>
                <p className="text-sm text-blue-700 mt-1">
                  추출된 메타데이터가 VDP 파이프라인으로 전송됩니다.
                </p>
                <div className="mt-2 text-xs text-blue-600">
                  • 콘텐츠 키: {selectedPlatform}:{extractedMetadata.content_id}
                  • 플랫폼: {selectedPlatform}
                  • 언어: ko (자동 감지)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
