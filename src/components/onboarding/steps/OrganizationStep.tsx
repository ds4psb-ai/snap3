'use client';

import { useState } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { validateOrganizationData, checkSlugAvailability } from '@/lib/validators/onboarding';

interface OrganizationStepProps {
  onNext: () => void;
  onError: (errors: Record<string, string[]>) => void;
}

export function OrganizationStep({ onNext, onError }: OrganizationStepProps) {
  const { data, updateOrganization } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);

  const handleInputChange = (field: keyof typeof data.organization, value: string) => {
    updateOrganization({ [field]: value });
    
    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      updateOrganization({ slug });
    }
  };

  const handleSlugCheck = async (slug: string) => {
    if (!slug || slug.length < 3) return;
    
    setSlugChecking(true);
    try {
      const isAvailable = await checkSlugAvailability(slug);
      if (!isAvailable) {
        onError({
          slug: ['This organization name is already taken. Please choose a different one.']
        });
      } else {
        onError({});
      }
    } catch (error) {
      onError({
        slug: ['Unable to verify organization name availability. Please try again.']
      });
    }
    setSlugChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form data
      const validation = validateOrganizationData(data.organization);
      if (!validation.isValid) {
        onError(validation.errors);
        return;
      }

      // Check slug availability one more time
      const isSlugAvailable = await checkSlugAvailability(data.organization.slug);
      if (!isSlugAvailable) {
        onError({
          slug: ['This organization name is already taken. Please choose a different one.']
        });
        return;
      }

      // Clear errors and proceed
      onError({});
      onNext();
    } catch (error) {
      onError({
        general: ['An error occurred. Please try again.']
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="organizationName" className="form-label">
          Organization Name *
        </label>
        <input
          type="text"
          id="organizationName"
          value={data.organization.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="form-input"
          placeholder="Enter your organization name"
          required
        />
        <p className="form-helper">
          This will be displayed as your organization's public name.
        </p>
      </div>

      <div>
        <label htmlFor="organizationSlug" className="form-label">
          Organization URL *
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
            https://app.company.com/
          </span>
          <input
            type="text"
            id="organizationSlug"
            value={data.organization.slug}
            onChange={(e) => handleInputChange('slug', e.target.value)}
            onBlur={() => handleSlugCheck(data.organization.slug)}
            className="form-input rounded-l-none"
            placeholder="organization-name"
            pattern="[a-z0-9-]+"
            title="Only lowercase letters, numbers, and hyphens are allowed"
            required
          />
        </div>
        {slugChecking && (
          <p className="form-helper text-blue-600">
            Checking availability...
          </p>
        )}
        <p className="form-helper">
          This will be your organization's unique URL. Only lowercase letters, numbers, and hyphens are allowed.
        </p>
      </div>

      <div>
        <label htmlFor="industry" className="form-label">
          Industry
        </label>
        <select
          id="industry"
          value={data.organization.industry}
          onChange={(e) => handleInputChange('industry', e.target.value)}
          className="form-input"
        >
          <option value="">Select your industry</option>
          <option value="technology">Technology</option>
          <option value="healthcare">Healthcare</option>
          <option value="finance">Finance</option>
          <option value="education">Education</option>
          <option value="retail">Retail</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="media">Media & Entertainment</option>
          <option value="nonprofit">Non-profit</option>
          <option value="other">Other</option>
        </select>
        <p className="form-helper">
          This helps us customize your experience.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || slugChecking}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating...' : 'Continue'}
        </button>
      </div>
    </form>
  );
}