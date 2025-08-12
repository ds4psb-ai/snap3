'use client';

import { useState } from 'react';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { OrganizationStep } from '@/components/onboarding/steps/OrganizationStep';
import { ValidationMessages } from '@/components/onboarding/ValidationMessages';

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  component?: React.ComponentType<any>;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Get started with curation',
  },
  {
    id: 'organization',
    title: 'Organization',
    description: 'Set up your organization',
    component: OrganizationStep,
  },
  {
    id: 'team',
    title: 'Team Setup',
    description: 'Configure your team',
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Set your preferences',
  },
  {
    id: 'integration',
    title: 'Integrations',
    description: 'Connect your tools',
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'Finish setup',
  },
];

export default function OnboardingPage() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const CurrentStepComponent = currentStep.component;

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <StepIndicator 
                steps={ONBOARDING_STEPS}
                currentStepIndex={currentStepIndex}
              />
              
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentStep.title}
                </h2>
                <p className="text-gray-600 mb-6">
                  {currentStep.description}
                </p>

                {Object.keys(errors).length > 0 && (
                  <ValidationMessages errors={errors} className="mb-6" />
                )}

                <div className="mb-8">
                  {CurrentStepComponent ? (
                    <CurrentStepComponent 
                      onNext={handleNext}
                      onError={(fieldErrors: Record<string, string[]>) => setErrors(fieldErrors)}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {currentStep.title}
                      </h3>
                      <p className="text-gray-600 mb-6">
                        This step is under development.
                      </p>
                      <button
                        onClick={handleNext}
                        className="btn-primary"
                        disabled={currentStepIndex >= ONBOARDING_STEPS.length - 1}
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={handlePrevious}
                    disabled={currentStepIndex === 0}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="text-sm text-gray-500">
                    Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
                  </div>
                  
                  {currentStepIndex < ONBOARDING_STEPS.length - 1 && !CurrentStepComponent && (
                    <button
                      onClick={handleNext}
                      className="btn-primary"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OnboardingProvider>
  );
}