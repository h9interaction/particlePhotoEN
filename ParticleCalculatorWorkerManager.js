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
        
        // 🚨 테스트용: 웹워커 강제 비활성화 - 폴백 모드만 사용
        this.fallbackMode = true;
        console.log('🔧 웹워커 강제 비활성화 - 메인 스레드에서만 파티클 계산 수행');
        
        // 원본 코드 (웹워커 사용시):
        // if (this.isSupported) {
        //     console.log('ParticleCalculatorWorker 초기화 시작:', this.getStatus());
        //     this.initializeWorker();
        // } else {
        //     console.warn('Web Workers not supported, using fallback mode');
        //     this.fallbackMode = true;
        // }
    }
    
    /**
     * 워커 초기화
     */
    async initializeWorker() {
        try {
            this.worker = new Worker('./workers/ParticleCalculatorWorker.js');
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            this.worker.onerror = this.handleWorkerError.bind(this);
            
            // 웹워커가 완전히 로드될 때까지 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 워커 연결 테스트 (더 긴 타임아웃과 재시도)
            let pingSuccess = false;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (!pingSuccess && attempts < maxAttempts) {
                attempts++;
                console.log(`ParticleCalculatorWorker ping 시도 ${attempts}/${maxAttempts}`);
                
                try {
                    const pingResult = await this.sendMessage('PING', {}, 3000); // 3초 타임아웃
                    console.log('Ping 결과:', pingResult);
                    
                    if (pingResult && pingResult.data && pingResult.data.message === 'ParticleWorker is alive') {
                        pingSuccess = true;
                        this.isInitialized = true;
                        console.log('ParticleCalculatorWorker 초기화 성공');
                    } else {
                        console.warn('예상하지 못한 ping 응답:', pingResult);
                        if (attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기 후 재시도
                        }
                    }
                } catch (pingError) {
                    console.warn(`Ping 시도 ${attempts} 실패:`, pingError);
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기 후 재시도
                    }
                }
            }
            
            if (!pingSuccess) {
                throw new Error(`Worker ping failed after ${maxAttempts} attempts`);
            }
        } catch (error) {
            console.warn('ParticleCalculatorWorker 초기화 실패, 폴백 모드 사용:', error);
            this.fallbackMode = true;
            this.isInitialized = false;
            
            // 워커 정리
            if (this.worker) {
                this.worker.terminate();
                this.worker = null;
            }
        }
    }
    
    /**
     * 워커 메시지 처리
     */
    handleWorkerMessage(event) {
        const { type, data, taskId, timestamp } = event.data;
        
        // console.log('ParticleCalculatorWorkerManager 메시지 수신:', { type, taskId, timestamp });
        
        if (this.taskQueue.has(taskId)) {
            const { resolve, reject } = this.taskQueue.get(taskId);
            this.taskQueue.delete(taskId);
            
            if (type === 'ERROR') {
                console.error('워커 에러 응답:', data.error);
                reject(new Error(data.error));
            } else {
                // console.log('워커 성공 응답:', { type, dataKeys: Object.keys(data || {}) });
                resolve({ type, data, timestamp });
            }
        } else {
            console.warn('해당하는 taskId를 찾을 수 없음:', taskId);
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
            
            // console.log('워커에게 메시지 전송:', { type, taskId, timeout });
            
            // 타임아웃 설정
            const timeoutId = setTimeout(() => {
                if (this.taskQueue.has(taskId)) {
                    this.taskQueue.delete(taskId);
                    console.warn('워커 태스크 타임아웃:', { type, taskId, timeout });
                    reject(new Error(`Worker task timeout after ${timeout}ms`));
                }
            }, timeout);
            
            this.taskQueue.set(taskId, { 
                resolve: (result) => {
                    clearTimeout(timeoutId);
                    console.log('워커 태스크 성공:', { type, taskId });
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    console.error('워커 태스크 실패:', { type, taskId, error });
                    reject(error);
                }
            });
            
            try {
                this.worker.postMessage({ type, data, taskId });
                console.log('워커 메시지 전송 완료:', { type, taskId });
            } catch (error) {
                clearTimeout(timeoutId);
                this.taskQueue.delete(taskId);
                console.error('워커 메시지 전송 실패:', error);
                reject(new Error('Failed to send message to worker: ' + error.message));
            }
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
                color: { r: p.color.r, g: p.color.g, b: p.color.b },
                currentRotation: p.currentRotation,
                rotationSpeed: p.rotationSpeed,
                swayAmount: p.swayAmount,
                initialX: p.initialX,
                initialY: p.initialY,
                dustSize: p.dustSize,
                settlementStarted: p.settlementStarted,
                rotationAtSettlement: p.rotationAtSettlement
            }));
            
            // 타이밍 체크 비활성화

            const result = await this.sendMessage('UPDATE_PARTICLES', {
                particles: particleData,
                currentTime
            });
            
            if (result.type === 'PARTICLES_UPDATED') {
                // 워커에서 받은 데이터로 기존 파티클 객체들 업데이트
                const updatedData = result.data.particles;
                
                // 상세 로깅 비활성화
                
                for (let i = 0; i < particles.length && i < updatedData.length; i++) {
                    const particle = particles[i];
                    const data = updatedData[i];
                    
                    // 업데이트 전 로깅 비활성화
                    
                    // 기본 속성 업데이트
                    particle.pos.x = data.pos.x || 0;
                    particle.pos.y = data.pos.y || 0;
                    particle.velocity.x = data.velocity.x || 0;
                    particle.velocity.y = data.velocity.y || 0;
                    particle.size = Math.max(data.size || 0.1, 0.1); // 최소 크기 보장
                    particle.atTarget = data.atTarget || false;
                    
                    // 렌더링에 필요한 추가 속성들 업데이트
                    if (data.currentRotation !== undefined) {
                        particle.currentRotation = data.currentRotation;
                    }
                    if (data.settlementStarted !== undefined) {
                        particle.settlementStarted = data.settlementStarted;
                    }
                    if (data.rotationAtSettlement !== undefined) {
                        particle.rotationAtSettlement = data.rotationAtSettlement;
                    }
                    if (data.color) {
                        particle.color.r = data.color.r;
                        particle.color.g = data.color.g;
                        particle.color.b = data.color.b;
                    }
                    
                    // 업데이트 후 로깅 비활성화
                }
                return particles;
            } else {
                throw new Error('Unexpected response type');
            }
        } catch (error) {
            console.warn('Worker particle update failed, using fallback:', error);
            
            // 웹워커가 반복적으로 실패하는 경우 폴백 모드로 전환
            if (!this.fallbackMode) {
                console.warn('웹워커 연속 실패 감지, 폴백 모드로 전환');
                this.fallbackMode = true;
                this.isInitialized = false;
                if (this.worker) {
                    this.worker.terminate();
                    this.worker = null;
                }
            }
            
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
     * 워커 상태 정보 (디버깅용 정보 포함)
     */
    getStatus() {
        return {
            isSupported: this.isSupported,
            isInitialized: this.isInitialized,
            fallbackMode: this.fallbackMode,
            pendingTasks: this.taskQueue.size,
            workerType: 'ParticleCalculatorWorker',
            hasWorker: !!this.worker,
            debugInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.userAgentData?.platform || navigator.platform || 'unknown',
                isWindows: (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase().includes('win'),
                isMac: (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase().includes('mac'),
                workerSupported: typeof Worker !== 'undefined'
            }
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