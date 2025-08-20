// 🚨 GPT-5 Lean Recursion - Vertex 사전검증 (4줄 구현)
// 목적: "디버그와 큰 사태" 방지를 위한 가벼운 예방 체계

let lastVertexCall = 0;
const MINIMUM_INTERVAL_MS = 800; // 1초보다 짧게 설정 (더 관대함)

/**
 * Vertex API 호출 전 필수 사전검증
 * @param {string} gcsUri - GCS URI 
 * @param {Object} circuitBreaker - Circuit breaker 상태
 * @returns {boolean} - 호출 허용 여부
 */
const preflightVertex = async (gcsUri, circuitBreaker) => {
  if (!gcsUri || !gcsUri.startsWith('gs://')) throw new Error('INVALID_GCS_URI');
  if (Date.now() - lastVertexCall < MINIMUM_INTERVAL_MS) await sleep(MINIMUM_INTERVAL_MS - (Date.now() - lastVertexCall));
  if (circuitBreaker.state === 'OPEN') throw new Error('CIRCUIT_OPEN');
  lastVertexCall = Date.now(); // 호출 시간 기록
};

/**
 * 간단한 sleep 유틸리티
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  preflightVertex,
  MINIMUM_INTERVAL_MS
};