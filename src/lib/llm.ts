import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const analyzeContent = async (content: string): Promise<any> => {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp' });
    
    const prompt = `다음 콘텐츠를 분석해주세요: ${content}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return {
      analysis: text,
      success: true
    };
  } catch (error) {
    console.error('LLM 분석 중 오류:', error);
    return {
      analysis: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const generateSummary = async (content: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp' });
    
    const prompt = `다음 콘텐츠의 요약을 생성해주세요: ${content}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text();
  } catch (error) {
    console.error('요약 생성 중 오류:', error);
    throw new Error('요약을 생성할 수 없습니다.');
  }
};
