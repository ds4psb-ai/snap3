'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';

interface Metrics {
  responseTime: string;
  throughput: string;
  errorRate: string;
  vdpProcessing: string;
}

interface MetricCardProps {
  label: string;
  value: string;
  target: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'error';
}

const MetricCard = ({ label, value, target, trend, status = 'good' }: MetricCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{label}</h3>
        {getTrendIcon()}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs opacity-75">목표: {target}</div>
    </div>
  );
};

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    responseTime: '0ms',
    throughput: '0 req/s',
    errorRate: '0%',
    vdpProcessing: '0ms'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setError(null);
      
      // T3 메트릭 서버(8082) 연동
      const response = await fetch('http://localhost:8082/metrics', {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setMetrics({
        responseTime: data.http_request_duration_p95 || '0ms',
        throughput: data.requests_per_second || '0 req/s',
        errorRate: data.error_rate_percentage || '0%',
        vdpProcessing: data.vdp_processing_duration_p95 || '0ms'
      });
      
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Metrics fetch error:', err);
      setError(err instanceof Error ? err.message : '메트릭을 불러올 수 없습니다.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // 5초마다 업데이트
    const interval = setInterval(fetchMetrics, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getMetricStatus = (metric: keyof Metrics): 'good' | 'warning' | 'error' => {
    const value = metrics[metric];
    
    switch (metric) {
      case 'responseTime':
        const responseMs = parseInt(value.replace('ms', ''));
        if (responseMs < 200) return 'good';
        if (responseMs < 500) return 'warning';
        return 'error';
        
      case 'throughput':
        const throughput = parseInt(value.replace(' req/s', ''));
        if (throughput > 10) return 'good';
        if (throughput > 5) return 'warning';
        return 'error';
        
      case 'errorRate':
        const errorRate = parseFloat(value.replace('%', ''));
        if (errorRate < 1) return 'good';
        if (errorRate < 5) return 'warning';
        return 'error';
        
      case 'vdpProcessing':
        const processingMs = parseInt(value.replace('ms', ''));
        if (processingMs < 5000) return 'good';
        if (processingMs < 10000) return 'warning';
        return 'error';
        
      default:
        return 'good';
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-gray-600">성능 메트릭을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-red-800">메트릭 오류: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">실시간 성능 대시보드</h2>
        {lastUpdate && (
          <span className="text-sm text-gray-500">
            마지막 업데이트: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="응답시간" 
          value={metrics.responseTime} 
          target="<200ms"
          status={getMetricStatus('responseTime')}
        />
        <MetricCard 
          label="처리량" 
          value={metrics.throughput} 
          target=">10 req/s"
          status={getMetricStatus('throughput')}
        />
        <MetricCard 
          label="에러율" 
          value={metrics.errorRate} 
          target="<1%"
          status={getMetricStatus('errorRate')}
        />
        <MetricCard 
          label="VDP 처리" 
          value={metrics.vdpProcessing} 
          target="<5s"
          status={getMetricStatus('vdpProcessing')}
        />
      </div>
    </div>
  );
}
