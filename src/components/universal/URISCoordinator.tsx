'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, Zap, Target } from 'lucide-react';

interface AgentStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  role: string;
  port: number;
  lastSeen: string;
  performance: {
    responseTime: number;
    successRate: number;
    activeConnections: number;
  };
}

interface RoutingDecision {
  id: string;
  timestamp: string;
  context: string;
  decision: string;
  target: string;
  confidence: number;
  executionTime: number;
}

interface ConsensusProgress {
  totalAgents: number;
  activeAgents: number;
  consensusLevel: number;
  lastUpdate: string;
  pendingDecisions: number;
}

interface URISCoordinatorProps {
  agentStatus: AgentStatus[];
  routingDecisions: RoutingDecision[];
  consensusProgress: ConsensusProgress;
}

const useURISStatus = () => {
  return useQuery({
    queryKey: ['uris-status'],
    queryFn: () => fetch('/api/uris/status').then(res => res.json()),
    refetchInterval: 5000 // 5초마다 업데이트
  });
};

const useURISAgents = () => {
  return useQuery({
    queryKey: ['uris-agents'],
    queryFn: () => fetch('/api/uris/agents').then(res => res.json()),
    refetchInterval: 5000
  });
};

const useURISTerminals = () => {
  return useQuery({
    queryKey: ['uris-terminals'],
    queryFn: () => fetch('/api/uris/terminals').then(res => res.json()),
    refetchInterval: 5000
  });
};

const useURISRouting = () => {
  return useQuery({
    queryKey: ['uris-routing'],
    queryFn: () => fetch('/api/uris/routing/current').then(res => res.json()),
    refetchInterval: 3000
  });
};

export default function URISCoordinator() {
  const { data: statusData, isLoading: statusLoading } = useURISStatus();
  const { data: agentsData, isLoading: agentsLoading } = useURISAgents();
  const { data: terminalsData, isLoading: terminalsLoading } = useURISTerminals();
  const { data: routingData, isLoading: routingLoading } = useURISRouting();

  const isLoading = statusLoading || agentsLoading || terminalsLoading || routingLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">URIS Coordination Dashboard</h2>
          <p className="text-gray-600">Universal Recursive Improvement System</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          <Activity className="w-4 h-4 mr-2" />
          Live
        </Badge>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentsData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {agentsData?.active || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{terminalsData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {terminalsData?.operational || 0} operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Routing Decisions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routingData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {routingData?.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consensus Level</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusData?.consensus || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {statusData?.lastUpdate || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentsData?.agents?.map((agent: any) => (
              <div key={agent.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{agent.name}</h3>
                  <Badge 
                    variant={agent.status === 'online' ? 'default' : 'destructive'}
                    className={agent.status === 'online' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {agent.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{agent.role}</p>
                <p className="text-xs text-gray-500">Port: {agent.port}</p>
                <p className="text-xs text-gray-500">Last seen: {agent.lastSeen}</p>
                {agent.performance && (
                  <div className="mt-2 text-xs">
                    <p>Response: {agent.performance.responseTime}ms</p>
                    <p>Success: {agent.performance.successRate}%</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Routing Decisions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Routing Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {routingData?.decisions?.slice(0, 5).map((decision: any) => (
              <div key={decision.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{decision.context}</p>
                    <p className="text-sm text-gray-600">
                      Decision: {decision.decision} → {decision.target}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{decision.confidence}%</p>
                    <p className="text-xs text-gray-500">{decision.executionTime}ms</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{decision.timestamp}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
