/**
 * ParticleCalculatorWorkerManager.js
 * ParticleCalculatorWorker와 메인 스레드 간의 통신 관리
 * 8200개 파티클의 계산을 백그라운드에서 처리하여 메인 스레드 부하 감소
 */

class ParticleCalculatorWorkerManager {
    constructor() {
        this.worker = null;
        this.isSupported = typeof Worker !== 'undefined';
        this.taskQueue = new Map();
        this.taskId = 0;
        this.isInitialized = false;
        this.fallbackMode = false;
        
        if (this.isSupported) {
            this.initializeWorker();
        } else {
            console.warn('Web Workers not supported, using fallback mode');
            this.fallbackMode = true;
        }
    }
    
    /**
     * 워커 초기화
     */
    async initializeWorker() {
        try {
            this.worker = new Worker('./workers/ParticleCalculatorWorker.js');
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            this.worker.onerror = this.handleWorkerError.bind(this);
            
            // 워커 연결 테스트
            const pingResult = await this.sendMessage('PING', {});
            if (pingResult && pingResult.message === 'ParticleWorker is alive') {
                this.isInitialized = true;
                console.log('ParticleCalculatorWorker 초기화 성공');
            } else {
                throw new Error('Worker ping failed');
            }
        } catch (error) {
            console.warn('ParticleCalculatorWorker 초기화 실패, 폴백 모드 사용:', error);
            this.fallbackMode = true;
            this.isInitialized = false;
        }
    }
    
    /**
     * 워커 메시지 처리
     */
    handleWorkerMessage(event) {
        const { type, data, taskId, timestamp } = event.data;
        
        if (this.taskQueue.has(taskId)) {
            const { resolve, reject } = this.taskQueue.get(taskId);
            this.taskQueue.delete(taskId);
            
            if (type === 'ERROR') {
                reject(new Error(data.error));
            } else {
                resolve({ type, data, timestamp });
            }
        }
    }
    
    /**
     * 워커 에러 처리
     */
    handleWorkerError(error) {
        console.error('ParticleCalculatorWorker 에러:', error);
        this.fallbackMode = true;
        
        // 대기 중인 모든 작업을 거부
        this.taskQueue.forEach(({ reject }) => {
            reject(new Error('Worker error occurred'));
        });
        this.taskQueue.clear();
    }
    
