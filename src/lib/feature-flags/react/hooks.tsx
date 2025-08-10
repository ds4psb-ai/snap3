import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import FeatureFlagManager, { FeatureFlagConfig, FeatureFlagValue } from '../index';

/**
 * Feature Flag Context
 */
interface FeatureFlagContextValue {
  manager: FeatureFlagManager;
  isEnabled: (flagKey: string) => boolean;
  getValue: <T = FeatureFlagValue>(flagKey: string, defaultValue: T) => T;
  override: (flagKey: string, enabled: boolean) => void;
  clearOverrides: () => void;
  refreshFlags: () => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

/**
 * Feature Flag Provider 컴포넌트
 */
interface FeatureFlagProviderProps {
  config: FeatureFlagConfig;
  children: ReactNode;
  userId?: string;
  userGroups?: string[];
}

export function FeatureFlagProvider({
  config,
  children,
  userId,
  userGroups,
}: FeatureFlagProviderProps) {
  const [manager] = useState(() => new FeatureFlagManager(config));
  const [refreshKey, setRefreshKey] = useState(0);

  // 사용자 컨텍스트 업데이트
  useEffect(() => {
    manager.updateUserContext(userId, userGroups);
    setRefreshKey(prev => prev + 1);
  }, [manager, userId, userGroups]);

  const contextValue: FeatureFlagContextValue = {
    manager,
    isEnabled: (flagKey: string) => {
      return manager.isEnabled(flagKey, { userId, userGroups });
    },
    getValue: <T = FeatureFlagValue>(flagKey: string, defaultValue: T) => {
      return manager.getValue(flagKey, defaultValue, { userId, userGroups });
    },
    override: (flagKey: string, enabled: boolean) => {
      manager.override(flagKey, enabled);
      setRefreshKey(prev => prev + 1);
    },
    clearOverrides: () => {
      manager.clearOverrides();
      setRefreshKey(prev => prev + 1);
    },
    refreshFlags: () => {
      manager.clearCache();
      setRefreshKey(prev => prev + 1);
    },
  };

  return (
    <FeatureFlagContext.Provider value={contextValue} key={refreshKey}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Feature Flag Hook
 */
export function useFeatureFlag(flagKey: string): boolean {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlag must be used within FeatureFlagProvider');
  }
  return context.isEnabled(flagKey);
}

/**
 * Feature Flag Value Hook
 */
export function useFeatureFlagValue<T = FeatureFlagValue>(
  flagKey: string,
  defaultValue: T
): T {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlagValue must be used within FeatureFlagProvider');
  }
  return context.getValue(flagKey, defaultValue);
}

/**
 * Feature Flag Manager Hook
 */
export function useFeatureFlagManager(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlagManager must be used within FeatureFlagProvider');
  }
  return context;
}

/**
 * Feature Flag Gate 컴포넌트
 * 기능 플래그에 따라 자식 컴포넌트를 조건부 렌더링
 */
interface FeatureGateProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
  invert?: boolean; // true면 플래그가 비활성화일 때 렌더링
}

export function FeatureGate({ 
  flag, 
  children, 
  fallback = null,
  invert = false 
}: FeatureGateProps) {
  const isEnabled = useFeatureFlag(flag);
  const shouldRender = invert ? !isEnabled : isEnabled;
  
  return <>{shouldRender ? children : fallback}</>;
}

/**
 * A/B 테스트 컴포넌트
 * 롤아웃 퍼센티지에 따라 다른 버전을 보여줌
 */
interface ABTestProps {
  flag: string;
  variantA: ReactNode;
  variantB: ReactNode;
}

export function ABTest({ flag, variantA, variantB }: ABTestProps) {
  const isVariantB = useFeatureFlag(flag);
  return <>{isVariantB ? variantB : variantA}</>;
}

/**
 * Feature Flag 디버그 패널
 * 개발 환경에서 플래그를 실시간으로 토글할 수 있는 UI
 */
export function FeatureFlagDebugPanel() {
  const { manager, override, clearOverrides, refreshFlags } = useFeatureFlagManager();
  const [isOpen, setIsOpen] = useState(false);
  const [flags, setFlags] = useState(manager.getAllFlags());

  useEffect(() => {
    setFlags(manager.getAllFlags());
  }, [manager]);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 9999,
      backgroundColor: 'white',
      border: '1px solid #ccc',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      maxWidth: 400,
      maxHeight: 600,
      overflow: 'auto',
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        🚩 Feature Flags {isOpen ? '▼' : '▲'}
      </button>
      
      {isOpen && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => {
                clearOverrides();
                refreshFlags();
              }}
              style={{
                padding: '4px 8px',
                marginRight: 8,
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Clear All Overrides
            </button>
            <button
              onClick={refreshFlags}
              style={{
                padding: '4px 8px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
          
          {Object.entries(flags).map(([key, flag]) => {
            const isEnabled = manager.isEnabled(key);
            return (
              <div key={key} style={{ 
                marginBottom: 12,
                padding: 8,
                backgroundColor: '#f8f9fa',
                borderRadius: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    id={`flag-${key}`}
                    checked={isEnabled}
                    onChange={(e) => {
                      override(key, e.target.checked);
                    }}
                    style={{ marginRight: 8 }}
                  />
                  <label htmlFor={`flag-${key}`} style={{ 
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    flex: 1,
                  }}>
                    {key}
                  </label>
                  <span style={{
                    fontSize: 12,
                    padding: '2px 6px',
                    backgroundColor: isEnabled ? '#28a745' : '#6c757d',
                    color: 'white',
                    borderRadius: 3,
                  }}>
                    {isEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                {flag.description && (
                  <div style={{ fontSize: 12, color: '#6c757d', marginLeft: 24 }}>
                    {flag.description}
                  </div>
                )}
                {flag.tags && flag.tags.length > 0 && (
                  <div style={{ marginTop: 4, marginLeft: 24 }}>
                    {flag.tags.map(tag => (
                      <span key={tag} style={{
                        fontSize: 10,
                        padding: '2px 4px',
                        backgroundColor: '#e9ecef',
                        marginRight: 4,
                        borderRadius: 2,
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100 && (
                  <div style={{ fontSize: 10, color: '#fd7e14', marginLeft: 24, marginTop: 2 }}>
                    📊 Rollout: {flag.rolloutPercentage}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}