# n8n Workflows Enhancement - Top Comments Collection

## Overview

Enhanced n8n workflows with top comments collection functionality for YouTube, Instagram, and TikTok platforms. Each workflow now includes robust error handling, comments processing, and validation to ensure `metadata.top_comments.length ≤ 5`.

## Enhanced Workflows

### 1. YouTube Data API Enhanced (`youtube-data-api-enhanced.json`)

**New Features:**
- **YouTube Comments API Call**: Fetches top 5 comments sorted by relevance
- **Process Top Comments**: Maps API response to standardized format
- **Enhanced Metadata**: Includes `top_comments` array and comment count tracking

**Technical Implementation:**
- Uses `commentThreads.list` API with `order=relevance` and `maxResults=5`
- Error handling returns empty array on API failures
- Comments include: `id`, `text`, `author`, `authorChannelUrl`, `likeCount`, `publishedAt`, `updatedAt`

**Required Environment Variables:**
```bash
YOUTUBE_API_KEY=your_youtube_api_key_here
```

**API Endpoints Used:**
- Videos: `https://www.googleapis.com/youtube/v3/videos`
- Comments: `https://www.googleapis.com/youtube/v3/commentThreads`

### 2. Instagram oEmbed Enhanced (`instagram-oembed-enhanced.json`)

**New Features:**
- **Instagram Comments API Call**: Uses Graph API to fetch comments
- **Process Instagram Comments**: Sorts by `like_count` and returns top 5
- **Dual Path Support**: Graph API for full data, oEmbed fallback

**Technical Implementation:**
- Graph API endpoint: `https://graph.facebook.com/v19.0/{media_id}/comments`
- Comments sorted by `like_count` descending, limited to 5
- Graceful fallback to oEmbed with empty comments array
- Includes media ID resolution logic (placeholder implementation)

**Required Environment Variables:**
```bash
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
```

**API Endpoints Used:**
- Media: `https://graph.facebook.com/v19.0/{media_id}`
- Comments: `https://graph.facebook.com/v19.0/{media_id}/comments`
- oEmbed: `https://www.instagram.com/oembed/`

**Note:** Media ID resolution from shortcode requires additional implementation or third-party service.

### 3. TikTok Scraper Enhanced (`tiktok-scraper-enhanced.json`)

**New Features:**
- **TikTok Comments Microservice**: Calls external comments service
- **Process TikTok Comments**: Maps service response to standardized format
- **Service Availability Handling**: Graceful degradation when service unavailable

**Technical Implementation:**
- POST request to comments microservice with URL and video ID
- 15-second timeout with error handling
- Service status tracking in VDP metadata
- Comments include: `id`, `text`, `author`, `likeCount`, `timestamp`, `replyCount`

**Required Environment Variables:**
```bash
TIKTOK_COMMENTS_SERVICE_URL=http://your-comments-service:3001
```

**Microservice API Contract:**
```json
POST /api/comments
{
  "url": "https://tiktok.com/@user/video/123456789",
  "videoId": "123456789",
  "limit": 5
}

Response:
{
  "success": true,
  "comments": [
    {
      "id": "comment_id",
      "text": "comment text",
      "author": "username",
      "likeCount": 123,
      "timestamp": "2024-01-01T00:00:00Z",
      "replyCount": 5
    }
  ]
}
```

## Validation Features

### Comment Count Validation
All workflows ensure `metadata.top_comments.length ≤ 5`:
- **YouTube**: `maxResults=5` in API call + `.slice(0, 5)` safety
- **Instagram**: `.slice(0, 5)` after sorting by likes
- **TikTok**: Service limited to 5 + `.slice(0, 5)` safety

### Error Handling
- **API Failures**: Return empty comments array, preserve workflow functionality
- **Network Timeouts**: 15-second timeout with graceful degradation
- **Invalid Tokens**: Fallback to oEmbed/basic functionality
- **Malformed URLs**: Early validation with clear error messages

