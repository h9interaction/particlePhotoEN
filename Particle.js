// 최적화된 Particle.js
const easeInOutQuart = (t) => {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

const easeInOutQuartModified = (t) => {
    if (t < 0.5) {
        return 1 - Math.pow(1 - (2 * t), 3);
    } else {
        return 1 - Math.pow(-2 * t + 2, 5) / 2;
    }
};

// 전역 임시 객체들 - 가비지 컬렉션 방지
const tempPos = { x: 0, y: 0 };
const directions = [0, 1, 2, 3];

const getOutsidePos = (canvasWidth, canvasHeight, reusablePos = tempPos) => {
    const direction = directions[Math.floor(Math.random() * 4)];
    
    switch (direction) {
        case 0: // 위
            reusablePos.x = Math.random() * canvasWidth;
            reusablePos.y = -1000;
            break;
        case 1: // 아래
            reusablePos.x = Math.random() * canvasWidth;
            reusablePos.y = canvasHeight + 1000;
            break;
        case 2: // 왼쪽
            reusablePos.x = -1000;
            reusablePos.y = Math.random() * canvasHeight;
            break;
        case 3: // 오른쪽
            reusablePos.x = canvasWidth + 1000;
            reusablePos.y = Math.random() * canvasHeight;
            break;
    }
    return { x: reusablePos.x, y: reusablePos.y };
}

const getRandomPos = (target, reusablePos = tempPos) => {
    const direction = directions[Math.floor(Math.random() * 4)];
    const rand1 = Math.random() * 100 - 50; // -50 ~ +50
    const rand2 = Math.random() * 100;      // 0 ~ 100

    switch (direction) {
        case 0: // 위
            reusablePos.x = target.x + rand1;
            reusablePos.y = target.y - rand2;
            break;
        case 1: // 아래
            reusablePos.x = target.x + rand1;
            reusablePos.y = target.y + rand2;
            break;
        case 2: // 왼쪽
            reusablePos.x = target.x - rand2;
            reusablePos.y = target.y + rand1;
            break;
        case 3: // 오른쪽
            reusablePos.x = target.x + rand2;
            reusablePos.y = target.y + rand1;
            break;
    }
    return { x: reusablePos.x, y: reusablePos.y };
}

class Particle {
    constructor(x, y, color, canvasWidth, canvasHeight, stepPixel) {
        // 객체 생성 최소화 - 직접 프로퍼티 할당
        this.target = { x: x, y: y };
        this.color = { r: color.r, g: color.g, b: color.b };
        this.pos = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        
        // 계산 결과 캐싱
        this.brightness = 0;
        this.size = 0;
        this.targetSize = 0;
        this.atTarget = false;
        this.exploding = false;
        this.isActive = true;
        
        // 타이밍 관련
        this.startTime = 0;
        this.duration = 0;
        
        // 성능 최적화용 플래그
        this.needsUpdate = true;
        this.lastUpdateTime = 0;
        
        // 물리 속성 (폭발 시 설정)
        this.mass = 1.0; // 질량 (사이즈에 따라 결정)
        this.gravityFactor = 1.0; // 중력 계수
        this.airResistance = 0.98; // 공기 저항 계수
        this.initialY = 0; // 초기 Y 위치 저장용
        
        // 2단계 애니메이션 관리
        this.phase = 'falling'; // 'falling' | 'sizing'
        this.positionComplete = false; // 위치 이동 완료 여부
        this.sizingStartTime = 0; // 사이즈 조정 시작 시간
        this.maxSize = 0; // 최대 사이즈 저장
        
        this.reset(x, y, color, canvasWidth, canvasHeight, stepPixel);
    }

    reset(x, y, color, canvasWidth, canvasHeight, stepPixel) {
        // 타겟 위치 설정
        this.target.x = x;
        this.target.y = y;
        
        // 색상 설정 (흰색으로 고정)
        this.color = { r: 255, g: 255, b: 255 };
        
        // 밝기 계산 및 크기 설정
        this.brightness = (color.r + color.g + color.b) / 3;
        this.targetSize = Math.max(stepPixel * ((1 - (this.brightness / 255)) * 0.8), stepPixel * 0.2);
        this.size = 0;
        
        // 속도 초기화
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        // 시작 위치 설정 (상단에서 떨어지는 모래 효과)
        this.pos.x = x + (Math.random() - 0.5) * 200; // 더 넓은 범위에서 시작
        this.initialY = -400 - (Math.random() * 600); // 훨씬 높은 곳에서 시작
        this.pos.y = this.initialY; // 화면 상단 위에서 시작
        
        // 드라마틱한 효과를 위한 추가 속성
        this.initialX = this.pos.x; // 초기 X 위치 저장
        this.swayAmount = (Math.random() - 0.5) * 3; // 떨어지며 흔들리는 정도
        this.rotationSpeed = (Math.random() - 0.5) * 0.3; // 회전 속도
        this.currentRotation = 0; // 현재 회전각
        
        // 상태 초기화
        this.atTarget = false;
        this.exploding = false;
        this.isActive = true;
        this.needsUpdate = true;
        
        // 2단계 애니메이션 초기화
        this.phase = 'falling';
        this.positionComplete = false;
        this.sizingStartTime = 0;
        this.maxSize = Math.max(stepPixel * 0.2, this.targetSize * 0.2); // 최대 사이즈 설정
        
        // 타이밍 설정 (더 랜덤하고 넓은 간격)
        const fallHeight = Math.abs(this.pos.y - y); // 떨어져야 하는 거리
        const baseHeightDelay = (canvasHeight - y) * 1.5; // 하단부터 기본 지연
        const randomDelay = Math.random() * 1500; // 큰 랜덤 지연 (0-1.5초)
        const extraRandomDelay = Math.random() * Math.random() * 2000; // 이중 랜덤으로 더 불규칙하게
        
        this.startTime = performance.now() + baseHeightDelay + randomDelay + extraRandomDelay;
        
        // 듀레이션도 더 길고 랜덤하게
        const baseDuration = 2500 + (fallHeight / canvasHeight) * 1500; // 기본 듀레이션 증가
        const randomDurationVariation = (Math.random() - 0.5) * 1000; // ±0.5초 변화
        this.duration = baseDuration + randomDurationVariation;
        this.lastUpdateTime = 0;
    }

    update(currentTime) {
        // 기존 스킵 로직 제거 - 매 프레임마다 업데이트 허용
        
        if (!this.exploding) {
            const timeElapsed = (currentTime - this.startTime) / this.duration;
            const progress = Math.min(Math.max(timeElapsed, 0), 1);
            
            // 낙엽이 쌓이는 듯한 부드러운 효과
            if (progress > 0) {
                // 낙엽처럼 자연스러운 낙하 곡선 - 처음 가속 후 공기저항으로 서서히 감속
                const naturalFallProgress = progress < 0.7 ? 
                    Math.pow(progress, 0.8) : // 70%까지 부드러운 가속
                    Math.pow(0.7, 0.8) + (1 - Math.pow(0.7, 0.8)) * (1 - Math.pow(1 - (progress - 0.7) / 0.3, 2)); // 70% 이후 점진적 감속
                
                // 수평 이동도 동일한 곡선 적용
                const horizontalProgress = naturalFallProgress;
                
                // 낙엽처럼 좌우로 부드럽게 흔들리는 효과
                const swayIntensity = Math.sin(progress * Math.PI * 1.5 + this.swayAmount) * this.swayAmount * 12;
                const leafSway = swayIntensity * (1 - Math.pow(progress, 1.2)); // 착지할수록 흔들림 자연스럽게 감소
                
                // 회전도 자연스럽게 감소 - 낙엽이 바닥에 가까워질수록 회전 느려짐
                const rotationIntensity = (1 - Math.pow(progress, 1.2));
                this.currentRotation += this.rotationSpeed * 0.4 * rotationIntensity;
                
                // 수평 위치 + 낙엽 흔들림 효과
                const baseX = this.target.x * horizontalProgress + this.initialX * (1 - horizontalProgress);
                this.pos.x = baseX + leafSway;
                
                // 수직 위치 - 자연스러운 낙하
                const fallDistance = this.target.y - this.initialY;
                this.pos.y = this.initialY + (fallDistance * naturalFallProgress);
                
                // 크기 변화 - 떨어지기 시작할 때부터 도착까지 점진적으로 증가
                const sizeProgress = Math.pow(progress, 1.1); // 자연스럽게 증가
                
                this.size = this.maxSize + (this.targetSize - this.maxSize) * sizeProgress;
            }
            
            if (timeElapsed >= 1) {
                this.pos.x = this.target.x;
                this.pos.y = this.target.y;
                this.size = this.targetSize;
                this.atTarget = true;
                this.needsUpdate = false;
            }
        } else {
            // 폭발 로직 (사이즈별 차별화된 중력 효과)
            this.velocity.x *= this.airResistance; // 공기 저항 (개별 설정)
            this.velocity.y += this.gravityFactor; // 중력 효과 (사이즈별 차별화)
            this.pos.x += this.velocity.x;
            this.pos.y += this.velocity.y;
            this.size -= 0.05;
            
            if (this.size <= 0) {
                this.size = 0;
                this.isActive = false;
                this.needsUpdate = false;
            }
            
            // 속도가 매우 작아지면 비활성화
            if (Math.abs(this.velocity.x) < 0.1 && Math.abs(this.velocity.y) < 0.1) {
                this.isActive = false;
                this.needsUpdate = false;
            }
        }
    }

    // 최적화된 draw 메서드 (회전 효과 포함)
    draw(ctx) {
        if (this.size <= 0) return;
        
        const halfSize = this.size * 0.5;
        const x = this.pos.x;
        const y = this.pos.y;
        
        // 회전 효과가 있는 경우
        if (this.currentRotation !== 0 && !this.atTarget) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(this.currentRotation);
            ctx.fillStyle = `rgb(${this.color.r},${this.color.g},${this.color.b})`;
            ctx.fillRect(-halfSize, -halfSize, this.size, this.size);
            ctx.restore();
        } else {
            // 기본 렌더링
            ctx.fillStyle = `rgb(${this.color.r},${this.color.g},${this.color.b})`;
            ctx.fillRect(x - halfSize, y - halfSize, this.size, this.size);
        }
    }

    isAtTarget() {
        return this.atTarget;
    }

    explode() {
        this.exploding = true;
        this.needsUpdate = true;
        this.isActive = true;
        
        // 사이즈에 따른 물리 속성 설정
        this.mass = this.size / 10; // 사이즈에 비례한 질량
        
        // 큰 파티클: 빠르게 떨어짐, 작은 파티클: 천천히 떨어짐
        const sizeRatio = this.size / 20; // 사이즈 비율 (일반적으로 0.5-2.0)
        this.gravityFactor = 0.3 + (sizeRatio * 0.4) + (Math.random() * 0.2 - 0.1); // 0.2-0.9 + 랜덤
        
        // 공기 저항도 사이즈에 따라 조정 (큰 파티클은 저항이 적음)
        this.airResistance = 0.98 - (sizeRatio * 0.05) + (Math.random() * 0.02 - 0.01); // 0.93-0.99 + 랜덤
        
        // 폭발 속도 설정 (사이즈에 따라 차별화)
        const randX = Math.random() - 0.5;
        const randY = Math.random() - 0.5;
        const speedMultiplier = 1 + (sizeRatio * 0.5) + (Math.random() * 0.3 - 0.15); // 랜덤 속도 변화
        this.velocity.x = randX * 3 * speedMultiplier;
        this.velocity.y = randY * 2 * speedMultiplier;
    }
}

export default Particle;