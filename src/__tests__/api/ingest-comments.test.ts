/**
 * @jest-environment node
 */
import { POST } from '@/app/api/ingest/route';
import { N8NMetadataClient } from '@/lib/metadata-collector/n8n-client';

// Mock the n8nClient to simulate responses
jest.mock('@/lib/metadata-collector/n8n-client', () => ({
  n8nClient: {
    collectMetadata: jest.fn(),
  },
  N8NMetadataClient: {
    normalizeToVdp: jest.fn(),
  },
}));

const mockN8nClient = require('@/lib/metadata-collector/n8n-client').n8nClient;
const mockNormalizeToVdp = N8NMetadataClient.normalizeToVdp as jest.MockedFunction<typeof N8NMetadataClient.normalizeToVdp>;

describe('Comments Integration Hotfix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should preserve top_comments from n8n response in API output', async () => {
    // Mock n8n response with top_comments
    const mockN8nResponse = {
      success: true,
      platform: 'youtube' as const,
      metadata: {
        videoId: 'test123',
        title: 'Test Video',
        top_comments: [
          {
            id: 'comment1',
            text: 'Great video!',
            author: 'User1',
            likeCount: 10
          },
          {
            id: 'comment2',
            text: 'Very helpful!',
            author: 'User2',
            likeCount: 5
          }
        ]
      },
      vdpHeaders: {}
    };

    const mockNormalizedVdp = {
      content_id: 'test123',
      metadata: {
        platform: 'Youtube',
        top_comments: mockN8nResponse.metadata.top_comments
      },
      overall_analysis: {
        audience_reaction: {
          notable_comments: mockN8nResponse.metadata.top_comments
        }
      }
    };

    mockN8nClient.collectMetadata.mockResolvedValue(mockN8nResponse);
    mockNormalizeToVdp.mockReturnValue(mockNormalizedVdp);

    const request = new Request('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'url',
        content: 'https://www.youtube.com/watch?v=test123'
      })
    });

    const response = await POST(request);
    const responseData = await response.json();

    // Verify API response includes comments
    expect(responseData.metadata.metadata.top_comments).toBeDefined();
    expect(responseData.metadata.metadata.top_comments).toHaveLength(2);
    expect(responseData.metadata.metadata.top_comments[0].text).toBe('Great video!');

    // Verify overall_analysis also has comments
    expect(responseData.metadata.overall_analysis.audience_reaction.notable_comments).toBeDefined();
    expect(responseData.metadata.overall_analysis.audience_reaction.notable_comments).toHaveLength(2);
  });

  it('should handle responses without top_comments gracefully', async () => {
    // Mock n8n response without top_comments
    const mockN8nResponse = {
      success: true,
      platform: 'youtube' as const,
      metadata: {
        videoId: 'test456',
        title: 'Test Video No Comments'
        // No top_comments field
      },
      vdpHeaders: {}
    };

    const mockNormalizedVdp = {
      content_id: 'test456',
      metadata: {
        platform: 'Youtube',
        top_comments: [] // Empty array when not present
      },
      overall_analysis: {
        audience_reaction: {
          notable_comments: []
        }
      }
    };

    mockN8nClient.collectMetadata.mockResolvedValue(mockN8nResponse);
    mockNormalizeToVdp.mockReturnValue(mockNormalizedVdp);

    const request = new Request('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'url',
        content: 'https://www.youtube.com/watch?v=test456'
      })
    });

    const response = await POST(request);
    const responseData = await response.json();

    // Verify graceful handling of missing comments
    expect(responseData.metadata.metadata.top_comments).toBeDefined();
    expect(responseData.metadata.metadata.top_comments).toHaveLength(0);
    expect(responseData.metadata.overall_analysis.audience_reaction.notable_comments).toHaveLength(0);
  });

  it('should maintain existing functionality for non-URL types', async () => {
    const request = new Request('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        content: 'Some text content'
      })
    });

    const response = await POST(request);
    const responseData = await response.json();

    // Should not call n8n for text type
    expect(mockN8nClient.collectMetadata).not.toHaveBeenCalled();
    expect(responseData.type).toBe('text');
    expect(responseData.status).toBe('normalized');
  });
});