'use client';

import PlatformWizard from '@/components/PlatformWizard';

export default function PlatformWizardPage() {
  const handlePlatformSelect = (platform: string) => {
    console.log('플랫폼 선택:', platform);
  };

  const handleValidationComplete = (platform: string, isValid: boolean) => {
    console.log('검증 완료:', platform, isValid);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PlatformWizard 
        onPlatformSelect={handlePlatformSelect}
        onValidationComplete={handleValidationComplete}
      />
    </div>
  );
}
