
import imageWorkerManager from './ImageWorkerManager.js';

// Use a Map for more flexible caching. Key is the person's absolute index.
export const imageDataCache = new Map();
let _shuffledPeople = [];
let _stepPixel = 20;

/**
 * Helper function to process a loaded image into pixel data.
 * Windows PC GPU 가속 환경 호환성 개선
 * 웹 워커를 사용하여 백그라운드에서 처리
 */
async function processImageToPixelData(img, stepPixel) {
    const canvas = document.createElement('canvas');
    
    // Windows PC GPU 호환성을 위한 Canvas 컨텍스트 설정
    const isWindowsPC = detectWindowsPC();
    const contextOptions = {
        willReadFrequently: true,
        // Windows PC에서는 하드웨어 가속 비활성화로 getImageData() 호환성 확보
        desynchronized: !isWindowsPC,
        alpha: true  // 투명도 처리 필요
    };
    
    const ctx = canvas.getContext('2d', contextOptions);
    canvas.width = window.innerWidth / 4;
    canvas.height = window.innerHeight;

    const imgAspectRatio = img.width / img.height;
    const canvasAspectRatio = canvas.width / canvas.height;

    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

    if (imgAspectRatio > canvasAspectRatio) {
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgAspectRatio;
        offsetX = (canvas.width - drawWidth) / 2;
    } else {
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgAspectRatio;
        offsetY = (canvas.height - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    
    // Windows PC에서 GPU 메모리 동기화를 위한 강제 대기
    const imageData = await getImageDataWithRetry(ctx, 0, 0, canvas.width, canvas.height, isWindowsPC);
    
    try {
        // 웹 워커를 사용하여 이미지 처리
        const pixelData = await imageWorkerManager.processImageAsync(
            imageData, 
            stepPixel, 
            canvas.width, 
            canvas.height,
            { offsetX, offsetY, drawWidth, drawHeight }
        );
        
        // The worker now pre-filters transparent pixels, so no need to filter here.
        return pixelData;
        
    } catch (error) {
        console.warn('웹 워커 이미지 처리 실패, 메인 스레드로 폴백:', error);
        
        // 폴백: 메인 스레드에서 처리
        const pixelData = [];
        const data = imageData.data;

        for (let y = 0; y < canvas.height; y += stepPixel) {
            for (let x = 0; x < canvas.width; x += stepPixel) {
                const idx = (y * canvas.width + x) * 4;
                const a = data[idx + 3];

                if (a > 128) { // Only consider non-transparent pixels
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const invertedR = 255 - r;
                    const invertedG = 255 - g;
                    const invertedB = 255 - b;
                    pixelData.push({
                        x: x,
                        y: y,
                        color: { r: invertedR, g: invertedG, b: invertedB }
                    });
                }
            }
        }
        
        return pixelData;
    }
}

/**
 * Loads a single image and returns its pixel data along with its original index.
 * 이제 비동기 이미지 처리를 지원
 */
function loadImage(person, index, stepPixel) {
    return new Promise(async (resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = person.imageUrl;

        img.onload = async () => {
            try {
                const pixels = await processImageToPixelData(img, stepPixel);
                resolve({ index, pixels });
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            console.warn(`Failed to load from URL: ${person.imageUrl}. Falling back to local path.`);
            img.src = `images/${person.englishName}.png`;
            img.onload = async () => {
                try {
                    const pixels = await processImageToPixelData(img, stepPixel);
                    resolve({ index, pixels });
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => {
                console.error(`Failed to load image for ${person.englishName} from all sources.`);
                reject(new Error(`Failed to load image for ${person.englishName}`));
            };
        };
    });
}

/**
 * Loads a specific batch of images and adds them to the cache.
 * @param {number} startIndex The starting index in the shuffledPeople array.
 * @param {number} batchSize The number of images to load.
 */
export async function loadBatch(startIndex, batchSize) {
    const batchList = _shuffledPeople.slice(startIndex, startIndex + batchSize);
    if (batchList.length === 0) return;

    console.log(`Requesting to load batch from index ${startIndex}...`);
    const promises = batchList.map((person, i) => {
        const personIndex = startIndex + i;
        // Only load if not already in cache
        if (!imageDataCache.has(personIndex)) {
            return loadImage(person, personIndex, _stepPixel);
        }
        return Promise.resolve(null); // Return a resolved promise for already cached items
    });

    const results = await Promise.allSettled(promises);
    let successCount = 0;
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            imageDataCache.set(result.value.index, result.value.pixels);
            successCount++;
        }
    });
    if (successCount > 0) {
        console.log(`Successfully loaded and cached ${successCount} new images from batch starting at ${startIndex}.`);
    }
}

/**
 * Removes a specific batch of images from the cache to free up memory.
 * @param {number} startIndex The starting index of the batch to remove.
 * @param {number} batchSize The number of images to remove.
 */
export function cleanupBatch(startIndex, batchSize) {
    console.log(`Cleaning up image batch from index ${startIndex} to ${startIndex + batchSize - 1}.`);
    for (let i = 0; i < batchSize; i++) {
        imageDataCache.delete(startIndex + i);
    }
}

/**
 * Initializes the image loader with data and pre-loads the first two batches.
 * @param {Array} people The shuffled list of people data.
 * @param {number} stepPixel The stepping interval for pixel sampling.
 * @param {number} batchSize The size of one batch.
 */
export async function initializeImageLoader(people, stepPixel, batchSize) {
    _shuffledPeople = people;
    _stepPixel = stepPixel;
    console.log("Loading initial image batches (for indices 0 and 1)...");
    // Load batch 0 and 1 in parallel to have a buffer
    await Promise.all([
        loadBatch(0, batchSize),
        loadBatch(batchSize, batchSize)
    ]);
    console.log("Initial image batches are loaded and cached.");
}

/**
 * Windows PC 환경 감지 (AnimationManager와 동일한 로직)
 * @returns {boolean} Windows PC 여부
 */
function detectWindowsPC() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isWindows = userAgent.includes('windows') || userAgent.includes('win32') || userAgent.includes('win64');
    
    // 가상머신이 아닌 실제 PC 감지
    const isRealPC = !userAgent.includes('utm') &&
                    !userAgent.includes('virtual') &&
                    !userAgent.includes('qemu') &&
                    !userAgent.includes('parallels');
    
    // GPU 정보 확인
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    let hasDiscreteGPU = false;
    
    if (gl) {
        const renderer = gl.getParameter(gl.RENDERER);
        hasDiscreteGPU = renderer.toLowerCase().includes('nvidia') ||
                       renderer.toLowerCase().includes('amd') ||
                       renderer.toLowerCase().includes('radeon') ||
                       renderer.toLowerCase().includes('geforce') ||
                       renderer.toLowerCase().includes('gtx') ||
                       renderer.toLowerCase().includes('rtx');
    }
    
    return isWindows && isRealPC && hasDiscreteGPU;
}

/**
 * Windows PC GPU 환경에서 getImageData() 재시도 로직
 * @param {CanvasRenderingContext2D} ctx - Canvas 컨텍스트
 * @param {number} x - X 좌표
 * @param {number} y - Y 좌표
 * @param {number} width - 너비
 * @param {number} height - 높이
 * @param {boolean} isWindowsPC - Windows PC 여부
 * @returns {Promise<ImageData>} 이미지 데이터
 */
async function getImageDataWithRetry(ctx, x, y, width, height, isWindowsPC) {
    if (!isWindowsPC) {
        // Windows PC가 아니면 즉시 반환
        return ctx.getImageData(x, y, width, height);
    }
    
    let attempts = 0;
    const maxAttempts = 3;
    const retryDelay = 16; // 16ms (1 프레임)
    
    while (attempts < maxAttempts) {
        try {
            // GPU 메모리 동기화를 위한 강제 대기
            if (attempts > 0) {
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
            }
            
            const imageData = ctx.getImageData(x, y, width, height);
            
            // 데이터 유효성 검사 (모든 픽셀이 검은색인지 확인)
            const data = imageData.data;
            let hasValidPixels = false;
            
            // 샘플링으로 빠르게 검사 (전체의 1%)
            for (let i = 0; i < data.length; i += 400) {
                if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
                    hasValidPixels = true;
                    break;
                }
            }
            
            if (hasValidPixels) {
                if (attempts > 0) {
                    console.log(`getImageData 성공 (시도 ${attempts + 1}/${maxAttempts})`);
                }
                return imageData;
            } else if (attempts === maxAttempts - 1) {
                // 마지막 시도에서도 실패한 경우 경고하고 그래도 반환
                console.warn('getImageData: 모든 픽셀이 검은색입니다. GPU 가속 문제 가능성이 있습니다.');
                return imageData;
            }
            
        } catch (error) {
            console.warn(`getImageData 시도 ${attempts + 1} 실패:`, error);
        }
        
        attempts++;
    }
    
    // 모든 시도 실패 시 기본 호출
    console.error('getImageData 재시도 모두 실패, 기본 호출로 대체');
    return ctx.getImageData(x, y, width, height);
}
