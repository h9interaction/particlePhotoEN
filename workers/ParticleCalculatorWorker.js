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
     * 형성 단계 파티클 업데이트 (Particle.js의 update 로직과 동일)
     * @param {Object} particle - 파티클 데이터
     * @param {number} currentTime - 현재 시간
     * @returns {Object} 업데이트된 파티클
     */
    updateFormationParticle(particle, currentTime) {
        const timeElapsed = (currentTime - particle.startTime) / particle.duration;
        let rawProgress = Math.min(Math.max(timeElapsed, 0), 1);
        
        // 🔥 Progress를 강제로 느리게 만들기 (제곱근 사용)
        let progress = Math.sqrt(rawProgress * 0.5); // 진행률을 극도로 느리게
        
        // Progress 상황 디버깅 (매우 제한적)
        if (Math.random() < 0.005) {
            console.log('⏱️ PROGRESS DEBUG:', {
                timeElapsed: timeElapsed.toFixed(3),
                rawProgress: rawProgress.toFixed(3), 
                finalProgress: progress.toFixed(3),
                startTime: particle.startTime,
                currentTime,
                duration: particle.duration
            });
        }
        
        let newParticle = { ...particle };
        
        // 애니메이션 시작 전 + 추가 지연 (더 오래 초기 상태 유지)
        if (progress <= 0.1) { // 10% 지점까지 초기 상태 유지
            newParticle.size = 100; // 극대 크기로 강제 설정
            
            // 🔥 ULTRA FIX: 초기 위치를 화면 바로 위로 강제 설정
            newParticle.pos.x = particle.initialX || particle.pos.x;
            let safeInitialY = particle.initialY || -100;
            // initialY가 너무 위에 있으면 강제로 화면 근처로 조정
            if (safeInitialY < -200) safeInitialY = -50 - (Math.random() * 100);
            newParticle.pos.y = safeInitialY;
            
            // 대기 상태 로그 (Y 위치 확인)
            if (Math.random() < 0.01) {
                console.log('🕒 WAITING PHASE:', { 
                    progress: progress.toFixed(3), 
                    timeElapsed: ((currentTime - particle.startTime) / 1000).toFixed(1) + 's',
                    originalY: particle.initialY,
                    safeY: safeInitialY,
                    finalY: newParticle.pos.y
                });
            }
            return newParticle;
        }
        
        if (progress > 0.1) {
            // 애니메이션 진행 상황 로그 
            if (Math.random() < 0.02) {
                console.log('🎬 ANIMATION ACTIVE:', {
                    progress: progress.toFixed(3),
                    timeElapsed: ((currentTime - particle.startTime) / 1000).toFixed(1) + 's',
                    initialY: particle.initialY,
                    targetY: particle.target?.y || 'undefined'
                });
            }
            
            // 부드러운 sine 곡선 기반 자연스러운 낙하
            const naturalFallProgress = 0.5 * (1 - Math.cos(progress * Math.PI));
            const horizontalProgress = naturalFallProgress;
            
            // 낙엽처럼 좌우로 부드럽게 흔들리는 효과
            const swayIntensity = Math.sin(progress * Math.PI * 1.5 + particle.swayAmount) * particle.swayAmount * 12;
            const leafSway = swayIntensity * (1 - Math.pow(progress, 1.2));
            
            // 회전 로직 업데이트
            if (progress < 0.8) {
                const rotationIntensity = (1 - Math.pow(progress, 1.2));
                newParticle.currentRotation = (particle.currentRotation || 0) + particle.rotationSpeed * 0.4 * rotationIntensity;
            } else {
                // 80% 지점에서 정착 시작
                if (!particle.settlementStarted) {
                    newParticle.settlementStarted = true;
                    newParticle.rotationAtSettlement = particle.currentRotation || 0;
                }
                
                // 80~100% 구간에서 회전각을 0으로 부드럽게 수렴
                const settlementProgress = (progress - 0.8) / 0.2;
                const easedSettlement = Math.pow(settlementProgress, 0.4);
                const targetRotation = 0;
                
                newParticle.currentRotation = (particle.rotationAtSettlement || 0) * (1 - easedSettlement) + targetRotation * easedSettlement;
            }
            
            // 수평 위치 + 낙엽 흔들림 효과
            const baseX = particle.target.x * horizontalProgress + particle.initialX * (1 - horizontalProgress);
            newParticle.pos.x = baseX + leafSway;
            
            // 🔧 수직 위치 - 자연스러운 낙하 (안전한 초기값 보장)
            // 극단적인 초기 Y값을 합리적 범위로 제한
            let safeInitialY = particle.initialY || -300;
            if (safeInitialY < -800) safeInitialY = -300; // 너무 위에서 시작하지 않도록
            
            const safeTargetY = particle.target.y || 400;
            const fallDistance = safeTargetY - safeInitialY;
            newParticle.pos.y = safeInitialY + (fallDistance * naturalFallProgress);
            
            // 디버깅: 극단적인 위치값 체크
            if (Math.random() < 0.01 && (newParticle.pos.y < -500 || newParticle.pos.y > 1000)) {
                console.warn('⚠️ 극단적 위치:', {
                    originalInitialY: particle.initialY,
                    safeInitialY,
                    targetY: safeTargetY,
                    progress: naturalFallProgress,
                    finalY: newParticle.pos.y
                });
            }
            
            // 크기 변화 - 90% 지점부터 급격히 커지도록
            let sizeProgress = 0;
            if (progress < 0.7) {
                sizeProgress = 0;
            } else {
                const finalPhaseProgress = (progress - 0.7) / 0.3;
                sizeProgress = Math.pow(finalPhaseProgress, 0.6);
            }
            
            // 안전한 크기 계산 (NaN 방지)
            const dustSize = particle.dustSize || 0.1; // 최소 크기 보장
            const targetSize = particle.targetSize || 2; // 기본 타겟 크기
            
            // 🔧 핵심 수정: 애니메이션 초기에도 최소한 보이도록 크기 조정
            // 원본: progress < 0.7일 때 dustSize(≈0.05)로 거의 안보임
            // 수정: progress < 0.7일 때도 최소 1픽셀 크기 보장
            let calculatedSize;
            if (sizeProgress === 0) {
                // 70% 이전: 극대 크기로 강제 설정
                calculatedSize = 100;
            } else {
                // 70% 이후: 정상적인 크기 증가
                calculatedSize = dustSize + (targetSize - dustSize) * sizeProgress;
            }
            
            newParticle.size = Math.max(calculatedSize, 100); // 극대 최소값
        }
        
        // 타겟에 도달했을 때 정확한 위치로 설정
        if (timeElapsed >= 1) {
            newParticle.pos.x = particle.target.x || 0;
            newParticle.pos.y = particle.target.y || 400;
            newParticle.size = 100; // 타겟 도달시에도 극대 크기
            newParticle.currentRotation = 0;
            newParticle.atTarget = true;
        }
        
        // 디버깅 최소화
        if (Math.random() < 0.001) {
            console.log('Worker:', { progress, size: newParticle.size, pos: newParticle.pos });
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