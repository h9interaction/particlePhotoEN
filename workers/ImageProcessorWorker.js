/**
 * ImageProcessorWorker.js
 * 이미지 처리 작업을 백그라운드에서 수행하는 웹 워커
 * 메인 스레드의 UI 블로킹을 방지하고 성능을 개선
 */

class ImageProcessorWorker {
    constructor() {
        self.onmessage = this.handleMessage.bind(this);
        console.log('ImageProcessorWorker 초기화 완료');
    }
    
    handleMessage(event) {
        const { type, data, taskId } = event.data;
        
        try {
            switch (type) {
                case 'PROCESS_IMAGE':
                    this.processImageData(data, taskId);
                    break;
                case 'BATCH_PROCESS':
                    this.batchProcessImages(data, taskId);
                    break;
                case 'PING':
                    this.sendResponse('PONG', { message: 'Worker is alive' }, taskId);
                    break;
                default:
                    this.sendError(`Unknown message type: ${type}`, taskId);
            }
        } catch (error) {
            this.sendError(error.message, taskId);
        }
    }
    
    /**
     * 단일 이미지 데이터를 처리
     * @param {Object} data - 이미지 처리 데이터
     * @param {string} taskId - 작업 ID
     */
    processImageData(data, taskId) {
        const { imageData, stepPixel, canvasWidth, canvasHeight, offsetX = 0, offsetY = 0, drawWidth, drawHeight } = data;
        
        if (!imageData || !imageData.data) {
            throw new Error('Invalid imageData provided');
        }
        
        const pixelData = [];
        const pixels = imageData.data;
        const imageWidth = imageData.width;
        
        // 기존 main.js의 이미지 처리 로직과 동일하게 유지
        for (let y = 0; y < drawHeight; y += stepPixel) {
            for (let x = 0; x < drawWidth; x += stepPixel) {
                const actualX = Math.floor(x + offsetX);
                const actualY = Math.floor(y + offsetY);
                
                // 경계 검사
                if (actualX >= 0 && actualY >= 0 && actualX < canvasWidth && actualY < canvasHeight) {
                    const idx = (actualY * imageWidth + actualX) * 4;
                    
                    if (idx < pixels.length - 2) {
                        const r = pixels[idx];
                        const g = pixels[idx + 1];
                        const b = pixels[idx + 2];
                        
                        // 기존과 동일한 색상 반전 로직
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
        
        this.sendResponse('IMAGE_PROCESSED', {
            pixelData,
            processingTime: performance.now() - data.startTime,
            particleCount: pixelData.length
        }, taskId);
    }
    
    /**
     * 여러 이미지를 배치로 처리
     * @param {Object} data - 배치 처리 데이터
     * @param {string} taskId - 작업 ID
     */
    batchProcessImages(data, taskId) {
        const { images, stepPixel } = data;
        const results = [];
        
        for (let i = 0; i < images.length; i++) {
            const imageInfo = images[i];
            try {
                const processedData = this.processImageData({
                    ...imageInfo,
                    stepPixel,
                    startTime: performance.now()
                });
                
                results.push({
                    index: i,
                    success: true,
                    data: processedData.data
                });
            } catch (error) {
                results.push({
                    index: i,
                    success: false,
                    error: error.message
                });
            }
        }
        
        this.sendResponse('BATCH_PROCESSED', {
            results,
            totalProcessed: results.length,
            successCount: results.filter(r => r.success).length
        }, taskId);
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
new ImageProcessorWorker();