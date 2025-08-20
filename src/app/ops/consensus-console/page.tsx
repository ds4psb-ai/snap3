'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity, 
  Gauge, 
  RefreshCw,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Clock
} from 'lucide-react';

interface AgentProposal {
  id: string;
  agent: 'gpt5' | 'claude' | 'cursor';
  agentName: string;
  proposal: string;
  reasoning: string;
  confidence: number;
  risks: string[];
  limitations: string[];
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ConsensusResult {
  decision: string;
  risks: string[];
  nextActions: string[];
  rollbackPlan: string;
  confidence: number;
  slaStatus: 'good' | 'warning' | 'error';
  sloBudget: number; // percentage remaining
}

interface SLOMetrics {
  p95ResponseTime: number;
  successRate: number;
  errorBudget: number;
  deploymentFrequency: number;
  leadTime: number;
  changeFailureRate: number;
  mttr: number;
}

export default function ConsensusConsolePage() {
  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
  const [sloMetrics, setSloMetrics] = useState<SLOMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 샘플 데이터 (실제로는 API에서 가져옴)
  const sampleProposals: AgentProposal[] = [
    {
      id: '1',
      agent: 'gpt5',
      agentName: 'GPT-5 Pro (전략)',
      proposal: 'LangGraph + Temporal 기반 오케스트레이션 시스템 즉시 구현',
      reasoning: '현재 VDP 파이프라인의 안정성과 확장성을 근본적으로 개선할 수 있는 가장 효과적인 방법입니다. 에이전틱 워크플로와 내구 실행을 통해 장애 복구와 재시도를 아키텍처 수준에서 처리할 수 있습니다.',
      confidence: 0.95,
      risks: ['구현 복잡도 증가', '학습 곡선', '초기 설정 시간'],
      limitations: ['기존 시스템과의 통합 필요', '팀 교육 시간 필요'],
      timestamp: new Date().toISOString(),
      status: 'approved'
    },
    {
      id: '2',
      agent: 'claude',
      agentName: 'ClaudeCode (백엔드)',
      proposal: 'Circuit Breaker + DLQ + SAGA 패턴 우선 구현',
      reasoning: '신뢰성 패턴을 먼저 구현하여 시스템 안정성을 확보한 후, 점진적으로 고급 기능을 추가하는 것이 안전합니다. 특히 대량 적재 시 실패 비용을 최소화할 수 있습니다.',
      confidence: 0.88,
      risks: ['기존 코드 수정 필요', '테스트 커버리지 확보'],
      limitations: ['점진적 구현으로 인한 일시적 복잡도'],
      timestamp: new Date(Date.now() - 300000).toISOString(),
      status: 'approved'
    },
    {
      id: '3',
      agent: 'cursor',
      agentName: 'Cursor (UX)',
      proposal: 'People+AI 가이드 준수하는 합의 콘솔 UI 구현',
      reasoning: '사용자가 AI 시스템의 의사결정 과정을 이해하고 제어할 수 있도록 투명성과 설명가능성을 제공해야 합니다. 이는 신뢰 구축과 사용자 경험 향상에 필수적입니다.',
      confidence: 0.92,
      risks: ['UI 복잡도 증가', '성능 오버헤드'],
      limitations: ['실시간 업데이트로 인한 리소스 사용'],
      timestamp: new Date(Date.now() - 600000).toISOString(),
      status: 'approved'
    }
  ];

  const sampleConsensus: ConsensusResult = {
    decision: 'Phase-1: LangGraph + Temporal + 신뢰성 패턴 병렬 구현',
    risks: [
      '구현 복잡도 증가로 인한 초기 지연',
      '기존 시스템과의 통합 리스크',
      '팀 학습 곡선'
    ],
    nextActions: [
      'LangGraph 상태그래프 골격 구현 (ClaudeCode)',
      'Temporal 워커 보일러플레이트 생성 (ClaudeCode)',
      'Circuit Breaker + DLQ 패턴 구현 (ClaudeCode)',
      '합의 콘솔 UI 완성 (Cursor)',
      'SLO/SLA 모니터링 대시보드 구현 (Cursor)'
    ],
    rollbackPlan: '기존 시스템으로 즉시 롤백, 점진적 재구현',
    confidence: 0.91,
    slaStatus: 'good',
    sloBudget: 85
  };

  const sampleSLOMetrics: SLOMetrics = {
    p95ResponseTime: 274,
    successRate: 99.7,
    errorBudget: 85,
    deploymentFrequency: 12,
    leadTime: 45,
    changeFailureRate: 2.3,
    mttr: 15
  };

  useEffect(() => {
    // 초기 데이터 로드
    setProposals(sampleProposals);
    setConsensus(sampleConsensus);
    setSloMetrics(sampleSLOMetrics);
    setLoading(false);

    // 자동 새로고침 (30초마다)
    if (autoRefresh) {
      const interval = setInterval(() => {
        // 실제로는 API 호출
        console.log('Auto-refreshing consensus data...');
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getAgentIcon = (agent: string) => {
    switch (agent) {
      case 'gpt5': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'claude': return <Activity className="w-4 h-4 text-green-500" />;
      case 'cursor': return <Users className="w-4 h-4 text-purple-500" />;
      default: return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSLAStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleRollback = () => {
    if (confirm('정말로 현재 결정을 롤백하시겠습니까?')) {
      console.log('Rollback initiated...');
      // 실제 롤백 로직
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">합의 데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">합의 콘솔</h1>
              <p className="text-gray-600 mt-2">
                AI 에이전트들의 제안과 합의 과정을 실시간으로 모니터링합니다
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>새로고침</span>
              </button>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">자동 새로고침</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 좌측: 에이전트별 제안 */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">에이전트 제안</h2>
            
            {proposals.map((proposal) => (
              <div key={proposal.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getAgentIcon(proposal.agent)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{proposal.agentName}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(proposal.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(proposal.status)}
                    <span className="text-sm font-medium text-gray-600">
                      {Math.round(proposal.confidence * 100)}% 확신
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">제안</h4>
                    <p className="text-gray-700">{proposal.proposal}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">근거</h4>
                    <p className="text-gray-700">{proposal.reasoning}</p>
                  </div>

                  {proposal.risks.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">리스크</h4>
                      <ul className="space-y-1">
                        {proposal.risks.map((risk, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {proposal.limitations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">한계</h4>
                      <ul className="space-y-1">
                        {proposal.limitations.map((limitation, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 우측: 합성결론 + 리스크 + 롤백 */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">합의 결과</h2>

            {/* 합의 결정 */}
            {consensus && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">최종 결정</h3>
                  <span className="text-sm font-medium text-gray-600">
                    {Math.round(consensus.confidence * 100)}% 확신
                  </span>
                </div>
                <p className="text-gray-700 mb-4">{consensus.decision}</p>

                {/* 리스크 */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">리스크</h4>
                  <ul className="space-y-1">
                    {consensus.risks.map((risk, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 다음 액션 */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">다음 액션</h4>
                  <ul className="space-y-1">
                    {consensus.nextActions.map((action, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 롤백 버튼 */}
                <button
                  onClick={handleRollback}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>롤백</span>
                </button>
              </div>
            )}

            {/* SLO/SLA 게이지 */}
            {sloMetrics && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">SLO/SLA 상태</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">P95 응답시간</span>
                      <span className="text-sm font-medium text-gray-900">{sloMetrics.p95ResponseTime}ms</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          sloMetrics.p95ResponseTime < 200 ? 'bg-green-500' : 
                          sloMetrics.p95ResponseTime < 500 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((sloMetrics.p95ResponseTime / 1000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">성공률</span>
                      <span className="text-sm font-medium text-gray-900">{sloMetrics.successRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          sloMetrics.successRate >= 99.5 ? 'bg-green-500' : 
                          sloMetrics.successRate >= 99.0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${sloMetrics.successRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">에러 버짓</span>
                      <span className="text-sm font-medium text-gray-900">{sloMetrics.errorBudget}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          sloMetrics.errorBudget > 80 ? 'bg-green-500' : 
                          sloMetrics.errorBudget > 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${sloMetrics.errorBudget}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* DORA 지표 */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">DORA 지표</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">배포 빈도</span>
                      <div className="font-medium">{sloMetrics.deploymentFrequency}/일</div>
                    </div>
                    <div>
                      <span className="text-gray-600">리드 타임</span>
                      <div className="font-medium">{sloMetrics.leadTime}분</div>
                    </div>
                    <div>
                      <span className="text-gray-600">변경 실패율</span>
                      <div className="font-medium">{sloMetrics.changeFailureRate}%</div>
                    </div>
                    <div>
                      <span className="text-gray-600">MTTR</span>
                      <div className="font-medium">{sloMetrics.mttr}분</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
