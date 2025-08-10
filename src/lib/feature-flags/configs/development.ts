import { FeatureFlagConfig } from '../index';

/**
 * 개발 환경 Feature Flags 설정
 */
export const developmentFlags: FeatureFlagConfig = {
  environment: 'development',
  defaultBehavior: 'enabled', // 개발 환경에서는 기본적으로 활성화
  flags: {
    // 새로운 대시보드 UI
    'new-dashboard': {
      key: 'new-dashboard',
      enabled: true,
      description: '새로운 대시보드 UI 디자인',
      tags: ['ui', 'experimental'],
      environments: ['development', 'staging'],
      rolloutPercentage: 100, // 개발 환경에서는 100% 활성화
    },

    // AI 기반 추천 시스템
    'ai-recommendations': {
      key: 'ai-recommendations',
      enabled: true,
      description: 'AI 기반 콘텐츠 추천 기능',
      tags: ['ai', 'backend'],
      environments: ['development'],
      rolloutPercentage: 100,
    },

    // 실시간 협업 기능
    'realtime-collaboration': {
      key: 'realtime-collaboration',
      enabled: true,
      description: '실시간 문서 협업 기능',
      tags: ['collaboration', 'websocket'],
      environments: ['development', 'staging'],
      userGroups: ['beta-testers', 'internal'],
    },

    // 성능 모니터링 대시보드
    'performance-monitoring': {
      key: 'performance-monitoring',
      enabled: true,
      description: '상세 성능 모니터링 대시보드',
      tags: ['monitoring', 'devtools'],
      environments: ['development', 'staging', 'production'],
      userGroups: ['admins', 'developers'],
    },

    // 고급 검색 기능
    'advanced-search': {
      key: 'advanced-search',
      enabled: true,
      description: 'Elasticsearch 기반 고급 검색',
      tags: ['search', 'backend'],
      environments: ['development', 'staging'],
      rolloutPercentage: 100,
    },

    // 다크 모드
    'dark-mode': {
      key: 'dark-mode',
      enabled: true,
      description: '다크 모드 테마 지원',
      tags: ['ui', 'theme'],
      value: {
        defaultTheme: 'light',
        allowUserPreference: true,
      },
      environments: ['development', 'staging', 'production'],
    },

    // 새로운 결제 시스템
    'new-payment-system': {
      key: 'new-payment-system',
      enabled: false, // 개발 중이므로 비활성화
      description: 'Stripe 기반 새로운 결제 시스템',
      tags: ['payment', 'critical'],
      environments: ['development'],
      userGroups: ['payment-team'],
    },

    // A/B 테스트 예제
    'checkout-flow-v2': {
      key: 'checkout-flow-v2',
      enabled: true,
      description: '개선된 체크아웃 플로우',
      tags: ['ab-test', 'conversion'],
      environments: ['development', 'staging'],
      rolloutPercentage: 50, // 50% 사용자에게만 노출
    },

    // 임시 기능 (만료일 설정)
    'holiday-promotion': {
      key: 'holiday-promotion',
      enabled: true,
      description: '연말 프로모션 배너',
      tags: ['marketing', 'temporary'],
      value: {
        discountPercentage: 20,
        bannerText: '연말 특별 할인!',
      },
      environments: ['development', 'staging', 'production'],
      expiresAt: new Date('2024-12-31'),
    },

    // 디버그 도구
    'debug-panel': {
      key: 'debug-panel',
      enabled: true,
      description: '개발자 디버그 패널',
      tags: ['devtools', 'debug'],
      environments: ['development'],
      userGroups: ['developers'],
    },
  },
};