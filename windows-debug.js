/**
 * windows-debug.js
 * Windows PC에서 파티클 렌더링 문제 디버깅을 위한 유틸리티
 * 
 * 사용법: 브라우저 개발자 도구 콘솔에서
 * - WindowsDebug.systemInfo() : 시스템 정보 출력
 * - WindowsDebug.testCanvas() : Canvas 기능 테스트
 * - WindowsDebug.testParticles() : 파티클 생성 테스트
 * - WindowsDebug.forceCompatibilityMode() : 강제 호환성 모드 활성화
 */

window.WindowsDebug = {
    
    /**
     * 시스템 정보 및 GPU 정보 출력
     */
    systemInfo() {
        console.group('🖥️ Windows PC 시스템 정보');
        
        // User Agent 정보
        console.log('User Agent:', navigator.userAgent);
        
        // WebGL GPU 정보
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (gl) {
            console.log('GPU 렌더러:', gl.getParameter(gl.RENDERER));
            console.log('GPU 벤더:', gl.getParameter(gl.VENDOR));
            console.log('WebGL 버전:', gl.getParameter(gl.VERSION));
            console.log('GLSL 버전:', gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
            
            // GPU 타입 감지
            const renderer = gl.getParameter(gl.RENDERER).toLowerCase();
            const isDiscreteGPU = renderer.includes('nvidia') ||
                                renderer.includes('amd') ||
                                renderer.includes('radeon') ||
                                renderer.includes('geforce') ||
                                renderer.includes('gtx') ||
                                renderer.includes('rtx');
            
            console.log('전용 GPU 감지:', isDiscreteGPU ? '✅ 예' : '❌ 아니오');
            
            // 확장 기능 정보
            const extensions = gl.getSupportedExtensions();
            console.log('지원되는 WebGL 확장 기능:', extensions.length + '개');
            
        } else {
            console.error('❌ WebGL을 사용할 수 없습니다.');
        }
        
        // 화면 정보
        console.log('화면 해상도:', `${screen.width}x${screen.height}`);
        console.log('Device Pixel Ratio:', window.devicePixelRatio);
        console.log('브라우저 뷰포트:', `${window.innerWidth}x${window.innerHeight}`);
        
        // 가상머신 감지
        const userAgent = navigator.userAgent.toLowerCase();
        const isVirtual = userAgent.includes('utm') ||
                         userAgent.includes('virtual') ||
                         userAgent.includes('qemu') ||
                         userAgent.includes('parallels');
        console.log('가상머신 환경:', isVirtual ? '🖥️ 가상머신' : '💻 실제 PC');
        
        console.groupEnd();
    },
    
    /**
     * Canvas 2D 기능 테스트
     */
    testCanvas() {
        console.group('🎨 Canvas 2D 기능 테스트');
        
        try {
            // 테스트 캔버스 생성
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            
            // 다양한 컨텍스트 옵션 테스트
            const contextOptions = [
                { name: '기본', options: {} },
                { name: '최적화', options: { willReadFrequently: true, alpha: false } },
                { name: '호환성', options: { willReadFrequently: true, desynchronized: false } },
                { name: '성능우선', options: { willReadFrequently: true, desynchronized: true } }
            ];
            
            contextOptions.forEach(({ name, options }) => {
                try {
                    const ctx = canvas.getContext('2d', options);
                    
                    if (ctx) {
                        // 간단한 그리기 테스트
                        ctx.fillStyle = '#FF0000';
                        ctx.fillRect(10, 10, 50, 50);
                        ctx.fillStyle = '#00FF00';
                        ctx.fillRect(70, 70, 50, 50);
                        
                        // getImageData 테스트
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const hasData = imageData.data.some(value => value !== 0);
                        
                        console.log(`${name} 모드:`, hasData ? '✅ 정상' : '❌ 데이터 없음');
                        
                        if (!hasData) {
                            // 픽셀 샘플 확인
                            const sample = Array.from(imageData.data.slice(0, 20));
                            console.warn(`  샘플 픽셀 데이터:`, sample);
                        }
                        
                    } else {
                        console.error(`${name} 모드: ❌ 컨텍스트 생성 실패`);
                    }
                } catch (error) {
                    console.error(`${name} 모드: ❌ 오류 -`, error.message);
                }
            });
            
        } catch (error) {
            console.error('Canvas 테스트 실패:', error);
        }
        
        console.groupEnd();
    },
    
    /**
     * 파티클 생성 테스트 (샘플 이미지 사용)
     */
    testParticles() {
        console.group('✨ 파티클 생성 테스트');
        
        try {
            // 테스트용 간단한 이미지 생성
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            
            const ctx = canvas.getContext('2d', { 
                willReadFrequently: true, 
                desynchronized: false  // 호환성 우선
            });
            
            // 테스트 패턴 그리기
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 100, 100);
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(25, 25, 50, 50);
            ctx.fillStyle = '#0000FF';
            ctx.beginPath();
            ctx.arc(50, 50, 20, 0, Math.PI * 2);
            ctx.fill();
            
            console.log('테스트 패턴 생성 완료');
            
            // 픽셀 데이터 추출
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            let pixelCount = 0;
            let colorPixelCount = 0;
            const stepPixel = 5;
            
            for (let y = 0; y < canvas.height; y += stepPixel) {
                for (let x = 0; x < canvas.width; x += stepPixel) {
                    const idx = (y * canvas.width + x) * 4;
                    const a = data[idx + 3];
                    
                    if (a > 128) {
                        pixelCount++;
                        
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];
                        
                        // 흰색이 아닌 컬러 픽셀 카운트
                        if (r !== 255 || g !== 255 || b !== 255) {
                            colorPixelCount++;
                        }
                    }
                }
            }
            
            console.log(`총 픽셀 수: ${pixelCount}`);
            console.log(`컬러 픽셀 수: ${colorPixelCount}`);
            console.log(`파티클 생성 가능:`, pixelCount > 0 ? '✅ 가능' : '❌ 불가능');
            
            if (pixelCount === 0) {
                console.error('❌ 픽셀 데이터를 추출할 수 없습니다. GPU 가속 문제일 수 있습니다.');
                console.warn('💡 해결 방법: 브라우저 설정에서 하드웨어 가속을 비활성화해 보세요.');
            }
            
        } catch (error) {
            console.error('파티클 테스트 실패:', error);
        }
        
        console.groupEnd();
    },
    
    /**
     * 강제 호환성 모드 활성화 (임시 해결책)
     */
    forceCompatibilityMode() {
        console.group('🛠️ 호환성 모드 활성화');
        
        try {
            // localStorage에 강제 호환성 모드 플래그 설정
            localStorage.setItem('forceCompatibilityMode', 'true');
            
            console.log('✅ 호환성 모드가 활성화되었습니다.');
            console.log('💡 페이지를 새로고침하면 적용됩니다.');
            console.log('❌ 호환성 모드 해제: localStorage.removeItem("forceCompatibilityMode")');
            
            // 현재 Canvas 컨텍스트 재설정 (가능한 경우)
            if (window.animationManager && window.animationManager.canvasContexts) {
                window.animationManager.canvasContexts.clear();
                console.log('🔄 Canvas 컨텍스트 캐시가 초기화되었습니다.');
            }
            
        } catch (error) {
            console.error('호환성 모드 활성화 실패:', error);
        }
        
        console.groupEnd();
    },
    
    /**
     * 브라우저 설정 가이드 출력
     */
    browserSettings() {
        console.group('⚙️ 브라우저 설정 가이드');
        
        console.log('Chrome/Edge에서 하드웨어 가속 비활성화:');
        console.log('1. chrome://settings/ 또는 edge://settings/ 접속');
        console.log('2. "고급" → "시스템" 메뉴');
        console.log('3. "가능한 경우 하드웨어 가속 사용" 비활성화');
        console.log('4. 브라우저 재시작');
        console.log('');
        console.log('Firefox에서 하드웨어 가속 비활성화:');
        console.log('1. about:preferences 접속');
        console.log('2. "일반" 탭에서 "성능" 섹션');
        console.log('3. "권장 성능 설정 사용" 체크 해제');
        console.log('4. "가능한 경우 하드웨어 가속 사용" 체크 해제');
        console.log('5. 브라우저 재시작');
        
        console.groupEnd();
    },
    
    /**
     * 전체 진단 실행
     */
    diagnose() {
        console.log('🔍 Windows PC 파티클 렌더링 진단 시작...\n');
        
        this.systemInfo();
        this.testCanvas();
        this.testParticles();
        
        console.log('\n📋 진단 완료! 문제가 지속되면 WindowsDebug.browserSettings()를 참고하세요.');
    }
};

// 호환성 모드 자동 감지 및 적용
if (localStorage.getItem('forceCompatibilityMode') === 'true') {
    console.log('🛠️ 강제 호환성 모드가 활성화되었습니다.');
    
    // 전역 Canvas 컨텍스트 생성 시 자동으로 호환성 옵션 적용
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
        if (contextType === '2d') {
            // 호환성을 위한 옵션 강제 적용
            const compatibilityOptions = {
                ...contextAttributes,
                desynchronized: false,
                willReadFrequently: true
            };
            return originalGetContext.call(this, contextType, compatibilityOptions);
        }
        return originalGetContext.call(this, contextType, contextAttributes);
    };
}

console.log('🎯 Windows 디버그 도구 로드 완료!');
console.log('💡 사용법: WindowsDebug.diagnose() 또는 개별 테스트 함수들을 호출하세요.');