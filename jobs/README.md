# Jobs T2 - URL Normalizer

Enhanced URL normalizer for social media platforms with redirect handling and strict validation.

## Features

- **Platform Support**: YouTube, Instagram, TikTok
- **Redirect Handling**: Automatic expansion of short URLs (TikTok vm/vt links)
- **Strict Validation**: Platform-specific ID format validation
- **Canonical URLs**: Normalized canonical URL generation
- **Error Prevention**: Platform misidentification protection

## Installation

```bash
cd /Users/ted/snap3/jobs
npm test  # Run test suite
```

## Usage

### URL Normalization Only
```bash
# CLI normalization
npm run normalize "https://youtu.be/55e6ScXfiZc"

# Direct node usage
node normalize-cli.mjs "https://vt.tiktok.com/ZSAer6GTR/"
```

### Complete Metadata Collection
```bash
# Universal collector (auto-detects platform)
npm run collect "https://youtu.be/55e6ScXfiZc"
npm run collect "https://www.instagram.com/reel/CX1234567/"  
npm run collect "https://vt.tiktok.com/ZSAer6GTR/"

# Platform-specific collectors
npm run collect:youtube "55e6ScXfiZc"
npm run collect:instagram "CX1234567"
npm run collect:tiktok "1234567890123456789"
```

### JavaScript API
```javascript
import { normalizeSocialUrl } from './url-normalizer.js';

const result = await normalizeSocialUrl('https://youtu.be/55e6ScXfiZc');
console.log(result);
// {
//   platform: 'youtube',
//   id: '55e6ScXfiZc', 
//   canonicalUrl: 'https://www.youtube.com/watch?v=55e6ScXfiZc',
//   originalUrl: 'https://youtu.be/55e6ScXfiZc',
//   expandedUrl: 'https://youtu.be/55e6ScXfiZc'
// }
```

## Supported URL Formats

### YouTube
- `https://www.youtube.com/watch?v={ID}`
- `https://youtu.be/{ID}`
- `https://www.youtube.com/shorts/{ID}`
- `https://www.youtube.com/embed/{ID}`

### Instagram
- `https://www.instagram.com/reel/{CODE}/`
- `https://www.instagram.com/p/{CODE}/`
- `https://www.instagram.com/tv/{CODE}/`

### TikTok
- `https://www.tiktok.com/@{USER}/video/{ID}`
- `https://www.tiktok.com/vm/{SHORT}` (auto-expanded)
- `https://www.tiktok.com/vt/{SHORT}` (auto-expanded)
- `https://www.tiktok.com/embed/{ID}`
- `https://www.tiktok.com/v/{ID}.html`

## Validation Rules

- **YouTube ID**: 11-character alphanumeric with `-_` allowed
- **Instagram Code**: Alphanumeric with `-_` allowed
- **TikTok ID**: 8-26 digit numeric ID

## Error Handling

- Invalid URL format → `URL이 비어있습니다`
- Unsupported platform → `지원하지 않는 도메인: {domain}`
- Invalid ID format → Platform-specific error message
- Redirect timeout → After 5 hops maximum

## Architecture Compliance

Follows Jobs T2 terminal role:
- ✅ External data collection (URL normalization)
- ✅ No server calls or deployments
- ✅ Pure utility function for metadata processing
- ✅ Integration with existing metadata collection pipeline

## Tests

Run the test suite to verify all URL formats and error cases:

```bash
npm test
```

Expected output includes successful parsing of valid URLs and appropriate error messages for invalid formats.