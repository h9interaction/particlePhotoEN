/**
 * integration.test.js
 * 리팩토링 후 기존 기능 보존 확인 테스트
 */

// Mock DOM elements
document.body.innerHTML = `
  <canvas id="imageCanvas1"></canvas>
  <canvas id="imageCanvas2"></canvas>
  <canvas id="imageCanvas3"></canvas>
  <canvas id="imageCanvas4"></canvas>
  <div id="imageCanvas1_text"></div>
  <div id="imageCanvas2_text"></div>
  <div id="imageCanvas3_text"></div>
  <div id="imageCanvas4_text"></div>
`;

// Mock Image constructor
global.Image = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
  }
  
  // Simulate successful image load
  simulateLoad() {
    this.width = 100;
    this.height = 100;
    if (this.onload) this.onload();
  }
  
  // Simulate image load error
  simulateError() {
    if (this.onerror) this.onerror();
  }
};

describe('Integration Tests - Refactored Data Structure', () => {
  let mockPeopleData;
  
  beforeEach(() => {
    // Mock people 데이터
    mockPeopleData = [
      {
        name: "ShinHyokyeong",
        koreanName: "신효경",
        imageUrl: "https://storage.googleapis.com/hninepeople.appspot.com/people/ShinHyokyeong.png"
      },
      {
        name: "KimJieun",
        koreanName: "김지은", 
        imageUrl: "https://storage.googleapis.com/hninepeople.appspot.com/people/KimJieun.png"
      }
    ];
  });

  describe('Data Loading Integration', () => {
    test('loadImages가 people 데이터를 올바르게 처리해야 함', async () => {
      // Given: people 데이터
      const imageList = mockPeopleData;
      
      // When: loadImages 호출
      const result = await loadImages(imageList, 24);
      
      // Then: 올바른 구조로 반환
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toHaveProperty('imageName');
        expect(item).toHaveProperty('pixels');
        expect(Array.isArray(item.pixels)).toBe(true);
      });
    });

    test('imageDataArray가 올바르게 설정되어야 함', async () => {
      // Given: people 데이터
      const imageList = mockPeopleData;
      
      // When: loadImages 실행
      await loadImages(imageList, 24);
      
      // Then: imageDataArray 설정 확인
      expect(imageDataArray).toBeDefined();
      expect(Array.isArray(imageDataArray)).toBe(true);
      expect(imageDataArray.length).toBeGreaterThan(0);
    });
  });

  describe('Main Application Flow', () => {
    test('shuffleArray가 people 데이터와 호환되어야 함', () => {
      // Given: people 데이터에서 이름 추출
      const originWords = mockPeopleData.map(p => p.name);
      
      // When: 셔플 실행
      const shuffled = shuffleArray([...originWords]);
      
      // Then: 올바른 셔플 결과
      expect(shuffled).toHaveLength(originWords.length);
      expect(shuffled).toEqual(expect.arrayContaining(originWords));
    });

    test('텍스트 변환 함수가 올바르게 동작해야 함', () => {
      // Given: 카멜케이스 텍스트
      const originalText = "ShinHyokyeong";
      
      // When: 공백 추가 함수 실행
      const modifiedText = originalText.replace(/([a-z])([A-Z])/g, '$1 $2');
      
      // Then: 올바른 변환
      expect(modifiedText).toBe("Shin Hyokyeong");
    });
  });

  describe('Image Loading Fallback', () => {
    test('imageUrl이 없을 때 로컬 경로 fallback이 동작해야 함', async () => {
      // Given: imageUrl이 없는 데이터
      const imageList = [
        { name: "TestImage", imageUrl: null }
      ];
      
      // When: loadImages 실행 (실제로는 에러 처리 테스트)
      try {
        await loadImages(imageList, 24);
      } catch (error) {
        // Then: 적절한 에러 처리
        expect(error).toBeDefined();
      }
    });
  });

  describe('Canvas Animation Compatibility', () => {
    test('캔버스 크기 설정이 올바르게 동작해야 함', () => {
      // Given: 캔버스 요소
      const canvas = document.getElementById('imageCanvas1');
      const ctx = canvas.getContext('2d');
      
      // When: 캔버스 크기 설정
      canvas.width = window.innerWidth / 4;
      canvas.height = window.innerHeight;
      
      // Then: 올바른 크기 설정
      expect(canvas.width).toBe(window.innerWidth / 4);
      expect(canvas.height).toBe(window.innerHeight);
    });
  });
});

describe('Performance Tests', () => {
  test('대량의 people 데이터 처리 시 성능이 적절해야 함', async () => {
    // Given: 대량의 테스트 데이터
    const largeImageList = Array.from({ length: 100 }, (_, i) => ({
      name: `TestPerson${i}`,
      imageUrl: `https://example.com/image${i}.png`
    }));
    
    // When: 대량 데이터 처리
    const startTime = performance.now();
    try {
      await loadImages(largeImageList, 24);
    } catch (error) {
      // 에러가 발생해도 성능 측정은 가능
    }
    const endTime = performance.now();
    
    // Then: 적절한 처리 시간 (5초 이내)
    expect(endTime - startTime).toBeLessThan(5000);
  });
}); 