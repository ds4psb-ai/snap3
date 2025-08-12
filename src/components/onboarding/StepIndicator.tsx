'use client';

import { OnboardingStep } from '@/app/onboarding/page';

interface StepIndicatorProps {
  steps: OnboardingStep[];
  currentStepIndex: number;
}

export function StepIndicator({ steps, currentStepIndex }: StepIndicatorProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center ${
              index < steps.length - 1 ? 'flex-1' : ''
            }`}
          >
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStepIndex
                    ? 'bg-green-500 text-white'
                    : index === currentStepIndex
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index < currentStepIndex ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <div
                  className={`text-sm font-medium ${
                    index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </div>
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div className="flex-1 mx-4">
                <div
                  className={`h-0.5 ${
                    index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Mobile step title */}
      <div className="mt-4 sm:hidden">
        <div className="text-sm font-medium text-gray-900">
          {steps[currentStepIndex].title}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Step {currentStepIndex + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}