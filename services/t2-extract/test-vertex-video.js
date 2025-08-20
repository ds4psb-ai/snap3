#!/usr/bin/env node

/**
 * Test Vertex AI with video content specifically
 */

import { VertexAI } from "@google-cloud/vertexai";

const PROJECT_ID = "tough-variety-466003-c5";
const LOCATION = "us-central1";
const MODEL_NAME = "gemini-2.5-pro";

async function testVertexAIVideo() {
  try {
    console.log(`🧪 Testing Vertex AI video processing`);
    console.log(`   Project: ${PROJECT_ID}`);
    console.log(`   Location: ${LOCATION}`);
    console.log(`   Model: ${MODEL_NAME}`);
    
    // Initialize Vertex AI
    const vertex = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    const model = vertex.getGenerativeModel({ model: MODEL_NAME });
    console.log(`✅ Model initialized`);
    
    // Test with video content
    const gcsUri = "gs://tough-variety-raw/raw/ingest/6_I2FmT1mbY.mp4";
    console.log(`📹 Testing video: ${gcsUri}`);
    
    const request = {
      contents: [{
        role: "user",
        parts: [
          { fileData: { fileUri: gcsUri, mimeType: "video/mp4" } },
          { text: "Describe this video in one sentence. Return only JSON: {\"description\": \"your description here\"}" }
        ]
      }]
    };
    
    console.log(`🚀 Sending video analysis request...`);
    const result = await model.generateContent(request);
    
    const response = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`✅ Video analysis successful!`);
    console.log(`Response: ${response}`);
    
  } catch (error) {
    console.error(`❌ Video test failed:`, error.message);
    console.error(`Error name: ${error.constructor.name}`);
    console.error(`Stack:`, error.stack);
    
    // Check if it's a network/timeout issue
    if (error.message.includes('fetch failed') || error.message.includes('Socket')) {
      console.log(`\n🔍 Network/Socket error detected - likely a timeout or connection issue`);
      console.log(`   This could be due to:`);
      console.log(`   - Large video file requiring more processing time`);
      console.log(`   - Network connectivity issues`);
      console.log(`   - Vertex AI service temporary unavailability`);
    }
  }
}

testVertexAIVideo();