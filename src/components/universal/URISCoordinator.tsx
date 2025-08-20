'use client';
import { useState, useEffect } from 'react';
import { Activity, Users, GitBranch, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';

interface URISStatus {
  context: string;
  decision: 'PROCEED' | 'MODIFY' | 'REJECT';
  consensus_score: number;
  active_agents: string[];
  routing_path: string[];
  performance_metrics: {
    p95_response_time: number;
    error_rate: number;
    throughput: number;
  };
  quality_gates: {
    circuit_breaker: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    dlq_count: number;
    saga_compensations: number;
  };
  last_updated: string;
}

interface AgentStatus {
  name: string;
  status: 'active' | 'idle' | 'error';
  current_task: string;
  performance_score: number;
  last_activity: string;
}

export default function URISCoordinator() {
  const [urisStatus, setUrisStatus] = useState<URISStatus | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchURISStatus = async () => {
      try {
        const response = await fetch('/api/uris/status');
        const data = await response.json();
        setUrisStatus(data);
      } catch (error) {
        console.error('URIS status fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchAgentStatuses = async () => {
      try {
        const response = await fetch('/api/uris/agents');
        const data = await response.json();
        setAgentStatuses(data);
      } catch (error) {
        console.error('Agent statuses fetch error:', error);
      }
    };

    fetchURISStatus();
    fetchAgentStatuses();

    const interval = setInterval(() => {
      fetchURISStatus();
      fetchAgentStatuses();
    }, 30000); // 5초 → 30초로 변경

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!urisStatus) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>URIS 상태를 불러올 수 없습니다</span>
        </div>
      </div>
    );
  }

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'PROCEED': return 'text-green-600 bg-green-50 border-green-200';
      case 'MODIFY': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'REJECT': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConsensusColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">URIS Coordination Dashboard</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>마지막 업데이트: {new Date(urisStatus.last_updated).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* 컨텍스트 및 결정 상태 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <GitBranch className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">컨텍스트</span>
          </div>
          <span className="text-lg font-semibold text-gray-900 capitalize">{urisStatus.context}</span>
        </div>

        <div className={`p-4 rounded-lg border ${getDecisionColor(urisStatus.decision)}`}>
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">결정</span>
          </div>
          <span className="text-lg font-semibold">{urisStatus.decision}</span>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">합의 점수</span>
          </div>
          <span className={`text-lg font-semibold ${getConsensusColor(urisStatus.consensus_score)}`}>
            {(urisStatus.consensus_score * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 활성 에이전트 */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">활성 에이전트</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agentStatuses.map((agent) => (
            <div key={agent.name} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{agent.name}</span>
                <div className={`w-2 h-2 rounded-full ${
                  agent.status === 'active' ? 'bg-green-500' :
                  agent.status === 'idle' ? 'bg-gray-400' : 'bg-red-500'
                }`}></div>
              </div>
              <p className="text-sm text-gray-600 mb-1">{agent.current_task}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>성능: {(agent.performance_score * 100).toFixed(0)}%</span>
                <span>{new Date(agent.last_activity).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 라우팅 경로 */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">라우팅 경로</h4>
        <div className="flex items-center space-x-2 overflow-x-auto">
          {urisStatus.routing_path.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                {step}
              </div>
              {index < urisStatus.routing_path.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 성능 메트릭 */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">성능 메트릭</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">P95 응답시간</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {urisStatus.performance_metrics.p95_response_time}ms
            </span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-gray-700">에러율</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {(urisStatus.performance_metrics.error_rate * 100).toFixed(2)}%
            </span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">처리량</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {urisStatus.performance_metrics.throughput}/sec
            </span>
          </div>
        </div>
      </div>

      {/* 품질 게이트 */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-3">품질 게이트</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Circuit Breaker</span>
            <div className={`mt-1 px-2 py-1 rounded text-sm font-medium inline-block ${
              urisStatus.quality_gates.circuit_breaker === 'CLOSED' ? 'bg-green-100 text-green-800' :
              urisStatus.quality_gates.circuit_breaker === 'HALF_OPEN' ? 'bg-amber-100 text-amber-800' :
              'bg-red-100 text-red-800'
            }`}>
              {urisStatus.quality_gates.circuit_breaker}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">DLQ 카운트</span>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {urisStatus.quality_gates.dlq_count}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Saga 보상</span>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {urisStatus.quality_gates.saga_compensations}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
