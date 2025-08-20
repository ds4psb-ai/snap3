/**
 * Integrated GenAI VDP Generator - Google GenAI SDK with API Key Rotation
 * 
 * Provides a backup engine for VDP generation using the Google GenAI SDK
 * with built-in API key rotation and quota management.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// API Key Pool with automatic rotation (hardcoded for reliability)
const API_KEYS = [
  'AIzaSyB0I6Pqs4vDFtekNy7-rhioqlS415NF6Uo',
  'AIzaSyBpKna42Zh8CsYCkoHCPMN7k9RYjeEN4nU', 
  'AIzaSyB0I6Pqs4vDFtekNy7-rhioqlS415NF6Uo'
];

class APIKeyManager {
  constructor() {
    this.currentIndex = 0;
    this.stats = API_KEYS.map(key => ({ 
      key: `${key.substring(0, 20)}...`, 
      success: 0, 
      failures: 0,
      lastUsed: null,
      lastError: null
    }));
    console.log(`[API Key Manager] 🔑 Initialized with ${API_KEYS.length} API keys`);
    console.log(`[API Key Manager] 🎯 Starting with key index: ${this.currentIndex}`);
  }

  getCurrentKey() {
    return API_KEYS[this.currentIndex];
  }

  recordSuccess() {
    this.stats[this.currentIndex].success++;
    this.stats[this.currentIndex].lastUsed = new Date().toISOString();
    console.log(`[API Key Manager] ✅ Success recorded for key ${this.currentIndex}: ${this.stats[this.currentIndex].success} total`);
  }

  recordFailure(error) {
    this.stats[this.currentIndex].failures++;
    this.stats[this.currentIndex].lastError = error.message;
    console.log(`[API Key Manager] ❌ Failure recorded for key ${this.currentIndex}: ${this.stats[this.currentIndex].failures} total`);
  }

  rotateKey() {
    this.currentIndex = (this.currentIndex + 1) % API_KEYS.length;
    console.log(`[API Key Manager] 🔄 Rotated to key index: ${this.currentIndex}`);
    return this.getCurrentKey();
  }

  getStats() {
    return {
      currentIndex: this.currentIndex,
      totalKeys: API_KEYS.length,
      stats: this.stats
    };
  }
}

const keyManager = new APIKeyManager();

class IntegratedGenAIVDP {
  constructor() {
    console.log('✅ [IntegratedGenAIVDP] Generator initialized successfully');
  }

  async generate(gcsUri, meta, correlationId = null) {
    const startTime = Date.now();
    console.log(`[IntegratedGenAI VDP] 🎯 Primary engine starting`);
    
    let attempts = 0;
    const maxAttempts = API_KEYS.length; // Try all keys once
    
    while (attempts < maxAttempts) {
      const currentKey = keyManager.getCurrentKey();
      attempts++;
      
      try {
        console.log(`[IntegratedGenAI VDP] 🔑 Attempt ${attempts}/${maxAttempts} with key index ${keyManager.currentIndex}`);
        
        // Create GenAI instance with current key
        const genAI = new GoogleGenerativeAI(currentKey);
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-pro',
          generationConfig: {
            temperature: 0.05,
            maxOutputTokens: 16384,
          }
        });

        // Prepare content for text-based generation (IntegratedGenAI doesn't support GCS URIs directly)
        const prompt = `Generate a comprehensive VDP (Viral DNA Profile) analysis for the following content:

**Analysis Input:**
- content_id: "${meta.content_id}"
- platform: "${meta.platform}"
- source_url: "${meta.source_url || gcsUri}"
- language: "${meta.language || 'ko'}"

**GCS URI**: ${gcsUri}

Please provide a detailed VDP analysis in valid JSON format including:
1. Content metadata and basic information
2. Hook genome analysis with pattern detection
3. Scene breakdown with narrative structure
4. Overall analysis with storytelling elements

Return only valid JSON.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        console.log(`[IntegratedGenAI VDP] 📄 Response received: ${responseText.length} chars`);
        
        // Parse JSON response
        let vdp;
        try {
          vdp = JSON.parse(responseText);
        } catch (parseError) {
          // Try to extract JSON from response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            vdp = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error(`JSON parsing failed: ${parseError.message}`);
          }
        }

        // Record success and return
        keyManager.recordSuccess();
        
        const processingTime = Date.now() - startTime;
        console.log(`[IntegratedGenAI VDP] ✅ Generation complete in ${processingTime}ms`);
        
        return {
          ...vdp,
          processing_metadata: {
            ...vdp.processing_metadata,
            engine: 'integrated-genai',
            processing_time_ms: processingTime,
            api_key_index: keyManager.currentIndex,
            generation_metadata: {
              platform: meta.platform || 'unknown',
              timestamp: new Date().toISOString(),
              model: 'gemini-2.5-pro',
              method: 'integrated-genai-text',
              retry_count: attempts - 1
            }
          }
        };
        
      } catch (error) {
        keyManager.recordFailure(error);
        console.error(`[IntegratedGenAI VDP] ❌ Key ${keyManager.currentIndex} failed:`, error.message);
        
        // Check if we should retry with next key
        if (attempts < maxAttempts) {
          console.log(`[IntegratedGenAI VDP] 🔄 Rotating to next API key...`);
          keyManager.rotateKey();
          continue;
        }
        
        // All keys failed
        throw new Error(`Integrated GenAI VDP generation failed after ${attempts} attempts: ${error.message}`);
      }
    }
  }

  getStats() {
    return keyManager.getStats();
  }
}

export { IntegratedGenAIVDP };