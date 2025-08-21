// 제한된 자동 모드 - 과도한 자동화 방지
export interface LimitedAutoModeConfig {
  maxExecutionTime: number;      // 최대 실행 시간 (ms)
  maxOperations: number;         // 최대 작업 수
  maxConcurrentTasks: number;    // 최대 동시 작업 수
  safetyTimeout: number;         // 안전 타임아웃 (ms)
  userApprovalThreshold: number; // 사용자 승인 임계값
}

export class LimitedAutoMode {
  private config: LimitedAutoModeConfig;
  private currentOperations = 0;
  private startTime = Date.now();
  private activeTasks = new Set<string>();

  constructor(config: Partial<LimitedAutoModeConfig> = {}) {
    this.config = {
      maxExecutionTime: 0,            // 제한 없음 (무제한)
      maxOperations: 3,               // 최대 3개 작업
      maxConcurrentTasks: 2,          // 최대 2개 동시 작업
      safetyTimeout: 30000,           // 30초 안전 타임아웃
      userApprovalThreshold: 2,       // 2개 작업 후 승인 필요
      ...config
    };
  }

  // 작업 실행 전 제한 사항 확인
  canExecute(taskName: string): { allowed: boolean; reason?: string } {
    // 1. 최대 실행 시간 체크 (제한 없음)
    if (this.config.maxExecutionTime > 0 && Date.now() - this.startTime > this.config.maxExecutionTime) {
      return { 
        allowed: false, 
        reason: `최대 실행 시간 초과 (${this.config.maxExecutionTime}ms)` 
      };
    }

    // 2. 최대 작업 수 체크
    if (this.currentOperations >= this.config.maxOperations) {
      return { 
        allowed: false, 
        reason: `최대 작업 수 초과 (${this.config.maxOperations}개)` 
      };
    }

    // 3. 최대 동시 작업 수 체크
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      return { 
        allowed: false, 
        reason: `최대 동시 작업 수 초과 (${this.config.maxConcurrentTasks}개)` 
      };
    }

    // 4. 사용자 승인 임계값 체크
    if (this.currentOperations >= this.config.userApprovalThreshold) {
      return { 
        allowed: false, 
        reason: `사용자 승인 필요 (${this.config.userApprovalThreshold}개 작업 완료)` 
      };
    }

    return { allowed: true };
  }

  // 작업 시작
  startTask(taskName: string): boolean {
    const check = this.canExecute(taskName);
    if (!check.allowed) {
      console.warn(`🚫 작업 차단: ${taskName} - ${check.reason}`);
      return false;
    }

    this.currentOperations++;
    this.activeTasks.add(taskName);
    console.log(`✅ 작업 시작: ${taskName} (${this.currentOperations}/${this.config.maxOperations})`);
    return true;
  }

  // 작업 완료
  completeTask(taskName: string): void {
    this.activeTasks.delete(taskName);
    console.log(`✅ 작업 완료: ${taskName} (남은 작업: ${this.activeTasks.size}개)`);
  }

  // 리셋
  reset(): void {
    this.currentOperations = 0;
    this.startTime = Date.now();
    this.activeTasks.clear();
    console.log('🔄 제한된 자동 모드 리셋됨');
  }

  // 상태 확인
  getStatus() {
    return {
      currentOperations: this.currentOperations,
      maxOperations: this.config.maxOperations,
      activeTasks: Array.from(this.activeTasks),
      maxConcurrentTasks: this.config.maxConcurrentTasks,
      elapsedTime: Date.now() - this.startTime,
      maxExecutionTime: this.config.maxExecutionTime,
      needsUserApproval: this.currentOperations >= this.config.userApprovalThreshold
    };
  }
}

// 글로벌 인스턴스
export const limitedAutoMode = new LimitedAutoMode();

// 데코레이터 함수
export function withLimitedAutoMode(taskName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      if (!limitedAutoMode.startTask(taskName)) {
        throw new Error(`작업 실행이 제한됨: ${taskName}`);
      }
      
      try {
        const result = method.apply(this, args);
        limitedAutoMode.completeTask(taskName);
        return result;
      } catch (error) {
        limitedAutoMode.completeTask(taskName);
        throw error;
      }
    };
    
    return descriptor;
  };
}
