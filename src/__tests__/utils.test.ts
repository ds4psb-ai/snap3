import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      const result = cn('class1', 'class2', { class3: true, class4: false });
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', { 'conditional': true, 'hidden': false });
      expect(result).toBe('base conditional');
    });
  });
});
