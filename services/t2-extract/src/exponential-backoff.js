// 🚨 GPT-5 Lean Recursion - 지수 백오프 + 지터 (3줄 구현)
// 목적: Thundering Herd 방지, 더 스마트한 재시도 정책

/**
 * 지수 백오프 + 지터 계산
 * @param {number} attempt - 재시도 횟수 (0부터 시작)
 * @param {number} baseMs - 기본 대기 시간 (기본값: 1000ms)
 * @param {number} maxMs - 최대 대기 시간 (기본값: 30000ms)
 * @returns {number} - 대기 시간 (밀리초)
 */
const backoffWithJitter = (attempt, baseMs = 1000, maxMs = 30000) => {
  const exponential = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  return exponential + Math.random() * Math.min(1000, exponential * 0.1); // 10% 지터 또는 최대 1초
};

/**
 * 재시도 가능 여부 판단
 * @param {Error} error - 발생한 에러
 * @param {number} attempt - 현재 재시도 횟수
 * @returns {boolean} - 재시도 가능 여부
 */
const isRetryableError = (error, attempt) => {
  if (attempt >= 3) return false; // 최대 3회 재시도
  if (error.message.includes('CIRCUIT_OPEN')) return false; // Circuit Open은 재시도 안함
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return true;
  if (error.response && error.response.status >= 500) return true;
  return false;
};

/**
 * 스마트 재시도 실행기
 * @param {Function} fn - 실행할 함수
 * @param {Object} options - 옵션 {maxRetries: 3, baseMs: 1000}
 */
const withSmartRetry = async (fn, options = {}) => {
  const { maxRetries = 3, baseMs = 1000 } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error, attempt) || attempt === maxRetries) {
        throw error;
      }
      
      const delay = backoffWithJitter(attempt, baseMs);
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = {
  backoffWithJitter,
  isRetryableError,
  withSmartRetry
};