import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PreviewPlayer } from '@/components/PreviewPlayer';
import { Problem } from '@/lib/errors/problem';

// Mock the child components
jest.mock('@/components/CropProxy', () => ({
  CropProxy: ({ onPositionChange, initialPosition }: any) => (
    <div data-testid="crop-proxy" data-position={JSON.stringify(initialPosition)}>
      Crop Proxy Component
    </div>
  ),
}));

jest.mock('@/components/PreviewOverlay', () => ({
  PreviewOverlay: ({ status, synthIdDetected }: any) => (
    <div data-testid="preview-overlay" data-status={status} data-synth-detected={synthIdDetected}>
      Overlay: {status}
    </div>
  ),
}));

describe('PreviewPlayer', () => {
  const defaultProps = {
    src: 'https://example.com/test-video.mp4',
    width: 640,
    height: 360,
  };

  describe('Video Properties', () => {
    it('sets muted, autoPlay, and playsInline properties correctly', () => {
      render(<PreviewPlayer {...defaultProps} />);
      
      const video = screen.getByLabelText('Preview video player');
      
      // Check properties, not attributes
      expect(video).toHaveProperty('muted', true);
      expect(video).toHaveProperty('autoplay', true); // Note: DOM property uses lowercase
      expect(video).toHaveProperty('playsInline', true);
    });

    it('has correct video attributes and accessibility', () => {
      render(<PreviewPlayer {...defaultProps} />);
      
      const video = screen.getByLabelText('Preview video player');
      
      // Check other video attributes
      expect(video).toHaveAttribute('src', defaultProps.src);
      expect(video).toHaveAttribute('preload', 'metadata');
      expect(video).toHaveAttribute('controls');
      expect(video).toHaveAttribute('aria-label', 'Preview video player');
    });

    it('sets initial status to loading', () => {
      render(<PreviewPlayer {...defaultProps} />);
      
      const overlay = screen.getByTestId('preview-overlay');
      expect(overlay).toHaveAttribute('data-status', 'processing');
    });

    it('updates status to ready on loadedData event', async () => {
      render(<PreviewPlayer {...defaultProps} />);
      
      const video = screen.getByLabelText('Preview video player');
      
      // Initially should be loading/processing
      let overlay = screen.getByTestId('preview-overlay');
      expect(overlay).toHaveAttribute('data-status', 'processing');
      
      // Fire loadedData event
      fireEvent.loadedData(video);
      
      // Wait for status update
      await waitFor(() => {
        overlay = screen.getByTestId('preview-overlay');
        expect(overlay).toHaveAttribute('data-status', 'completed');
      });
    });

    it('updates status to error on error event', async () => {
      render(<PreviewPlayer {...defaultProps} />);
      
      const video = screen.getByLabelText('Preview video player');
      
      // Fire error event
      fireEvent.error(video);
      
      // Wait for status update
      await waitFor(() => {
        const overlay = screen.getByTestId('preview-overlay');
        expect(overlay).toHaveAttribute('data-status', 'failed');
      });
    });
  });

  describe('Crop Proxy Display', () => {
    it('shows crop proxy only for vertical target when video is ready', async () => {
      render(<PreviewPlayer {...defaultProps} target="vertical" />);
      
      const video = screen.getByLabelText('Preview video player');
      
      // Initially no crop proxy should be visible (status is loading)
      expect(screen.queryByTestId('crop-proxy')).not.toBeInTheDocument();
      
      // Fire loadedData to set status to ready
      fireEvent.loadedData(video);
      
      // Wait for crop proxy to appear
      await waitFor(() => {
        expect(screen.getByTestId('crop-proxy')).toBeInTheDocument();
      });
    });

    it('does not show crop proxy for horizontal target', async () => {
      render(<PreviewPlayer {...defaultProps} target="horizontal" />);
      
      const video = screen.getByLabelText('Preview video player');
      
      // Fire loadedData to set status to ready
      fireEvent.loadedData(video);
      
      // Wait a bit to ensure component updates
      await waitFor(() => {
        const overlay = screen.getByTestId('preview-overlay');
        expect(overlay).toHaveAttribute('data-status', 'completed');
      });
      
      // Should not show crop proxy for horizontal
      expect(screen.queryByTestId('crop-proxy')).not.toBeInTheDocument();
    });

    it('displays crop position information for vertical target', () => {
      render(<PreviewPlayer {...defaultProps} target="vertical" />);
      
      // Should show crop position display
      expect(screen.getByText(/9:16 Crop Position/)).toBeInTheDocument();
      expect(screen.getByText(/X=34\.7%, Y=0\.0%/)).toBeInTheDocument();
    });

    it('does not display crop position for horizontal target', () => {
      render(<PreviewPlayer {...defaultProps} target="horizontal" />);
      
      // Should not show crop position display
      expect(screen.queryByText(/9:16 Crop Position/)).not.toBeInTheDocument();
    });
  });

  describe('Quality Selector', () => {
    it('shows quality selector when multiple qualities provided', () => {
      const qualities: ('720p' | '1080p')[] = ['720p', '1080p'];
      render(<PreviewPlayer {...defaultProps} qualities={qualities} defaultQuality="1080p" />);
      
      // Should show both quality buttons
      const button720p = screen.getByRole('button', { name: '720p' });
      const button1080p = screen.getByRole('button', { name: '1080p' });
      
      expect(button720p).toBeInTheDocument();
      expect(button1080p).toBeInTheDocument();
      
      // Default quality should be pressed
      expect(button1080p).toHaveAttribute('aria-pressed', 'true');
      expect(button720p).toHaveAttribute('aria-pressed', 'false');
    });

    it('does not show quality selector for single quality', () => {
      render(<PreviewPlayer {...defaultProps} qualities={['720p']} />);
      
      // Should not show quality buttons
      expect(screen.queryByRole('button', { name: '720p' })).not.toBeInTheDocument();
    });

    it('updates quality selection on button click', () => {
      const qualities: ('720p' | '1080p')[] = ['720p', '1080p'];
      render(<PreviewPlayer {...defaultProps} qualities={qualities} defaultQuality="720p" />);
      
      const button1080p = screen.getByRole('button', { name: '1080p' });
      
      // Click to change quality
      fireEvent.click(button1080p);
      
      // Check updated aria-pressed states
      expect(button1080p).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: '720p' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Error Handling', () => {
    it('displays error state when problem provided', () => {
      const problem: Problem = {
        type: 'about:blank',
        title: 'Video Not Found',
        status: 404,
        detail: 'The requested video could not be found',
        code: 'NOT_FOUND' as any,
      };
      
      render(<PreviewPlayer {...defaultProps} problem={problem} />);
      
      // Should show error display instead of video
      expect(screen.getByText('Error: Video Not Found')).toBeInTheDocument();
      expect(screen.getByText('The requested video could not be found')).toBeInTheDocument();
      expect(screen.getByText('Code: NOT_FOUND')).toBeInTheDocument();
      
      // Should not show video element
      expect(screen.queryByLabelText('Preview video player')).not.toBeInTheDocument();
    });

    it('shows fix text when detail is not available', () => {
      const problem: Problem = {
        type: 'about:blank',
        title: 'Server Error',
        status: 500,
        fix: 'Please try again later',
        code: 'INTERNAL_ERROR' as any,
      };
      
      render(<PreviewPlayer {...defaultProps} problem={problem} />);
      
      expect(screen.getByText('Please try again later')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('has proper ARIA labels for video element', () => {
      render(<PreviewPlayer {...defaultProps} />);
      
      const video = screen.getByLabelText('Preview video player');
      expect(video).toHaveAttribute('aria-label', 'Preview video player');
    });

    it('has proper aria-pressed states for quality buttons', () => {
      const qualities: ('720p' | '1080p')[] = ['720p', '1080p'];
      render(<PreviewPlayer {...defaultProps} qualities={qualities} defaultQuality="720p" />);
      
      const button720p = screen.getByRole('button', { name: '720p' });
      const button1080p = screen.getByRole('button', { name: '1080p' });
      
      expect(button720p).toHaveAttribute('aria-pressed', 'true');
      expect(button1080p).toHaveAttribute('aria-pressed', 'false');
    });

    it('passes synthId detection to overlay component', () => {
      render(<PreviewPlayer {...defaultProps} synthIdDetected={true} />);
      
      const overlay = screen.getByTestId('preview-overlay');
      expect(overlay).toHaveAttribute('data-synth-detected', 'true');
    });
  });

  describe('Responsive Behavior', () => {
    it('applies width styles correctly', () => {
      render(<PreviewPlayer {...defaultProps} width={800} />);
      
      const video = screen.getByLabelText('Preview video player');
      const container = video.closest('.relative')?.parentElement;
      
      expect(container).toHaveStyle({ width: '800px' });
      expect(container).toHaveStyle({ maxWidth: '100%' });
    });

    it('uses 100% width when width not specified', () => {
      const { src, ...propsWithoutWidth } = defaultProps;
      render(<PreviewPlayer src={src} />);
      
      const video = screen.getByLabelText('Preview video player');
      const container = video.closest('.relative')?.parentElement;
      
      expect(container).toHaveStyle({ width: '100%' });
      expect(container).toHaveStyle({ maxWidth: '100%' });
    });
  });
});