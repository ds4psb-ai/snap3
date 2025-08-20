#!/usr/bin/env node

/**
 * Minimal test server to isolate the Vertex AI issue
 */

import express from "express";
import { VertexAI } from "@google-cloud/vertexai";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PROJECT_ID = "tough-variety-466003-c5";
const LOCATION = "us-central1";

const vertex = new VertexAI({ project: PROJECT_ID, location: LOCATION });

function createModel() {
  return vertex.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.1,
    }
  });
}

app.post("/test-minimal", async (req, res) => {
  try {
    const { gcsUri } = req.body || {};
    if (!gcsUri) return res.status(400).json({ error: "gcsUri required" });

    console.log(`🧪 Minimal test for: ${gcsUri}`);
    
    const model = createModel();
    
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { fileData: { fileUri: gcsUri, mimeType: "video/mp4" } },
          { text: "Describe this video in one sentence. Return only valid JSON: {\"description\": \"your description here\"}" }
        ]
      }]
    });

    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    console.log(`✅ Success: ${text.substring(0, 100)}...`);
    
    return res.json({ success: true, response: text });
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = 8081;
app.listen(PORT, () => console.log(`🚀 Minimal test server listening on ${PORT}`));