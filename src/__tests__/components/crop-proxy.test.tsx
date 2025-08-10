import { render, screen, fireEvent } from '@testing-library/react';
import { CropProxy } from '@/components/CropProxy';

describe('CropProxy', () => {
  it('calculates correct 9:16 overlay width (≈31.64%)', () => {
    const onPositionChange = jest.fn();
    render(<CropProxy onPositionChange={onPositionChange} />);
    
    const overlay = screen.getByRole('slider');
    const style = window.getComputedStyle(overlay);
    
    // The width should be (9/16) / (16/9) * 100 = 31.640625%
    const expectedWidth = (9 / 16) / (16 / 9) * 100;
    const actualWidth = parseFloat(style.width);
    
    // Allow small tolerance for CSS rounding
    expect(Math.abs(actualWidth - expectedWidth)).toBeLessThan(0.001);
  });
  
  it('updates position on keyboard arrow keys', () => {
    const onPositionChange = jest.fn();
    render(<CropProxy onPositionChange={onPositionChange} />);
    
    const slider = screen.getByRole('slider');
    
    // Press right arrow
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onPositionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        x: expect.any(Number),
        y: 0,
      })
    );
    
    // Press left arrow
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onPositionChange).toHaveBeenCalledTimes(2);
  });
  
  it('limits position to valid range', () => {
    const onPositionChange = jest.fn();
    render(<CropProxy onPositionChange={onPositionChange} initialPosition={{ x: 0, y: 0 }} />);
    
    const slider = screen.getByRole('slider');
    
    // Try to move left from x=0 (should stay at 0)
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onPositionChange).toHaveBeenCalledWith({ x: 0, y: 0 });
    
    // Move right to max position
    for (let i = 0; i < 100; i++) {
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
    }
    
    const lastCall = onPositionChange.mock.calls[onPositionChange.mock.calls.length - 1][0];
    const maxX = 100 - (9 / 16) / (16 / 9) * 100;
    expect(lastCall.x).toBeCloseTo(maxX, 0);
  });
});