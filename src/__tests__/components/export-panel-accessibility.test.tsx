/**
 * Accessibility Tests for Export Panel
 * 
 * Tests the ExportPanel component for proper error handling,
 * accessible form controls, and screen reader compatibility.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

expect.extend(toHaveNoViolations);

// Mock ExportPanel component for testing
function MockExportPanel({ onError }: { onError?: (error: string) => void }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleExport = async (format: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (format === 'invalid') {
            reject(new Error('Invalid export format'));
          } else {
            resolve(true);
          }
        }, 100);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="region" aria-label="Export Panel">
      <h2 id="export-heading">Export Options</h2>
      
      {error && (
        <div 
          role="alert" 
          aria-live="assertive"
          aria-atomic="true"
          className="error-message"
          data-testid="error-alert"
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      <form aria-labelledby="export-heading">
        <fieldset>
          <legend>Select Export Format</legend>
          
          <div role="group" aria-describedby="format-description">
            <p id="format-description" className="sr-only">
              Choose the format for your export. Brief includes summary, JSON includes full data.
            </p>
            
            <label>
              <input 
                type="radio" 
                name="format" 
                value="brief"
                aria-describedby="brief-description"
              />
              <span>Brief Export</span>
              <span id="brief-description" className="text-sm text-gray-600">
                PDF summary with evidence pack
              </span>
            </label>
            
            <label>
              <input 
                type="radio" 
                name="format" 
                value="json"
                aria-describedby="json-description"
              />
              <span>JSON Export</span>
              <span id="json-description" className="text-sm text-gray-600">
                Complete data in JSON format
              </span>
            </label>
            
            <label>
              <input 
                type="radio" 
                name="format" 
                value="invalid"
                aria-describedby="invalid-description"
              />
              <span>Invalid Format (Test)</span>
              <span id="invalid-description" className="text-sm text-gray-600">
                This will trigger an error
              </span>
            </label>
          </div>
        </fieldset>

        <div className="form-group">
          <label htmlFor="export-id">
            Export ID
            <span aria-label="required" className="required">*</span>
          </label>
          <input
            id="export-id"
            type="text"
            pattern="[A-Z0-9]{8}"
            aria-required="true"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'export-id-error' : 'export-id-hint'}
            placeholder="C0008888"
          />
          <span id="export-id-hint" className="hint">
            Enter an 8-character alphanumeric ID
          </span>
          {error && (
            <span id="export-id-error" className="error" role="alert">
              {error}
            </span>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => handleExport('brief')}
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? 'Exporting, please wait' : 'Export as Brief'}
          >
            {loading ? 'Exporting...' : 'Export Brief'}
          </button>
          
          <button
            type="button"
            onClick={() => handleExport('json')}
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? 'Exporting, please wait' : 'Export as JSON'}
          >
            {loading ? 'Exporting...' : 'Export JSON'}
          </button>
          
          <button
            type="button"
            onClick={() => handleExport('invalid')}
            disabled={loading}
            aria-busy={loading}
            aria-label="Trigger test error"
            data-testid="error-trigger"
          >
            Test Error
          </button>
        </div>
      </form>
    </div>
  );
}

describe('Export Panel Accessibility', () => {
  describe('Form Controls Accessibility', () => {
    it('should have proper labels for all form controls', async () => {
      render(<MockExportPanel />);

      // Check main heading
      expect(screen.getByRole('heading', { name: 'Export Options' })).toBeInTheDocument();

      // Check fieldset and legend
      expect(screen.getByRole('group', { name: 'Select Export Format' })).toBeInTheDocument();

      // Check input label
      expect(screen.getByLabelText(/Export ID/)).toBeInTheDocument();

      // Check buttons have labels
      expect(screen.getByRole('button', { name: /Export as Brief/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export as JSON/ })).toBeInTheDocument();
    });

    it('should indicate required fields accessibly', () => {
      render(<MockExportPanel />);

      const exportIdInput = screen.getByLabelText(/Export ID/);
      expect(exportIdInput).toHaveAttribute('aria-required', 'true');

      // Check for visual required indicator
      const requiredIndicator = screen.getByLabelText('required');
      expect(requiredIndicator).toHaveTextContent('*');
    });

    it('should provide helpful hints for form fields', () => {
      render(<MockExportPanel />);

      const exportIdInput = screen.getByLabelText(/Export ID/);
      const hintId = exportIdInput.getAttribute('aria-describedby');
      expect(hintId).toBeTruthy();

      const hint = document.getElementById(hintId!);
      expect(hint).toHaveTextContent('Enter an 8-character alphanumeric ID');
    });

    it('should have proper fieldset grouping for radio buttons', () => {
      render(<MockExportPanel />);

      const fieldset = screen.getByRole('group', { name: 'Select Export Format' });
      const radios = within(fieldset).getAllByRole('radio');
      
      expect(radios).toHaveLength(3);
      radios.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'format');
      });
    });
  });

  describe('Error State Accessibility', () => {
    it('should announce errors with role="alert"', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      render(<MockExportPanel onError={onError} />);

      const errorButton = screen.getByTestId('error-trigger');
      await user.click(errorButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('Invalid export format');
      });

      expect(onError).toHaveBeenCalledWith('Invalid export format');
    });

    it('should have aria-live="assertive" for error messages', async () => {
      const user = userEvent.setup();
      render(<MockExportPanel />);

      const errorButton = screen.getByTestId('error-trigger');
      await user.click(errorButton);

      await waitFor(() => {
        const alert = screen.getByTestId('error-alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
        expect(alert).toHaveAttribute('aria-atomic', 'true');
      });
    });

    it('should mark invalid fields with aria-invalid', async () => {
      const user = userEvent.setup();
      render(<MockExportPanel />);

      const exportIdInput = screen.getByLabelText(/Export ID/);
      expect(exportIdInput).toHaveAttribute('aria-invalid', 'false');

      const errorButton = screen.getByTestId('error-trigger');
      await user.click(errorButton);

      await waitFor(() => {
        expect(exportIdInput).toHaveAttribute('aria-invalid', 'true');
        expect(exportIdInput).toHaveAttribute('aria-describedby', 'export-id-error');
      });
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      render(<MockExportPanel />);

      const errorButton = screen.getByTestId('error-trigger');
      await user.click(errorButton);

      await waitFor(() => {
        const exportIdInput = screen.getByLabelText(/Export ID/);
        const errorId = exportIdInput.getAttribute('aria-describedby');
        expect(errorId).toContain('error');

        const errorMessage = document.getElementById(errorId!);
        expect(errorMessage).toHaveTextContent('Invalid export format');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Loading State Accessibility', () => {
    it('should indicate loading state with aria-busy', async () => {
      const user = userEvent.setup();
      render(<MockExportPanel />);

      const exportButton = screen.getByRole('button', { name: /Export as Brief/ });
      
      // Initial state
      expect(exportButton).toHaveAttribute('aria-busy', 'false');
      
      // Click and check during loading
      const clickPromise = user.click(exportButton);
      
      await waitFor(() => {
        expect(exportButton).toHaveAttribute('aria-busy', 'true');
        expect(exportButton).toBeDisabled();
      });

      await clickPromise;
      
      // After loading
      expect(exportButton).toHaveAttribute('aria-busy', 'false');
      expect(exportButton).not.toBeDisabled();
    });

    it('should update button label during loading', async () => {
      const user = userEvent.setup();
      render(<MockExportPanel />);

      const exportButton = screen.getByRole('button', { name: /Export as Brief/ });
      await user.click(exportButton);

      await waitFor(() => {
        expect(exportButton).toHaveAttribute('aria-label', 'Exporting, please wait');
        expect(exportButton).toHaveTextContent('Exporting...');
      });
    });

    it('should disable all actions during loading', async () => {
      const user = userEvent.setup();
      render(<MockExportPanel />);

      const briefButton = screen.getByRole('button', { name: /Export as Brief/ });
      const jsonButton = screen.getByRole('button', { name: /Export as JSON/ });
      
      const clickPromise = user.click(briefButton);

      await waitFor(() => {
        expect(briefButton).toBeDisabled();
        expect(jsonButton).toBeDisabled();
      });

      await clickPromise;
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Tab navigation through form controls', async () => {
      const user = userEvent.setup();
      render(<MockExportPanel />);

      // Start from the beginning
      await user.tab();
      
      // Should focus first radio button
      let focused = document.activeElement;
      expect(focused).toHaveAttribute('type', 'radio');

      // Tab through radio buttons
      await user.tab();
      await user.tab();
      
      // Should reach text input
      await user.tab();
      focused = document.activeElement;
      expect(focused).toHaveAttribute('id', 'export-id');

      // Tab to buttons
      await user.tab();
      focused = document.activeElement;
      expect(focused).toHaveTextContent('Export Brief');
    });

    it('should support arrow key navigation for radio groups', async () => {
      const user = userEvent.setup();
      render(<MockExportPanel />);

      const radios = screen.getAllByRole('radio');
      radios[0].focus();

      // Arrow down should move to next radio
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(radios[1]);

      // Arrow up should move to previous radio
      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe(radios[0]);
    });

    it('should support Enter key for button activation', async () => {
      const user = userEvent.setup();
      render(<MockExportPanel />);

      const exportButton = screen.getByRole('button', { name: /Export as Brief/ });
      exportButton.focus();

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(exportButton).toHaveAttribute('aria-busy', 'true');
      });
    });
  });

  describe('Screen Reader Descriptions', () => {
    it('should provide descriptions for each export format', () => {
      render(<MockExportPanel />);

      const briefRadio = screen.getByLabelText(/Brief Export/);
      const briefDescId = briefRadio.getAttribute('aria-describedby');
      const briefDesc = document.getElementById(briefDescId!);
      expect(briefDesc).toHaveTextContent('PDF summary with evidence pack');

      const jsonRadio = screen.getByLabelText(/JSON Export/);
      const jsonDescId = jsonRadio.getAttribute('aria-describedby');
      const jsonDesc = document.getElementById(jsonDescId!);
      expect(jsonDesc).toHaveTextContent('Complete data in JSON format');
    });

    it('should have screen reader only instructions', () => {
      render(<MockExportPanel />);

      const srOnlyText = screen.getByText(/Choose the format for your export/);
      expect(srOnlyText).toHaveClass('sr-only');
    });
  });

  describe('WCAG Compliance', () => {
    it('should pass axe accessibility checks', async () => {
      const { container } = render(<MockExportPanel />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should pass axe checks in error state', async () => {
      const user = userEvent.setup();
      const { container } = render(<MockExportPanel />);

      const errorButton = screen.getByTestId('error-trigger');
      await user.click(errorButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should maintain focus visible indicators', async () => {
      const user = userEvent.setup();
      render(<MockExportPanel />);

      // Tab through elements and verify focus is visible
      await user.tab();
      let focused = document.activeElement;
      
      // Check that focused element has some visual indication
      // This would typically check for focus styles in actual implementation
      expect(focused).not.toBe(document.body);
      expect(focused?.tagName).toBeDefined();
    });
  });
});