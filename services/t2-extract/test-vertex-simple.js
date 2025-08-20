import { VertexAI } from "@google-cloud/vertexai";

const PROJECT_ID = "tough-variety-466003-c5";
const LOCATION = "us-central1";

const vertex = new VertexAI({ project: PROJECT_ID, location: LOCATION });

// Test simple text generation first
const model = vertex.getGenerativeModel({
  model: "gemini-1.5-pro"
});

try {
  console.log("Testing basic Gemini connectivity...");
  const result = await model.generateContent({
    contents: [{
      role: "user", 
      parts: [{ text: "Hello, respond with just 'OK'" }]
    }]
  });
  
  const response = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("Basic test result:", response);
  
} catch (err) {
  console.error("Basic test failed:", err.message);
  process.exit(1);
}

// Test with video file
console.log("Testing video analysis...");
try {
  const videoResult = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { fileData: { fileUri: "gs://tough-variety-raw/raw/ingest/2a2633528e7c4de43ebc9555134ad5e96b681b4ca4a4c394959ec536cfe30a63.mp4", mimeType: "video/mp4" } },
        { text: "Describe this video in one sentence." }
      ]
    }]
  });
  
  const videoResponse = videoResult.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("Video test result:", videoResponse);
  
} catch (err) {
  console.error("Video test failed:", err.message);
}
