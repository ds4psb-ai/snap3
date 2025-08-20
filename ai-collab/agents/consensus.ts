// AutoGen GroupChat Consensus Layer
export interface AgentRole {
  name: 'commander' | 'implementer' | 'ux';
  agent_id: 'gpt5-pro' | 'claude-code' | 'cursor';
  confidence: number;
  proposal: string;
  risks: string[];
  implementation_time: string;
  dependencies: string[];
}

export interface ConsensusResult {
  decision: 'PROCEED' | 'MODIFY' | 'REJECT';
  consensus_score: number; // 0.0-1.0
  risks: string[];
  next_actions: string[];
  rollback_plan: string[];
  estimated_time: string;
  slo_impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

// GPT-5 Pro Consensus Protocol Integration
export interface GPT5ConsensusMessage {
  correlation_id: string;
  analysis_type: 'feasibility' | 'risk' | 'priority';
  recommendation: 'PROCEED' | 'MODIFY' | 'REJECT';
  reasoning: string[];
  confidence: number;
  implementation_notes: string[];
}

// Triangular Formation Protocol (GPT-5 ↔ ClaudeCode ↔ Cursor)
export class TriangularConsensus {
  private agents: Map<string, AgentRole> = new Map();
  
  async addAgentProposal(agent: AgentRole): Promise<void> {
    this.agents.set(agent.agent_id, agent);
  }
  
  async calculateConsensus(): Promise<ConsensusResult> {
    const proposals = Array.from(this.agents.values());
    const avgConfidence = proposals.reduce((sum, p) => sum + p.confidence, 0) / proposals.length;
    
    // Consensus threshold: 0.85+ for PROCEED
    if (avgConfidence >= 0.85) {
      return {
        decision: 'PROCEED',
        consensus_score: avgConfidence,
        risks: this.mergeRisks(proposals),
        next_actions: this.mergeActions(proposals),
        rollback_plan: this.generateRollbackPlan(proposals),
        estimated_time: this.calculateMaxTime(proposals),
        slo_impact: this.assessSLOImpact(proposals)
      };
    }
    
    return {
      decision: avgConfidence >= 0.60 ? 'MODIFY' : 'REJECT',
      consensus_score: avgConfidence,
      risks: this.mergeRisks(proposals),
      next_actions: [],
      rollback_plan: [],
      estimated_time: '0',
      slo_impact: 'HIGH'
    };
  }
  
  private mergeRisks(proposals: AgentRole[]): string[] {
    return [...new Set(proposals.flatMap(p => p.risks))];
  }
  
  private mergeActions(proposals: AgentRole[]): string[] {
    return [...new Set(proposals.flatMap(p => p.proposal.split(';')))];
  }
  
  private generateRollbackPlan(proposals: AgentRole[]): string[] {
    return ['circuit_breaker_open', 'dlq_isolation', 'saga_compensation'];
  }
  
  private calculateMaxTime(proposals: AgentRole[]): string {
    const times = proposals.map(p => parseInt(p.implementation_time) || 0);
    return Math.max(...times) + 'min';
  }
  
  private assessSLOImpact(proposals: AgentRole[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    const hasRisks = proposals.some(p => p.risks.length > 0);
    const avgTime = proposals.reduce((sum, p) => sum + (parseInt(p.implementation_time) || 0), 0) / proposals.length;
    
    if (hasRisks || avgTime > 60) return 'HIGH';
    if (avgTime > 30) return 'MEDIUM';
    return 'LOW';
  }
}