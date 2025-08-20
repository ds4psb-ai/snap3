// Text-based JSON parsing logic for VertexAI responses
// Replaces structured output schema approach

async function extractVDPFromText(vertexAIResult) {
  // 1. Extract text from VertexAI response
  let text = vertexAIResult.response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  
  // 2. Clean up markdown formatting if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // 3. Handle potential formatting issues
  text = text.replace(/^\s*```\s*/, '').replace(/\s*```\s*$/, '');
  
  // 4. Parse JSON with detailed error handling
  try {
    const vdp = JSON.parse(text);
    return { success: true, vdp, rawText: text };
  } catch (parseErr) {
    return { 
      success: false, 
      error: parseErr.message, 
      rawText: text.substring(0, 500),
      parseError: parseErr
    };
  }
}

// Enhanced prompt for better JSON output
function createEnhancedPrompt(basePrompt, meta) {
  return `${basePrompt}

PLATFORM CONTEXT:
- Platform: ${meta.platform || 'unknown'}
- Language: ${meta.language || 'ko'}

CRITICAL: Respond with VALID JSON only. No markdown formatting, no code blocks.

[... rest of prompt ...]

Return a complete VDP 2.0 JSON structure.`;
}

module.exports = { extractVDPFromText, createEnhancedPrompt };
