/**
 * OptimizedParticlePool.js
 * 메모리 효율적인 파티클 풀 관리 클래스
 * 기존 비주얼과 기능을 완전히 보존하면서 성능만 개선
 */

import Particle from './Particle.js';

class OptimizedParticlePool {
    constructor(size) {
        this.size = size;
        this.pool = new Array(size);
        this.activeParticles = [];
        this.activeCount = 0;
        
        // 전체 애니메이션 상태 관리
        this.allPositionsComplete = false;
        this.globalSizingStartTime = 0;
        this.lastPositionCheckTime = 0;
        
        // 초기화 시 한 번만 파티클 객체들을 생성
        for (let i = 0; i < size; i++) {
            this.pool[i] = new Particle(0, 0, { r: 120, g: 120, b: 120 }, 0, 0, 26);
        }
        
        console.log(`ParticlePool 초기화 완료: ${size}개 파티클`);
    }
    
    /**
     * 파티클 풀에서 활성 파티클들을 가져와서 초기화
     * @param {Array} imageData - 이미지 픽셀 데이터
     * @param {number} canvasWidth - 캔버스 너비
     * @param {number} canvasHeight - 캔버스 높이
     * @param {number} stepPixel - 픽셀 스텝
     * @returns {Array} 활성화된 파티클 배열
     */
    activateParticles(imageData, canvasWidth, canvasHeight, stepPixel) {
        this.activeParticles.length = 0; // 배열 재할당 없이 초기화
        this.activeCount = Math.min(imageData.length, this.size);
        
        // 전체 상태 초기화
        this.allPositionsComplete = false;
        this.globalSizingStartTime = 0;
        this.lastPositionCheckTime = 0;
        
        for (let i = 0; i < this.activeCount; i++) {
            const particle = this.pool[i];
            const pixel = imageData[i];
            
            // 기존과 동일한 reset 로직
            particle.reset(pixel.x, pixel.y, pixel.color, canvasWidth, canvasHeight, stepPixel);
            this.activeParticles[i] = particle;
        }
        
        return this.activeParticles;
    }
    
    /**
     * 모든 파티클을 비활성화
     */
    deactivateAll() {
        this.activeCount = 0;
        this.activeParticles.length = 0;
    }
    
    /**
     * 활성 파티클 개수 반환
     */
    getActiveCount() {
        return this.activeCount;
    }
    
    /**
     * 활성 파티클 배열 반환 (읽기 전용)
     */
    getActiveParticles() {
        return this.activeParticles;
    }
    
    /**
     * 모든 파티클의 위치 완료 상태를 확인하고 사이즈 변화 시작
     * @param {number} currentTime - 현재 시간
     */
    updateGlobalState(currentTime) {
        // 0.1초마다 체크 (성능 최적화)
        if (currentTime - this.lastPositionCheckTime < 100) {
            return;
        }
        this.lastPositionCheckTime = currentTime;
        
        // 아직 전체 위치 완료가 안됐다면 체크
        if (!this.allPositionsComplete) {
            let allInPosition = true;
            for (let i = 0; i < this.activeCount; i++) {
                const particle = this.activeParticles[i];
                if (!particle.positionComplete) {
                    allInPosition = false;
                    break;
                }
            }
            
            if (allInPosition) {
                this.allPositionsComplete = true;
                this.globalSizingStartTime = currentTime;
                console.log('All particles in position, starting global sizing animation');
                
                // 모든 파티클에게 사이즈 변화 시작 알림
                for (let i = 0; i < this.activeCount; i++) {
                    const particle = this.activeParticles[i];
                    particle.startGlobalSizing(currentTime);
                }
            }
        }
    }
}

export default OptimizedParticlePool;