'use client';

import PlatformWizard from '@/components/platform/PlatformWizard';

export default function PlatformWizardPage() {
  const handleMetadataExtracted = (metadata: any) => {
    console.log('메타데이터 추출 완료:', metadata);
    // 여기서 VDP 폼에 자동으로 데이터를 채울 수 있습니다
  };

  const handleError = (error: string) => {
    console.error('메타데이터 추출 실패:', error);
    // 에러 처리 로직
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Wizard 테스트</h1>
          <p className="text-gray-600">
            Instagram/TikTok/YouTube URL을 입력하여 메타데이터 자동 추출을 테스트해보세요
          </p>
        </div>
        
        <PlatformWizard 
          onMetadataExtracted={handleMetadataExtracted}
          onError={handleError}
        />
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">테스트 URL 예시</h3>
          <div className="space-y-2 text-sm">
            <p className="text-blue-700">
              <strong>Instagram:</strong> https://instagram.com/p/ABC123
            </p>
            <p className="text-blue-700">
              <strong>TikTok:</strong> https://tiktok.com/@user/video/123
            </p>
            <p className="text-blue-700">
              <strong>YouTube:</strong> https://youtube.com/shorts/ABC123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