    /**
     * 워커에게 메시지 전송
     */
    sendMessage(type, data, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (this.fallbackMode || !this.worker) {
                reject(new Error('Worker not available, using fallback'));
                return;
            }
            
            const taskId = `task_${++this.taskId}_${Date.now()}`;
            
            // 타임아웃 설정
            const timeoutId = setTimeout(() => {
                if (this.taskQueue.has(taskId)) {
                    this.taskQueue.delete(taskId);
                    reject(new Error('Worker task timeout'));
                }
            }, timeout);
            
            this.taskQueue.set(taskId, { 
                resolve: (result) => {
                    clearTimeout(timeoutId);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });
            
            this.worker.postMessage({ type, data, taskId });
        });
    }
    
    /**
     * 파티클 업데이트 (메인 기능)
     * @param {Array} particles - 파티클 배열
     * @param {number} currentTime - 현재 시간
     * @returns {Promise<Array>} 업데이트된 파티클 배열
     */
    async updateParticles(particles, currentTime) {
        if (this.fallbackMode || !this.isInitialized) {
            return this.fallbackUpdateParticles(particles, currentTime);
        }
        
        try {
            // 파티클 데이터를 워커로 전송 가능한 형태로 변환
            const particleData = particles.map(p => ({
                pos: { x: p.pos.x, y: p.pos.y },
                target: { x: p.target.x, y: p.target.y },
                velocity: { x: p.velocity.x, y: p.velocity.y },
                size: p.size,
                targetSize: p.targetSize,
                startTime: p.startTime,
                duration: p.duration,
                exploding: p.exploding,
                atTarget: p.atTarget,
                color: { r: p.color.r, g: p.color.g, b: p.color.b }
            }));
            
            const result = await this.sendMessage('UPDATE_PARTICLES', {
                particles: particleData,
                currentTime
            });
            
            if (result.type === 'PARTICLES_UPDATED') {
                // 워커에서 받은 데이터로 기존 파티클 객체들 업데이트
                const updatedData = result.data.particles;
                for (let i = 0; i < particles.length && i < updatedData.length; i++) {
                    const particle = particles[i];
                    const data = updatedData[i];
                    
                    particle.pos.x = data.pos.x;
                    particle.pos.y = data.pos.y;
                    particle.velocity.x = data.velocity.x;
                    particle.velocity.y = data.velocity.y;
                    particle.size = data.size;
                    particle.atTarget = data.atTarget;
                }
                return particles;
            } else {
                throw new Error('Unexpected response type');
            }
        } catch (error) {
            console.warn('Worker particle update failed, using fallback:', error);
            return this.fallbackUpdateParticles(particles, currentTime);
        }
    }
    
    /**
     * 폴백 모드: 메인 스레드에서 파티클 업데이트
     */
    fallbackUpdateParticles(particles, currentTime) {
        for (let i = 0; i < particles.length; i++) {
            particles[i].update(currentTime);
        }
        return particles;
    }
    
    /**
     * 폭발 계산
     * @param {Array} particles - 파티클 배열
     * @param {number} explosionDelay - 폭발 지연 시간
     * @returns {Promise<Array>} 폭발 데이터
     */
    async calculateExplosion(particles, explosionDelay = 4000) {
        if (this.fallbackMode || !this.isInitialized) {
            return this.fallbackCalculateExplosion(particles, explosionDelay);
        }
        
        try {
            const result = await this.sendMessage('CALCULATE_EXPLOSION', {
                particles: particles.map(p => ({ index: p.index || 0 })),
                explosionDelay
            });
            
            if (result.type === 'EXPLOSION_CALCULATED') {
                return result.data.explosionData;
            } else {
                throw new Error('Unexpected response type');
            }
        } catch (error) {
            console.warn('Worker explosion calculation failed, using fallback:', error);
            return this.fallbackCalculateExplosion(particles, explosionDelay);
        }
    }
    
    /**
     * 폴백 모드: 메인 스레드에서 폭발 계산
     */
    fallbackCalculateExplosion(particles, explosionDelay) {
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
        return explosionData;
    }
    
    /**
     * 배치 파티클 업데이트 (대용량 처리)
     * @param {Array} particleBatches - 파티클 배치 배열
     * @param {number} currentTime - 현재 시간
     * @returns {Promise<Array>} 업데이트된 배치 결과
     */
    async batchUpdateParticles(particleBatches, currentTime) {
        if (this.fallbackMode || !this.isInitialized) {
            return this.fallbackBatchUpdate(particleBatches, currentTime);
        }
        
        try {
            const batchData = particleBatches.map(batch => 
                batch.map(p => ({
                    pos: { x: p.pos.x, y: p.pos.y },
                    target: { x: p.target.x, y: p.target.y },
                    velocity: { x: p.velocity.x, y: p.velocity.y },
                    size: p.size,
                    targetSize: p.targetSize,
                    startTime: p.startTime,
                    duration: p.duration,
                    exploding: p.exploding,
                    atTarget: p.atTarget
                }))
            );
            
            const result = await this.sendMessage('BATCH_UPDATE', {
                batches: batchData,
                currentTime
            });
            
            if (result.type === 'BATCH_UPDATED') {
                return result.data.results;
            } else {
                throw new Error('Unexpected response type');
            }
        } catch (error) {
            console.warn('Worker batch update failed, using fallback:', error);
            return this.fallbackBatchUpdate(particleBatches, currentTime);
        }
    }
    
    /**
     * 폴백 모드: 메인 스레드에서 배치 업데이트
     */
    fallbackBatchUpdate(particleBatches, currentTime) {
        return particleBatches.map((batch, batchIndex) => ({
            batchIndex,
            particles: batch.map(p => {
                p.update(currentTime);
                return p;
            })
        }));
    }
    
    /**
     * 워커 상태 정보
     */
    getStatus() {
        return {
            isSupported: this.isSupported,
            isInitialized: this.isInitialized,
            fallbackMode: this.fallbackMode,
            pendingTasks: this.taskQueue.size,
            workerType: 'ParticleCalculatorWorker'
        };
    }
    
    /**
     * 리소스 정리
     */
    cleanup() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        this.taskQueue.clear();
        this.isInitialized = false;
        console.log('ParticleCalculatorWorkerManager 정리 완료');
    }
}

// 싱글톤 인스턴스
const particleCalculatorWorkerManager = new ParticleCalculatorWorkerManager();

export default particleCalculatorWorkerManager;