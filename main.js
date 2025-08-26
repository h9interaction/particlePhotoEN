import { initializePeopleData, shuffleArray } from './peopleDataLoader.js';
import { imageDataCache, initializeImageLoader, loadBatch, cleanupBatch } from './imageLoader.js';
import Particle from './Particle.js';
import OptimizedParticlePool from './OptimizedParticlePool.js';
import animationManager from './AnimationManager.js';
import performanceMonitor from './PerformanceMonitor.js';
import particleCalculatorWorkerManager from './ParticleCalculatorWorkerManager.js';

const canvasIds = ['imageCanvas1', 'imageCanvas2', 'imageCanvas3', 'imageCanvas4'];
const canvasContexts = {};
const particlePools = {}; // 이제 OptimizedParticlePool 인스턴스들을 저장
let shuffledPeople = [];

// --- State Management ---
let nextPersonIndex = 0; 
const animationQueue = []; // The queue of canvasIds ready for the next animation

// --- Constants ---
const maxParticles = 8200;
const stepPixel = 22;
const TICK_INTERVAL = 4000; // The conductor's steady beat for starting animations
const EXPLOSION_START_DELAY = 3000;
const EXPLOSION_PARTICLE_DELAY = 3000;
const IMAGE_BATCH_SIZE = 4; 

// --- Initialization ---

window.onload = () => {
    canvasIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            // AnimationManager를 사용하여 최적화된 컨텍스트 획득
            canvasContexts[id] = animationManager.getOptimizedContext(id);
        }
    });
    dataLoad();
};

async function dataLoad() {
    try {
        const peopleData = await initializePeopleData();
        if (!peopleData || !Array.isArray(peopleData) || peopleData.length === 0) {
            throw new Error('peopleData is empty');
        }
        shuffledPeople = shuffleArray([...peopleData]);
        console.log(`People data shuffled. Total people: ${shuffledPeople.length}. Initializing image loader...`);

        await initializeImageLoader(shuffledPeople, stepPixel, IMAGE_BATCH_SIZE);

        canvasIds.forEach(id => {
            createParticles(id);
            animationQueue.push(id); // Prime the queue
        });

        startConductor();
    } catch (error) {
        console.error("Fatal error during initial data load:", error);
    }
}

function createParticles(canvasId) {
    // OptimizedParticlePool을 사용하여 메모리 효율성 개선
    particlePools[canvasId] = new OptimizedParticlePool(maxParticles);
}

// --- Conductor (The new core logic) ---

function startConductor() {
    console.log("--- Conductor starting ---");
    // Start the first animation immediately.
    conductorTick();

    // AnimationManager를 사용하여 메모리 누수 방지
    const intervalId = setInterval(conductorTick, TICK_INTERVAL);
    
    // 성능 모니터링 시작
    performanceMonitor.start();
    
    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
        clearInterval(intervalId);
        animationManager.cleanup();
        performanceMonitor.stop();
        particleCalculatorWorkerManager.cleanup();
    });
}

function conductorTick() {
    if (animationQueue.length === 0) {
        // console.log("Queue is empty, waiting for a canvas to finish.");
        return; // Nothing to do
    }

    const canvasId = animationQueue.shift(); // Get the next canvas from the front of the queue
    const personIndex = nextPersonIndex++;

    console.log(`Conductor tick: Starting ${canvasId} with person index ${personIndex}`);

    // Handle infinite looping of people data
    const loopedPersonIndex = personIndex % shuffledPeople.length;
    
    // --- 순환 캐시 로직 (단순화) ---
    // 항상 현재 인덱스 주변의 배치가 로드되어 있도록 보장
    const currentBatch = Math.floor(personIndex / IMAGE_BATCH_SIZE);
    const nextBatchStart = (currentBatch + 1) * IMAGE_BATCH_SIZE;
    const prevBatchStart = Math.max(0, (currentBatch - 1) * IMAGE_BATCH_SIZE);
    
    // 다음 배치가 캐시에 없으면 미리 로드
    const nextBatchFirstIndex = nextBatchStart;
    if (!imageDataCache.has(nextBatchFirstIndex) && nextBatchFirstIndex < shuffledPeople.length * 3) {
        console.log(`Preloading batch starting at ${nextBatchStart}`);
        loadBatch(nextBatchStart, IMAGE_BATCH_SIZE).catch(console.error);
    }
    
    // 너무 오래된 배치는 정리 (메모리 절약)
    const oldBatchStart = Math.max(0, (currentBatch - 3) * IMAGE_BATCH_SIZE);
    if (imageDataCache.has(oldBatchStart)) {
        console.log(`Cleaning up old batch starting at ${oldBatchStart}`);
        cleanupBatch(oldBatchStart, IMAGE_BATCH_SIZE);
    }

    init(canvasId, loopedPersonIndex, personIndex);
}

