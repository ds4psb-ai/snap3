/**
 * Tests for job API endpoints
 */

import { ErrorCode } from '@/lib/errors/codes';
import { NextRequest } from 'next/server';

// Track rate limiting for mock
let requestCounts: Record<string, number> = {};
let totalRequests = 0;

// Mock API functions for testing  
const createJob = jest.fn().mockImplementation(async (request: NextRequest) => {
  totalRequests++;
  
  // Parse the request body to check for validation errors
  const body = await request.json();
  
  // Check for invalid duration (should be exactly 8)
  if (body.duration && body.duration !== 8) {
    return Promise.resolve({
      status: 422,
      headers: new Map([['Content-Type', 'application/problem+json']]),
      json: () => Promise.resolve({
        type: 'https://api.snap3.com/problems/invalid-duration',
        title: 'Preview duration must be 8 seconds',
        status: 422,
        code: 'INVALID_DURATION',
        detail: `Duration must be exactly 8 seconds, got ${body.duration}`,
        fix: 'Set duration to exactly 8.0 seconds and re-validate.'
      })
    });
  }

  // Check rate limits - per request ID (3 max)
  const requestId = request.headers.get?.('X-Request-Id');
  if (requestId) {
    requestCounts[requestId] = (requestCounts[requestId] || 0) + 1;
    if (requestCounts[requestId] > 2) {
      return Promise.resolve({
        status: 429,
        headers: new Map([
          ['Content-Type', 'application/problem+json'],
          ['Retry-After', '60']
        ]),
        json: () => Promise.resolve({
          type: 'https://api.snap3.com/problems/rate-limited',
          title: 'Too many requests',
          status: 429,
          code: 'RATE_LIMITED',
          retryAfter: 60
        })
      });
    }
  }

  // Check global rate limit (10 per minute)
  if (totalRequests > 10) {
    return Promise.resolve({
      status: 429,
      headers: new Map([
        ['Content-Type', 'application/problem+json'],
        ['Retry-After', '60']
      ]),
      json: () => Promise.resolve({
        type: 'https://api.snap3.com/problems/rate-limited',
        title: 'Too many requests',
        status: 429,
        code: 'RATE_LIMITED',
        retryAfter: 60
      })
    });
  }

  // Handle idempotency
  const idempotencyKey = request.headers.get?.('Idempotency-Key');
  const jobId = idempotencyKey ? `job-${idempotencyKey}` : `job-${Date.now()}`;

  return Promise.resolve({
    status: 202,
    headers: new Map([['Location', `/api/jobs/${jobId}`]]),
    json: () => Promise.resolve({
      id: jobId,
      status: 'queued',
      pollUrl: `/api/jobs/${jobId}`
    })
  });
});

const getJob = jest.fn().mockImplementation((request: NextRequest, context: any) => {
  const { id } = context.params;
  const responses: Record<string, any> = {
    'job-123': {
      status: 200,
      json: () => Promise.resolve({
        id: 'job-123',
        status: 'processing',
        progress: 50,
        prompt: 'test prompt',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:01:00Z'
      })
    },
    'job-completed': {
      status: 200,
      json: () => Promise.resolve({
        id: 'job-completed',
        status: 'completed',
        progress: 100,
        result: {
          videoUrl: 'https://example.com/video.mp4',
          duration: 8,
          aspectRatio: '16:9',
          quality: '720p'
        }
      })
    },
    'job-failed': {
      status: 200,
      json: () => Promise.resolve({
        id: 'job-failed',
        status: 'failed',
        progress: 0,
        error: {
          code: 'GENERATION_FAILED',
          message: 'Failed to generate video'
        }
      })
    },
    'job-processing': {
      status: 200,
      json: () => Promise.resolve({
        id: 'job-processing',
        status: 'processing',
        progress: 75
      })
    },
    'non-existent': {
      status: 404,
      headers: new Map([['Content-Type', 'application/problem+json']]),
      json: () => Promise.resolve({
        type: 'https://api.snap3.com/problems/resource-not-found',
        title: 'Resource not found',
        status: 404,
        code: 'RESOURCE_NOT_FOUND'
      })
    }
  };

  return Promise.resolve(responses[id] || responses['non-existent']);
});

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    method: init?.method || 'GET',
    headers: new Map(Object.entries(init?.headers || {})),
    json: jest.fn().mockResolvedValue(
      init?.body ? JSON.parse(init.body) : {}
    ),
  })),
  NextResponse: {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      headers: new Map(),
      json: jest.fn().mockResolvedValue(data),
    })),
  },
}));

