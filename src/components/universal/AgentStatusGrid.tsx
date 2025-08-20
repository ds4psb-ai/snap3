'use client';
import { useState, useEffect } from 'react';
import { Monitor, Server, Database, Cloud, Cpu, Memory, Network, Activity } from 'lucide-react';

interface TerminalStatus {
  name: string;
  type: 'T1' | 'T2' | 'T3' | 'T4';
  status: 'online' | 'offline' | 'error';
  cpu_usage: number;
  memory_usage: number;
  network_io: number;
  active_processes: number;
  last_heartbeat: string;
  current_task?: string;
}

interface AgentStatus {
  name: string;
  type: 'ClaudeCode' | 'GPT-5' | 'Cursor';
  status: 'active' | 'idle' | 'error';
  current_task: string;
  performance_score: number;
  response_time: number;
  success_rate: number;
  last_activity: string;
}

export default function AgentStatusGrid() {
  const [terminals, setTerminals] = useState<TerminalStatus[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const [terminalsResponse, agentsResponse] = await Promise.all([
          fetch('/api/uris/terminals'),
          fetch('/api/uris/agents')
        ]);

        const terminalsData = await terminalsResponse.json();
        const agentsData = await agentsResponse.json();

        setTerminals(terminalsData);
        setAgents(agentsData);
      } catch (error) {
        console.error('Status fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 3000); // 3초 간격 업데이트

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'idle':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'offline':
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'T1':
        return <Monitor className="w-4 h-4" />;
      case 'T2':
        return <Server className="w-4 h-4" />;
      case 'T3':
        return <Database className="w-4 h-4" />;
      case 'T4':
        return <Cloud className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'text-green-600';
    if (usage < 80) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900">Agent & Terminal Status Grid</h3>
      </div>

      {/* 터미널 상태 */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Terminal Status (T1-T4)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {terminals.map((terminal) => (
            <div key={terminal.name} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(terminal.type)}
                  <span className="font-medium text-gray-900">{terminal.name}</span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(terminal.status)}`}>
                  {terminal.status.toUpperCase()}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">CPU</span>
                  <span className={`font-medium ${getUsageColor(terminal.cpu_usage)}`}>
                    {terminal.cpu_usage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${terminal.cpu_usage < 50 ? 'bg-green-500' : terminal.cpu_usage < 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${terminal.cpu_usage}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Memory</span>
                  <span className={`font-medium ${getUsageColor(terminal.memory_usage)}`}>
                    {terminal.memory_usage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${terminal.memory_usage < 50 ? 'bg-green-500' : terminal.memory_usage < 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${terminal.memory_usage}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Network</span>
                  <span className="font-medium text-gray-900">
                    {terminal.network_io} MB/s
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Processes</span>
                  <span className="font-medium text-gray-900">
                    {terminal.active_processes}
                  </span>
                </div>

                {terminal.current_task && (
                  <div className="text-xs text-gray-500 mt-2">
                    <span className="font-medium">Current:</span> {terminal.current_task}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-2">
                  Last: {new Date(terminal.last_heartbeat).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 에이전트 상태 */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Agent Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent.name} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-gray-900">{agent.name}</span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {agent.status.toUpperCase()}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Task:</span> {agent.current_task}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Performance</span>
                      <span className={`font-medium ${getUsageColor(agent.performance_score * 100)}`}>
                        {(agent.performance_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full ${agent.performance_score > 0.8 ? 'bg-green-500' : agent.performance_score > 0.6 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${agent.performance_score * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Success Rate</span>
                      <span className={`font-medium ${getUsageColor(agent.success_rate * 100)}`}>
                        {(agent.success_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full ${agent.success_rate > 0.9 ? 'bg-green-500' : agent.success_rate > 0.7 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${agent.success_rate * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Response Time</span>
                  <span className={`font-medium ${agent.response_time < 1000 ? 'text-green-600' : agent.response_time < 3000 ? 'text-amber-600' : 'text-red-600'}`}>
                    {agent.response_time}ms
                  </span>
                </div>

                <div className="text-xs text-gray-400">
                  Last: {new Date(agent.last_activity).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
