/**
 * VDP Streaming Generator - 2-Pass Token-Efficient Generation
 * 
 * Pass 1: Generate scene structure with beats and shot counts only
 * Pass 2: Stream-fill shot/keyframe details scene by scene
 */

import fs from 'fs/promises';
import path from 'path';

// Optimized prompts for each pass
const PASS1_STRUCTURE_PROMPT = `
You are a VDP Structure Analyzer inspired by OLD VDP efficiency principles.

🎯 OLD VDP TOKEN OPTIMIZATION RULES (CRITICAL):
- Generate MINIMAL structure with MAXIMUM semantic compression
- Use ENUM values wherever possible (camera.size, angle, move)
- Single scene preferred for short videos (≤10s) - NO artificial segmentation
- scene.beat must be ULTRA-CONCISE (≤60 chars) - pack maximum meaning
- shot_count realistic estimates only (1-3 per scene typical)

CRITICAL: Apply OLD VDP structural consistency - NO verbose descriptions!

Output JSON format:
{
  "content_id": "extracted_id",
  "media": {
    "platform": "YouTube|Instagram|TikTok",
    "duration_sec": <number>,
    "source_url": "<url>"
  },
  "hook_genome": {
    "pattern_code": "<pattern>",
    "strength_score": <0-1>,
    "start_sec": 0.0,
    "end_sec": <hook_end>
  },
  "scenes": [
    {
      "idx": 0,
      "start": <start_time>,
      "end": <end_time>,
      "beat": "<60-char narrative beat>",
      "role": "Hook|Build|Peak|Resolve|CTA",
      "shot_count": <number_of_shots>
    }
  ]
}

Rules:
- Scenes: 2-6 total (natural breaks only)
- Beat: Single sentence, max 60 chars
- Shot_count: Realistic estimate (1-4 per scene)
- Hook_genome: Required with accurate pattern analysis
- NO detailed descriptions, summaries, or verbose text
`;

const PASS2_DETAIL_PROMPT = `
You are a VDP Detail Filler applying OLD VDP token efficiency principles.

🎯 OLD VDP SEMANTIC COMPRESSION (CRITICAL):
- keyframe.desc: ULTRA-CONCISE (≤40 chars) - no redundant context
- composition: ENUM values only, minimal notes
- audio: Only SIGNIFICANT events - avoid micro-details  
- NO repetition of scene context in shot details
- Focus on ESSENTIAL visual/audio changes only

Given scene structure:
{scene_data}

Generate ONLY the shots array for this scene:
{
  "shots": [
    {
      "idx": 0,
      "cam": {
        "size": "ECU|CU|MCU|MS|MLS|WS|EWS",
        "angle": "eye|high|low|overhead|dutch", 
        "move": "static|pan|tilt|dolly|truck|handheld|crane|zoom"
      },
      "comp": ["left_third|center|right_third|symmetry"],
      "kf": [
        {
          "t": <timestamp>,
          "desc": "<max 40 chars - ultra concise>"
        }
      ],
      "audio": [
        {
          "t": <timestamp>,
          "event": "music_starts|music_stops|sfx|laugh|voice_peak|silence",
          "intensity": 1-3
        }
      ]
    }
  ]
}

Rules:
- Generate exactly {shot_count} shots
- Keyframes: 2-4 per shot, ultra-concise descriptions
- Audio events: Only significant ones
- NO redundant descriptions across shots
- Focus on visual/audio changes, not narrative repetition
`;

class VDPStreamingGenerator {
  constructor(vertexModel, hybridSchema) {
    this.model = vertexModel;
    this.schema = hybridSchema;
  }

