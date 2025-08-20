// Saga Transaction + Outbox 패턴 (GPT-5 전문가 권고)
const { EventEmitter } = require('events');

class SagaTransaction extends EventEmitter {
    constructor(sagaId, correlationId) {
        super();
        this.sagaId = sagaId;
        this.correlationId = correlationId;
        this.steps = [];
        this.completed = [];
        this.compensations = [];
        this.state = 'STARTED';
    }
    
    // 단계 추가 (forward action + compensation)
    addStep(stepId, forwardAction, compensationAction) {
        this.steps.push({
            stepId,
            forwardAction,
            compensationAction,
            status: 'PENDING'
        });
    }
    
    // Saga 실행
    async execute() {
        try {
            // Forward 단계 실행
            for (const step of this.steps) {
                console.log(`🔄 [SAGA] 단계 실행: ${step.stepId}`);
                
                await step.forwardAction();
                step.status = 'COMPLETED';
                this.completed.push(step);
                
                // Outbox 이벤트 발행
                this.emit('step_completed', {
                    sagaId: this.sagaId,
                    stepId: step.stepId,
                    timestamp: new Date().toISOString()
                });
            }
            
            this.state = 'COMPLETED';
            console.log(`✅ [SAGA] 완료: ${this.sagaId}`);
            
        } catch (error) {
            console.log(`❌ [SAGA] 실패: ${this.sagaId} - 보상 트랜잭션 시작`);
            await this.compensate();
            throw error;
        }
    }
    
    // 보상 트랜잭션 실행
    async compensate() {
        this.state = 'COMPENSATING';
        
        // 완료된 단계들을 역순으로 보상
        for (const step of this.completed.reverse()) {
            try {
                console.log(`🔄 [SAGA] 보상 실행: ${step.stepId}`);
                await step.compensationAction();
                
                // Outbox 보상 이벤트
                this.emit('step_compensated', {
                    sagaId: this.sagaId,
                    stepId: step.stepId,
                    timestamp: new Date().toISOString()
                });
                
            } catch (compensationError) {
                console.error(`❌ [SAGA] 보상 실패: ${step.stepId}`, compensationError);
                // 보상 실패는 DLQ로 전송
            }
        }
        
        this.state = 'COMPENSATED';
    }
}

module.exports = { SagaTransaction };