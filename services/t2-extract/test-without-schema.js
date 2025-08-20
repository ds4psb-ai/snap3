import { VertexAI } from "@google-cloud/vertexai";

const PROJECT_ID = "tough-variety-466003-c5";
const LOCATION = "us-central1";

const vertex = new VertexAI({ project: PROJECT_ID, location: LOCATION });

// Test without structured output first
const model = vertex.getGenerativeModel({
  model: "gemini-2.5-pro"
  // No generationConfig with responseSchema
});

try {
  console.log("Testing video analysis without structured output...");
  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { fileData: { fileUri: "gs://tough-variety-raw/raw/ingest/2a2633528e7c4de43ebc9555134ad5e96b681b4ca4a4c394959ec536cfe30a63.mp4", mimeType: "video/mp4" } },
        { text: "Analyze this video and provide a JSON response with: {\"summary\": \"brief description\", \"hook_start\": 0, \"hook_strength\": 0.8}" }
      ]
    }]
  });
  
  const response = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("Video analysis result:", response);
  
} catch (err) {
  console.error("Video analysis failed:", err.message);
  console.error("Full error:", err);
}
