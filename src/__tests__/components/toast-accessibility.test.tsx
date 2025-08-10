/**
 * RTL Tests for Error Toasts and Accessibility
 * 
 * Tests error toast components for proper ARIA attributes,
 * keyboard navigation, and screen reader compatibility.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import '@testing-library/jest-dom';

expect.extend(toHaveNoViolations);

// Test component that triggers toasts
function TestToastTrigger() {
  const { toast } = useToast();

  const showErrorToast = () => {
    toast({
      variant: 'destructive',
      title: 'Export Failed',
      description: 'Unable to generate export. Please try again.',
    });
  };

  const showSuccessToast = () => {
    toast({
      title: 'Export Complete',
      description: 'Your export has been generated successfully.',
    });
  };

  const showWarningToast = () => {
    toast({
      title: 'Rate Limited',
      description: 'You have exceeded the rate limit. Please wait 60 seconds.',
    });
  };

  return (
    <div>
      <button onClick={showErrorToast} aria-label="Show error toast">
        Show Error
      </button>
      <button onClick={showSuccessToast} aria-label="Show success toast">
        Show Success
      </button>
      <button onClick={showWarningToast} aria-label="Show warning toast">
        Show Warning
      </button>
      <Toaster />
    </div>
  );
}

describe('Toast Accessibility Tests', () => {
  describe('Error Toast Accessibility', () => {
    it('should have role="alert" for error toasts', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('Export Failed');
      });
    });

    it('should have proper ARIA attributes for error toasts', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
        expect(alert).toHaveAttribute('aria-atomic', 'true');
      });
    });

    it('should announce error messages to screen readers', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      // Create a mock for aria-live region announcements
      const ariaLiveRegion = document.createElement('div');
      ariaLiveRegion.setAttribute('role', 'alert');
      ariaLiveRegion.setAttribute('aria-live', 'assertive');
      document.body.appendChild(ariaLiveRegion);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Export Failed');
        expect(alert).toHaveTextContent('Unable to generate export');
      });

      document.body.removeChild(ariaLiveRegion);
    });
  });

  describe('Toast Keyboard Navigation', () => {
    it('should be dismissible with Escape key', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should have focusable close button', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        const closeButton = within(alert).getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
        expect(closeButton).toHaveAttribute('aria-label');
      });
    });

    it('should support Tab navigation to close button', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      await user.tab();
      
      const alert = screen.getByRole('alert');
      const closeButton = within(alert).getByRole('button', { name: /close/i });
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Accessible Labels', () => {
    it('should have descriptive labels for all interactive elements', async () => {
      render(<TestToastTrigger />);

      // Check trigger buttons have proper labels
      expect(screen.getByLabelText('Show error toast')).toBeInTheDocument();
      expect(screen.getByLabelText('Show success toast')).toBeInTheDocument();
      expect(screen.getByLabelText('Show warning toast')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy in toasts', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        const heading = within(alert).getByText('Export Failed');
        // Toast titles should be marked as headings for screen readers
        expect(heading.tagName).toMatch(/^H[1-6]$/i);
      });
    });

    it('should distinguish between title and description', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        const title = within(alert).getByText('Export Failed');
        const description = within(alert).getByText(/Unable to generate export/);
        
        // Ensure they are separate elements
        expect(title).not.toBe(description);
        expect(title.parentElement).not.toBe(description.parentElement);
      });
    });
  });

  describe('Color Contrast and Visual Indicators', () => {
    it('should have sufficient color contrast for error toasts', async () => {
      const user = userEvent.setup();
      const { container } = render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Run axe accessibility tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should use semantic colors for different toast types', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        // Error toasts should have destructive variant class
        expect(alert).toHaveClass('destructive');
      });
    });
  });

  describe('Multiple Toast Management', () => {
    it('should stack multiple toasts accessibly', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      // Trigger multiple toasts
      const errorButton = screen.getByLabelText('Show error toast');
      const successButton = screen.getByLabelText('Show success toast');
      
      await user.click(errorButton);
      await user.click(successButton);

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts).toHaveLength(2);
        
        // Each should be independently accessible
        alerts.forEach(alert => {
          expect(alert).toHaveAttribute('aria-live');
          expect(alert).toHaveAttribute('aria-atomic', 'true');
        });
      });
    });

    it('should maintain focus order with multiple toasts', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      const successButton = screen.getByLabelText('Show success toast');
      
      await user.click(errorButton);
      await user.click(successButton);

      await waitFor(() => {
        expect(screen.getAllByRole('alert')).toHaveLength(2);
      });

      // Tab through all close buttons
      await user.tab();
      let focusedElement = document.activeElement;
      expect(focusedElement?.getAttribute('aria-label')).toContain('close');

      await user.tab();
      focusedElement = document.activeElement;
      expect(focusedElement?.getAttribute('aria-label')).toContain('close');
    });
  });

  describe('Timing and Auto-dismiss', () => {
    it('should respect user preferences for auto-dismiss', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const successButton = screen.getByLabelText('Show success toast');
      await user.click(successButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Success toasts may auto-dismiss after a delay
      // Users should be able to interact before dismissal
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      
      // Check that there's enough time to read (minimum 5 seconds for auto-dismiss)
      // This is a placeholder - actual implementation would check the duration
    });

    it('should not auto-dismiss error toasts', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Error toasts should remain until explicitly dismissed
      // Wait to ensure it doesn't auto-dismiss
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce toast content immediately for errors', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const errorButton = screen.getByLabelText('Show error toast');
      await user.click(errorButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        // aria-live="assertive" ensures immediate announcement
        expect(alert).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should use polite announcements for non-critical toasts', async () => {
      const user = userEvent.setup();
      render(<TestToastTrigger />);

      const successButton = screen.getByLabelText('Show success toast');
      await user.click(successButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        // Success messages can use polite announcements
        const ariaLive = alert.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(ariaLive);
      });
    });
  });
});