function onAnimationComplete(canvasId) {
    console.log(`${canvasId} finished. Returning to the back of the queue.`);
    animationQueue.push(canvasId); // Return the canvas to the end of the queue
}

// --- Animation Functions ---

const animationFrameIds = {};
const canvasRetryCounters = {}; // 캔버스별 재시도 카운터

function init(canvasId, loopedPersonIndex, absolutePersonIndex) {
    const person = shuffledPeople[loopedPersonIndex];
    
    // 디버깅을 위한 로그
    console.log(`Trying to load person ${loopedPersonIndex} (absolute: ${absolutePersonIndex}), cache size: ${imageDataCache.size}`);
    
    // 캐시는 절대 인덱스로 저장되므로 절대 인덱스로 조회
    const pixels = imageDataCache.get(absolutePersonIndex);

    if (!pixels) {
        console.warn(`Image data for index ${absolutePersonIndex} not in cache! Starting immediate load...`);
        
        // 캐시 상태 확인
        console.log('Available cache keys:', Array.from(imageDataCache.keys()));
        
        // 무한 루프 방지를 위한 최대 재시도 횟수 제한
        if (!canvasRetryCounters[canvasId]) canvasRetryCounters[canvasId] = 0;
        canvasRetryCounters[canvasId]++;
        
        if (canvasRetryCounters[canvasId] > 5) {
            console.error(`Too many retries for ${canvasId}, skipping to next person`);
            canvasRetryCounters[canvasId] = 0;
            return; // 다음 틱에서 새로운 person index로 시도
        }
        
        // 🚀 즉시 로딩 시도 (비동기)
        const fallbackLoad = async () => {
            try {
                console.log(`🔄 Emergency loading person ${loopedPersonIndex} (absolute: ${absolutePersonIndex})`);
                
                // loadBatch를 사용하여 단일 이미지 로드
                const { loadBatch } = await import('./imageLoader.js');
                await loadBatch(absolutePersonIndex, 1);
                
                // 로드 완료 후 즉시 재시도
                console.log(`✅ Emergency load complete for index ${absolutePersonIndex}`);
                
                // 재귀 호출 대신 다음 틱에서 재시도
                animationQueue.unshift(canvasId);
                nextPersonIndex--;  // 인덱스 되돌리기
                
            } catch (error) {
                console.error(`❌ Emergency load failed for index ${absolutePersonIndex}:`, error);
                
                // 실패 시 다음 person으로 넘어가기
                animationQueue.unshift(canvasId);
                nextPersonIndex--; 
            }
        };
        
        // 비동기로 로딩 시작하고 현재 함수는 종료
        fallbackLoad();
        return;
    }
    
    // 성공 시 재시도 카운터 리셋
    canvasRetryCounters[canvasId] = 0;

    const text = document.getElementById(canvasId + '_text');
    const canvas = document.getElementById(canvasId);
    const ctx = canvasContexts[canvasId];

    canvas.width = window.innerWidth / 4;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    cancelAnimation(canvasId);

    const originalText = person.englishName.replace(/([a-z])([A-Z])/g, '$1 $2');
    text.innerText = originalText.toUpperCase();
    text.classList.remove("hide");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let particles = particlePools[canvasId].activateParticles(pixels, canvas.width, canvas.height, stepPixel);

    async function animate(timestamp) {
        const frameStartTime = performance.now();
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allParticlesAtTarget = true;

        // 파티클 업데이트 시간 측정
        const updateStartTime = performance.now();
        
        // 전역 애니메이션 상태 업데이트
        particlePools[canvasId].updateGlobalState(timestamp);
        
        // Web Worker를 통한 파티클 계산 (폴백 지원)
        try {
            await particleCalculatorWorkerManager.updateParticles(particles, timestamp);
        } catch (error) {
            // 폴백: 메인 스레드에서 직접 계산
            for (let i = 0; i < particles.length; i++) {
                particles[i].update(timestamp);
            }
        }
        
        // 렌더링은 메인 스레드에서 수행
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.draw(ctx);
            if (!p.isAtTarget()) allParticlesAtTarget = false;
        }
        
        // 성능 모니터링
        const updateTime = performance.now() - updateStartTime;
        performanceMonitor.recordParticleUpdate(updateTime, particles.length);
        performanceMonitor.recordFrame(frameStartTime);

        if (!allParticlesAtTarget) {
            animationFrameIds[canvasId] = animationManager.requestAnimationFrame(animate);
        } else {
            console.log(`애니메이션이 ${canvasId}에서 완료되었습니다.`);
            animationManager.setTimeout(() => {
                console.log(`폭발 시작 ${canvasId}`);
                startExplosionAnimation(canvasId, particles, ctx);
            }, EXPLOSION_START_DELAY);
        }
    }
    animationFrameIds[canvasId] = animationManager.requestAnimationFrame(animate);
}

