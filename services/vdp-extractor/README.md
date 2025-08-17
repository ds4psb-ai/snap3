# VDP Extractor Service v2.0 - GitHub VDP Compatible

A comprehensive Viral DNA Profile (VDP) extraction service that analyzes social media content to identify viral patterns, engagement factors, and content performance metrics. **Now fully compatible with GitHub VDP Extractor JSON structure.**

## 🚀 What's New in v2.0

### GitHub VDP Extractor Compatibility
- **Exact JSON Structure**: Now outputs the same JSON format as the GitHub VDP extractor
- **Field Name Matching**: Uses `content_id`, `metadata.platform`, `overall_analysis` etc.
- **Scene Analysis**: Detailed scene breakdown with shots, keyframes, and cinematography
- **Product/Service Detection**: Comprehensive brand mention analysis
- **Audience Reaction**: In-depth audience sentiment and comment analysis
- **Multi-language Support**: OCR and ASR with language detection and translation

### Enhanced Analysis Capabilities
- **Shot-by-Shot Breakdown**: Camera angles, movements, composition analysis
- **Narrative Structure**: Hook identification, rhetoric analysis, comedic devices
- **Audio-Visual Integration**: Music, sound effects, ambient sound analysis
- **Cultural Context**: Language detection, cultural references, localization
- **Brand Intelligence**: Product placements, promotional content detection

## 📋 Output Structure

The service now outputs VDP JSON that matches exactly with the GitHub VDP extractor:

```json
{
  "content_id": "C000001",
  "metadata": {
    "comment_count": 7000,
    "cta_types": ["product_recommendation"],
    "hashtags": ["CarGadgets", "LifeHacks"],
    "like_count": 80000,
    "original_sound": { "id": null, "title": null },
    "platform": "Instagram",
    "share_count": 30000,
    "source_url": "https://www.instagram.com/reel/...",
    "upload_date": "2025-04-15T23:18:00.000Z",
    "video_origin": "Real-Footage",
    "view_count": 5000000
  },
  "overall_analysis": {
    "audience_reaction": {
      "analysis": "Detailed audience response analysis...",
      "common_reactions": ["Appreciation for practical solutions"],
      "notable_comments": [
        {
          "lang": "ko",
          "text": "차량",
          "translation_en": "Car"
        }
      ],
      "overall_sentiment": "Highly Positive and Inquisitive"
    },
    "confidence": {
      "device_analysis": 0.9,
      "overall": 0.95,
      "scene_classification": 0.98
    },
    "emotional_arc": "Curiosity -> Relatability -> Intrigue -> Satisfaction",
    "summary": "Fast-paced Korean-language listicle showcasing car accessories...",
    "asr_lang": "ko",
    "asr_transcript": "친구들이 제 차만 탔다 하면...",
    "asr_translation_en": "Whenever my friends get in my car...",
    "ocr_text": [
      {
        "lang": "ko", 
        "text": "차량 꿀템 Best 3",
        "translation_en": "Car Must-Have Items Best 3"
      }
    ]
  },
  "scenes": [
    {
      "duration_sec": 4.88,
      "narrative_unit": {
        "comedic_device": [],
        "dialogue": "친구들이 제 차만 탔다 하면...",
        "narrative_role": "Hook",
        "rhetoric": ["storytelling", "curiosity_gap"],
        "summary": "Video opens with strong hook...",
        "dialogue_lang": "ko",
        "dialogue_translation_en": "Whenever my friends get in my car..."
      },
      "scene_id": "S01_IntroHook", 
      "shots": [
        {
          "camera": {
            "angle": "eye",
            "move": "handheld", 
            "shot": "MS"
          },
          "composition": {
            "grid": "center",
            "notes": ["Subject centered as she approaches car"]
          },
          "confidence": "high",
          "end": 1.58,
          "keyframes": [
            {
              "desc": "Woman opens white SUV door",
              "role": "start",
              "t_rel_shot": 0.1
            }
          ],
          "shot_id": "S01_01",
          "start": 0
        }
      ],
      "time_end": 4.88,
      "time_start": 0,
      "importance": "critical"
    }
  ],
  "product_mentions": [
    {
      "confidence": "high",
      "evidence": ["차량 틈새 사이드포켓"],
      "name": "차량 틈새 사이드포켓",
      "category": "car organizer",
      "time_ranges": [[23.9, 36.72]]
    }
  ],
  "service_mentions": [],
  "default_lang": "ko"
}
```

## Features

