'use client';
import SummaryDock from '@/components/SummaryDock';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import PlatformWizard from '@/components/platform/PlatformWizard';
import SchemaValidator from '@/components/SchemaValidator';
import LogStream from '@/components/LogStream';
import UniversalSystemStatus from '@/components/universal/UniversalSystemStatus';
import URISCoordinator from '@/components/universal/URISCoordinator';
import AgentStatusGrid from '@/components/universal/AgentStatusGrid';
import RoutingFlowChart from '@/components/universal/RoutingFlowChart';
import { LimitedAutoModePanel } from '@/components/recursive-improvement/LimitedAutoModePanel';

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
          <UniversalSystemStatus />
        </div>

        {/* 제한된 자동 모드 패널 */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">제한된 자동 모드</h2>
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm font-medium">
              과도한 자동화 방지
            </span>
          </div>
          <div className="flex justify-center">
            <LimitedAutoModePanel />
          </div>
        </div>

        {/* URIS Dashboard 섹션 */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">URIS Coordination</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
              Phase A
            </span>
          </div>
          <URISCoordinator />
        </div>

        <div className="mb-8">
          <AgentStatusGrid />
        </div>

        <div className="mb-8">
          <RoutingFlowChart />
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