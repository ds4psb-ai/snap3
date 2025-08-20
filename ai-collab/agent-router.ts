import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface ContextRules {
  version: number;
  signals: {
    file_patterns: Record<string, string[]>;
    commit_conventions: Record<string, {weight: number}>;
    code_complexity: {high_threshold: number};
  };
  routing: {
    weights_by_context: Record<string, Record<string, number>>;
  };
  thresholds: {
    consensus: {proceed: number; modify: number; reject: number};
  };
}

interface DecisionResult {
  context: string;
  assignees: string[];
  weights: Record<string, number>;
  decision: 'proceed' | 'modify' | 'reject';
  consensus_score: number;
  recommendations: string[];
  correlation_id: string;
}

class UniversalAgentRouter {
  private rules: ContextRules;
  private recentSuccess: Record<string, number> = {};
  
  constructor() {
    const rulesPath = path.join(__dirname, '../configs/context-engine.rules.yaml');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    this.rules = yaml.load(rulesContent) as ContextRules;
  }

  detectContext(fileChanges: string[], commitMessage?: string): string {
    const scores: Record<string, number> = {};
    
    // 파일 패턴 기반 점수 계산
    for (const [context, patterns] of Object.entries(this.rules.signals.file_patterns)) {
      scores[context] = 0;
      
      for (const file of fileChanges) {
        for (const pattern of patterns) {
          const regex = new RegExp(pattern.replace('**/', '.*').replace('*', '[^/]*'));
          if (regex.test(file)) {
            scores[context] += 1;
          }
        }
      }
    }
    
    // 커밋 메시지 기반 가중치 적용
    if (commitMessage) {
      for (const [convention, config] of Object.entries(this.rules.signals.commit_conventions)) {
        if (commitMessage.startsWith(convention + ':')) {
          const topContext = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
          if (topContext) {
            scores[topContext[0]] *= config.weight;
          }
        }
      }
    }
    
    // 최고 점수 컨텍스트 반환
    const topContext = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return topContext ? topContext[0] : 'architecture';
  }

  async routeDecision(context: string, correlationId: string): Promise<DecisionResult> {
    const contextWeights = this.rules.routing.weights_by_context[context] || {};
    
    // SLO 상태 확인
    const sloData = await this.checkSLOStatus();
    
    // 동적 가중치 계산 (성과 기반)
    const finalWeights = this.calculateDynamicWeights(contextWeights, context);
    
    // 합의 점수 계산
    const consensusScore = this.calculateConsensusScore(finalWeights, sloData);
    
    // 의사결정
    let decision: 'proceed' | 'modify' | 'reject' = 'proceed';
    if (consensusScore < this.rules.thresholds.consensus.reject) {
      decision = 'reject';
    } else if (consensusScore < this.rules.thresholds.consensus.proceed) {
      decision = 'modify';
    }

    return {
      context,
      assignees: Object.keys(finalWeights),
      weights: finalWeights,
      decision,
      consensus_score: consensusScore,
      recommendations: this.generateRecommendations(context, consensusScore, sloData),
      correlation_id: correlationId
    };
  }

  private async checkSLOStatus(): Promise<any> {
    try {
      const response = await fetch('http://localhost:8080/api/circuit-breaker/status');
      return await response.json();
    } catch {
      return { state: { state: 'UNKNOWN' }, performance_metrics: {} };
    }
  }

  private calculateDynamicWeights(baseWeights: Record<string, number>, context: string): Record<string, number> {
    const weights = { ...baseWeights };
    
    // 최근 성과 기반 조정
    for (const agent of Object.keys(weights)) {
      const successRate = this.recentSuccess[`${agent}_${context}`] || 1.0;
      weights[agent] *= successRate;
    }
    
    // 정규화
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      for (const agent of Object.keys(weights)) {
        weights[agent] /= total;
      }
    }
    
