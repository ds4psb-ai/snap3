import { FeatureFlagConfig } from '../index';

/**
 * 프로덕션 환경 Feature Flags 설정
 * 프로덕션에서는 보수적으로 기능을 활성화
 */
export const productionFlags: FeatureFlagConfig = {
  environment: 'production',
  defaultBehavior: 'disabled', // 프로덕션에서는 기본적으로 비활성화
  flags: {
    // 새로운 대시보드 UI - 점진적 롤아웃
    'new-dashboard': {
      key: 'new-dashboard',
      enabled: true,
      description: '새로운 대시보드 UI 디자인',
      tags: ['ui', 'experimental'],
      environments: ['production'],
      rolloutPercentage: 10, // 10% 사용자에게만 먼저 노출
      userGroups: ['early-adopters'],
    },

    // AI 기반 추천 시스템 - 비활성화
    'ai-recommendations': {
      key: 'ai-recommendations',
      enabled: false, // 아직 프로덕션 준비 안됨
      description: 'AI 기반 콘텐츠 추천 기능',
      tags: ['ai', 'backend'],
      environments: ['production'],
    },

    // 실시간 협업 기능 - 베타 사용자만
    'realtime-collaboration': {
      key: 'realtime-collaboration',
      enabled: true,
      description: '실시간 문서 협업 기능',
      tags: ['collaboration', 'websocket'],
      environments: ['production'],
      userGroups: ['beta-testers', 'premium-users'],
      rolloutPercentage: 5, // 베타 그룹 중에서도 5%만
    },

    // 성능 모니터링 대시보드 - 관리자만
    'performance-monitoring': {
      key: 'performance-monitoring',
      enabled: true,
      description: '상세 성능 모니터링 대시보드',
      tags: ['monitoring', 'devtools'],
      environments: ['production'],
      userGroups: ['admins'],
    },

    // 고급 검색 기능 - 프리미엄 사용자
    'advanced-search': {
      key: 'advanced-search',
      enabled: true,
      description: 'Elasticsearch 기반 고급 검색',
      tags: ['search', 'backend'],
      environments: ['production'],
      userGroups: ['premium-users', 'enterprise-users'],
    },

    // 다크 모드 - 전체 활성화
    'dark-mode': {
      key: 'dark-mode',
      enabled: true,
      description: '다크 모드 테마 지원',
      tags: ['ui', 'theme'],
      value: {
        defaultTheme: 'light',
        allowUserPreference: true,
      },
      environments: ['production'],
      rolloutPercentage: 100, // 안정적인 기능이므로 100%
    },

    // 새로운 결제 시스템 - 비활성화
    'new-payment-system': {
      key: 'new-payment-system',
      enabled: false, // 프로덕션에서는 완전히 비활성화
      description: 'Stripe 기반 새로운 결제 시스템',
      tags: ['payment', 'critical'],
      environments: ['production'],
    },

    // A/B 테스트 - 활성화
    'checkout-flow-v2': {
      key: 'checkout-flow-v2',
      enabled: true,
      description: '개선된 체크아웃 플로우',
      tags: ['ab-test', 'conversion'],
      environments: ['production'],
      rolloutPercentage: 20, // 20% 사용자에게 테스트
    },

    // 임시 기능 (만료일 설정)
    'holiday-promotion': {
      key: 'holiday-promotion',
      enabled: true,
      description: '연말 프로모션 배너',
      tags: ['marketing', 'temporary'],
      value: {
        discountPercentage: 15, // 프로덕션은 15% 할인
        bannerText: '특별 할인 이벤트!',
      },
      environments: ['production'],
      expiresAt: new Date('2024-12-31'),
    },

    // 디버그 도구 - 프로덕션에서는 비활성화
    'debug-panel': {
      key: 'debug-panel',
      enabled: false,
      description: '개발자 디버그 패널',
      tags: ['devtools', 'debug'],
      environments: ['production'],
    },

    // 긴급 킬 스위치 예제
    'emergency-maintenance': {
      key: 'emergency-maintenance',
      enabled: false, // 평상시에는 비활성화
      description: '긴급 유지보수 모드',
      tags: ['emergency', 'killswitch'],
      value: {
        message: '시스템 점검 중입니다. 잠시 후 다시 시도해주세요.',
        redirectUrl: '/maintenance',
      },
      environments: ['production'],
    },
  },
};