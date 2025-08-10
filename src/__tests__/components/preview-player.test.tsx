import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PreviewPlayer } from '@/components/PreviewPlayer';

describe('PreviewPlayer', () => {
  const defaultProps = {
    src: 'https://example.com/video.mp4',
    qualities: ['720p', '1080p'] as ('720p' | '1080p')[],
    defaultQuality: '720p' as '720p' | '1080p',
  };
  
  it('renders video with muted+autoPlay+playsInline attributes', () => {
    render(<PreviewPlayer {...defaultProps} />);
    const video = screen.getByLabelText('Preview video player') as HTMLVideoElement;
    
    // Check properties (React sets these as properties, not attributes)
    expect(video.muted).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(video).toHaveAttribute('controls');
  });
  
  it('shows CropProxy overlay for vertical target', async () => {
    render(<PreviewPlayer {...defaultProps} target="vertical" />);
    const video = screen.getByLabelText('Preview video player') as HTMLVideoElement;
    
    // Simulate video loaded to trigger status change
    fireEvent.loadedData(video);
    
    // Wait for CropProxy to appear
    await waitFor(() => {
      const overlay = screen.getByLabelText('9:16 crop overlay for vertical format');
      expect(overlay).toBeInTheDocument();
    });
  });
  
  it('toggles quality between 720p and 1080p', () => {
    render(<PreviewPlayer {...defaultProps} />);
    const button1080 = screen.getByText('1080p');
    
    expect(button1080).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button1080);
    expect(button1080).toHaveAttribute('aria-pressed', 'true');
  });
  
  it('displays SynthID badge when detected', () => {
    render(<PreviewPlayer {...defaultProps} synthIdDetected={true} />);
    expect(screen.getByText(/AI Generated/)).toBeInTheDocument();
    expect(screen.getByText(/SynthID/)).toBeInTheDocument();
  });
  
  it('shows error state with Problem details', () => {
    const problem = {
      type: 'https://api.example.com/problem',
      title: 'Video not available',
      status: 404,
      code: 'NOT_FOUND',
      detail: 'The requested video could not be found',
      fix: 'Check the video ID',
    };
    
    render(<PreviewPlayer {...defaultProps} problem={problem} />);
    expect(screen.getByText(/Video not available/)).toBeInTheDocument();
    expect(screen.getByText(/could not be found/)).toBeInTheDocument();
    expect(screen.getByText(/Code: NOT_FOUND/)).toBeInTheDocument();
  });
});