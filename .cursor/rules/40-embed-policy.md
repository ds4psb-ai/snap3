# Embed Policy — Official Embeds Only

## Security Policy

**ALLOW ONLY**: Official YouTube and Vimeo embed URLs  
**FORBID**: All other domains, file paths, or unofficial embed sources

## Allowed Patterns

### ✅ YouTube Official Embeds
```
https://www.youtube.com/embed/{VIDEO_ID}
https://youtube.com/embed/{VIDEO_ID}
```
- **Pattern**: `/^https?:\/\/(?:www\.)?youtube\.com\/embed\/[A-Za-z0-9_-]+/`
- **Examples**:
  - `https://www.youtube.com/embed/dQw4w9WgXcQ` ✅
  - `https://youtube.com/embed/VIDEO_123` ✅

### ✅ Vimeo Official Player Embeds
```
https://player.vimeo.com/video/{VIDEO_ID}
```
- **Pattern**: `/^https?:\/\/player\.vimeo\.com\/video\/\d+/`
- **Examples**:
  - `https://player.vimeo.com/video/123456789` ✅

## Forbidden Sources

### ❌ Unauthorized Domains
- Any domain other than official YouTube/Vimeo embed endpoints
- **Examples**:
  - `https://example.com/video.mp4` ❌
  - `https://youtube-proxy.com/embed/123` ❌
  - `https://vimeo.com/123456789` ❌ (not player.vimeo.com)
  - `https://dailymotion.com/embed/xyz` ❌

### ❌ Direct File Paths
- Direct video file URLs (MP4, WebM, etc.)
- **Examples**:
  - `/videos/sample.mp4` ❌
  - `https://cdn.example.com/video.webm` ❌
  - `./assets/promotional.mov` ❌

### ❌ Unofficial YouTube/Vimeo URLs
- YouTube watch URLs (not embed URLs)
- Vimeo main URLs (not player URLs)
- **Examples**:
  - `https://www.youtube.com/watch?v=dQw4w9WgXcQ` ❌
  - `https://vimeo.com/123456789` ❌
  - `https://youtu.be/dQw4w9WgXcQ` ❌

## Rationale

### Security Protection
1. **XSS Prevention**: Restricting domains prevents malicious embed injection
2. **CSP Compliance**: Aligns with Content Security Policy frame-src restrictions
3. **Data Privacy**: Official embeds respect user privacy and GDPR requirements
4. **Content Safety**: Platform moderation ensures appropriate content standards

### Business Compliance
1. **oEmbed Standards**: Official embeds provide standardized metadata
2. **Terms of Service**: Respects platform TOS by using official embed methods
3. **Rate Limiting**: Official embeds handle API rate limits appropriately
4. **Analytics**: Proper view counting and analytics through official channels

### Technical Benefits
1. **Reliability**: Official embeds have guaranteed uptime and support
2. **Performance**: Platform CDNs provide optimal delivery
3. **Responsive**: Official players handle mobile/desktop optimization
4. **Accessibility**: Built-in accessibility features and controls

## Implementation

### API Validation
```typescript
// Only these domains are allowed in embed-meta API
const ALLOWED_EMBED_DOMAINS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[A-Za-z0-9_-]+/,
  /^https?:\/\/player\.vimeo\.com\/video\/\d+/
];
```

### CSP Headers
```
Content-Security-Policy: frame-src 'self' https://www.youtube.com https://player.vimeo.com;
```

### Error Response
Unauthorized embed attempts return RFC 9457 Problem+JSON:
```json
{
  "type": "https://api.snap3.com/problems/embed-denied",
  "title": "Embed denied",
  "status": 403,
  "code": "EMBED_DENIED",
  "detail": "Only official YouTube and Vimeo embeds are allowed",
  "fix": "Use official embeds only; link out if needed."
}
```

## Enforcement

### Static Analysis
- `scripts/check-media-embeds.ts` validates all iframe src attributes
- CI/CD pipeline fails on policy violations
- Pre-commit hooks prevent unauthorized embed commits

### Runtime Validation
- `embed-meta` API rejects unauthorized domains
- EmbedFrame component only accepts whitelisted URLs
- CSP headers provide browser-level protection

## References

- [YouTube Embed API](https://developers.google.com/youtube/player_parameters)
- [Vimeo Player SDK](https://developer.vimeo.com/player/sdk)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)