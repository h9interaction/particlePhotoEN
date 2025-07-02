/**
 * peopleDataLoader.test.js
 * Firestore people 데이터 로딩 및 처리 테스트
 */

// Mock Firebase Admin SDK
const mockFirestore = {
  collection: jest.fn(() => ({
    get: jest.fn()
  }))
};

// Mock people 데이터
const mockPeopleData = [
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

describe('PeopleDataLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadPeopleData', () => {
    test('Firestore에서 people 데이터를 성공적으로 로드해야 함', async () => {
      // Given: Firestore에서 데이터 반환
      mockFirestore.collection().get.mockResolvedValue({
        docs: mockPeopleData.map(doc => ({
          data: () => doc,
          id: doc.name
        }))
      });

      // When: 데이터 로드 실행
      const result = await loadPeopleData();

      // Then: 올바른 구조로 반환되어야 함
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('name', 'ShinHyokyeong');
      expect(result[0]).toHaveProperty('koreanName', '신효경');
      expect(result[0]).toHaveProperty('imageUrl');
    });

    test('Firestore 연결 실패 시 적절한 에러를 던져야 함', async () => {
      // Given: Firestore 에러
      mockFirestore.collection().get.mockRejectedValue(new Error('Firestore connection failed'));

      // When & Then: 에러 처리 확인
      await expect(loadPeopleData()).rejects.toThrow('Firestore connection failed');
    });

    test('빈 데이터셋에 대해 빈 배열을 반환해야 함', async () => {
      // Given: 빈 데이터
      mockFirestore.collection().get.mockResolvedValue({
        docs: []
      });

      // When: 데이터 로드 실행
      const result = await loadPeopleData();

      // Then: 빈 배열 반환
      expect(result).toEqual([]);
    });
  });

  describe('Data Structure Validation', () => {
    test('모든 필수 필드가 포함되어야 함', async () => {
      // Given: 완전한 데이터
      mockFirestore.collection().get.mockResolvedValue({
        docs: mockPeopleData.map(doc => ({
          data: () => doc,
          id: doc.name
        }))
      });

      // When: 데이터 로드
      const result = await loadPeopleData();

      // Then: 필수 필드 검증
      result.forEach(person => {
        expect(person).toHaveProperty('name');
        expect(person).toHaveProperty('koreanName');
        expect(person).toHaveProperty('imageUrl');
        expect(typeof person.name).toBe('string');
        expect(typeof person.koreanName).toBe('string');
        expect(typeof person.imageUrl).toBe('string');
      });
    });
  });

  describe('Caching Mechanism', () => {
    test('캐시된 데이터가 있으면 Firestore 호출하지 않아야 함', async () => {
      // Given: 첫 번째 호출 성공
      mockFirestore.collection().get.mockResolvedValue({
        docs: mockPeopleData.map(doc => ({
          data: () => doc,
          id: doc.name
        }))
      });

      // When: 첫 번째 호출
      const result1 = await loadPeopleData();
      
      // Then: 두 번째 호출 시 캐시 사용
      const result2 = await loadPeopleData();
      
      expect(result1).toEqual(result2);
      expect(mockFirestore.collection().get).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Integration with Existing Code', () => {
  test('originWords와 originTexts가 올바르게 생성되어야 함', async () => {
    // Given: people 데이터
    const peopleData = [
      { name: "Test1", koreanName: "테스트1" },
      { name: "Test2", koreanName: "테스트2" }
    ];

    // When: 데이터 변환
    const originWords = peopleData.map(p => p.name);
    const originTexts = peopleData.map(p => p.koreanName);

    // Then: 올바른 배열 생성
    expect(originWords).toEqual(["Test1", "Test2"]);
    expect(originTexts).toEqual(["테스트1", "테스트2"]);
  });
}); 