'use client';
import { useState, useEffect } from 'react';
import { GitBranch, Users, CheckCircle, AlertCircle, Clock, ArrowRight, Activity } from 'lucide-react';

interface RoutingStep {
  id: string;
  name: string;
  type: 'context' | 'routing' | 'consensus' | 'decision' | 'execution';
  status: 'pending' | 'active' | 'completed' | 'error';
  duration: number;
  agents: string[];
  metrics?: {
    accuracy: number;
    confidence: number;
    throughput: number;
  };
  timestamp: string;
}

interface RoutingFlow {
  id: string;
  context: string;
  steps: RoutingStep[];
  total_duration: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

export default function RoutingFlowChart() {
  const [currentFlow, setCurrentFlow] = useState<RoutingFlow | null>(null);
  const [recentFlows, setRecentFlows] = useState<RoutingFlow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutingData = async () => {
      try {
        const [currentResponse, recentResponse] = await Promise.all([
          fetch('/api/uris/routing/current'),
          fetch('/api/uris/routing/recent')
        ]);

        const currentData = await currentResponse.json();
        const recentData = await recentResponse.json();

        setCurrentFlow(currentData);
        setRecentFlows(recentData);
      } catch (error) {
        console.error('Routing data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutingData();
    const interval = setInterval(fetchRoutingData, 2000); // 2초 간격 업데이트

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'context':
        return <GitBranch className="w-4 h-4" />;
      case 'routing':
        return <Users className="w-4 h-4" />;
      case 'consensus':
        return <CheckCircle className="w-4 h-4" />;
      case 'decision':
        return <AlertCircle className="w-4 h-4" />;
      case 'execution':
        return <Activity className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'active':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'active':
        return <Activity className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900">Routing Flow Chart</h3>
      </div>

      {/* 현재 라우팅 플로우 */}
      {currentFlow && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Current Flow</h4>
            <div className="text-sm text-gray-600">
              Context: <span className="font-medium capitalize">{currentFlow.context}</span>
            </div>
          </div>

          <div className="space-y-4">
            {currentFlow.steps.map((step, index) => (
              <div key={step.id} className="relative">
                <div className={`p-4 border rounded-lg ${getStepColor(step.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStepIcon(step.type)}
                      <span className="font-medium text-gray-900">{step.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStepStatusIcon(step.status)}
                      <span className="text-sm font-medium">
                        {step.duration}ms
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Agents:</span>
                      <div className="flex space-x-1">
                        {step.agents.map((agent) => (
                          <span key={agent} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {agent}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-gray-500">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {step.metrics && (
                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-gray-600">Accuracy:</span>
                        <span className="ml-1 font-medium">{(step.metrics.accuracy * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Confidence:</span>
                        <span className="ml-1 font-medium">{(step.metrics.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Throughput:</span>
                        <span className="ml-1 font-medium">{step.metrics.throughput}/sec</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 화살표 연결 */}
                {index < currentFlow.steps.length - 1 && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 mt-2">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 플로우 요약 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Duration:</span>
                <span className="ml-2 font-medium">{currentFlow.total_duration}ms</span>
              </div>
              <div>
                <span className="text-gray-600">Success Rate:</span>
                <span className="ml-2 font-medium">{(currentFlow.success_rate * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Steps:</span>
                <span className="ml-2 font-medium">{currentFlow.steps.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 최근 라우팅 플로우 */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Flows</h4>
        <div className="space-y-3">
          {recentFlows.slice(0, 5).map((flow) => (
            <div key={flow.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-gray-900 capitalize">{flow.context}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className={`px-2 py-1 rounded ${
                    flow.success_rate > 0.9 ? 'bg-green-100 text-green-800' :
                    flow.success_rate > 0.7 ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {(flow.success_rate * 100).toFixed(0)}%
                  </span>
                  <span className="text-gray-500">{flow.total_duration}ms</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Steps: {flow.steps.length}</span>
                <span>{new Date(flow.updated_at).toLocaleTimeString()}</span>
              </div>

              {/* 미니 플로우 시각화 */}
              <div className="mt-2 flex items-center space-x-1">
                {flow.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${
                      step.status === 'completed' ? 'bg-green-500' :
                      step.status === 'active' ? 'bg-blue-500' :
                      step.status === 'error' ? 'bg-red-500' :
                      'bg-gray-300'
                    }`}></div>
                    {index < flow.steps.length - 1 && (
                      <div className="w-1 h-0.5 bg-gray-300 mx-1"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
