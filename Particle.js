
const easeInOutQuart = (t) => {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

const easeInOutQuartModified = (t) => {
    if (t < 0.5) {
        return 1 - Math.pow(1 - (2 * t), 3); // 초반에 빠르게 가속
    } else {
        return 1 - Math.pow(-2 * t + 2, 5) / 2; // 도착할 때 천천히 멈춤
    }
};

const getOutsidePos = (canvasWidth, canvasHeight) => {
    const direction = Math.floor(Math.random() * 4);
    var pos = { x: 0, y: 0 };
    switch (direction) {
        case 0: // 위
            pos = {
                x: Math.random() * canvasWidth,
                y: -1000  // 캔버스 상단 밖에서 시작
            };
            break;
        case 1: // 아래
            pos = {
                x: Math.random() * canvasWidth,
                y: canvasHeight + 1000  // 캔버스 하단 밖에서 시작
            };
            break;
        case 2: // 왼쪽
            pos = {
                x: -1000,  // 캔버스 왼쪽 밖에서 시작
                y: Math.random() * canvasHeight
            };
            break;
        case 3: // 오른쪽
            pos = {
                x: canvasWidth + 1000,  // 캔버스 오른쪽 밖에서 시작
                y: Math.random() * canvasHeight
            };
            break;
    }
    return pos;
}

const getRandomPos = (target) => {
    var pos = { x: 0, y: 0 };
    const direction = Math.floor(Math.random() * 4);

    switch (direction) {
        case 0: // target 위치 기준 x는 +- 50px 범위 내에서 랜덤, y는 target 위치 기준 위쪽 100px 범위 내에서 랜덤
            pos = {
                x: target.x + (Math.random() * 100 - 50), // -50 ~ +50
                y: target.y - (Math.random() * 100) // 위쪽으로 최대 100px 이동
            };
            break;
        case 1:  // target 위치 기준 x는 +- 50px 범위 내에서 랜덤, y는 target 위치 기준 아래쪽 100px 범위 내에서 랜덤
            pos = {
                x: target.x + (Math.random() * 100 - 50), // -50 ~ +50
                y: target.y + (Math.random() * 100) // 아래쪽으로 최대 100px 이동
            };
            break;
        case 2: // target 위치 기준 y는 +- 50px 범위 내에서 랜덤, x는 target 위치 기준 왼쪽 100px 범위 내에서 랜덤
            pos = {
                x: target.x - (Math.random() * 100), // 왼쪽으로 최대 100px 이동
                y: target.y + (Math.random() * 100 - 50) // -50 ~ +50
            };
            break;
        case 3:  // target 위치 기준 y는 +- 50px 범위 내에서 랜덤, x는 target 위치 기준 오른쪽 100px 범위 내에서 랜덤
            pos = {
                x: target.x + (Math.random() * 100), // 오른쪽으로 최대 100px 이동
                y: target.y + (Math.random() * 100 - 50) // -50 ~ +50
            };
            break;
    }
    return pos;
}

class Particle {
    constructor(x, y, color, canvasWidth, canvasHeight, stepPixel) {
        this.target = { x, y };
        this.color = color;
        const brightness = (color.r + color.g + color.b) / 3;
        this.size = 0;
        this.targetSize = Math.max(stepPixel * ((1 - (brightness / 255)) * 1.90), stepPixel * 0.02);


        this.velocity = { x: 0, y: 0 }; // 속도 초기화
        this.pos = getOutsidePos(canvasWidth, canvasHeight);
        // this.pos = this.target;

        this.atTarget = false;
        this.startTime = performance.now() + Math.random() * 1000;  // 랜덤한 출발 시간 (최대 1초 지연)
        this.duration = 4000 + Math.random() * 10000;  // 4~6초 사이의 랜덤한 이동 시간
        this.exploding = false; // 폭발 상태 초기화
    }

    reset(x, y, color, canvasWidth, canvasHeight, stepPixel) {
        this.target = { x, y };
        this.color = { r: 255, g: 255, b: 255, a: 100 };
        // this.color = color;
        const brightness = (color.r + color.g + color.b) / 3;
        this.size = 0;
        this.targetSize = Math.max(stepPixel * ((1 - (brightness / 255)) * 0.8), stepPixel * 0.2);

        this.velocity = { x: 0, y: 0 }; // 속도 초기화
        // this.pos = getOutsidePos(canvasWidth, canvasHeight);
        // this.pos = this.target;
        this.pos = getRandomPos(this.target);

        this.atTarget = false;
        this.startTime = performance.now() + Math.random() * 1000;  // 랜덤한 출발 시간 (최대 1초 지연)
        this.duration = 4000 + Math.random() * 10000;  // 4~6초 사이의 랜덤한 이동 시간
        this.exploding = false; // 폭발 상태 초기화
    }

    update(currentTime) {
        if (!this.exploding) {
            const timeElapsed = (currentTime - this.startTime) / this.duration;
            const progress = easeInOutQuart(Math.min(timeElapsed, 2));
    
            // 크기 증가 속도를 더 빠르게 하지만 부드럽게 보정
            const growthFactor = 2.5; // 크기 증가 속도 조절 (기본값보다 빠르게)
            const speed = Math.pow(progress, growthFactor);
            this.pos.x = (this.target.x * speed + this.pos.x * (1 - speed));
            this.pos.y = (this.target.y * speed + this.pos.y * (1 - speed));
            this.size = this.targetSize * speed; // 부드러운 크기 증가
    
            if (timeElapsed >= 1) {
                this.pos.x = this.target.x;
                this.pos.y = this.target.y;
                this.size = this.targetSize;
                this.atTarget = true;
            }
        } else {
            // 폭발하는 동안 파티클의 위치를 보다 자연스럽게 사방으로 확산시키며 화면 밖으로 나가도록 처리
            this.velocity.x *= 1.02; // 속도를 점점 증가시켜 자연스럽게 확산되도록
            this.velocity.y *= 1.02;
            this.pos.x += this.velocity.x;
            this.pos.y += this.velocity.y;
            this.size -= 0.5;
    
            if (this.size < 0) this.size = 0;
    
            // 특정 속도 이하가 되면 더 이상 업데이트하지 않음
            if (Math.abs(this.velocity.x) < 0.1 && Math.abs(this.velocity.y) < 0.1) {
                this.isActive = false;
            }
        }
    }


    // draw(ctx) {
    //     ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
    //     ctx.beginPath();  // 새로운 경로 시작
    //     ctx.arc(this.pos.x, this.pos.y, this.size / 2, 0, Math.PI * 2);  // 원 그리기
    //     ctx.fill();  // 원 채우기
    // }

    // draw(ctx) {
    //     ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
    //     ctx.fillRect(this.pos.x, this.pos.y, this.size, this.size);  // 사각형 그리기
    // }

    draw(ctx) {
        ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        // ctx.fillRect(this.pos.x - this.targetSize / 2, this.pos.y - this.targetSize / 2, this.size, this.size);  // 중앙 기준으로 사각형 그리기
        ctx.fillRect(this.pos.x - this.size / 2, this.pos.y - this.size / 2, this.size, this.size);
    }


    isAtTarget() {
        return this.atTarget;
    }

    explode() {
        this.exploding = true;
        this.velocity.x = (Math.random() - 0.5) * 3; // X 방향 랜덤 속도 설정
        this.velocity.y = (Math.random() - 0.5) * 2; // Y 방향 랜덤 속도 설정
    }
}

export default Particle