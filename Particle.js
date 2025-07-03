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
        
        this.reset(x, y, color, canvasWidth, canvasHeight, stepPixel);
    }

    reset(x, y, color, canvasWidth, canvasHeight, stepPixel) {
        // 타겟 위치 설정
        this.target.x = x;
        this.target.y = y;
        
        // 색상 설정 (흰색으로 고정)
        this.color.r = 255;
        this.color.g = 255;
        this.color.b = 255;
        
        // 밝기 계산 및 크기 설정
        this.brightness = (color.r + color.g + color.b) / 3;
        this.targetSize = Math.max(stepPixel * ((1 - (this.brightness / 255)) * 0.8), stepPixel * 0.2);
        this.size = 0;
        
        // 속도 초기화
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        // 시작 위치 설정 (객체 재사용)
        const startPos = getRandomPos(this.target, tempPos);
        this.pos.x = startPos.x;
        this.pos.y = startPos.y;
        
        // 상태 초기화
        this.atTarget = false;
        this.exploding = false;
        this.isActive = true;
        this.needsUpdate = true;
        
        // 타이밍 설정
        this.startTime = performance.now() + Math.random() * 1000;
        this.duration = 4000 + Math.random() * 10000;
        this.lastUpdateTime = 0;
    }

    update(currentTime) {
        // 이미 업데이트된 프레임이면 스킵
        if (this.lastUpdateTime === currentTime) {
            return;
        }
        this.lastUpdateTime = currentTime;
        
        if (!this.exploding) {
            const timeElapsed = (currentTime - this.startTime) / this.duration;
            
            if (timeElapsed < 0) {
                return; // 아직 시작 시간이 되지 않음
            }
            
            const progress = easeInOutQuart(Math.min(timeElapsed, 1));
            
            // 인라인 계산으로 성능 최적화
            const growthFactor = 2.5;
            const speed = Math.pow(progress, growthFactor);
            const invSpeed = 1 - speed;
            
            this.pos.x = this.target.x * speed + this.pos.x * invSpeed;
            this.pos.y = this.target.y * speed + this.pos.y * invSpeed;
            this.size = this.targetSize * speed;
            
            if (timeElapsed >= 1) {
                this.pos.x = this.target.x;
                this.pos.y = this.target.y;
                this.size = this.targetSize;
                this.atTarget = true;
                this.needsUpdate = false;
            }
        } else {
            // 폭발 로직
            this.velocity.x *= 1.02;
            this.velocity.y *= 1.02;
            this.pos.x += this.velocity.x;
            this.pos.y += this.velocity.y;
            this.size -= 0.5;
            
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

    // 최적화된 draw 메서드
    draw(ctx) {
        if (this.size <= 0) return;
        
        const halfSize = this.size * 0.5;
        const x = this.pos.x - halfSize;
        const y = this.pos.y - halfSize;
        
        // fillStyle 설정 최소화
        ctx.fillStyle = `rgb(${this.color.r},${this.color.g},${this.color.b})`;
        ctx.fillRect(x, y, this.size, this.size);
    }

    isAtTarget() {
        return this.atTarget;
    }

    explode() {
        this.exploding = true;
        this.needsUpdate = true;
        this.isActive = true;
        
        // 폭발 속도 설정 (계산 최적화)
        const randX = Math.random() - 0.5;
        const randY = Math.random() - 0.5;
        this.velocity.x = randX * 3;
        this.velocity.y = randY * 2;
    }
}

export default Particle;