/**
 * ImageWorkerManager.js
 * ImageProcessorWorker와 메인 스레드 간의 통신을 관리하는 클래스
 * Promise 기반 비동기 처리 및 작업 큐 관리
 */

class ImageWorkerManager {
    constructor() {
        this.worker = null;
        this.pendingTasks = new Map();
        this.taskIdCounter = 0;
        this.isInitialized = false;
        this.retryCount = 3;
        
        this.initWorker();
    }
    
    /**
     * 워커 초기화
     */
    initWorker() {
        try {
            this.worker = new Worker('./workers/ImageProcessorWorker.js');
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            this.worker.onerror = this.handleWorkerError.bind(this);
            
            // 워커 생존 확인
            this.pingWorker().then(() => {
                this.isInitialized = true;
                console.log('ImageWorkerManager 초기화 완료');
            }).catch((error) => {
                console.error('워커 초기화 실패:', error);
                this.fallbackToMainThread = true;
            });
            
        } catch (error) {
            console.error('웹 워커 생성 실패:', error);
            this.fallbackToMainThread = true;
        }
    }
    
    /**
     * 워커 생존 확인
     * @returns {Promise} 핑 결과
     */
    pingWorker() {
        return this.sendMessage('PING', {});
    }
    
    /**
     * 이미지 데이터를 비동기로 처리
     * @param {ImageData} imageData - 처리할 이미지 데이터
     * @param {number} stepPixel - 픽셀 스텝
     * @param {number} canvasWidth - 캔버스 너비
     * @param {number} canvasHeight - 캔버스 높이
     * @param {Object} cropInfo - 크롭 정보
     * @returns {Promise<Array>} 처리된 픽셀 데이터
     */
    async processImageAsync(imageData, stepPixel, canvasWidth, canvasHeight, cropInfo = {}) {
        // 워커가 초기화되지 않았거나 폴백 모드인 경우 메인 스레드에서 처리
        if (!this.isInitialized || this.fallbackToMainThread) {
            return this.processImageMainThread(imageData, stepPixel, canvasWidth, canvasHeight, cropInfo);
        }
        
        try {
            const result = await this.sendMessage('PROCESS_IMAGE', {
                imageData: {
                    data: imageData.data,
                    width: imageData.width,
                    height: imageData.height
                },
                stepPixel,
                canvasWidth,
                canvasHeight,
                offsetX: cropInfo.offsetX || 0,
                offsetY: cropInfo.offsetY || 0,
                drawWidth: cropInfo.drawWidth || canvasWidth,
                drawHeight: cropInfo.drawHeight || canvasHeight,
                startTime: performance.now()
            });
            
            return result.pixelData;
            
        } catch (error) {
            console.warn('워커에서 이미지 처리 실패, 메인 스레드로 폴백:', error);
            return this.processImageMainThread(imageData, stepPixel, canvasWidth, canvasHeight, cropInfo);
        }
    }
    
    /**
     * 메인 스레드에서 이미지 처리 (폴백)
     * @param {ImageData} imageData - 처리할 이미지 데이터
     * @param {number} stepPixel - 픽셀 스텝  
     * @param {number} canvasWidth - 캔버스 너비
     * @param {number} canvasHeight - 캔버스 높이
     * @param {Object} cropInfo - 크롭 정보
     * @returns {Array} 처리된 픽셀 데이터
     */
    processImageMainThread(imageData, stepPixel, canvasWidth, canvasHeight, cropInfo = {}) {
        const pixelData = [];
        const data = imageData.data;
        const { offsetX = 0, offsetY = 0, drawWidth = canvasWidth, drawHeight = canvasHeight } = cropInfo;
        
        // 기존 imageLoader.js와 동일한 로직
        for (let y = 0; y < drawHeight; y += stepPixel) {
            for (let x = 0; x < drawWidth; x += stepPixel) {
                const actualX = Math.floor(x + offsetX);
                const actualY = Math.floor(y + offsetY);
                
                if (actualX >= 0 && actualY >= 0 && actualX < canvasWidth && actualY < canvasHeight) {
                    const idx = (actualY * canvasWidth + actualX) * 4;
                    
                    if (idx < data.length - 2) {
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];
                        
                        // 색상 반전
                        const invertedR = 255 - r;
                        const invertedG = 255 - g;
                        const invertedB = 255 - b;
                        
                        pixelData.push({
                            x: actualX,
                            y: actualY,
                            color: { r: invertedR, g: invertedG, b: invertedB }
                        });
                    }
                }
            }
        }
        
        return pixelData;
    }
    
    /**
     * 워커에게 메시지 전송
     * @param {string} type - 메시지 타입
     * @param {Object} data - 전송할 데이터
     * @returns {Promise} 응답 Promise
     */
    sendMessage(type, data) {
        return new Promise((resolve, reject) => {
            const taskId = this.generateTaskId();
            const timeout = setTimeout(() => {
                this.pendingTasks.delete(taskId);
                reject(new Error(`워커 응답 시간 초과: ${type}`));
            }, 10000); // 10초 타임아웃
            
            this.pendingTasks.set(taskId, { resolve, reject, timeout });
            
            this.worker.postMessage({
                type,
                data,
                taskId
            });
        });
    }
    
    /**
     * 워커 메시지 처리
     * @param {MessageEvent} event - 워커 메시지 이벤트
     */
    handleWorkerMessage(event) {
        const { type, data, taskId } = event.data;
        
        const task = this.pendingTasks.get(taskId);
        if (!task) {
            console.warn('알 수 없는 작업 ID:', taskId);
            return;
        }
        
        clearTimeout(task.timeout);
        this.pendingTasks.delete(taskId);
        
        if (type === 'ERROR') {
            task.reject(new Error(data.error));
        } else {
            task.resolve(data);
        }
    }
    
    /**
     * 워커 에러 처리
     * @param {ErrorEvent} error - 워커 에러 이벤트
     */
    handleWorkerError(error) {
        console.error('ImageProcessorWorker 에러:', error);
        
        // 모든 대기 중인 작업을 실패로 처리
        this.pendingTasks.forEach((task) => {
            clearTimeout(task.timeout);
            task.reject(new Error('워커 에러 발생'));
        });
        this.pendingTasks.clear();
        
        // 폴백 모드로 전환
        this.fallbackToMainThread = true;
    }
    
    /**
     * 고유 작업 ID 생성
     * @returns {string} 작업 ID
     */
    generateTaskId() {
        return `task_${++this.taskIdCounter}_${Date.now()}`;
    }
    
    /**
     * 워커 정리
     */
    cleanup() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        // 모든 대기 중인 작업 취소
        this.pendingTasks.forEach((task) => {
            clearTimeout(task.timeout);
            task.reject(new Error('워커가 종료됨'));
        });
        this.pendingTasks.clear();
        
        console.log('ImageWorkerManager 정리 완료');
    }
    
    /**
     * 현재 상태 정보 반환
     * @returns {Object} 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            fallbackMode: this.fallbackToMainThread,
            pendingTasks: this.pendingTasks.size,
            workerAvailable: !!this.worker
        };
    }
}

// 싱글톤 인스턴스
const imageWorkerManager = new ImageWorkerManager();

export default imageWorkerManager;