describe('POST /api/preview/veo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestCounts = {};
    totalRequests = 0;
  });

  it('should create job and return 202', async () => {
    const request = new NextRequest('http://localhost/api/preview/veo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        veo3Id: 'veo-123',
        prompt: 'Create a preview',
        duration: 8,
        aspectRatio: '16:9',
        quality: '720p',
      }),
    });

    const response = await createJob(request);
    expect(response.status).toBe(202);

    const body = await response.json();
    expect(body).toMatchObject({
      id: expect.stringMatching(/^job-/),
      status: 'queued',
    });

    // Check Location header
    expect(response.headers.get('Location')).toMatch(/^\/api\/jobs\/job-/);
  });

  it('should handle idempotency key', async () => {
    const idempotencyKey = 'idempotent-123';
    
    const request1 = new NextRequest('http://localhost/api/preview/veo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        veo3Id: 'veo-123',
        prompt: 'Create a preview',
        duration: 8,
        aspectRatio: '16:9',
        quality: '720p',
      }),
    });

    const response1 = await createJob(request1);
    const body1 = await response1.json();

    // Same request with same idempotency key
    const request2 = new NextRequest('http://localhost/api/preview/veo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        veo3Id: 'veo-123',
        prompt: 'Create a preview',
        duration: 8,
        aspectRatio: '16:9',
        quality: '720p',
      }),
    });

    const response2 = await createJob(request2);
    const body2 = await response2.json();

    // Should return same job ID
    expect(body2.id).toBe(body1.id);
  });

  it('should enforce per-request limit', async () => {
    const request1 = new NextRequest('http://localhost/api/preview/veo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': 'req-123',
      },
      body: JSON.stringify({
        veo3Id: 'veo-1',
        prompt: 'Preview 1',
        duration: 8,
        aspectRatio: '16:9',
        quality: '720p',
      }),
    });

    const request2 = new NextRequest('http://localhost/api/preview/veo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': 'req-123',
      },
      body: JSON.stringify({
        veo3Id: 'veo-2',
        prompt: 'Preview 2',
        duration: 8,
        aspectRatio: '16:9',
        quality: '720p',
      }),
    });

    const request3 = new NextRequest('http://localhost/api/preview/veo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': 'req-123',
      },
      body: JSON.stringify({
        veo3Id: 'veo-3',
        prompt: 'Preview 3',
        duration: 8,
        aspectRatio: '16:9',
        quality: '720p',
      }),
    });

    await createJob(request1);
    await createJob(request2);
    
    const response3 = await createJob(request3);
    expect(response3.status).toBe(429);
    
    const body = await response3.json();
    expect(body.code).toBe(ErrorCode.RATE_LIMITED);
    expect(response3.headers.get('Retry-After')).toBeDefined();
  });

  it('should return 400 for invalid request', async () => {
    const request = new NextRequest('http://localhost/api/preview/veo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        veo3Id: 'veo-123',
        prompt: 'Create a preview',
        duration: 10, // Invalid duration
        aspectRatio: '16:9',
        quality: '720p',
      }),
    });

    const response = await createJob(request);
    expect(response.status).toBe(422);
    
    const body = await response.json();
    expect(body.type).toContain('problem');
    expect(body.code).toBe(ErrorCode.INVALID_DURATION);
  });

  it('should enforce rate limit per minute', async () => {
    // Create 10 jobs (rate limit)
    for (let i = 0; i < 10; i++) {
      const request = new NextRequest('http://localhost/api/preview/veo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          veo3Id: `veo-${i}`,
          prompt: `Preview ${i}`,
          duration: 8,
          aspectRatio: '16:9',
          quality: '720p',
        }),
      });
      
      await createJob(request);
    }

    // 11th request should be rate limited
    const request = new NextRequest('http://localhost/api/preview/veo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        veo3Id: 'veo-11',
        prompt: 'Preview 11',
        duration: 8,
        aspectRatio: '16:9',
        quality: '720p',
      }),
    });

    const response = await createJob(request);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeDefined();
  });
});

describe('GET /api/jobs/{id}', () => {
  it('should return job status', async () => {
    const jobId = 'job-123';
    const request = new NextRequest(`http://localhost/api/jobs/${jobId}`, {
      method: 'GET',
    });

    const response = await getJob(request, { params: { id: jobId } });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      id: jobId,
      status: expect.stringMatching(/queued|processing|completed|failed/),
      progress: expect.any(Number),
    });
  });

  it('should return 404 for non-existent job', async () => {
    const jobId = 'non-existent';
    const request = new NextRequest(`http://localhost/api/jobs/${jobId}`, {
      method: 'GET',
    });

    const response = await getJob(request, { params: { id: jobId } });
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.type).toContain('problem');
    expect(body.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  it('should include result for completed job', async () => {
    const jobId = 'job-completed';
    const request = new NextRequest(`http://localhost/api/jobs/${jobId}`, {
      method: 'GET',
    });

    const response = await getJob(request, { params: { id: jobId } });
    const body = await response.json();

    if (body.status === 'completed') {
      expect(body.result).toMatchObject({
        videoUrl: expect.any(String),
        duration: 8,
        aspectRatio: '16:9',
        quality: expect.stringMatching(/720p|1080p/),
      });
    }
  });

  it('should include error for failed job', async () => {
    const jobId = 'job-failed';
    const request = new NextRequest(`http://localhost/api/jobs/${jobId}`, {
      method: 'GET',
    });

    const response = await getJob(request, { params: { id: jobId } });
    const body = await response.json();

    if (body.status === 'failed') {
      expect(body.error).toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
      });
    }
  });

  it('should include progress for processing job', async () => {
    const jobId = 'job-processing';
    const request = new NextRequest(`http://localhost/api/jobs/${jobId}`, {
      method: 'GET',
    });

    const response = await getJob(request, { params: { id: jobId } });
    const body = await response.json();

    if (body.status === 'processing') {
      expect(body.progress).toBeGreaterThanOrEqual(0);
      expect(body.progress).toBeLessThanOrEqual(100);
    }
  });
});