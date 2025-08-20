import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ViralDNAProfile } from '../schemas/viral-dna-profile';
import { VDPExtractionError } from '../types';
import winston from 'winston';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private logger: winston.Logger;
  private maxRetries: number;
  private timeoutMs: number;

  constructor(
    apiKey: string,
    modelName: string = 'gemini-2.0-flash-exp',
    maxRetries: number = 3,
    timeoutMs: number = 60000,
    logger?: winston.Logger
  ) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    this.maxRetries = maxRetries;
    this.timeoutMs = timeoutMs;
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [new winston.transports.Console()],
    });
  }

  /**
   * Comprehensive VDP analysis system prompt matching GitHub VDP extractor
   */
  private getSystemPrompt(): string {
    return `You are an expert viral content analyzer specializing in social media video analysis. Your task is to extract a comprehensive Viral DNA Profile (VDP) that captures the complete structure, narrative, technical elements, and viral potential of video content.

You must analyze the video at multiple levels:

## 1. METADATA EXTRACTION
Extract basic video metadata including:
- Platform (Instagram, TikTok, YouTube, etc.)
- Engagement metrics (views, likes, comments, shares)
- Upload date and content origin type
- Hashtags and CTAs
- Original sound information

## 2. OVERALL ANALYSIS
Provide comprehensive analysis including:

### Audience Reaction Analysis
- Overall sentiment analysis of audience engagement
- Common reaction patterns and themes
- Notable comments with language detection and English translation
- Analysis of why content resonates with viewers

### Content Summary and Context
- Concise but detailed summary of video content
- Emotional arc and narrative progression
- Cultural context and references
- Safety flags for inappropriate content

### ASR (Automatic Speech Recognition)
- Full transcript of spoken content in original language
- Language detection for speech content
- English translation of all non-English speech
- Identification of key phrases and messaging

### OCR (Optical Character Recognition)
- All visible text in video frames
- Language detection for each text element
- English translation for non-English text
- Context and significance of text overlays

### Graph References
- Potential meme template identification
- Related hashtags for content discovery
- Viral pattern recognition

## 3. DETAILED SCENE ANALYSIS
Break down video into scenes with:

### Scene Structure
- Precise timing (start/end timestamps)
- Duration calculation
- Narrative importance level (critical/high/medium/low)
- Scene ID and description

### Narrative Units
- Dialogue transcription with translations
- Narrative role (Hook, Demonstration, Problem_Solution, etc.)
- Rhetorical devices used (storytelling, demonstration, comparison)
- Comedic devices if applicable
- Comprehensive summary of scene purpose

### Visual Settings
- Location and environment description
- Lighting analysis and mood
- Visual style and cinematic properties
- Edit grammar (camera style, cut speed, subtitle style)
- Mood palette and aesthetic choices

### Audio Analysis
- Background music description and tone
- Ambient sound characteristics
- Audio events with timestamps and intensity
- Overall audio style and contribution to mood

### Shot-by-Shot Breakdown
For each shot within scenes:
- Camera specifications (angle, movement, shot type)
- Composition analysis (grid placement, visual notes)
- Confidence level in analysis
- Precise start/end timestamps
- Keyframe analysis with roles (start, peak, mid, end)
- Detailed descriptions of visual content

### Technical Cinematography
- Shot types: ECU (Extreme Close-Up), CU (Close-Up), MCU (Medium Close-Up), MS (Medium Shot), MLS (Medium Long Shot), LS (Long Shot), ELS (Extreme Long Shot)
- Camera angles: eye level, high, low, bird's eye, worm's eye
- Camera movements: static, handheld, pan, tilt, zoom, dolly, crane
- Composition grids: center, rule of thirds, symmetrical, dynamic

## 4. PRODUCT AND SERVICE MENTIONS
Identify and analyze:
- Product names and categories
- Service mentions and types
- Confidence levels (high/medium/low)
- Evidence sources (OCR, ASR, visual)
- Time ranges of mentions
- Promotional status analysis
- Brand integration assessment

## 5. CONFIDENCE SCORING
Provide confidence metrics for:
- Overall analysis quality (0.0-1.0)
- Device/platform analysis accuracy
- Scene classification precision
- Technical analysis reliability

## OUTPUT FORMAT REQUIREMENTS

You MUST return a valid JSON object matching this EXACT structure:

{
  "content_id": "string",
  "metadata": {
    "comment_count": number,
    "cta_types": ["string"],
    "hashtags": ["string"],
    "like_count": number,
    "original_sound": {
      "id": string|null,
      "title": string|null
    },
    "platform": "string",
    "share_count": number,
    "source_url": "string",
    "upload_date": "ISO datetime string",
    "video_origin": "Real-Footage|AI-Generated|Mixed|Unknown",
    "view_count": number
  },
  "overall_analysis": {
    "audience_reaction": {
      "analysis": "detailed analysis of audience response patterns",
      "common_reactions": ["reaction1", "reaction2"],
      "notable_comments": [
        {
          "lang": "language code",
          "text": "original comment text",
          "translation_en": "English translation"
        }
      ],
      "overall_sentiment": "sentiment description"
    },
    "confidence": {
      "device_analysis": 0.0-1.0,
      "overall": 0.0-1.0,
      "scene_classification": 0.0-1.0
    },
    "emotional_arc": "description of emotional journey",
    "graph_refs": {
      "potential_meme_template": "meme template description",
      "related_hashtags": ["#hashtag1", "#hashtag2"]
    },
    "safety_flags": ["flag1", "flag2"],
    "summary": "comprehensive content summary",
    "asr_lang": "language code",
    "asr_transcript": "full speech transcript",
    "asr_translation_en": "English translation of speech",
    "ocr_text": [
      {
        "lang": "language code",
        "text": "visible text",
        "translation_en": "English translation"
      }
    ]
  },
  "product_mentions": [
    {
      "confidence": "high|medium|low",
      "evidence": ["evidence1", "evidence2"],
      "name": "product name",
      "promotion": {
        "signals": ["signal1"],
        "status": "sponsored|organic|unknown"
      },
      "sources": ["ocr", "asr", "visual"],
      "type": "product",
      "category": "product category",
      "time_ranges": [[start_time, end_time]]
    }
  ],
  "scenes": [
    {
      "duration_sec": number,
      "narrative_unit": {
        "comedic_device": ["device1"],
        "dialogue": "spoken content",
        "narrative_role": "Hook|Setup|Demonstration|Problem_Solution|Climax|Resolution|Call_to_Action",
        "rhetoric": ["storytelling", "demonstration"],
        "summary": "scene purpose and content",
        "dialogue_lang": "language code",
        "dialogue_translation_en": "English translation"
      },
      "scene_id": "unique scene identifier",
      "setting": {
        "audio_style": {
          "ambient_sound": "description",
          "audio_events": [
            {
              "description": "event description",
              "event": "event type",
              "intensity": "Low|Medium|High",
              "timestamp": number
            }
          ],
          "music": "music description",
          "tone": "audio tone description"
        },
        "location": "location description",
        "visual_style": {
          "cinematic_properties": "visual characteristics",
          "edit_grammar": {
            "camera_style": "static|handheld|gimbal|tripod",
            "cut_speed": "slow|medium|fast|variable",
            "subtitle_style": "broadcast_entertainment|social_media|educational|minimal"
          },
          "lighting": "lighting description",
          "mood_palette": ["mood1", "mood2"]
        }
      },
      "shots": [
        {
          "camera": {
            "angle": "eye|high|low|bird|worm",
            "move": "static|handheld|pan|tilt|zoom|dolly|crane",
            "shot": "ECU|CU|MCU|MS|MLS|LS|ELS"
          },
          "composition": {
            "grid": "center|rule_of_thirds|symmetrical|dynamic",
            "notes": ["composition note"]
          },
          "confidence": "high|medium|low",
          "end": number,
          "keyframes": [
            {
              "desc": "keyframe description",
              "role": "start|peak|mid|end",
              "t_rel_shot": number
            }
          ],
          "shot_id": "unique shot identifier",
          "start": number
        }
      ],
      "time_end": number,
      "time_start": number,
      "importance": "critical|high|medium|low"
    }
  ],
  "service_mentions": [
    {
      "confidence": "high|medium|low",
      "evidence": ["evidence1"],
      "name": "service name",
      "promotion": {
        "signals": ["signal1"],
        "status": "sponsored|organic|unknown"
      },
      "sources": ["ocr", "asr", "visual"],
      "type": "service",
      "category": "service category",
      "time_ranges": [[start_time, end_time]]
    }
  ],
  "default_lang": "primary language code"
}

## CRITICAL REQUIREMENTS:

1. **Precision**: Provide exact timestamps down to 0.01 second precision
2. **Completeness**: Analyze every visible second of content
3. **Cultural Context**: Consider cultural references and language nuances
4. **Technical Accuracy**: Use proper cinematography and editing terminology
5. **Consistency**: Maintain consistent analysis depth across all sections
6. **Evidence-Based**: Every claim must be supported by observable content
7. **Language Detection**: Accurately identify and translate all languages
8. **Brand Analysis**: Thoroughly assess commercial content and sponsorship signals

Be extremely thorough in your analysis. This VDP will be used for content intelligence, brand analysis, and viral pattern recognition. Every detail matters for accurate content understanding and viral prediction algorithms.`;
  }

  /**
   * Analyze video content with Gemini to extract complete VDP data
   */
  async analyzeVideoContent(
    videoData: string | Buffer,
    mimeType: string,
    metadata?: any
  ): Promise<ViralDNAProfile> {
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        this.logger.info(`Analyzing video content with Gemini (attempt ${attempt + 1})`);

        const prompt = `${this.getSystemPrompt()}

## CONTENT METADATA (if available)
${metadata ? JSON.stringify(metadata, null, 2) : 'No additional metadata provided'}

## ANALYSIS TASK
Analyze the provided video content and extract a comprehensive Viral DNA Profile following the exact JSON structure specified above.

Focus on these critical analysis areas:
1. **Complete Scene Breakdown**: Identify every distinct scene with precise timing
2. **Shot-by-Shot Analysis**: Detailed cinematographic analysis of each shot
3. **Narrative Structure**: How the story unfolds and engages viewers
4. **Audio-Visual Integration**: How sound and visuals work together
5. **Cultural Context**: Language, cultural references, and audience targeting
6. **Commercial Analysis**: Product placements, brand mentions, promotional content
7. **Viral Elements**: What makes this content shareable and engaging
8. **Technical Quality**: Production values and technical execution

Provide the most detailed and accurate analysis possible. This will be used for content intelligence and viral pattern recognition.

IMPORTANT: Return ONLY the JSON object. Do not include any explanatory text outside the JSON structure.`;

        const result = await Promise.race([
          this.generateContentWithMedia(prompt, videoData, mimeType),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), this.timeoutMs)
          ),
        ]) as any;

        const response = result.response;
        const text = response.text();

        this.logger.info('Gemini analysis completed successfully');

        // Extract and parse JSON from response
        let vdpData: ViralDNAProfile;
        
        // Try to extract JSON from code blocks first
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            vdpData = JSON.parse(jsonMatch[1]);
          } catch (parseError) {
            this.logger.warn('Failed to parse JSON from code block, trying full text');
            vdpData = JSON.parse(text);
          }
        } else {
          // Try parsing the entire response as JSON
          vdpData = JSON.parse(text);
        }

        // Validate the structure matches our schema
        if (!vdpData.content_id || !vdpData.metadata || !vdpData.overall_analysis) {
          throw new Error('Invalid VDP structure returned from Gemini');
        }

        this.logger.info(`Successfully extracted VDP for content_id: ${vdpData.content_id}`);
        return vdpData;

      } catch (error) {
        attempt++;
        this.logger.error(`Gemini analysis attempt ${attempt} failed:`, error);

        if (attempt >= this.maxRetries) {
          throw new VDPExtractionError(
            `Gemini analysis failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'gemini-analysis',
            'high',
            error instanceof Error ? error : undefined
          );
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new VDPExtractionError(
      'Gemini analysis failed: Maximum retries exceeded',
      'gemini-analysis',
      'critical'
    );
  }

  /**
   * Generate content using Gemini with video/image input (private helper)
   */
  private async generateContentWithMedia(prompt: string, videoData: string | Buffer, mimeType: string) {
    let mediaData: any;

    if (typeof videoData === 'string') {
      // Assume it's a base64 encoded string
      mediaData = {
        inlineData: {
          data: videoData,
          mimeType: mimeType,
        },
      };
    } else {
      // Buffer - convert to base64
      mediaData = {
        inlineData: {
          data: videoData.toString('base64'),
          mimeType: mimeType,
        },
      };
    }

    return await this.model.generateContent([prompt, mediaData]);
  }

  /**
   * Analyze video from URL (if supported by Gemini)
   */
  async analyzeVideoFromUrl(url: string, metadata?: any): Promise<ViralDNAProfile> {
    const prompt = `${this.getSystemPrompt()}

## VIDEO URL
${url}

## CONTENT METADATA (if available)
${metadata ? JSON.stringify(metadata, null, 2) : 'No additional metadata provided'}

## ANALYSIS TASK
Analyze the video content at the provided URL and extract a comprehensive Viral DNA Profile following the exact JSON structure specified above.

IMPORTANT: Return ONLY the JSON object. Do not include any explanatory text outside the JSON structure.`;

    try {
      const result = await this.model.generateContent([prompt]);
      const response = result.response;
      const text = response.text();

      // Parse and return the analysis
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      let vdpData: ViralDNAProfile;

      if (jsonMatch) {
        vdpData = JSON.parse(jsonMatch[1]);
      } else {
        vdpData = JSON.parse(text);
      }

      // Validate the structure
      if (!vdpData.content_id || !vdpData.metadata || !vdpData.overall_analysis) {
        throw new Error('Invalid VDP structure returned from Gemini');
      }

      return vdpData;

    } catch (error) {
      throw new VDPExtractionError(
        `Failed to analyze video from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'gemini-url-analysis',
        'high',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate content from text prompt with optional video data for GitHub VDP analysis
   */
  async generateContent(prompt: string, videoData?: string | Buffer, mimeType?: string): Promise<string> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        this.logger.info(`Generating GitHub VDP content with Gemini (attempt ${attempt + 1})`);
        
        let result;
        
        if (videoData && mimeType) {
          // Multi-modal analysis with video
          const videoPart = {
            inlineData: {
              data: Buffer.isBuffer(videoData) ? videoData.toString('base64') : Buffer.from(videoData).toString('base64'),
              mimeType: mimeType
            }
          };
          
          result = await this.model.generateContent([prompt, videoPart]);
        } else {
          // Text-only analysis
          result = await this.model.generateContent([prompt]);
        }
        
        const response = result.response;
        const text = response.text();
        
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini');
        }
        
        this.logger.info(`Gemini analysis completed successfully (${text.length} characters)`);
        return text;
        
      } catch (error: any) {
        attempt++;
        this.logger.warn(`Gemini generation attempt ${attempt} failed:`, error);
        
        if (attempt >= this.maxRetries) {
          throw new VDPExtractionError(
            `Failed to generate content after ${this.maxRetries} attempts: ${error.message}`,
            'gemini-generation',
            'high',
            error
          );
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('Unexpected error in generateContent');
  }

  /**
   * Test the Gemini service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent(['Hello, this is a test message.']);
      const response = result.response;
      const text = response.text();
      return text.length > 0;
    } catch (error) {
      this.logger.error('Gemini connection test failed:', error);
      return false;
    }
  }

  /**
   * Get model information
   */
  getModelInfo(): { model: string; maxRetries: number; timeoutMs: number } {
    return {
      model: this.model.model,
      maxRetries: this.maxRetries,
      timeoutMs: this.timeoutMs,
    };
  }
}