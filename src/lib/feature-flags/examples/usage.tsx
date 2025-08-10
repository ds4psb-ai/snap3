import React from 'react';
import { 
  FeatureFlagProvider, 
  useFeatureFlag, 
  useFeatureFlagValue,
  FeatureGate,
  ABTest,
  FeatureFlagDebugPanel
} from '../react/hooks';
import { developmentFlags } from '../configs/development';
import { productionFlags } from '../configs/production';

/**
 * 1. 앱 최상위에서 Provider 설정
 */
export function App() {
  const config = process.env.NODE_ENV === 'production' 
    ? productionFlags 
    : developmentFlags;

  // 사용자 정보 (실제로는 인증 시스템에서 가져옴)
  const userId = 'user-123';
  const userGroups = ['beta-testers', 'premium-users'];

  return (
    <FeatureFlagProvider 
      config={config}
      userId={userId}
      userGroups={userGroups}
    >
      <MainApp />
      {/* 개발 환경에서만 디버그 패널 표시 */}
      <FeatureFlagDebugPanel />
    </FeatureFlagProvider>
  );
}

/**
 * 2. Hook을 사용한 조건부 렌더링
 */
function DashboardComponent() {
  const isNewDashboardEnabled = useFeatureFlag('new-dashboard');
  
  if (isNewDashboardEnabled) {
    return <NewDashboard />;
  }
  
  return <LegacyDashboard />;
}

/**
 * 3. FeatureGate 컴포넌트 사용
 */
function NavigationMenu() {
  return (
    <nav>
      <ul>
        <li>홈</li>
        <li>프로필</li>
        
        {/* AI 추천 기능이 활성화된 경우에만 표시 */}
        <FeatureGate flag="ai-recommendations">
          <li>AI 추천</li>
        </FeatureGate>
        
        {/* 고급 검색 기능 - 비활성화시 대체 UI 제공 */}
        <FeatureGate 
          flag="advanced-search"
          fallback={<li>기본 검색</li>}
        >
          <li>고급 검색</li>
        </FeatureGate>
      </ul>
    </nav>
  );
}

/**
 * 4. A/B 테스트 예제
 */
function CheckoutPage() {
  return (
    <div>
      <h1>결제 페이지</h1>
      
      {/* A/B 테스트: 두 가지 체크아웃 플로우 비교 */}
      <ABTest
        flag="checkout-flow-v2"
        variantA={<CheckoutFlowV1 />}
        variantB={<CheckoutFlowV2 />}
      />
    </div>
  );
}

/**
 * 5. 플래그 값 사용 예제
 */
function PromotionBanner() {
  const promotionConfig = useFeatureFlagValue('holiday-promotion', {
    discountPercentage: 0,
    bannerText: '',
  });
  
  if (!promotionConfig.bannerText) {
    return null;
  }
  
  return (
    <div className="promotion-banner">
      <h2>{promotionConfig.bannerText}</h2>
      <p>{promotionConfig.discountPercentage}% 할인!</p>
    </div>
  );
}

/**
 * 6. 실시간 협업 기능 (사용자 그룹 기반)
 */
function DocumentEditor({ documentId }: { documentId: string }) {
  const isCollaborationEnabled = useFeatureFlag('realtime-collaboration');
  
  return (
    <div>
      <h1>문서 편집기</h1>
      
      {isCollaborationEnabled ? (
        <RealtimeCollaborativeEditor documentId={documentId} />
      ) : (
        <StandardEditor documentId={documentId} />
      )}
      
      {/* 협업 기능이 활성화된 경우에만 협업자 목록 표시 */}
      <FeatureGate flag="realtime-collaboration">
        <CollaboratorsList documentId={documentId} />
      </FeatureGate>
    </div>
  );
}

/**
 * 7. 다크 모드 설정
 */
function ThemeSettings() {
  const themeConfig = useFeatureFlagValue('dark-mode', {
    defaultTheme: 'light',
    allowUserPreference: false,
  });
  
  if (!themeConfig.allowUserPreference) {
    return null;
  }
  
  return (
    <div>
      <h3>테마 설정</h3>
      <select defaultValue={themeConfig.defaultTheme}>
        <option value="light">라이트 모드</option>
        <option value="dark">다크 모드</option>
        <option value="auto">시스템 설정 따르기</option>
      </select>
    </div>
  );
}

/**
 * 8. 긴급 유지보수 모드
 */
function MainApp() {
  const maintenanceConfig = useFeatureFlagValue('emergency-maintenance', null);
  
  // 긴급 유지보수 모드가 활성화된 경우
  if (maintenanceConfig) {
    return (
      <div className="maintenance-mode">
        <h1>{maintenanceConfig.message}</h1>
        <a href={maintenanceConfig.redirectUrl}>자세히 보기</a>
      </div>
    );
  }
  
  // 정상 앱 렌더링
  return (
    <div>
      <NavigationMenu />
      <DashboardComponent />
      <PromotionBanner />
      <ThemeSettings />
    </div>
  );
}

/**
 * 9. 서버사이드 사용 예제 (Next.js)
 */
export async function getServerSideProps(context: any) {
  const { initFeatureFlags, isFeatureEnabled } = await import('../index');
  
  // 서버에서 플래그 초기화
  const config = process.env.NODE_ENV === 'production' 
    ? productionFlags 
    : developmentFlags;
    
  initFeatureFlags(config);
  
  // 서버사이드에서 플래그 확인
  const showNewFeature = isFeatureEnabled('new-dashboard', {
    userId: context.req.session?.userId,
    userGroups: context.req.session?.userGroups,
  });
  
  return {
    props: {
      showNewFeature,
    },
  };
}

/**
 * 10. 플래그 기반 라우팅 예제
 */
function AppRouter() {
  const isNewPaymentEnabled = useFeatureFlag('new-payment-system');
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* 새로운 결제 시스템이 활성화된 경우에만 라우트 추가 */}
        {isNewPaymentEnabled && (
          <Route path="/payment/v2" element={<NewPaymentFlow />} />
        )}
        
        {/* 기존 결제 라우트 */}
        <Route 
          path="/payment" 
          element={isNewPaymentEnabled ? <NewPaymentFlow /> : <LegacyPaymentFlow />} 
        />
      </Routes>
    </Router>
  );
}

// 컴포넌트 스텁들 (실제 구현은 별도)
function NewDashboard() { return <div>New Dashboard</div>; }
function LegacyDashboard() { return <div>Legacy Dashboard</div>; }
function CheckoutFlowV1() { return <div>Checkout V1</div>; }
function CheckoutFlowV2() { return <div>Checkout V2</div>; }
function RealtimeCollaborativeEditor({ documentId }: any) { return <div>Realtime Editor</div>; }
function StandardEditor({ documentId }: any) { return <div>Standard Editor</div>; }
function CollaboratorsList({ documentId }: any) { return <div>Collaborators</div>; }
function Home() { return <div>Home</div>; }
function NewPaymentFlow() { return <div>New Payment</div>; }
function LegacyPaymentFlow() { return <div>Legacy Payment</div>; }
function Router({ children }: any) { return <div>{children}</div>; }
function Routes({ children }: any) { return <div>{children}</div>; }
function Route({ path, element }: any) { return element; }