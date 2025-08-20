import { VertexAI } from "@google-cloud/vertexai";

const PROJECT_ID = "tough-variety-466003-c5";
const LOCATION = "us-central1";

const vertex = new VertexAI({ project: PROJECT_ID, location: LOCATION });

const model = vertex.getGenerativeModel({
  model: "gemini-2.5-pro"
});

try {
  console.log("Testing Gemini 2.5 Pro connectivity...");
  const result = await model.generateContent({
    contents: [{
      role: "user", 
      parts: [{ text: "Hello, respond with just 'OK'" }]
    }]
  });
  
  const response = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("Gemini 2.5 Pro test result:", response);
  
} catch (err) {
  console.error("Gemini 2.5 Pro test failed:", err.message);
}
