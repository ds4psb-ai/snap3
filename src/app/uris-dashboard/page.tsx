'use client';
import URISCoordinator from '@/components/universal/URISCoordinator';
import AgentStatusGrid from '@/components/universal/AgentStatusGrid';
import RoutingFlowChart from '@/components/universal/RoutingFlowChart';

export default function URISDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">URIS Dashboard</h1>
          <p className="text-gray-600">
            Universal Recursive Improvement System - 실시간 협업 상태 및 라우팅 모니터링
          </p>
        </div>

        <div className="space-y-8">
          {/* URIS Coordination Dashboard */}
          <div>
            <URISCoordinator />
          </div>

          {/* Agent & Terminal Status Grid */}
          <div>
            <AgentStatusGrid />
          </div>

          {/* Routing Flow Chart */}
          <div>
            <RoutingFlowChart />
          </div>
        </div>
      </div>
    </div>
  );
}
