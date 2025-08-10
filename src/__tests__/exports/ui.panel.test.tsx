import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExportPanel } from '@/components/ExportPanel';

// Mock fetch
global.fetch = jest.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('ExportPanel Component', () => {
  const mockExportId = 'C0008888';
  const mockInitialData = {
    evidencePack: {
      digestId: 'C0008888',
      trustScore: 0.95,
      evidenceChips: ['5.2M views', 'Viral', 'Verified on Instagram'],
      synthIdDetected: false,
    },
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any toasts
    document.body.innerHTML = '';
  });
  
  describe('Download JSON', () => {
    it('downloads JSON export on button click', async () => {
      const mockResponse = {
        digestId: 'C0008888',
        videoGenIR: { durationSec: 8 },
        evidencePack: mockInitialData.evidencePack,
      };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      
      // Mock createElement for download link
      const mockClick = jest.fn();
      const mockAnchor = document.createElement('a');
      mockAnchor.click = mockClick;
      jest.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor);
      
      render(<ExportPanel exportId={mockExportId} initialData={mockInitialData} />);
      
      const downloadButton = screen.getByText('Download JSON');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(`/api/export/json/${mockExportId}`);
      });
      
      await waitFor(() => {
        expect(mockClick).toHaveBeenCalled();
        expect(mockAnchor.download).toBe(`export-${mockExportId}.json`);
      });
      
      // Check for success toast
      await waitFor(() => {
        const toast = document.querySelector('[role="alert"]');
        expect(toast).toHaveTextContent('Export downloaded successfully');
      });
    });
    
    it('shows error toast on download failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: 'Export not found',
          status: 404,
        }),
      });
      
      render(<ExportPanel exportId={mockExportId} />);
      
      const downloadButton = screen.getByText('Download JSON');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent('Export not found');
      });
      
      // Check for error toast
      const toasts = document.querySelectorAll('[role="alert"]');
      const errorToast = Array.from(toasts).find(t => 
        t.textContent?.includes('Export not found')
      );
      expect(errorToast).toBeInTheDocument();
    });
  });
  
  describe('Stream JSON', () => {
    it('streams and displays chunked data', async () => {
      const chunks = [
        '{"evidencePack":',
        '{"digestId":"C0008888","trustScore":0.95}',
        ',"evidenceChips":',
        '["5.2M views","Viral"]',
        ',"synthIdDetected":',
        'false',
        '}',
      ];
      
      // Create a mock readable stream
      const mockStream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        },
      });
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      });
      
      render(<ExportPanel exportId={mockExportId} />);
      
      const streamButton = screen.getByText('Stream JSON');
      fireEvent.click(streamButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(`/api/export/brief/${mockExportId}?format=stream`);
      });
      
      // Wait for streaming to complete
      await waitFor(() => {
        const streamDisplay = screen.getByText(/Streamed Data:/);
        expect(streamDisplay).toBeInTheDocument();
      });
      
      // Check that accumulated data is displayed
      const preElement = document.querySelector('pre');
      expect(preElement).toHaveTextContent('evidencePack');
      expect(preElement).toHaveTextContent('C0008888');
      
      // Check for success toast
      await waitFor(() => {
        const toasts = document.querySelectorAll('[role="alert"]');
        const successToast = Array.from(toasts).find(t => 
          t.textContent?.includes('Stream completed successfully')
        );
        expect(successToast).toBeInTheDocument();
      });
    });
    
    it('handles stream errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: 'Stream unavailable',
          status: 503,
        }),
      });
      
      render(<ExportPanel exportId={mockExportId} />);
      
      const streamButton = screen.getByText('Stream JSON');
      fireEvent.click(streamButton);
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent('Stream unavailable');
      });
    });
  });
  
  describe('Evidence Chips Display', () => {
    it('displays evidence chips from initial data', () => {
      render(<ExportPanel exportId={mockExportId} initialData={mockInitialData} />);
      
      expect(screen.getByText('Evidence Chips:')).toBeInTheDocument();
      expect(screen.getByText('5.2M views')).toBeInTheDocument();
      expect(screen.getByText('Viral')).toBeInTheDocument();
      expect(screen.getByText('Verified on Instagram')).toBeInTheDocument();
    });
    
    it('does not show evidence chips section when no data', () => {
      render(<ExportPanel exportId={mockExportId} />);
      
      expect(screen.queryByText('Evidence Chips:')).not.toBeInTheDocument();
    });
  });
  
  describe('Loading States', () => {
    it('disables buttons during loading', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<ExportPanel exportId={mockExportId} />);
      
      const downloadButton = screen.getByText('Download JSON');
      fireEvent.click(downloadButton);
      
      // Button should be disabled and show loading text
      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeDisabled();
      });
    });
  });
  
  describe('WCAG Compliance', () => {
    it('has proper ARIA labels on buttons', () => {
      render(<ExportPanel exportId={mockExportId} />);
      
      const downloadButton = screen.getByLabelText('Download JSON export');
      const streamButton = screen.getByLabelText('Stream JSON export');
      
      expect(downloadButton).toBeInTheDocument();
      expect(streamButton).toBeInTheDocument();
    });
    
    it('has role="alert" on error messages', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Error occurred' }),
      });
      
      render(<ExportPanel exportId={mockExportId} />);
      
      const downloadButton = screen.getByText('Download JSON');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Error occurred');
      });
    });
    
    it('maintains color contrast for accessibility', () => {
      render(<ExportPanel exportId={mockExportId} />);
      
      const downloadButton = screen.getByText('Download JSON');
      
      // Check button has proper contrast classes
      expect(downloadButton).toHaveClass('bg-blue-600 text-white');
    });
  });
});