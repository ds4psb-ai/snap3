import { POST } from '@/app/api/qa/validate/route';

describe('POST /api/qa/validate', () => {
  function createRequest(body: any) {
    return {
      json: async () => body,
      url: 'http://localhost:3000/api/qa/validate',
    } as any;
  }

  it('returns 422 Problem+JSON on violations', async () => {
    const request = createRequest({
      fps: 29,
      bitrate: 400000,
      duration: 8,
      aspectRatio: '16:9',
      resolution: '720p',
      target: 'reels',
      hookSec: 4, // Violation: > 3s
      subtitles: [
        { text: '#fff on #fff', fg: '#ffffff', bg: '#ffffff', bbox: [0, 0, 100, 30] }
      ]
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(data.code).toBe('QA_RULE_VIOLATION');
    expect(data.violations).toBeDefined();
    expect(data.violations.length).toBeGreaterThan(0);
  });

  it('returns 200 OK when score===100', async () => {
    const request = createRequest({
      fps: 30,
      bitrate: 1000000,
      duration: 8,
      aspectRatio: '16:9',
      resolution: '720p',
      target: 'reels',
      hookSec: 2,
      subtitles: [
        { text: 'Good contrast', fg: '#000000', bg: '#ffffff', bbox: [0, 0, 100, 30] }
      ]
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pass).toBe(true);
    expect(data.score).toBe(100);
    expect(data.issues).toEqual([]);
  });

  it('maps ZodError → Problem+JSON violations', async () => {
    const request = createRequest({
      fps: 'invalid', // Type error
      duration: 10, // Invalid value
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(data.violations).toBeDefined();
    expect(data.violations.some((v: any) => v.field === 'fps')).toBe(true);
  });
});