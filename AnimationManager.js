/**
 * AnimationManager.js
 * 애니메이션 성능 최적화 및 리소스 관리 클래스
 * 메모리 누수 방지 및 렌더링 최적화
 */

class AnimationManager {
    constructor() {
        this.timers = new Set();
        this.animationFrames = new Set();
        this.canvasContexts = new Map();
        this.lastFrameTime = 0;
        this.targetFPS = 120;
        this.frameInterval = 1000 / this.targetFPS;
        
        // 성능 모니터링
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 0;
    }
    
    /**
     * Canvas 컨텍스트를 캐시하여 성능 향상
     * @param {string} canvasId - 캔버스 ID
     * @returns {CanvasRenderingContext2D} 캐시된 컨텍스트
     */
    getOptimizedContext(canvasId) {
        if (!this.canvasContexts.has(canvasId)) {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const ctx = canvas.getContext('2d', {
                    alpha: false,  // 투명도 비활성화로 성능 향상
                    willReadFrequently: true,
                    desynchronized: true  // 성능 향상을 위한 비동기 렌더링
                });
                this.canvasContexts.set(canvasId, ctx);
            }
        }
        return this.canvasContexts.get(canvasId);
    }
    
    /**
     * 메모리 누수 방지를 위한 setTimeout 래퍼
     * @param {Function} callback - 실행할 함수
     * @param {number} delay - 지연 시간
     * @returns {number} 타이머 ID
     */
    setTimeout(callback, delay) {
        const id = setTimeout(() => {
            this.timers.delete(id);
            callback();
        }, delay);
        this.timers.add(id);
        return id;
    }
    
    /**
     * 메모리 누수 방지를 위한 requestAnimationFrame 래퍼
     * @param {Function} callback - 애니메이션 함수
     * @returns {number} 애니메이션 프레임 ID
     */
    requestAnimationFrame(callback) {
        const id = requestAnimationFrame((timestamp) => {
            this.animationFrames.delete(id);
            
            // FPS 모니터링 (제한 없이 자연스러운 애니메이션 허용)
            this.updateFPS(timestamp);
            callback(timestamp);
            this.lastFrameTime = timestamp;
        });
        this.animationFrames.add(id);
        return id;
    }
    
    /**
     * FPS 모니터링
     * @param {number} timestamp - 현재 타임스탬프
     */
    updateFPS(timestamp) {
        this.frameCount++;
        if (timestamp - this.lastFPSUpdate >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = timestamp;
            
            // 성능 경고 (개발 모드에서만)
            if (this.currentFPS < 30) {
                console.warn(`낮은 FPS 감지: ${this.currentFPS}fps`);
            }
        }
    }
    
    /**
     * 특정 타이머 취소
     * @param {number} id - 타이머 ID
     */
    clearTimeout(id) {
        if (this.timers.has(id)) {
            clearTimeout(id);
            this.timers.delete(id);
        }
    }
    
    /**
     * 특정 애니메이션 프레임 취소
     * @param {number} id - 애니메이션 프레임 ID
     */
    cancelAnimationFrame(id) {
        if (this.animationFrames.has(id)) {
            cancelAnimationFrame(id);
            this.animationFrames.delete(id);
        }
    }
    
    /**
     * 모든 타이머 및 애니메이션 정리
     */
    cleanup() {
        // 모든 타이머 정리
        this.timers.forEach(id => clearTimeout(id));
        this.timers.clear();
        
        // 모든 애니메이션 프레임 정리
        this.animationFrames.forEach(id => cancelAnimationFrame(id));
        this.animationFrames.clear();
        
        // 컨텍스트 캐시 정리
        this.canvasContexts.clear();
        
        console.log('AnimationManager 리소스 정리 완료');
    }
    
    /**
     * 현재 FPS 반환
     * @returns {number} 현재 FPS
     */
    getCurrentFPS() {
        return this.currentFPS;
    }
    
    /**
     * 활성 리소스 정보 반환
     * @returns {Object} 리소스 정보
     */
    getResourceInfo() {
        return {
            activeTimers: this.timers.size,
            activeAnimations: this.animationFrames.size,
            cachedContexts: this.canvasContexts.size,
            currentFPS: this.currentFPS
        };
    }
}

// 싱글톤 인스턴스
const animationManager = new AnimationManager();

export default animationManager;