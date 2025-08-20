'use client';

import SummaryDock from '@/components/SummaryDock';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import PlatformWizard from '@/components/PlatformWizard';
import SchemaValidator from '@/components/SchemaValidator';
import LogStream from '@/components/LogStream';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 기존 SummaryDock */}
      <SummaryDock />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* NEW: 성능 대시보드 */}
        <div className="mb-8">
          <PerformanceDashboard />
        </div>
        
        {/* 기존 PlatformWizard */}
        <div className="mb-8">
          <PlatformWizard 
            onPlatformSelect={(platform) => console.log('Platform selected:', platform)}
            onValidationComplete={(platform, isValid) => console.log('Validation:', platform, isValid)}
          />
        </div>
        
        {/* NEW: 실시간 로그 */}
        <div className="mb-8">
          <LogStream />
        </div>
        
        {/* 기존 SchemaValidator */}
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