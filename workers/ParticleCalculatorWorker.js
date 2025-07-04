/**
 * ParticleCalculatorWorker.js
 * 파티클 위치 계산을 백그라운드에서 수행하는 웹 워커
 * 8200개 파티클의 복잡한 계산을 메인 스레드에서 분리
 */

class ParticleCalculatorWorker {
    constructor() {
        self.onmessage = this.handleMessage.bind(this);
        console.log('ParticleCalculatorWorker 초기화 완료');
    }
    
    handleMessage(event) {
        const { type, data, taskId } = event.data;
        
        try {
            switch (type) {
                case 'UPDATE_PARTICLES':
                    this.updateParticles(data, taskId);
                    break;
                case 'CALCULATE_EXPLOSION':
                    this.calculateExplosion(data, taskId);
                    break;
                case 'BATCH_UPDATE':
                    this.batchUpdateParticles(data, taskId);
                    break;
                case 'PING':
                    this.sendResponse('PONG', { message: 'ParticleWorker is alive' }, taskId);
                    break;
                default:
                    this.sendError(`Unknown message type: ${type}`, taskId);
            }
        } catch (error) {
            this.sendError(error.message, taskId);
        }
    }
    
    /**
     * 파티클들의 위치를 업데이트
     * @param {Object} data - 파티클 업데이트 데이터
     * @param {string} taskId - 작업 ID
     */
    updateParticles(data, taskId) {
        const { particles, currentTime } = data;
        const updatedParticles = [];
        
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            
            if (!particle.exploding) {
                const updatedParticle = this.updateFormationParticle(particle, currentTime);
                updatedParticles.push(updatedParticle);
            } else {
                const updatedParticle = this.updateExplodingParticle(particle, currentTime);
                updatedParticles.push(updatedParticle);
            }
        }
        
        this.sendResponse('PARTICLES_UPDATED', {
            particles: updatedParticles,
            timestamp: currentTime
        }, taskId);
    }
    
    /**
     * 형성 단계 파티클 업데이트 (기존 로직과 동일)
     * @param {Object} particle - 파티클 데이터
     * @param {number} currentTime - 현재 시간
     * @returns {Object} 업데이트된 파티클
     */
    updateFormationParticle(particle, currentTime) {
        const timeElapsed = (currentTime - particle.startTime) / particle.duration;
        const progress = this.easeInOutQuart(Math.min(Math.max(timeElapsed, 0), 1));
        
        // 기존과 동일한 로직
        const growthFactor = 2.5;
        const speed = Math.pow(progress, growthFactor);
        
        const newParticle = {
            ...particle,
            pos: {
                x: particle.target.x * speed + particle.pos.x * (1 - speed),
                y: particle.target.y * speed + particle.pos.y * (1 - speed)
            },
            size: particle.targetSize * speed,
            atTarget: timeElapsed >= 1
        };
        
        // 타겟에 도달했을 때 정확한 위치로 설정
        if (timeElapsed >= 1) {
            newParticle.pos.x = particle.target.x;
            newParticle.pos.y = particle.target.y;
            newParticle.size = particle.targetSize;
            newParticle.atTarget = true;
        }
        
        return newParticle;
    }
    
    /**
     * 폭발 단계 파티클 업데이트 (기존 로직과 동일)
     * @param {Object} particle - 파티클 데이터
     * @param {number} currentTime - 현재 시간
     * @returns {Object} 업데이트된 파티클
     */
    updateExplodingParticle(particle, currentTime) {
        return {
            ...particle,
            velocity: {
                x: particle.velocity.x * 1.02,
                y: particle.velocity.y * 1.02
            },
            pos: {
                x: particle.pos.x + particle.velocity.x * 1.02,
                y: particle.pos.y + particle.velocity.y * 1.02
            },
            size: Math.max(0, particle.size - 0.5)
        };
    }
    
    /**
     * 폭발 계산 (기존 로직과 동일)
     * @param {Object} data - 폭발 데이터
     * @param {string} taskId - 작업 ID
     */
    calculateExplosion(data, taskId) {
        const { particles, explosionDelay } = data;
        const explosionData = [];
        
        for (let i = 0; i < particles.length; i++) {
            const delay = Math.random() * explosionDelay;
            const velocity = {
                x: (Math.random() - 0.5) * 3,
                y: (Math.random() - 0.5) * 2
            };
            
            explosionData.push({
                index: i,
                delay,
                velocity,
                exploding: true
            });
        }
        
        this.sendResponse('EXPLOSION_CALCULATED', {
            explosionData,
            totalParticles: particles.length
        }, taskId);
    }
    
    /**
     * 배치 파티클 업데이트 (성능 최적화)
     * @param {Object} data - 배치 데이터
     * @param {string} taskId - 작업 ID
     */
    batchUpdateParticles(data, taskId) {
        const { batches, currentTime } = data;
        const results = [];
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const updatedBatch = [];
            
            for (let i = 0; i < batch.length; i++) {
                const particle = batch[i];
                
                if (!particle.exploding) {
                    updatedBatch.push(this.updateFormationParticle(particle, currentTime));
                } else {
                    updatedBatch.push(this.updateExplodingParticle(particle, currentTime));
                }
            }
            
            results.push({
                batchIndex,
                particles: updatedBatch
            });
        }
        
        this.sendResponse('BATCH_UPDATED', {
            results,
            processedBatches: results.length
        }, taskId);
    }
    
    /**
     * Easing 함수 (기존과 동일)
     * @param {number} t - 진행률 (0-1)
     * @returns {number} eased 값
     */
    easeInOutQuart(t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }
    
    /**
     * 성공 응답 전송
     * @param {string} type - 응답 타입
     * @param {Object} data - 응답 데이터
     * @param {string} taskId - 작업 ID
     */
    sendResponse(type, data, taskId) {
        self.postMessage({
            type,
            data,
            taskId,
            timestamp: performance.now()
        });
    }
    
    /**
     * 에러 응답 전송
     * @param {string} errorMessage - 에러 메시지
     * @param {string} taskId - 작업 ID
     */
    sendError(errorMessage, taskId) {
        self.postMessage({
            type: 'ERROR',
            data: { error: errorMessage },
            taskId,
            timestamp: performance.now()
        });
    }
}

// 워커 인스턴스 생성
new ParticleCalculatorWorker();