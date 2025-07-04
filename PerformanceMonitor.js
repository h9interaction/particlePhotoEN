/**
 * PerformanceMonitor.js
 * 성능 개선 효과를 측정하고 모니터링하는 유틸리티 클래스
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            frameRates: [],
            memoryUsage: [],
            imageProcessingTimes: [],
            particleUpdateTimes: [],
            renderTimes: []
        };
        
        this.isMonitoring = false;
        this.startTime = 0;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        
        // 개발 모드에서만 활성화
        this.enabledInProduction = false;
    }
    
    /**
     * 모니터링 시작
     */
    start() {
        if (!this.shouldMonitor()) return;
        
        this.isMonitoring = true;
        this.startTime = performance.now();
        this.frameCount = 0;
        this.lastFrameTime = 0;
        
        console.log('🚀 Performance monitoring started');
        
        // 주기적으로 메모리 사용량 측정
        this.memoryInterval = setInterval(() => {
            this.recordMemoryUsage();
        }, 1000);
        
        // 5분 후 자동으로 리포트 생성
        this.reportTimeout = setTimeout(() => {
            this.generateReport();
        }, 300000);
    }
    
    /**
     * 모니터링 중지
     */
    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
        }
        
        if (this.reportTimeout) {
            clearTimeout(this.reportTimeout);
        }
        
        console.log('⏹️ Performance monitoring stopped');
    }
    
    /**
     * 프레임 렌더링 시간 기록
     * @param {number} startTime - 렌더링 시작 시간
     */
    recordFrame(startTime) {
        if (!this.shouldMonitor()) return;
        
        const endTime = performance.now();
        const frameTime = endTime - startTime;
        const currentTime = endTime;
        
        // FPS 계산
        if (this.lastFrameTime > 0) {
            const timeDiff = currentTime - this.lastFrameTime;
            const fps = 1000 / timeDiff;
            this.metrics.frameRates.push(fps);
        }
        
        this.metrics.renderTimes.push(frameTime);
        this.lastFrameTime = currentTime;
        this.frameCount++;
    }
    
    /**
     * 이미지 처리 시간 기록
     * @param {number} processingTime - 처리 시간 (ms)
     * @param {boolean} usedWorker - 웹 워커 사용 여부
     */
    recordImageProcessing(processingTime, usedWorker = false) {
        if (!this.shouldMonitor()) return;
        
        this.metrics.imageProcessingTimes.push({
            time: processingTime,
            worker: usedWorker,
            timestamp: performance.now()
        });
    }
    
    /**
     * 파티클 업데이트 시간 기록
     * @param {number} updateTime - 업데이트 시간 (ms)
     * @param {number} particleCount - 파티클 개수
     */
    recordParticleUpdate(updateTime, particleCount) {
        if (!this.shouldMonitor()) return;
        
        this.metrics.particleUpdateTimes.push({
            time: updateTime,
            count: particleCount,
            timestamp: performance.now()
        });
    }
    
    /**
     * 메모리 사용량 기록
     */
    recordMemoryUsage() {
        if (!this.shouldMonitor()) return;
        
        if (performance.memory) {
            this.metrics.memoryUsage.push({
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: performance.now()
            });
        }
    }
    
    /**
     * 현재 FPS 반환
     * @returns {number} 현재 FPS
     */
    getCurrentFPS() {
        if (this.metrics.frameRates.length === 0) return 0;
        
        // 최근 10프레임의 평균 FPS
        const recent = this.metrics.frameRates.slice(-10);
        return recent.reduce((sum, fps) => sum + fps, 0) / recent.length;
    }
    
    /**
     * 성능 리포트 생성
     * @returns {Object} 성능 분석 결과
     */
    generateReport() {
        if (!this.shouldMonitor()) return null;
        
        const totalTime = performance.now() - this.startTime;
        
        const report = {
            duration: totalTime,
            frameCount: this.frameCount,
            
            // FPS 통계
            fps: this.calculateStats(this.metrics.frameRates),
            
            // 렌더링 시간 통계
            renderTime: this.calculateStats(this.metrics.renderTimes),
            
            // 이미지 처리 통계
            imageProcessing: this.analyzeImageProcessing(),
            
            // 파티클 업데이트 통계
            particleUpdate: this.analyzeParticleUpdates(),
            
            // 메모리 사용량 분석
            memory: this.analyzeMemoryUsage(),
            
            // 전체 성능 점수 (0-100)
            performanceScore: this.calculatePerformanceScore()
        };
        
        console.group('📊 Performance Report');
        console.log('Duration:', `${(totalTime / 1000).toFixed(2)}s`);
        console.log('Average FPS:', report.fps.average?.toFixed(1));
        console.log('Frame Time (avg):', `${report.renderTime.average?.toFixed(2)}ms`);
        console.log('Performance Score:', `${report.performanceScore}/100`);
        
        if (report.imageProcessing.workerUsage > 0) {
            console.log('Worker Usage:', `${(report.imageProcessing.workerUsage * 100).toFixed(1)}%`);
        }
        
        console.groupEnd();
        
        return report;
    }
    
    /**
     * 통계 계산
     * @param {Array} values - 값 배열
     * @returns {Object} 통계 결과
     */
    calculateStats(values) {
        if (values.length === 0) return null;
        
        const sorted = [...values].sort((a, b) => a - b);
        
        return {
            count: values.length,
            average: values.reduce((sum, val) => sum + val, 0) / values.length,
            median: sorted[Math.floor(sorted.length / 2)],
            min: sorted[0],
            max: sorted[sorted.length - 1],
            p95: sorted[Math.floor(sorted.length * 0.95)]
        };
    }
    
    /**
     * 이미지 처리 분석
     * @returns {Object} 분석 결과
     */
    analyzeImageProcessing() {
        const times = this.metrics.imageProcessingTimes;
        if (times.length === 0) return null;
        
        const workerTimes = times.filter(t => t.worker).map(t => t.time);
        const mainThreadTimes = times.filter(t => !t.worker).map(t => t.time);
        
        return {
            total: times.length,
            workerUsage: workerTimes.length / times.length,
            workerStats: this.calculateStats(workerTimes),
            mainThreadStats: this.calculateStats(mainThreadTimes),
            averageSpeedup: this.calculateSpeedup(workerTimes, mainThreadTimes)
        };
    }
    
    /**
     * 파티클 업데이트 분석
     * @returns {Object} 분석 결과
     */
    analyzeParticleUpdates() {
        const updates = this.metrics.particleUpdateTimes;
        if (updates.length === 0) return null;
        
        const times = updates.map(u => u.time);
        const counts = updates.map(u => u.count);
        
        return {
            updateStats: this.calculateStats(times),
            particleStats: this.calculateStats(counts),
            efficiency: this.calculateStats(updates.map(u => u.time / u.count))
        };
    }
    
    /**
     * 메모리 사용량 분석
     * @returns {Object} 분석 결과
     */
    analyzeMemoryUsage() {
        const memory = this.metrics.memoryUsage;
        if (memory.length === 0) return null;
        
        const usedMB = memory.map(m => m.used / 1024 / 1024);
        const totalMB = memory.map(m => m.total / 1024 / 1024);
        
        return {
            used: this.calculateStats(usedMB),
            total: this.calculateStats(totalMB),
            peak: Math.max(...usedMB),
            growth: usedMB[usedMB.length - 1] - usedMB[0]
        };
    }
    
    /**
     * 성능 개선 계산
     * @param {Array} workerTimes - 워커 처리 시간
     * @param {Array} mainThreadTimes - 메인 스레드 처리 시간
     * @returns {number} 개선 배수
     */
    calculateSpeedup(workerTimes, mainThreadTimes) {
        if (workerTimes.length === 0 || mainThreadTimes.length === 0) return 1;
        
        const workerAvg = workerTimes.reduce((sum, t) => sum + t, 0) / workerTimes.length;
        const mainAvg = mainThreadTimes.reduce((sum, t) => sum + t, 0) / mainThreadTimes.length;
        
        return mainAvg / workerAvg;
    }
    
    /**
     * 전체 성능 점수 계산
     * @returns {number} 성능 점수 (0-100)
     */
    calculatePerformanceScore() {
        let score = 100;
        
        // FPS 기반 점수 (30fps 이하 감점)
        const avgFPS = this.getCurrentFPS();
        if (avgFPS < 60) score -= (60 - avgFPS) * 2;
        if (avgFPS < 30) score -= 20;
        
        // 메모리 사용량 기반 감점
        const memory = this.analyzeMemoryUsage();
        if (memory && memory.peak > 100) { // 100MB 초과
            score -= Math.min(20, (memory.peak - 100) / 10);
        }
        
        // 렌더링 시간 기반 감점
        const renderStats = this.calculateStats(this.metrics.renderTimes);
        if (renderStats && renderStats.average > 16.67) { // 60fps 기준
            score -= Math.min(15, (renderStats.average - 16.67) / 2);
        }
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    
    /**
     * 모니터링 실행 여부 확인
     * @returns {boolean} 모니터링 실행 여부
     */
    shouldMonitor() {
        return (
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1' ||
             this.enabledInProduction)
        );
    }
    
    /**
     * 실시간 성능 정보 반환
     * @returns {Object} 실시간 성능 정보
     */
    getRealTimeStats() {
        return {
            isMonitoring: this.isMonitoring,
            currentFPS: this.getCurrentFPS(),
            frameCount: this.frameCount,
            runtime: this.isMonitoring ? performance.now() - this.startTime : 0,
            memoryUsed: performance.memory ? 
                Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'N/A'
        };
    }
}

// 싱글톤 인스턴스
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;