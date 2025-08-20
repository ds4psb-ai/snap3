const { SagaTransaction } = require('./saga-compensation-system.js');

// VDP 처리 Saga 정의
async function createVDPProcessingSaga(videoData, correlationId) {
    const saga = new SagaTransaction(`vdp-processing-${Date.now()}`, correlationId);
    
    // 단계 1: GCS 업로드
    saga.addStep('gcs-upload',
        async () => {
            console.log('📤 GCS 업로드 실행');
            // GCS 업로드 로직 (기존 코드 호출)
        },
        async () => {
            console.log('🗑️ GCS 파일 삭제 (보상)');
            // GCS 파일 삭제
        }
    );
    
    // 단계 2: VDP 추출 (T3 호출)
    saga.addStep('vdp-extraction',
        async () => {
            console.log('🧠 VDP 추출 실행');
            // T3 VDP 추출 API 호출
        },
        async () => {
            console.log('🔄 VDP 캐시 삭제 (보상)');
            // VDP 캐시 데이터 삭제
        }
    );
    
    // 단계 3: BigQuery 적재
    saga.addStep('bigquery-load',
        async () => {
            console.log('📊 BigQuery 적재 실행');
            // BigQuery 적재 로직
        },
        async () => {
            console.log('🗑️ BigQuery 레코드 삭제 (보상)');
            // BigQuery 데이터 삭제 (soft delete)
        }
    );
    
    return saga;
}

module.exports = { createVDPProcessingSaga };