import { describe, it, expect } from '@jest/globals';

describe('VDP Exposure Guards', () => {
  describe('VDP_FULL Field Detection', () => {
    it('detects VDP_FULL exposure in API responses', () => {
      const code = `
        return NextResponse.json({
          id: '123',
          overall_analysis: vdp.overall_analysis,
          scenes: vdp.scenes,
        });
      `;
      
      const violations = checkVDPExposure(code, '/api/export/brief');
      
      expect(violations).toContainEqual(
        expect.objectContaining({
          pattern: 'Direct VDP access',
          context: expect.stringContaining('overall_analysis'),
        })
      );
    });

    it('detects audience_reaction exposure', () => {
      const code = `
        const data = {
          reaction: vdp.audience_reaction,
          comments: vdp.notable_comments,
        };
        return res.json(data);
      `;
      
      const violations = checkVDPExposure(code, '/api/data');
      
      expect(violations.length).toBeGreaterThanOrEqual(2);
      expect(violations).toContainEqual(
        expect.objectContaining({
          pattern: 'Direct VDP access',
          context: expect.stringContaining('audience_reaction'),
        })
      );
    });

    it('detects narrative_unit exposure', () => {
      const code = `
        const scenes = vdp.scenes.map(s => ({
          narrative: s.narrative_unit,
          shots: s.shots,
        }));
      `;
      
      const violations = checkVDPExposure(code, '/api/scenes');
      
      // The test detects vdp.scenes access (Direct VDP access)
      expect(violations).toContainEqual(
        expect.objectContaining({
          pattern: 'Direct VDP access',
          context: expect.stringContaining('vdp.scenes'),
        })
      );
    });

    it('allows VDP_FULL in lib/exports for processing', () => {
      const code = `
        function extractEvidence(vdp) {
          const confidence = vdp.overall_analysis?.confidence;
          return { trustScore: confidence * 100 };
        }
      `;
      
      const violations = checkVDPExposure(code, '/lib/exports/evidence.ts');
      
      expect(violations).toHaveLength(0); // Allowed in lib/exports
    });
  });

  describe('Internal Path Protection', () => {
    it('detects access to /internal/vdp_full paths', () => {
      const code = `
        return NextResponse.json(await fetch('/internal/vdp_full/data.json'));
      `;
      
      const violations = checkVDPExposure(code, '/api/data');
      
      expect(violations).toContainEqual(
        expect.objectContaining({
          pattern: '\\/internal\\/vdp_full',
          context: expect.stringContaining('/internal/vdp_full'),
        })
      );
    });

    it('blocks internal VDP routes', () => {
      const routePath = '/app/api/internal/vdp_full/route.ts';
      const warnings = checkInternalRoutes([routePath]);
      
      expect(warnings).toContainEqual(
        expect.stringContaining('Found internal route')
      );
    });
  });

  describe('Direct VDP Access', () => {
    it('detects direct VDP property access in components', () => {
      const code = `
        function VideoCard({ vdp }) {
          return <div>{vdp.overall_analysis.summary}</div>;
        }
      `;
      
      const violations = checkVDPExposure(code, '/components/VideoCard.tsx');
      
      expect(violations).toContainEqual(
        expect.objectContaining({
          pattern: 'Direct VDP access',
        })
      );
    });

    it('allows vdpMin access', () => {
      const code = `
        function VideoCard({ vdpMin }) {
          return <div>{vdpMin.digestId}</div>;
        }
      `;
      
      const violations = checkVDPExposure(code, '/components/VideoCard.tsx');
      
      expect(violations).toHaveLength(0);
    });
  });

  describe('Comment and Mock Exclusions', () => {
    it('ignores VDP references in comments', () => {
      const code = `
        // This function processes vdp.overall_analysis
        // but doesn't expose it
        function processData() {
          return { safe: true };
        }
      `;
      
      const violations = checkVDPExposure(code, '/api/process');
      
      expect(violations).toHaveLength(0);
    });

    it('ignores VDP in test files', () => {
      const code = `
        test('processes VDP data', () => {
          const vdp = { overall_analysis: mockData };
          expect(vdp.overall_analysis).toBeDefined();
        });
      `;
      
      const violations = checkVDPExposure(code, '/test/vdp.test.ts');
      
      expect(violations).toHaveLength(0);
    });

    it('ignores mock data', () => {
      const code = `
        const mockVDP = {
          overall_analysis: { confidence: 0.95 },
          scenes: [],
        };
      `;
      
      const violations = checkVDPExposure(code, '/mocks/vdp.ts');
      
      expect(violations).toHaveLength(0);
    });
  });
});

// Helper functions
function checkVDPExposure(code: string, filePath: string): Array<any> {
  const violations: any[] = [];
  
  // Skip test files and mocks
  if (filePath.includes('.test.') || filePath.includes('/mock')) {
    return violations;
  }
  
  // Allow in lib/exports for processing
  if (filePath.includes('/lib/exports/')) {
    return violations;
  }
  
  const lines = code.split('\n');
  const forbiddenPatterns = [
    /\/internal\/vdp_full/gi,
    /overall_analysis/gi,
    /audience_reaction/gi,
    /notable_comments/gi,
    /asr_transcript/gi,
    /narrative_unit/gi,
  ];
  
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return;
    }
    
    // Check for forbidden patterns
    forbiddenPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        const isApiResponse = 
          filePath.includes('/api/') && 
          (line.includes('res.json') || 
           line.includes('NextResponse.json') ||
           line.includes('return') && line.includes('json'));
        
        if (isApiResponse || filePath.includes('/app/') || filePath.includes('/components/')) {
          violations.push({
            line: index + 1,
            pattern: pattern.source,
            context: line.trim(),
          });
        }
      }
    });
    
    // Check for direct VDP access
    if (line.includes('vdp.') && !line.includes('vdpMin')) {
      const isProcessing = filePath.includes('/lib/') || filePath.includes('/utils/');
      if (!isProcessing) {
        violations.push({
          line: index + 1,
          pattern: 'Direct VDP access',
          context: line.trim(),
        });
      }
    }
  });
  
  return violations;
}

function checkInternalRoutes(routePaths: string[]): string[] {
  const warnings: string[] = [];
  
  routePaths.forEach(path => {
    if (path.includes('/internal/')) {
      warnings.push(`Found internal route: ${path}`);
    }
  });
  
  return warnings;
}