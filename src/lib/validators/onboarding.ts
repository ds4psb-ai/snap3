import { z } from 'zod';

// Validation schemas
const organizationSchema = z.object({
  name: z.string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be less than 100 characters')
    .trim(),
  slug: z.string()
    .min(3, 'Organization URL must be at least 3 characters')
    .max(50, 'Organization URL must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'URL can only contain lowercase letters, numbers, and hyphens')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), 'URL cannot start or end with a hyphen'),
  industry: z.string().optional(),
});

const teamSchema = z.object({
  size: z.string().optional(),
  roles: z.array(z.string()).optional(),
});

const preferencesSchema = z.object({
  notifications: z.boolean().default(true),
  analytics: z.boolean().default(true),
});

const integrationsSchema = z.object({
  selected: z.array(z.string()).default([]),
});

// Validation messages
export const ValidationMessages = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must be less than ${max} characters`,
  invalidFormat: (field: string) => `${field} format is invalid`,
  slugFormat: 'URL can only contain lowercase letters, numbers, and hyphens',
  slugEdges: 'URL cannot start or end with a hyphen',
  emailInvalid: 'Please enter a valid email address',
  passwordStrength: 'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
  slugTaken: 'This organization name is already taken',
  slugUnavailable: 'Unable to verify organization name availability',
  serverError: 'An error occurred. Please try again.',
};

// Validation functions
export function validateOrganizationData(data: any) {
  try {
    organizationSchema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach(err => {
        const field = err.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(err.message);
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: ['Validation failed'] } };
  }
}

export function validateTeamData(data: any) {
  try {
    teamSchema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach(err => {
        const field = err.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(err.message);
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: ['Validation failed'] } };
  }
}

export function validatePreferencesData(data: any) {
  try {
    preferencesSchema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach(err => {
        const field = err.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(err.message);
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: ['Validation failed'] } };
  }
}

// Progressive validation helper
export function createProgressiveValidator<T>(
  schema: z.ZodSchema<T>,
  debounceMs: number = 300
) {
  let timeoutId: NodeJS.Timeout;
  
  return (data: any, callback: (errors: Record<string, string[]>) => void) => {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      try {
        schema.parse(data);
        callback({});
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string[]> = {};
          error.errors.forEach(err => {
            const field = err.path.join('.');
            if (!errors[field]) {
              errors[field] = [];
            }
            errors[field].push(err.message);
          });
          callback(errors);
        }
      }
    }, debounceMs);
  };
}

// API call helpers
export async function checkSlugAvailability(slug: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/onboarding/organizations/check-slug?slug=${encodeURIComponent(slug)}`);
    
    if (!response.ok) {
      throw new Error('Failed to check slug availability');
    }
    
    const data = await response.json();
    return data.available;
  } catch (error) {
    console.error('Slug availability check failed:', error);
    throw new Error(ValidationMessages.slugUnavailable);
  }
}

export async function completeOnboarding(onboardingData: any) {
  try {
    const response = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onboardingData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to complete onboarding');
    }

    return await response.json();
  } catch (error) {
    console.error('Onboarding completion failed:', error);
    throw new Error(ValidationMessages.serverError);
  }
}