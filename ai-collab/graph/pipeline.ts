// LangGraph VDP Pipeline State Graph
export const nodes = ["ingest","fetch_media","vdp_extract","enrich_complete","load_bq","finalize"] as const;

export interface PipelineState {
  content_key: string;
  platform: string;
  correlation_id: string;
  current_step: typeof nodes[number];
  metadata: any;
  vdp_data?: any;
  errors: string[];
}

// Circuit Breaker Integration
export interface CircuitBreakerState {
  failures: number;
  last_failure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// DLQ Integration
export interface DLQMessage {
  content_key: string;
  retry_count: number;
  failed_at: string;
  error_reason: string;
  dlq_policy: 'retry' | 'manual' | 'discard';
}

// SAGA Compensation
export interface CompensationAction {
  step: typeof nodes[number];
  action: 'rollback_upload' | 'delete_bq_record' | 'cleanup_temp';
  params: any;
}

// TODO: guards, transitions, compensation logic