### Metadata Structure
Enhanced metadata includes:
```json
{
  "platform": "youtube|instagram|tiktok",
  "top_comments": [
    {
      "id": "unique_comment_id",
      "text": "comment content",
      "author": "author_name",
      "likeCount": 123,
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "vdp": {
    "hasTopComments": true,
    "extractedAt": "2024-01-01T00:00:00Z",
    "source": "platform_api_with_comments",
    "confidence": 0.95
  }
}
```

## Installation & Setup

### 1. Import Workflows
1. Open n8n interface
2. Go to Workflows → Import from File
3. Import each enhanced JSON file
4. Activate workflows

### 2. Environment Configuration
Set required environment variables in n8n:
- `YOUTUBE_API_KEY`: YouTube Data API v3 key
- `INSTAGRAM_ACCESS_TOKEN`: Facebook Graph API token with Instagram permissions
- `TIKTOK_COMMENTS_SERVICE_URL`: URL to TikTok comments microservice

### 3. Webhook URLs
Enhanced workflows use same webhook paths:
- YouTube: `/webhook/youtube-metadata`
- Instagram: `/webhook/instagram-metadata`
- TikTok: `/webhook/tiktok-metadata`

### 4. Testing
Test each workflow with sample URLs:
```bash
# YouTube
curl -X GET "http://your-n8n-instance/webhook/youtube-metadata?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Instagram  
curl -X GET "http://your-n8n-instance/webhook/instagram-metadata?url=https://www.instagram.com/p/ABC123/"

# TikTok
curl -X GET "http://your-n8n-instance/webhook/tiktok-metadata?url=https://www.tiktok.com/@user/video/123456789"
```

## Performance Considerations

### API Rate Limits
- **YouTube**: 10,000 requests/day (default quota)
- **Instagram**: 200 requests/hour per token
- **TikTok**: Depends on microservice implementation

### Optimization Strategies
- **Parallel Requests**: Comments and metadata fetched simultaneously
- **Caching**: Consider implementing Redis cache for frequent requests
- **Circuit Breaker**: Automatic fallback when APIs are unavailable
- **Batch Processing**: Group multiple requests when possible

## Monitoring & Troubleshooting

### Key Metrics
- Comments collection success rate
- API response times
- Error rates by platform
- Fallback usage frequency

### Common Issues
1. **Empty Comments**: Check API permissions and content privacy
2. **Rate Limiting**: Implement exponential backoff
3. **Invalid Media IDs**: Instagram shortcode resolution may fail
4. **Service Unavailable**: TikTok microservice health checks

### Logging
Enhanced workflows log:
- Comment processing errors
- API response failures  
- Service availability status
- Validation failures

## Security Considerations

### API Key Protection
- Store tokens in n8n environment variables
- Rotate tokens regularly
- Use least-privilege permissions
- Monitor for unauthorized usage

### Data Privacy
- Comments contain personal information
- Implement data retention policies
- Respect platform privacy settings
- Consider GDPR compliance for EU users

### Rate Limiting
- Implement client-side rate limiting
- Respect platform API quotas
- Use exponential backoff on failures
- Monitor quota usage

## Future Enhancements

### Planned Improvements
- **Sentiment Analysis**: Add comment sentiment scoring
- **Content Moderation**: Filter inappropriate comments
- **Caching Layer**: Redis integration for performance
- **Analytics**: Comment engagement metrics
- **Real-time Updates**: WebSocket for live comments

### Platform Extensions
- **YouTube Shorts**: Enhanced support for short-form content
- **Instagram Reels**: Specialized metadata extraction
- **TikTok Live**: Live streaming comments support
- **Twitter/X**: Social media expansion

## Support & Maintenance

### Version Compatibility
- n8n version: 1.0.0+
- Node.js: 18.0.0+
- API versions: YouTube v3, Instagram v19.0

### Update Schedule
- Monthly security updates
- Quarterly feature releases
- API version compatibility checks
- Performance optimization reviews

For technical support or feature requests, contact the development team or create an issue in the project repository.