  /**
   * Pass 1: Generate scene structure only
   */
  async generateStructure(gcsUri, meta) {
    console.log(`[Pass 1] 🏗️ Generating scene structure for ${meta.content_id}`);
    
    const prompt = PASS1_STRUCTURE_PROMPT.replace('<url>', meta.source_url || gcsUri);
    
    console.log(`[DEBUG] GCS URI: ${gcsUri}`);
    console.log(`[DEBUG] Meta: ${JSON.stringify(meta)}`);
    console.log(`[DEBUG] Prompt length: ${prompt.length}`);
    console.log(`[DEBUG] Model: ${typeof this.model}, has generateContent: ${!!this.model.generateContent}`);
    
    try {
      const requestPayload = {
        contents: [{
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: gcsUri,
                mimeType: "video/mp4"
              }
            },
            { text: prompt }
          ]
        }]
      };
      
      console.log(`[DEBUG] API Request payload:`, JSON.stringify(requestPayload, null, 2));
      
      const result = await this.model.generateContent(requestPayload);
      
      console.log(`[DEBUG] Result structure:`, typeof result, Object.keys(result));
      console.log(`[DEBUG] Response structure:`, typeof result.response, Object.keys(result.response || {}));
      
      // Try different ways to extract text from response
      let structureText;
      if (result.response && typeof result.response.text === 'function') {
        structureText = result.response.text();
      } else if (result.response && result.response.text) {
        structureText = result.response.text;
      } else if (result.response && result.response.candidates && result.response.candidates[0]) {
        structureText = result.response.candidates[0].content.parts[0].text;
      } else if (result.candidates && result.candidates[0]) {
        structureText = result.candidates[0].content.parts[0].text;
      } else {
        console.error(`[DEBUG] Unable to extract text from result:`, JSON.stringify(result, null, 2));
        throw new Error('Unable to extract text from Vertex AI response');
      }
      
      console.log(`[Pass 1] 📄 Structure response length: ${structureText.length} chars`);
      
      const structure = JSON.parse(structureText);
      
      // Validate structure
      this.validateStructure(structure);
      
      console.log(`[Pass 1] ✅ Structure generated: ${structure.scenes.length} scenes, ${structure.scenes.reduce((sum, s) => sum + (s.shot_count || 1), 0)} total shots planned`);
      
      return structure;
      
    } catch (error) {
      console.error(`[Pass 1] ❌ Structure generation failed:`, error.message);
      console.error(`[Pass 1] ERROR Stack:`, error.stack);
      console.error(`[Pass 1] Full error:`, error);
      throw new Error(`Structure generation failed: ${error.message}`);
    }
  }

  /**
   * Pass 2: Stream-fill details scene by scene
   */
  async fillSceneDetails(structure, gcsUri) {
    console.log(`[Pass 2] 🎬 Filling details for ${structure.scenes.length} scenes`);
    
    const completeVdp = { ...structure };
    
    for (let i = 0; i < structure.scenes.length; i++) {
      const scene = structure.scenes[i];
      console.log(`[Pass 2.${i+1}] 🔍 Processing scene ${scene.idx}: "${scene.beat}"`);
      
      try {
        const sceneDetails = await this.generateSceneDetails(scene, gcsUri);
        
        // Merge details into complete structure
        completeVdp.scenes[i] = {
          ...scene,
          shots: sceneDetails.shots
        };
        
        // Remove shot_count as it's no longer needed
        delete completeVdp.scenes[i].shot_count;
        
        console.log(`[Pass 2.${i+1}] ✅ Scene ${scene.idx} completed: ${sceneDetails.shots.length} shots, ${sceneDetails.shots.reduce((sum, s) => sum + s.kf.length, 0)} keyframes`);
        
      } catch (error) {
        console.error(`[Pass 2.${i+1}] ❌ Scene ${scene.idx} detail generation failed:`, error.message);
        
        // Fallback: generate minimal shot structure
        completeVdp.scenes[i].shots = this.generateMinimalShots(scene);
        console.log(`[Pass 2.${i+1}] 🔄 Using fallback minimal shots for scene ${scene.idx}`);
      }
    }
    
    // Add context summary (single comprehensive summary)
    completeVdp.context = await this.generateContextSummary(completeVdp, gcsUri);
    
    console.log(`[Pass 2] ✅ Complete VDP generated with context`);
    return completeVdp;
  }

  /**
   * Generate details for a single scene
   */
  async generateSceneDetails(scene, gcsUri) {
    const prompt = PASS2_DETAIL_PROMPT
      .replace('{scene_idx}', scene.idx)
      .replace('{scene_data}', JSON.stringify(scene, null, 2))
      .replace('{shot_count}', scene.shot_count || 2);
    
    const requestPayload = {
      contents: [{
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: gcsUri,
              mimeType: "video/mp4"
            }
          },
          { text: prompt }
        ]
      }]
    };
    
    console.log(`[DEBUG] Scene detail API payload:`, JSON.stringify(requestPayload, null, 2));
    
    const result = await this.model.generateContent(requestPayload);
    
    // Extract text using same logic as structure generation
    let detailText;
    if (result.response && typeof result.response.text === 'function') {
      detailText = result.response.text();
    } else if (result.response && result.response.text) {
      detailText = result.response.text;
    } else if (result.response && result.response.candidates && result.response.candidates[0]) {
      detailText = result.response.candidates[0].content.parts[0].text;
    } else if (result.candidates && result.candidates[0]) {
      detailText = result.candidates[0].content.parts[0].text;
    } else {
      console.error(`[DEBUG] Scene detail: Unable to extract text from result:`, JSON.stringify(result, null, 2));
      throw new Error('Unable to extract text from Vertex AI response');
    }
    
    return JSON.parse(detailText);
  }

  /**
   * Generate single context summary applying OLD VDP context consolidation
   */
  async generateContextSummary(vdp, gcsUri) {
    const contextPrompt = `
Generate a single comprehensive context applying OLD VDP consolidation principles.

🎯 OLD VDP CONTEXT CONSOLIDATION (CRITICAL):
- overall_summary: Pack MAXIMUM meaning in ≤200 chars
- emotional_arc: Single sentence flow description  
- visual_style: ENUM values preferred, minimal descriptions
- audio_profile: Core elements only - avoid verbose descriptions
- transcript: Essential dialogue only - OLD VDP language separation

Scene beats: ${vdp.scenes.map(s => `${s.idx}: ${s.beat}`).join(', ')}

Output format:
{
  "overall_summary": "<200-char comprehensive summary>",
  "emotional_arc": "<150-char emotional journey>",
  "visual_style": {
    "lighting": "<50-char lighting description>",
    "mood": ["<mood1>", "<mood2>"],
    "edit_pace": "slow|medium|fast|mixed"
  },
  "audio_profile": {
    "music_type": "<40-char music description>",
    "tone": "<40-char audio tone>"
  },
  "transcript": {
    "lang": "ko|en|ja",
    "text": "<500-char transcript>",
    "translation_en": "<500-char english translation>"
  }
}
`;

    try {
      const requestPayload = {
        contents: [{
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: gcsUri,
                mimeType: "video/mp4"
              }
            },
            { text: contextPrompt }
          ]
        }]
      };
      
      console.log(`[DEBUG] Context API payload:`, JSON.stringify(requestPayload, null, 2));
      
      const result = await this.model.generateContent(requestPayload);
      
      // Extract text using same logic as structure generation
      let contextText;
      if (result.response && typeof result.response.text === 'function') {
        contextText = result.response.text();
      } else if (result.response && result.response.text) {
        contextText = result.response.text;
      } else if (result.response && result.response.candidates && result.response.candidates[0]) {
        contextText = result.response.candidates[0].content.parts[0].text;
      } else if (result.candidates && result.candidates[0]) {
        contextText = result.candidates[0].content.parts[0].text;
      } else {
        console.error(`[DEBUG] Context: Unable to extract text from result:`, JSON.stringify(result, null, 2));
        throw new Error('Unable to extract text from Vertex AI response');
      }
      
      return JSON.parse(contextText);
    } catch (error) {
      console.error(`[Context] ⚠️ Context generation failed, using minimal context:`, error.message);
      return {
        overall_summary: "Context generation failed - minimal summary",
        emotional_arc: "Context not available",
        visual_style: { lighting: "unknown", mood: ["neutral"], edit_pace: "medium" },
        audio_profile: { music_type: "unknown", tone: "neutral" }
      };
    }
  }

  /**
   * Fallback minimal shot generation
   */
  generateMinimalShots(scene) {
    const shotCount = scene.shot_count || 2;
    const shotDuration = (scene.end - scene.start) / shotCount;
    
    const shots = [];
    for (let i = 0; i < shotCount; i++) {
      const shotStart = scene.start + (i * shotDuration);
      const shotEnd = scene.start + ((i + 1) * shotDuration);
      
      shots.push({
        idx: i,
        cam: {
          size: i === 0 ? "MS" : "CU",
          angle: "eye",
          move: "static"
        },
        comp: ["center"],
        kf: [
          {
            t: shotStart,
            desc: `Shot ${i + 1} start`
          },
          {
            t: shotEnd - 0.5,
            desc: `Shot ${i + 1} end`
          }
        ],
        audio: []
      });
    }
    
    return shots;
  }

  /**
   * Validate structure from Pass 1
   */
  validateStructure(structure) {
    if (!structure.content_id) throw new Error("Missing content_id");
    if (!structure.hook_genome) throw new Error("Missing hook_genome");
    if (!structure.scenes || structure.scenes.length === 0) throw new Error("Missing scenes");
    
    // Validate hook genome
    const hg = structure.hook_genome;
    if (typeof hg.strength_score !== 'number' || hg.strength_score < 0 || hg.strength_score > 1) {
      throw new Error("Invalid hook_genome.strength_score");
    }
    
    // Validate scenes
    for (const scene of structure.scenes) {
      if (typeof scene.idx !== 'number') throw new Error(`Scene missing idx: ${JSON.stringify(scene)}`);
      if (!scene.beat || scene.beat.length > 80) throw new Error(`Scene beat invalid: ${scene.beat}`);
      if (!scene.role) throw new Error(`Scene missing role: ${JSON.stringify(scene)}`);
    }
  }

  /**
   * Main entry point - complete 2-pass generation
   */
  async generate(gcsUri, meta) {
    const startTime = Date.now();
    
    try {
      // Pass 1: Structure
      const structure = await this.generateStructure(gcsUri, meta);
      
      // Pass 2: Details
      const completeVdp = await this.fillSceneDetails(structure, gcsUri);
      
      const duration = Date.now() - startTime;
      console.log(`[2-Pass VDP] ✅ Complete generation in ${duration}ms`);
      
      return completeVdp;
      
    } catch (error) {
      console.error(`[2-Pass VDP] ❌ Generation failed:`, error.message);
      throw error;
    }
  }
}

export { VDPStreamingGenerator };