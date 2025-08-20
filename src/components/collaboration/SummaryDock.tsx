'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Server,
  Database,
  Cpu,
  HardDrive
} from 'lucide-react';

interface CollabMessage {
  id: string;
  from: 'gpt5' | 'claude' | 'cursor';
  message: string;
  timestamp: string;
  status: 'pending' | 'sent' | 'received' | 'error';
}

interface ConsensusResult {
  score: number;
  status: 'pending' | 'agreed' | 'disagreed' | 'error';
  lastUpdate: string;
  participants: string[];
}

interface TerminalState {
  id: 'T1' | 'T2' | 'T3' | 'T4';
  name: string;
  port: number;
  status: 'online' | 'offline' | 'error' | 'starting';
  lastHeartbeat: string;
  load: number;
  memory: number;
}

interface SummaryDockProps {
  collaborationMessages?: CollabMessage[];
  consensusStatus?: ConsensusResult;
  terminalStates?: TerminalState[];
  currentPhase?: string;
}

export default function SummaryDock({ 
  collaborationMessages = [],
  consensusStatus,
  terminalStates = [],
  currentPhase = 'Phase 1'
}: SummaryDockProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // 샘플 데이터 (실제로는 API에서 가져옴)
  const sampleTerminalStates: TerminalState[] = [
    {
      id: 'T1',
      name: 'Main Terminal',
      port: 3000,
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      load: 45,
      memory: 68
    },
    {
      id: 'T2',
      name: 'Jobs Terminal',
      port: 8080,
      status: 'online',
      lastHeartbeat: new Date(Date.now() - 5000).toISOString(),
      load: 72,
      memory: 85
    },
    {
      id: 'T3',
      name: 'T2VDP Terminal',
      port: 8082,
      status: 'starting',
      lastHeartbeat: new Date(Date.now() - 15000).toISOString(),
      load: 0,
      memory: 0
    },
    {
      id: 'T4',
      name: 'Storage Terminal',
      port: 8083,
      status: 'online',
      lastHeartbeat: new Date(Date.now() - 2000).toISOString(),
      load: 23,
      memory: 42
    }
  ];

  const sampleConsensusStatus: ConsensusResult = {
    score: 0.91,
    status: 'agreed',
    lastUpdate: new Date().toISOString(),
    participants: ['GPT-5 Pro', 'ClaudeCode', 'Cursor']
  };

  const [terminals, setTerminals] = useState<TerminalState[]>(sampleTerminalStates);
  const [consensus, setConsensus] = useState<ConsensusResult>(sampleConsensusStatus);
  const [dlqCount, setDlqCount] = useState(0);

  // 자동 새로고침 (30초 간격으로 변경)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 30000); // 5초 → 30초로 변경

    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    try {
      // 실제로는 API 호출
      console.log('Refreshing collaboration data...');
      setLastRefresh(new Date());
      
      // DLQ 카운트 시뮬레이션
      setDlqCount(Math.floor(Math.random() * 5));
      
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const getTerminalIcon = (id: string) => {
    switch (id) {
      case 'T1': return <Server className="w-4 h-4" />;
      case 'T2': return <Database className="w-4 h-4" />;
      case 'T3': return <Cpu className="w-4 h-4" />;
      case 'T4': return <HardDrive className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'starting': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-50 border-green-200 text-green-800';
      case 'offline': return 'bg-red-50 border-red-200 text-red-800';
      case 'starting': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getConsensusColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPhaseProgress = (phase: string) => {
    switch (phase) {
      case 'Phase 1': return 33;
      case 'Phase 2': return 66;
      case 'Phase 3': return 100;
      default: return 0;
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed right-4 top-4 z-50 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <Users className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed right-4 top-4 z-50 w-80 h-3/5 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <h3 className="font-semibold">AI Collaboration</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshData}
            className="p-1 hover:bg-blue-700 rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-blue-700 rounded transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4 space-y-4 overflow-y-auto h-full">
        {/* 터미널 상태 */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <Server className="w-4 h-4" />
            <span>Terminal Status</span>
          </h4>
          <div className="space-y-2">
            {terminals.map((terminal) => (
              <div
                key={terminal.id}
                className={`p-3 rounded-lg border ${getStatusColor(terminal.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getTerminalIcon(terminal.id)}
                    <span className="font-medium">{terminal.name}</span>
                  </div>
                  {getStatusIcon(terminal.status)}
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Port:</span>
                    <span className="font-mono">{terminal.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Load:</span>
                    <span>{terminal.load}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory:</span>
                    <span>{terminal.memory}%</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Last: {new Date(terminal.lastHeartbeat).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 합의 점수 */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Consensus Score</span>
          </h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Agreement Level</span>
              <span className={`font-bold ${getConsensusColor(consensus.score)}`}>
                {Math.round(consensus.score * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full ${
                  consensus.score >= 0.8 ? 'bg-green-500' : 
                  consensus.score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${consensus.score * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-600">
              Status: {consensus.status} | 
              Participants: {consensus.participants.length}
            </div>
          </div>
        </div>

        {/* 현재 페이즈 */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Current Phase</span>
          </h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{currentPhase}</span>
              <span className="text-sm font-bold text-blue-600">
                {getPhaseProgress(currentPhase)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${getPhaseProgress(currentPhase)}%` }}
              />
            </div>
            <div className="text-xs text-gray-600">
              Phase 1: Summary Dock | Phase 2: Platform Wizard | Phase 3: Schema Validator
            </div>
          </div>
        </div>

        {/* DLQ 통계 */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>DLQ Stats</span>
          </h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Failed Jobs</span>
              <span className={`font-bold ${dlqCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {dlqCount}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* 새로고침 상태 */}
        <div className="text-xs text-gray-500 text-center">
          Auto-refresh every 30s | Last: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