### Core Capabilities
- **Multi-Platform Support**: YouTube, Instagram, TikTok detection
- **Comprehensive Scene Analysis**: Shot-by-shot breakdown with cinematography
- **AI-Powered Content Analysis**: Gemini 2.0 Flash integration
- **Multi-language Processing**: OCR, ASR with translation support
- **Brand Intelligence**: Product and service mention detection
- **Audience Analytics**: Sentiment analysis and reaction patterns

### Technical Features
- **RESTful API**: Clean, documented endpoints
- **Batch Processing**: Multiple URL processing
- **Rate Limiting**: Built-in protection
- **Health Monitoring**: Service health checks
- **Error Handling**: RFC-compliant error responses
- **TypeScript**: Full type safety

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Google Gemini API key
- YouTube Data API key (for YouTube content)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd vdp-extractor

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here

# Optional
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

### Running the Service

```bash
# Start the service
npm start

# Or run in development mode
npm run dev
```

### Basic Testing

```bash
# Test basic functionality (no API keys required)
npm run test:basic

# Test with actual extraction (requires API keys)
npm run test:extraction
```

## API Endpoints

### Extract VDP from URL

```http
POST /api/vdp/extract
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "options": {
    "deepAnalysis": true,
    "maxComments": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content_id": "dQw4w9WgXcQ",
    "metadata": { /* ... */ },
    "overall_analysis": { /* ... */ },
    "scenes": [ /* ... */ ],
    "product_mentions": [ /* ... */ ],
    "service_mentions": [ /* ... */ ]
  },
  "processingTime": 15430
}
```

### Batch Extract

```http
POST /api/vdp/batch
Content-Type: application/json

{
  "urls": [
    "https://www.youtube.com/watch?v=video1",
    "https://www.youtube.com/watch?v=video2"
  ],
  "options": {
    "deepAnalysis": true
  }
}
```

### Health Check

```http
GET /api/health
```

## Architecture

### Service Components

```
├── src/
│   ├── controllers/          # API request handlers
│   ├── services/
│   │   ├── gemini.service.ts      # Gemini AI integration
│   │   ├── youtube.service.ts     # YouTube API integration  
│   │   └── vdp-extractor.service.ts # Main extraction logic
│   ├── schemas/
│   │   └── viral-dna-profile.ts   # GitHub VDP compatible schema
│   ├── types/                # TypeScript type definitions
│   ├── utils/               # Validation and utilities
│   └── server.ts           # Express server setup
```

### Data Flow

1. **URL Input** → Platform Detection
2. **Platform API** → Basic metadata extraction  
3. **Video Download** → Content preparation
4. **Gemini Analysis** → Comprehensive VDP generation
5. **Validation** → Schema compliance check
6. **Response** → GitHub VDP compatible JSON

## Configuration

### Service Configuration

```typescript
const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash-exp',
    maxRetries: 3,
    timeoutMs: 60000,
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
    maxRetries: 3,
  },
  processing: {
    maxFileSizeMB: 100,
    maxConcurrentJobs: 3,
  }
};
```

### Supported Platforms

- ✅ **YouTube**: Full support with API integration
- 🔄 **Instagram**: URL detection (API integration planned)
- 🔄 **TikTok**: URL detection (API integration planned)

## Error Handling

The service returns structured error responses:

```json
{
  "success": false,
  "error": "Content not accessible: Video is private",
  "processingTime": 1250
}
```

### Common Error Cases

- **Invalid URL**: Unrecognized or malformed URLs
- **Private Content**: Content not publicly accessible
- **API Limits**: Rate limiting or quota exceeded
- **Processing Errors**: Video download or analysis failures

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["npm", "start"]
```

### Google Cloud Run

```yaml
# cloudbuild.yaml included in repository
```

## Development

### Project Structure

- **Schema-First**: Zod schemas define the VDP structure
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Structured error types
- **Validation**: Input/output validation
- **Logging**: Structured logging with Winston

### Running Tests

```bash
# Basic functionality test
npm run test:basic

# Unit tests (when implemented)
npm test

# Type checking
npm run build
```

### Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure TypeScript compilation passes

## Compatibility

### GitHub VDP Extractor

This service is designed to be a drop-in replacement for the GitHub VDP extractor:

- **Same JSON Structure**: Identical field names and hierarchy
- **Same Analysis Depth**: Scene, shot, and keyframe analysis
- **Same Content Types**: Product mentions, audience reactions
- **Same Confidence Scores**: Compatible scoring methodology

### Migration from v1.0

The service maintains backward compatibility but recommends upgrading to the new JSON structure for enhanced features.

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or questions:
1. Check the health endpoint: `GET /api/health`
2. Review the logs for error details
3. Verify API key configuration
4. Test with the basic test script: `npm run test:basic`