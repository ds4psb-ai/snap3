'use client';

import SummaryDock from '@/components/SummaryDock';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import PlatformWizard from '@/components/platform/PlatformWizard';
import SchemaValidator from '@/components/SchemaValidator';
import LogStream from '@/components/LogStream';

export default function HomePage() {
  const handleMetadataExtracted = (metadata: any) => {
    console.log('메타데이터 추출 완료:', metadata);
    // VDP 폼에 자동으로 데이터 채우기
  };

  const handleError = (error: string) => {
    console.error('메타데이터 추출 실패:', error);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <SummaryDock />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <PerformanceDashboard />
        </div>
        
        <div className="mb-8">
          <PlatformWizard 
            onMetadataExtracted={handleMetadataExtracted}
            onError={handleError}
          />
        </div>
        
        <div className="mb-8">
          <LogStream />
        </div>
        
        <div className="mb-8">
          <SchemaValidator 
            vdpData={null}
            onValidationChange={(result) => console.log('Schema validation:', result)}
            showDetails={true}
          />
        </div>
      </div>
    </div>
  );
}