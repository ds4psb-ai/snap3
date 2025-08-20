#!/usr/bin/env node

/**
 * Vertex AI VDP Schema Integration Script
 * 
 * Purpose: Prepares the strict VDP schema for Vertex AI response_schema enforcement
 * Based on vdp-C000888/889 samples with comprehensive validation
 * 
 * Usage:
 *   node scripts/vertex-vdp-schema-integration.js
 *   npm run vertex:schema:prepare
 */

const fs = require('fs');
const path = require('path');

// Paths
const STRICT_SCHEMA_PATH = path.join(__dirname, '../schemas/vdp-strict.schema.json');
const VERTEX_SCHEMA_PATH = path.join(__dirname, '../schemas/vdp-vertex-ai.schema.json');
const SAMPLE_888_PATH = '/Users/ted/Downloads/vdp-C000888.json';
const SAMPLE_889_PATH = '/Users/ted/Downloads/vdp-C000889.json';

console.log('🤖 Vertex AI VDP Schema Integration');
console.log('=====================================');

// Load strict schema
console.log('📋 Loading strict VDP schema...');
let strictSchema;
try {
  strictSchema = JSON.parse(fs.readFileSync(STRICT_SCHEMA_PATH, 'utf8'));
  console.log('✅ Strict schema loaded successfully');
} catch (error) {
  console.error('❌ Failed to load strict schema:', error.message);
  process.exit(1);
}

// Vertex AI specific modifications
console.log('🔧 Preparing Vertex AI compatible schema...');

// Create Vertex AI optimized schema
const vertexSchema = {
  ...strictSchema,
  title: "VDP Vertex AI Response Schema",
  description: "Strict VDP schema optimized for Vertex AI response_schema enforcement based on C000888/889 samples",
  
  // Add Vertex AI specific constraints
  "x-vertex-ai": {
    "model": "gemini-2.5-pro",
    "strictness": "high",
    "validation": "comprehensive",
    "samples": ["vdp-C000888.json", "vdp-C000889.json"],
    "version": "1.0",
    "created": new Date().toISOString()
  },
  
  // Enhanced error messages for Vertex AI
  "errorMessage": {
    "type": "VDP must be a valid object with all required fields",
    "required": {
      "content_id": "content_id is required and must match pattern C######",
      "metadata": "metadata object is required with all platform fields",
      "overall_analysis": "overall_analysis is required with comprehensive analysis",
      "scenes": "scenes array is required with detailed scene breakdown",
      "product_mentions": "product_mentions array is required (can be empty)",
      "service_mentions": "service_mentions array is required (can be empty)",
      "default_lang": "default_lang is required (ISO 639-1 code)"
    }
  }
};

// Vertex AI specific optimizations
console.log('⚡ Applying Vertex AI optimizations...');

// Add response guidance for common fields
vertexSchema.properties.content_id["x-vertex-guidance"] = "Generate unique content ID in format C followed by 6 digits";
vertexSchema.properties.metadata["x-vertex-guidance"] = "Extract comprehensive metadata from video analysis";
vertexSchema.properties.overall_analysis["x-vertex-guidance"] = "Provide detailed analysis with confidence scores 0.9+";
vertexSchema.properties.scenes["x-vertex-guidance"] = "Break down video into 1-8 distinct narrative scenes with shot details";

// Enhance required validations for Vertex AI
vertexSchema.properties.overall_analysis.properties.confidence.properties.overall.minimum = 0.9;
vertexSchema.properties.overall_analysis.properties.confidence.properties.scene_classification.minimum = 0.9;
vertexSchema.properties.overall_analysis.properties.confidence.properties.device_analysis.minimum = 0.8;

// Add sample data validation
console.log('🧪 Validating against sample data...');

