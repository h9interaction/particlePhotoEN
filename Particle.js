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
        
        // 회전 정착을 위한 변수들
        this.settlementStarted = false;
        this.rotationAtSettlement = 0;
        
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
        this.size = 0; // 먼지처럼 작은 크기로 시작
        
        // 속도 초기화
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        // 🔥 ULTRA FIX: 화면 바로 위에서 시작하도록 강제 설정
        this.pos.x = x + (Math.random() - 0.5) * 200; // 더 넓은 범위에서 시작
        this.initialY = -50 - (Math.random() * 100); // 화면 바로 위(-50~-150)에서 시작
        this.pos.y = this.initialY; // 화면 바로 위에서 시작
        
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
        this.dustSize = stepPixel * 0.05; // 먼지처럼 매우 작은 초기 크기 (기존 maxSize 대신)
        
        // 회전 정착 초기화
        this.settlementStarted = false;
        this.rotationAtSettlement = 0;
        
        // 타이밍 설정 (더 랜덤하고 넓은 간격)
        const fallHeight = Math.abs(this.pos.y - y); // 떨어져야 하는 거리
        const baseHeightDelay = (canvasHeight - y) * 1.5; // 하단부터 기본 지연
        const randomDelay = Math.random() * 1500; // 큰 랜덤 지연 (0-1.5초)
        const extraRandomDelay = Math.random() * Math.random() * 2000; // 이중 랜덤으로 더 불규칙하게
        
        this.startTime = performance.now() + baseHeightDelay + randomDelay + extraRandomDelay; // 원래 지연으로 복구
        
        // 듀레이션을 원래대로 복구 (3~8초)
        const baseDuration = 3000; // 3초 기본
        const randomDurationVariation = Math.random() * 5000; // 0~5초 추가
        this.duration = baseDuration + randomDurationVariation;
        this.lastUpdateTime = 0;
    }

    update(currentTime) {
        // 기존 스킵 로직 제거 - 매 프레임마다 업데이트 허용
        
        if (!this.exploding) {
            const timeElapsed = (currentTime - this.startTime) / this.duration;
            const progress = Math.min(Math.max(timeElapsed, 0), 1);
            
            // 🚨 ULTRA DEBUG: 애니메이션 시작 및 초기 진행 상황 로깅
            if (progress > 0 && progress <= 0.1 && Math.random() < 0.02) {
                // console.log('🎬 메인스레드 등장 START:', {
                //     progress: progress.toFixed(3),
                //     timeElapsed: ((currentTime - this.startTime) / 1000).toFixed(1) + 's',
                //     initialY: this.initialY,
                //     currentY: this.pos.y,
                //     targetY: this.target.y
                // });
            }
            
            // 낙엽이 쌓이는 듯한 부드러운 효과
            if (progress > 0) {
                // 부드러운 sine 곡선 기반 자연스러운 낙하
                // 0에서 시작해서 천천히 가속 후 부드럽게 감속하여 1에 도달하는 S자 곡선
                const naturalFallProgress = 0.5 * (1 - Math.cos(progress * Math.PI));
                
                // 수평 이동도 동일한 곡선 적용
                const horizontalProgress = naturalFallProgress;
                
                // 낙엽처럼 좌우로 부드럽게 흔들리는 효과
                const swayIntensity = Math.sin(progress * Math.PI * 1.5 + this.swayAmount) * this.swayAmount * 12;
                const leafSway = swayIntensity * (1 - Math.pow(progress, 1.2)); // 착지할수록 흔들림 자연스럽게 감소
                
                // 회전도 자연스럽게 감소 - 낙엽이 바닥에 가까워질수록 회전 느려짐
                // 80% 이후부터는 회전을 0도로 수렴하여 자연스럽게 정착
                if (progress < 0.8) {
                    const rotationIntensity = (1 - Math.pow(progress, 1.2));
                    this.currentRotation += this.rotationSpeed * 0.4 * rotationIntensity;
                } else {
                    // 80% 지점에서 정착 시작 - 한 번만 기록
                    if (!this.settlementStarted) {
                        this.settlementStarted = true;
                        this.rotationAtSettlement = this.currentRotation;
                    }
                    
                    // 80~100% 구간에서 회전각을 0으로 부드럽게 수렴
                    const settlementProgress = (progress - 0.8) / 0.2; // 0~1로 정규화
                    const easedSettlement = Math.pow(settlementProgress, 0.4); // 부드러운 easing
                    const targetRotation = 0; // 최종 회전각은 0도 (정렬된 상태)
                    
                    // 80% 지점의 회전각에서 0도로 부드럽게 보간
                    this.currentRotation = this.rotationAtSettlement * (1 - easedSettlement) + targetRotation * easedSettlement;
                }
                
                // 수평 위치 + 낙엽 흔들림 효과
                const baseX = this.target.x * horizontalProgress + this.initialX * (1 - horizontalProgress);
                this.pos.x = baseX + leafSway;
                
                // 수직 위치 - 자연스러운 낙하
                const fallDistance = this.target.y - this.initialY;
                this.pos.y = this.initialY + (fallDistance * naturalFallProgress);
                
                // 🚨 ULTRA DEBUG: 위치 계산 후 파티클 위치 로깅
                if (progress > 0 && progress <= 0.3 && Math.random() < 0.01) {
                    // console.log('📍 메인스레드 위치 UPDATE:', {
                    //     progress: progress.toFixed(3),
                    //     fallProgress: naturalFallProgress.toFixed(3),
                    //     initialY: this.initialY,
                    //     currentY: this.pos.y,
                    //     targetY: this.target.y,
                    //     fallDistance: fallDistance.toFixed(1)
                    // });
                }
                
                // 크기 변화 - 90% 지점부터 급격히 커지도록 수정
                let sizeProgress = 0;
                if (progress < 0.7) {
                    // 70% 지점까지는 먼지 크기 유지
                    sizeProgress = 0;
                } else {
                    // 70% 이후 마지막 70% 구간에서 자연스럽게 커짐
                    const finalPhaseProgress = (progress - 0.7) / 0.3; // 0~1로 정규화
                    sizeProgress = Math.pow(finalPhaseProgress, 0.6); // 부드러운 easing으로 자연스럽게 커짐
                }
                
                this.size = this.dustSize + (this.targetSize - this.dustSize) * sizeProgress;
            }
            
            if (timeElapsed >= 1) {
                this.pos.x = this.target.x;
                this.pos.y = this.target.y;
                this.size = this.targetSize;
                this.currentRotation = 0; // 완전 도착 시 회전각 확실히 0으로 설정
                this.atTarget = true;
                this.needsUpdate = false;
            }
        } else {
            // 폭발 로직 (사이즈별 차별화된 중력 효과)
            this.velocity.x *= this.airResistance; // 공기 저항 (개별 설정)
            this.velocity.y += this.gravityFactor; // 중력 효과 (사이즈별 차별화)
            this.pos.x += this.velocity.x;
            this.pos.y += this.velocity.y;
            
            // 크기별 차별화된 감소율로 자연스럽게 줄어들기
            const sizeRatio = this.explosionStartSize / 20; // 초기 크기 기준 비율
            const baseShrinkRate = 0.16; // 기본 감소율 (0.02 → 0.06으로 3배 증가)
            const sizeBasedShrinkRate = baseShrinkRate * (1.5 - sizeRatio * 0.5); // 큰 파티클은 더 빠르게 줄어듦
            const randomVariation = 1 + (Math.random() - 0.5) * 0.3; // ±15% 랜덤 변화
            
            this.size -= sizeBasedShrinkRate * randomVariation;
            
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
        
        // 원래 색상으로 복구 (흰색)
        ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        
        // 회전 효과가 있는 경우
        if (this.currentRotation !== 0 && !this.atTarget) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(this.currentRotation);
            ctx.fillRect(-halfSize, -halfSize, this.size, this.size);
            ctx.restore();
        } else {
            // 기본 렌더링
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
        
        // 폭발 시작 시 크기 정보 저장
        this.explosionStartSize = this.size;
        this.explosionStartTime = performance.now();
        
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