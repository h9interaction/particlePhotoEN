import { initializePeopleData, shuffleArray } from './peopleDataLoader.js';
import { imageDataArray, loadImages } from './imageLoader.js';
import Particle from './Particle.js';

const canvasIds = ['imageCanvas1', 'imageCanvas2', 'imageCanvas3', 'imageCanvas4'];
let currentIndex = 0;
const maxParticles = 4320; // 최대 파티클 개수 설정
const particlePools = {};
const stepPixel = 22;
let shuffledPeople = [];

async function dataLoad() {
    try {
        // Firestore people 데이터 초기화 및 peopleData 획득
        const peopleData = await initializePeopleData();
        if (!peopleData || !Array.isArray(peopleData) || peopleData.length === 0) {
            throw new Error('peopleData가 비어있음');
        }
        // peopleData 객체 배열 자체를 셔플
        shuffledPeople = shuffleArray([...peopleData]);
        console.log("People 데이터 셔플 완료, 이미지 로딩 시작...");
        await loadImages(shuffledPeople, stepPixel);
        console.log("이미지 로딩 완료!");
        canvasIds.forEach(id => createParticles(id));
        startAnimationLoop();
    } catch (error) {
        console.error("데이터 로드 실패:", error);
        // 에러 발생 시 기본 데이터로 fallback
        shuffledPeople = [{ englishName: "Test", koreanName: "테스트", imageUrl: "" }];
        await loadImages(shuffledPeople, stepPixel);
        canvasIds.forEach(id => createParticles(id));
        startAnimationLoop();
    }
}

function createParticles(canvasId) {
    particlePools[canvasId] = [];
    for (let i = 0; i < maxParticles; i++) {
        particlePools[canvasId].push(new Particle(0, 0, { r: 120, g: 120, b: 120 }, 0, 0, stepPixel));
    }
}

window.onload = () => {
    dataLoad();
};

function startAnimationLoop() {
    canvasIds.forEach((canvasId, index) => {
        setTimeout(() => {
            init(canvasId, index);
        }, 4000 * index);  // 각 캔버스는 4초 간격으로 시작
    });
}

const canvasAnimationState = {
    imageCanvas1: { animationFrameId: null, exploding: false },
    imageCanvas2: { animationFrameId: null, exploding: false },
    imageCanvas3: { animationFrameId: null, exploding: false },
    imageCanvas4: { animationFrameId: null, exploding: false }
};

function init(canvasId, index) {
    const text = document.getElementById(canvasId + '_text');
    console.log('index: ', index);

    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 안전한 배열 접근
    if (!imageDataArray || imageDataArray.length === 0) {
        console.error('이미지 데이터가 없습니다.');
        return;
    }

    const currentImageData = imageDataArray[currentIndex % imageDataArray.length];
    if (!currentImageData || !currentImageData.pixels) {
        console.error(`인덱스 ${currentIndex}의 이미지 데이터가 유효하지 않습니다.`);
        return;
    }

    const imageData = currentImageData.pixels;
    canvas.width = window.innerWidth / 4;  // 화면의 1/4 크기로 설정
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    cancelAnimation(canvasId);
    function addSpaceBeforeUppercase(text) {
        return text.replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    // 셔플된 people 배열에서 현재 인덱스의 이름/한글명 사용
    const person = shuffledPeople[currentIndex % shuffledPeople.length];
    const originalText = person ? person.englishName : '';
    const modifiedText = addSpaceBeforeUppercase(originalText);
    console.log(modifiedText);
    text.innerText = modifiedText.toUpperCase();
    text.classList.remove("hide");
    currentIndex++;
    if (currentIndex >= shuffledPeople.length) {
        currentIndex = 0; // 마지막에 도달하면 처음부터 다시 시작
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let particles = activateParticles(particlePools[canvasId], imageData, canvas.width, canvas.height);

    function animate(timestamp) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allParticlesAtTarget = true;

        particles.forEach(particle => {
            particle.update(timestamp);
            particle.draw(ctx);
            if (!particle.isAtTarget()) {
                allParticlesAtTarget = false;
            }
        });

        if (!allParticlesAtTarget) {
            requestAnimationFrame(animate);
        } else {
            console.log(`애니메이션이 ${canvasId}에서 완료되었습니다.`);
            setTimeout(() => {
                init(canvasId, index);  // 같은 캔버스에서 다음 이미지로 넘어가기
            }, 8000);  // 모든 캔버스가 한 번씩 활성화 된 후 다음 순환 시작
            setTimeout(() => {
                console.log(`폭발 시작 ${canvasId}`);
                startExplosionAnimation(canvasId);
            }, 2000);
        }
    }

    requestAnimationFrame(animate);

    function startExplosionAnimation(canvasId) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        const text = document.getElementById(canvasId + '_text');
        text.classList.add('hide');

        // 현재 폭발 상태를 true로 설정
        canvasAnimationState[canvasId].exploding = true;

        particles.forEach((particle, index) => {
            const delay = Math.random() * 4000; // 0ms ~ 1000ms (1초) 사이의 랜덤한 지연시간
            setTimeout(() => {
                particle.explode(); // 수정된 explode() 함수 사용
            }, delay);
        });

        function explodeAnimation() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let allParticlesOutside = true;

            particles.forEach(particle => {
                particle.update(performance.now());
                if (particle.pos.x > 0 && particle.pos.x < canvas.width && particle.pos.y > 0 && particle.pos.y < canvas.height) {
                    allParticlesOutside = false;
                }
                particle.draw(ctx);
            });

            if (!allParticlesOutside) {
                canvasAnimationState[canvasId].animationFrameId = requestAnimationFrame(explodeAnimation);
            } else {
                console.log(`${canvasId} 폭발 애니메이션이 완료되었습니다.`);
                canvasAnimationState[canvasId].exploding = false;
                // 다음 이미지로 넘어가거나 종료 처리
            }
        }
        explodeAnimation();
    }
}

function activateParticles(pool, imageData, canvasWidth, canvasHeight) {
    let activeParticles = [];
    imageData.forEach((pixel, index) => {
        if (index < pool.length) {
            let particle = pool[index];
            particle.reset(pixel.x, pixel.y, pixel.color, canvasWidth, canvasHeight, stepPixel);
            activeParticles.push(particle);
        }
    });
    return activeParticles;
}

function cancelAnimation(canvasId) {
    if (canvasAnimationState[canvasId].animationFrameId !== null) {
        cancelAnimationFrame(canvasAnimationState[canvasId].animationFrameId);
        console.log(`${canvasId} 애니메이션이 취소되었습니다.`);
        canvasAnimationState[canvasId].exploding = false;
        canvasAnimationState[canvasId].animationFrameId = null; // 초기화
    }
}

