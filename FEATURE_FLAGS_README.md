# Feature Flags 시스템 가이드

## 🎯 목적

마틴 파울러의 Feature Toggle 패턴을 구현하여 **배포와 기능 공개를 분리**합니다.
이를 통해 긴 기능 브랜치를 피하고, 충돌 확률을 줄이며, 안전한 롤백과 부분 배포를 가능하게 합니다.

## 🚀 주요 이점

1. **병렬 개발 지원**: 여러 팀이 메인 브랜치에서 동시 작업 가능
2. **점진적 롤아웃**: 특정 비율의 사용자에게만 먼저 공개
3. **즉시 롤백**: 코드 배포 없이 기능 비활성화 가능
4. **A/B 테스팅**: 다양한 버전을 동시에 테스트
5. **사용자 그룹 타겟팅**: 베타 테스터, 프리미엄 사용자 등 특정 그룹에만 공개

## 📁 프로젝트 구조

```
src/lib/feature-flags/
├── index.ts                 # 핵심 Feature Flag Manager
├── configs/
│   ├── development.ts       # 개발 환경 플래그 설정
│   └── production.ts        # 프로덕션 환경 플래그 설정
├── react/
│   └── hooks.tsx           # React Hooks 및 컴포넌트
└── examples/
    └── usage.tsx           # 사용 예제

```

## 🔧 설정 방법

### 1. 초기 설정

```typescript
// app.tsx
import { FeatureFlagProvider } from '@/lib/feature-flags/react/hooks';
import { developmentFlags } from '@/lib/feature-flags/configs/development';
import { productionFlags } from '@/lib/feature-flags/configs/production';

function App() {
  const config = process.env.NODE_ENV === 'production' 
    ? productionFlags 
    : developmentFlags;

  return (
    <FeatureFlagProvider 
      config={config}
      userId="user-123"
      userGroups={['beta-testers']}
    >
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

### 2. 플래그 정의

```typescript
// configs/development.ts
export const developmentFlags = {
  environment: 'development',
  flags: {
    'new-feature': {
      key: 'new-feature',
      enabled: true,
      description: '새로운 기능',
      rolloutPercentage: 100,  // 개발에서는 100%
      environments: ['development', 'staging'],
    }
  }
};
```

## 💻 사용 방법

### Hook 사용

```typescript
function MyComponent() {
  const isEnabled = useFeatureFlag('new-feature');
  
  if (isEnabled) {
    return <NewFeature />;
  }
  return <OldFeature />;
}
```

### FeatureGate 컴포넌트

```typescript
<FeatureGate flag="new-feature">
  <NewFeature />
</FeatureGate>

// fallback 제공
<FeatureGate flag="new-feature" fallback={<OldFeature />}>
  <NewFeature />
</FeatureGate>
```

### A/B 테스팅

```typescript
<ABTest
  flag="checkout-flow-v2"
  variantA={<CheckoutV1 />}
  variantB={<CheckoutV2 />}
/>
```

## 🎯 롤아웃 전략

### 1. 점진적 롤아웃

```typescript
{
  'new-dashboard': {
    enabled: true,
    rolloutPercentage: 10,  // 10% 사용자에게만 노출
  }
}
```

### 2. 사용자 그룹 타겟팅

```typescript
{
  'premium-feature': {
    enabled: true,
    userGroups: ['premium-users', 'enterprise-users'],
  }
}
```

### 3. 환경별 설정

```typescript
{
  'experimental-feature': {
    enabled: true,
    environments: ['development', 'staging'],  // 프로덕션 제외
  }
}
```

### 4. 임시 기능 (만료일 설정)

```typescript
{
  'holiday-promotion': {
    enabled: true,
    expiresAt: new Date('2024-12-31'),
    value: {
      discountPercentage: 20,
      bannerText: '연말 특별 할인!'
    }
  }
}
```

## 🚨 긴급 상황 대응

### Kill Switch (긴급 비활성화)

```typescript
// production.ts
{
  'emergency-maintenance': {
    enabled: false,  // 평소에는 false
    value: {
      message: '시스템 점검 중입니다.',
      redirectUrl: '/maintenance'
    }
  }
}
```

필요시 데이터베이스나 관리자 패널에서 즉시 활성화 가능

## 🔍 디버깅

개발 환경에서는 `FeatureFlagDebugPanel`이 자동으로 표시됩니다:

```typescript
<FeatureFlagProvider config={config}>
  <App />
  <FeatureFlagDebugPanel />  // 개발 환경에서만 표시
</FeatureFlagProvider>
```

디버그 패널에서:
- 모든 플래그 상태 확인
- 실시간 토글
- 오버라이드 설정
- 캐시 초기화

## 📊 모니터링

### 플래그 사용 현황 확인

```typescript
const manager = getFeatureFlags();
const enabledFeatures = manager.getEnabledFeatures();
console.log('활성화된 기능:', enabledFeatures);
```

### 플래그 메타데이터

```typescript
const metadata = manager.getFlagMetadata('new-feature');
console.log('플래그 정보:', metadata);
```

## 🔄 CI/CD 통합

### GitHub Actions 예제

```yaml
- name: Deploy with Feature Flags
  run: |
    # 배포 전 플래그 상태 확인
    npm run check-feature-flags
    
    # 안전 모드로 배포
    npm run deploy -- --feature-flag=safe-deployment
```

## ✅ 베스트 프랙티스

1. **짧은 수명 유지**: 플래그는 임시적이어야 함
2. **명확한 네이밍**: `new-checkout-flow` 처럼 구체적으로
3. **정리 주기**: 사용하지 않는 플래그는 정기적으로 제거
4. **문서화**: 각 플래그의 목적과 제거 일정 명시
5. **테스트**: 플래그 on/off 모두 테스트
6. **모니터링**: 플래그 사용률과 성능 영향 추적

## 🚦 플래그 라이프사이클

1. **생성**: 새 기능 개발 시작
2. **테스트**: 개발/스테이징에서 테스트
3. **롤아웃**: 점진적으로 프로덕션 배포
4. **안정화**: 100% 롤아웃 및 모니터링
5. **제거**: 안정화 후 플래그 코드 제거

## 🛠️ 문제 해결

### 플래그가 작동하지 않을 때

1. Provider가 올바르게 설정되었는지 확인
2. 환경 설정이 맞는지 확인
3. 사용자 그룹/ID가 올바른지 확인
4. 캐시를 초기화해보기 (`clearCache()`)
5. 디버그 패널에서 상태 확인

### 성능 이슈

- 캐싱이 활성화되어 있는지 확인
- 불필요한 재평가를 피하도록 컨텍스트 최적화
- 플래그 수가 너무 많으면 그룹화 고려

## 📚 참고 자료

- [마틴 파울러의 Feature Toggle](https://martinfowler.com/articles/feature-toggles.html)
- [Trunk Based Development](https://trunkbaseddevelopment.com/)
- [Progressive Delivery](https://launchdarkly.com/blog/what-is-progressive-delivery/)