    return weights;
  }

  private calculateConsensusScore(weights: Record<string, number>, sloData: any): number {
    let score = 0.7; // 기본 점수
    
    // SLO 상태 반영
    if (sloData.t1_api_breaker?.state === 'CLOSED') score += 0.1;
    if (sloData.vertex_api_breaker?.state === 'CLOSED') score += 0.05;
    
    // 시스템 건강도 반영
    if (sloData.system_uptime > 3600) score += 0.05; // 1시간 이상 안정 운영
    
    // 가중치 집중도 반영 (분산이 낮을수록 합의 강함)
    const entropy = -Object.values(weights).reduce((sum, w) => w > 0 ? sum + w * Math.log(w) : sum, 0);
    const maxEntropy = Math.log(Object.keys(weights).length);
    score += (1 - entropy / maxEntropy) * 0.1;
    
    return Math.min(score, 1.0);
  }

  private generateRecommendations(context: string, score: number, sloData: any): string[] {
    const recommendations: string[] = [];
    
    if (score < 0.8) {
      recommendations.push('합의 점수가 낮습니다. 에이전트 협업 검토 필요');
    }
    
    if (sloData.t1_api_breaker?.state !== 'CLOSED') {
      recommendations.push('T1 API Circuit Breaker 상태 확인 필요');
    }
    
    if (sloData.vertex_api_breaker?.state !== 'CLOSED') {
      recommendations.push('Vertex API 안정성 문제. 대체 처리 고려');
    }
    
    if (context === 'frontend') {
      recommendations.push('Frontend 컨텍스트: Cursor 주도 개발 권장');
    } else if (context === 'backend') {
      recommendations.push('Backend 컨텍스트: ClaudeCode 주도 개발 권장');
    } else if (context === 'performance') {
      recommendations.push('Performance 컨텍스트: T2/T3 터미널 협업 권장');
    }
    
    return recommendations;
  }

  private async checkSLOStatus(): Promise<any> {
    try {
      const response = await fetch('http://localhost:8080/api/circuit-breaker/status');
      return await response.json();
    } catch {
      return { state: { state: 'UNKNOWN' }, performance_metrics: {} };
    }
  }

  private calculateDynamicWeights(baseWeights: Record<string, number>, context: string): Record<string, number> {
    const weights = { ...baseWeights };
    
    // 최근 성과 기반 조정
    for (const agent of Object.keys(weights)) {
      const successRate = this.recentSuccess[`${agent}_${context}`] || 1.0;
      weights[agent] *= successRate;
    }
    
    // 정규화
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    for (const agent of Object.keys(weights)) {
      weights[agent] /= total;
    }
    
    return weights;
  }

  private calculateConsensusScore(weights: Record<string, number>, sloData: any): number {
    let score = 0.7; // 기본 점수
    
    // SLO 상태 반영
    if (sloData.state?.state === 'CLOSED') score += 0.1;
    if (sloData.performance_metrics?.success_rate === '100.00%') score += 0.1;
    
    // 가중치 분산도 반영 (집중도가 높을수록 점수 상승)
    const entropy = -Object.values(weights).reduce((sum, w) => sum + w * Math.log(w), 0);
    score += (1 - entropy / Math.log(Object.keys(weights).length)) * 0.1;
    
    return Math.min(score, 1.0);
  }

  private generateRecommendations(context: string, score: number, sloData: any): string[] {
    const recommendations: string[] = [];
    
    if (score < 0.8) {
      recommendations.push('합의 점수가 낮습니다. 에이전트 협업 검토 필요');
    }
    
    if (sloData.state?.state !== 'CLOSED') {
      recommendations.push('Circuit Breaker가 열린 상태입니다. 시스템 안정성 확인 필요');
    }
    
    if (context === 'frontend') {
      recommendations.push('Frontend 컨텍스트: Cursor 주도 개발 권장');
    } else if (context === 'backend') {
      recommendations.push('Backend 컨텍스트: ClaudeCode 주도 개발 권장');
    }
    
    return recommendations;
  }
}

export const agentRouter = new UniversalAgentRouter();