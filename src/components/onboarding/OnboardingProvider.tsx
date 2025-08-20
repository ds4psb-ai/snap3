'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface OnboardingData {
  organization: {
    name: string;
    slug: string;
    industry: string;
  };
  team: {
    size: string;
    roles: string[];
  };
  preferences: {
    notifications: boolean;
    analytics: boolean;
  };
  integrations: {
    selected: string[];
  };
}

type OnboardingAction =
  | { type: 'UPDATE_ORGANIZATION'; payload: Partial<OnboardingData['organization']> }
  | { type: 'UPDATE_TEAM'; payload: Partial<OnboardingData['team']> }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<OnboardingData['preferences']> }
  | { type: 'UPDATE_INTEGRATIONS'; payload: Partial<OnboardingData['integrations']> }
  | { type: 'RESET' };

interface OnboardingContextType {
  data: OnboardingData;
  dispatch: React.Dispatch<OnboardingAction>;
  updateOrganization: (data: Partial<OnboardingData['organization']>) => void;
  updateTeam: (data: Partial<OnboardingData['team']>) => void;
  updatePreferences: (data: Partial<OnboardingData['preferences']>) => void;
  updateIntegrations: (data: Partial<OnboardingData['integrations']>) => void;
  reset: () => void;
}

const initialState: OnboardingData = {
  organization: {
    name: '',
    slug: '',
    industry: '',
  },
  team: {
    size: '',
    roles: [],
  },
  preferences: {
    notifications: true,
    analytics: true,
  },
  integrations: {
    selected: [],
  },
};

function onboardingReducer(state: OnboardingData, action: OnboardingAction): OnboardingData {
  switch (action.type) {
    case 'UPDATE_ORGANIZATION':
      return {
        ...state,
        organization: { ...state.organization, ...action.payload },
      };
    case 'UPDATE_TEAM':
      return {
        ...state,
        team: { ...state.team, ...action.payload },
      };
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };
    case 'UPDATE_INTEGRATIONS':
      return {
        ...state,
        integrations: { ...state.integrations, ...action.payload },
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(onboardingReducer, initialState);

  const contextValue: OnboardingContextType = {
    data,
    dispatch,
    updateOrganization: (payload) => dispatch({ type: 'UPDATE_ORGANIZATION', payload }),
    updateTeam: (payload) => dispatch({ type: 'UPDATE_TEAM', payload }),
    updatePreferences: (payload) => dispatch({ type: 'UPDATE_PREFERENCES', payload }),
    updateIntegrations: (payload) => dispatch({ type: 'UPDATE_INTEGRATIONS', payload }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}