function startExplosionAnimation(canvasId, particles, ctx) {
    document.getElementById(canvasId + '_text').classList.add('hide');

    for (let i = 0; i < particles.length; i++) {
        animationManager.setTimeout(() => particles[i].explode(), Math.random() * EXPLOSION_PARTICLE_DELAY);
    }

    function explodeAnimation() {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        let allParticlesOutside = true;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.update(performance.now());
            if (p.pos.x > 0 && p.pos.x < ctx.canvas.width && p.pos.y > 0 && p.pos.y < ctx.canvas.height) {
                allParticlesOutside = false;
            }
            p.draw(ctx);
        }

        if (!allParticlesOutside) {
            animationFrameIds[canvasId] = animationManager.requestAnimationFrame(explodeAnimation);
        } else {
            console.log(`${canvasId} 폭발 애니메이션이 완료되었습니다.`);
            onAnimationComplete(canvasId);
        }
    }
    animationFrameIds[canvasId] = animationManager.requestAnimationFrame(explodeAnimation);
}

// activateParticles 함수는 OptimizedParticlePool.activateParticles()로 대체됨

function cancelAnimation(canvasId) {
    if (animationFrameIds[canvasId]) {
        animationManager.cancelAnimationFrame(animationFrameIds[canvasId]);
        animationFrameIds[canvasId] = null;
    }
}

// === 개발자 도구용 전역 함수들 ===
// 브라우저 콘솔에서 성능 정보 확인 가능

window.getPerformanceReport = () => {
    return performanceMonitor.generateReport();
};

window.getRealtimeStats = () => {
    return performanceMonitor.getRealTimeStats();
};

window.getAnimationManagerInfo = () => {
    return animationManager.getResourceInfo();
};

window.getImageWorkerStatus = () => {
    return import('./ImageWorkerManager.js').then(module => 
        module.default.getStatus()
    );
};

window.getParticleWorkerStatus = () => {
    return particleCalculatorWorkerManager.getStatus();
};

// 성능 정보를 주기적으로 콘솔에 출력 (개발 모드에서만)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setInterval(() => {
        const stats = window.getRealtimeStats();
        console.log('🎯 Real-time Performance:', {
            FPS: stats.currentFPS.toFixed(1),
            Memory: `${stats.memoryUsed}MB`,
            Frames: stats.frameCount,
            Runtime: `${(stats.runtime / 1000).toFixed(1)}s`
        });
    }, 10000); // 10초마다 출력
}
