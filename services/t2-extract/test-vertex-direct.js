#!/usr/bin/env node

/**
 * Direct test of Vertex AI connectivity and model access
 */

import { VertexAI } from "@google-cloud/vertexai";

const PROJECT_ID = "tough-variety-466003-c5";
const LOCATION = "us-central1";

async function testVertexAI() {
  try {
    console.log(`🧪 Testing Vertex AI connectivity`);
    console.log(`   Project: ${PROJECT_ID}`);
    console.log(`   Location: ${LOCATION}`);
    
    // Initialize Vertex AI
    const vertex = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    console.log(`✅ Vertex AI client initialized`);
    
    // Try different model names that might be available
    const modelNames = [
      "gemini-2.5-pro",
      "gemini-1.5-pro",
      "gemini-pro",
      "gemini-1.0-pro"
    ];
    
    for (const modelName of modelNames) {
      try {
        console.log(`\n🔍 Testing model: ${modelName}`);
        const model = vertex.getGenerativeModel({ model: modelName });
        
        // Simple text-only test (no video)
        const result = await model.generateContent("Hello, can you respond with just 'test successful'?");
        const response = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        console.log(`✅ Model ${modelName} works! Response: ${response?.substring(0, 50)}...`);
        break; // Exit on first successful model
        
      } catch (modelError) {
        console.log(`❌ Model ${modelName} failed: ${modelError.message}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Vertex AI test failed:`, error.message);
    console.error(`Stack:`, error.stack);
  }
}

testVertexAI();