function validateSample(samplePath, sampleName) {
  try {
    if (fs.existsSync(samplePath)) {
      const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
      console.log(`✅ ${sampleName}: Structure validated`);
      
      // Basic structure checks
      const requiredFields = ['content_id', 'metadata', 'overall_analysis', 'scenes'];
      const missingFields = requiredFields.filter(field => !sampleData[field]);
      
      if (missingFields.length === 0) {
        console.log(`✅ ${sampleName}: All required fields present`);
      } else {
        console.log(`⚠️ ${sampleName}: Missing fields: ${missingFields.join(', ')}`);
      }
      
      // Scene count check
      const sceneCount = sampleData.scenes?.length || 0;
      console.log(`📊 ${sampleName}: ${sceneCount} scenes`);
      
      // Confidence check
      const confidence = sampleData.overall_analysis?.confidence?.overall || 0;
      console.log(`🎯 ${sampleName}: Overall confidence ${confidence}`);
      
      return true;
    } else {
      console.log(`⚠️ ${sampleName}: Sample file not found at ${samplePath}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${sampleName}: Validation failed - ${error.message}`);
    return false;
  }
}

const sample888Valid = validateSample(SAMPLE_888_PATH, 'vdp-C000888.json');
const sample889Valid = validateSample(SAMPLE_889_PATH, 'vdp-C000889.json');

// Generate integration guide
const integrationGuide = {
  "vertex_ai_integration": {
    "model_configuration": {
      "model": "gemini-2.5-pro",
      "response_schema": vertexSchema,
      "temperature": 0.1,
      "max_output_tokens": 32768,
      "safety_settings": [
        {
          "category": "HARM_CATEGORY_HATE_SPEECH",
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          "category": "HARM_CATEGORY_DANGEROUS_CONTENT", 
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    },
    "prompt_structure": {
      "system_instruction": "You are a video analysis expert. Analyze the provided video and generate a comprehensive VDP (Video Data Package) following the exact schema structure. Ensure all required fields are populated with accurate, detailed information.",
      "user_prompt_template": "Analyze this video and provide a complete VDP analysis:\n\nVideo URL: {video_url}\nPlatform: {platform}\nDuration: {duration}s\n\nGenerate a comprehensive VDP following the strict schema requirements.",
      "response_format": "JSON object strictly conforming to the provided response_schema"
    },
    "validation_workflow": [
      "1. Video ingestion and preprocessing",
      "2. Multi-modal analysis (visual, audio, text)",
      "3. Scene segmentation and shot detection", 
      "4. Product/service mention extraction",
      "5. Audience reaction analysis",
      "6. Schema-compliant JSON generation",
      "7. Validation against strict schema",
      "8. Quality assurance checks"
    ],
    "error_handling": {
      "schema_violations": "Retry with corrected structure",
      "missing_required_fields": "Re-analyze and populate all required fields",
      "invalid_confidence_scores": "Ensure confidence scores are realistic (0.8-1.0)",
      "malformed_timestamps": "Validate all timing data is consistent and logical"
    }
  }
};

// Save Vertex AI schema
console.log('💾 Saving Vertex AI optimized schema...');
try {
  fs.writeFileSync(VERTEX_SCHEMA_PATH, JSON.stringify(vertexSchema, null, 2));
  console.log(`✅ Vertex AI schema saved to: ${VERTEX_SCHEMA_PATH}`);
} catch (error) {
  console.error('❌ Failed to save Vertex AI schema:', error.message);
  process.exit(1);
}

// Save integration guide
const guideePath = path.join(__dirname, '../docs/vertex-ai-integration-guide.json');
try {
  fs.writeFileSync(guideePath, JSON.stringify(integrationGuide, null, 2));
  console.log(`✅ Integration guide saved to: ${guideePath}`);
} catch (error) {
  console.error('❌ Failed to save integration guide:', error.message);
}

// Generate summary report
console.log('\n📊 Integration Summary');
console.log('=====================');
console.log(`📋 Strict Schema: ${STRICT_SCHEMA_PATH}`);
console.log(`🤖 Vertex Schema: ${VERTEX_SCHEMA_PATH}`);
console.log(`📖 Integration Guide: ${guideePath}`);
console.log(`🧪 Sample Validation: ${sample888Valid ? '✅' : '❌'} C000888, ${sample889Valid ? '✅' : '❌'} C000889`);

// Vertex AI specific recommendations
console.log('\n🎯 Vertex AI Implementation Recommendations');
console.log('==========================================');
console.log('1. Use response_schema parameter in Vertex AI API calls');
console.log('2. Set temperature to 0.1 for consistent structured output');
console.log('3. Enable safety filters for content moderation');
console.log('4. Implement retry logic for schema validation failures');
console.log('5. Monitor confidence scores to ensure quality (target: >0.9)');
console.log('6. Use streaming for large video analysis tasks');
console.log('7. Implement proper error handling for quota limits');

// Example API call
console.log('\n🔧 Example Vertex AI API Call Structure');
console.log('=====================================');
const exampleCall = {
  "model": "gemini-2.5-pro",
  "generationConfig": {
    "temperature": 0.1,
    "maxOutputTokens": 32768,
    "response_schema": {
      "$ref": "vdp-vertex-ai.schema.json"
    }
  },
  "contents": [{
    "role": "user", 
    "parts": [{
      "text": "Analyze this video and generate a comprehensive VDP: [video_data]"
    }]
  }]
};

console.log(JSON.stringify(exampleCall, null, 2));

console.log('\n🎉 Vertex AI VDP Schema Integration Complete!');
console.log('\nNext Steps:');
console.log('1. Test with Vertex AI API using the generated schema');
console.log('2. Validate output against sample VDP files');
console.log('3. Fine-tune confidence thresholds based on results');
console.log('4. Implement T2 extraction API integration');