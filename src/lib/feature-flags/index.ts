/**
 * Feature Flags 시스템
 * 마틴 파울러의 Feature Toggle 패턴 구현
 * 배포와 기능 공개를 분리하여 안전한 점진적 롤아웃 지원
 */

export type FeatureFlagValue = boolean | string | number | object;

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  value?: FeatureFlagValue;
  description?: string;
  tags?: string[];
  rolloutPercentage?: number; // 0-100
  userGroups?: string[];
  environments?: string[];
  expiresAt?: Date;
}

export interface FeatureFlagConfig {
  flags: Record<string, FeatureFlag>;
  environment: string;
  userId?: string;
  userGroups?: string[];
  defaultBehavior?: 'enabled' | 'disabled';
}

class FeatureFlagManager {
  private config: FeatureFlagConfig;
  private overrides: Map<string, boolean> = new Map();
  private evaluationCache: Map<string, boolean> = new Map();

  constructor(config: FeatureFlagConfig) {
    this.config = {
      defaultBehavior: 'disabled',
      ...config
    };
  }

  /**
   * 기능 플래그 평가
   */
  isEnabled(flagKey: string, context?: {
    userId?: string;
    userGroups?: string[];
    properties?: Record<string, any>;
  }): boolean {
    // 오버라이드 확인
    if (this.overrides.has(flagKey)) {
      return this.overrides.get(flagKey)!;
    }

    // 캐시 확인
    const cacheKey = this.getCacheKey(flagKey, context);
    if (this.evaluationCache.has(cacheKey)) {
      return this.evaluationCache.get(cacheKey)!;
    }

    // 플래그 평가
    const result = this.evaluateFlag(flagKey, context);
    this.evaluationCache.set(cacheKey, result);
    return result;
  }

  /**
   * 플래그 값 가져오기
   */
  getValue<T = FeatureFlagValue>(
    flagKey: string,
    defaultValue: T,
    context?: any
  ): T {
    const flag = this.config.flags[flagKey];
    if (!flag || !this.isEnabled(flagKey, context)) {
      return defaultValue;
    }
    return (flag.value ?? defaultValue) as T;
  }

  /**
   * 플래그 평가 로직
   */
  private evaluateFlag(flagKey: string, context?: any): boolean {
    const flag = this.config.flags[flagKey];
    
    if (!flag) {
      return this.config.defaultBehavior === 'enabled';
    }

    // 만료 확인
    if (flag.expiresAt && new Date() > flag.expiresAt) {
      return false;
    }

    // 환경 확인
    if (flag.environments && !flag.environments.includes(this.config.environment)) {
      return false;
    }

    // 기본 활성화 상태
    if (!flag.enabled) {
      return false;
    }

    // 사용자 그룹 확인
    if (flag.userGroups && flag.userGroups.length > 0) {
      const userGroups = context?.userGroups || this.config.userGroups || [];
      const hasMatchingGroup = flag.userGroups.some(group => 
        userGroups.includes(group)
      );
      if (!hasMatchingGroup) {
        return false;
      }
    }

    // 롤아웃 퍼센티지 확인
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const userId = context?.userId || this.config.userId;
      if (!userId) {
        return false;
      }
      const hash = this.hashUserId(userId, flagKey);
      return hash <= flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * 사용자 ID를 해시하여 일관된 롤아웃 결정
   */
  private hashUserId(userId: string, flagKey: string): number {
    const str = `${userId}-${flagKey}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  /**
   * 캐시 키 생성
   */
  private getCacheKey(flagKey: string, context?: any): string {
    const parts = [flagKey];
    if (context?.userId) parts.push(context.userId);
    if (context?.userGroups) parts.push(context.userGroups.join(','));
    return parts.join(':');
  }

  /**
   * 런타임 오버라이드 설정 (테스트/디버깅용)
   */
  override(flagKey: string, enabled: boolean): void {
    this.overrides.set(flagKey, enabled);
    this.clearCache();
  }

  /**
   * 오버라이드 제거
   */
  removeOverride(flagKey: string): void {
    this.overrides.delete(flagKey);
    this.clearCache();
  }

  /**
   * 모든 오버라이드 제거
   */
  clearOverrides(): void {
    this.overrides.clear();
    this.clearCache();
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.evaluationCache.clear();
  }

  /**
   * 활성화된 기능 목록
   */
  getEnabledFeatures(context?: any): string[] {
    return Object.keys(this.config.flags)
      .filter(key => this.isEnabled(key, context));
  }

  /**
   * 플래그 메타데이터 가져오기
   */
  getFlagMetadata(flagKey: string): FeatureFlag | undefined {
    return this.config.flags[flagKey];
  }

  /**
   * 모든 플래그 목록
   */
  getAllFlags(): Record<string, FeatureFlag> {
    return this.config.flags;
  }

  /**
   * 환경 변경
   */
  setEnvironment(environment: string): void {
    this.config.environment = environment;
    this.clearCache();
  }

  /**
   * 사용자 컨텍스트 업데이트
   */
  updateUserContext(userId?: string, userGroups?: string[]): void {
    this.config.userId = userId;
    this.config.userGroups = userGroups;
    this.clearCache();
  }
}

// 싱글톤 인스턴스
let instance: FeatureFlagManager | null = null;

/**
 * Feature Flag Manager 초기화
 */
export function initFeatureFlags(config: FeatureFlagConfig): FeatureFlagManager {
  instance = new FeatureFlagManager(config);
  return instance;
}

/**
 * Feature Flag Manager 인스턴스 가져오기
 */
export function getFeatureFlags(): FeatureFlagManager {
  if (!instance) {
    throw new Error('Feature flags not initialized. Call initFeatureFlags first.');
  }
  return instance;
}

/**
 * 간편 헬퍼 함수들
 */
export function isFeatureEnabled(flagKey: string, context?: any): boolean {
  return getFeatureFlags().isEnabled(flagKey, context);
}

export function getFeatureValue<T = FeatureFlagValue>(
  flagKey: string,
  defaultValue: T,
  context?: any
): T {
  return getFeatureFlags().getValue(flagKey, defaultValue, context);
}

export default FeatureFlagManager;