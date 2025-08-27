/**
 * peopleDataLoader.js
 * Firestore people 컬렉션에서 데이터를 로드하고 관리하는 모듈
 */

// 캐시 변수
let cachedPeopleData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

/**
 * Firestore에서 people 데이터를 로드합니다.
 * @returns {Promise<Array>} people 데이터 배열
 */
export async function loadPeopleData() {
    // 캐시가 유효하면 캐시된 데이터 반환
    if (cachedPeopleData && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
        console.log('캐시된 people 데이터 사용');
        return cachedPeopleData;
    }

    try {
        console.log('Firestore에서 people 데이터 로드 중...');
        
        // 서버 API를 통해 people 데이터 조회
        const response = await fetch('/api/people');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const peopleData = await response.json();
        
        // 데이터 구조 검증
        const validatedData = validatePeopleData(peopleData);
        
        // 캐시 업데이트
        cachedPeopleData = validatedData;
        cacheTimestamp = Date.now();
        
        console.log(`${validatedData.length}개의 people 데이터 로드 완료`);
        return validatedData;
        
    } catch (error) {
        console.error('People 데이터 로드 실패:', error);
        
        // 캐시된 데이터가 있으면 fallback으로 사용
        if (cachedPeopleData) {
            console.log('캐시된 데이터를 fallback으로 사용');
            return cachedPeopleData;
        }
        
        throw new Error('People 데이터를 로드할 수 없습니다.');
    }
}

/**
 * people 데이터 구조를 검증합니다.
 * @param {Array} data - 검증할 데이터
 * @returns {Array} 검증된 데이터
 */
function validatePeopleData(data) {
    if (!Array.isArray(data)) {
        throw new Error('People 데이터는 배열이어야 합니다.');
    }
    
            return data.filter(person => {
            // 필수 필드 검증 (서버에서는 englishName 사용)
            const hasRequiredFields = person.englishName && person.koreanName && person.imageUrl;
            
            if (!hasRequiredFields) {
                console.warn('필수 필드가 누락된 데이터:', person);
                return false;
            }
            
            // 데이터 타입 검증
            const hasValidTypes = typeof person.englishName === 'string' && 
                                 typeof person.koreanName === 'string' && 
                                 typeof person.imageUrl === 'string';
            
            if (!hasValidTypes) {
                console.warn('잘못된 데이터 타입:', person);
                return false;
            }
            
            return true;
        });
}

/**
 * 캐시를 강제로 무효화합니다.
 */
export function invalidateCache() {
    cachedPeopleData = null;
    cacheTimestamp = null;
    console.log('People 데이터 캐시 무효화됨');
}

/**
 * 기존 words.js 호환성을 위한 데이터 변환 함수들
 */
export function getOriginWords(peopleData) {
    return peopleData.map(person => person.englishName);
}

export function getOriginTexts(peopleData) {
    return peopleData.map(person => person.koreanName);
}

/**
 * 특정 이름으로 people 데이터를 찾습니다.
 * @param {string} name - 찾을 이름
 * @returns {Object|null} 찾은 데이터 또는 null
 */
export function findPersonByName(name, peopleData) {
    return peopleData.find(person => person.englishName === name) || null;
}

/**
 * 이미지 URL이 유효한지 확인합니다.
 * @param {string} imageUrl - 확인할 이미지 URL
 * @returns {Promise<boolean>} 유효성 여부
 */
export function validateImageUrl(imageUrl) {
    return new Promise((resolve) => {
        if (!imageUrl) {
            resolve(false);
            return;
        }
        
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = imageUrl;
    });
} 

/**
 * people 데이터를 로드해서 반환하는 initializePeopleData 함수 (words.js 대체)
 * @returns {Promise<Array>} people 데이터 배열
 */
export async function initializePeopleData() {
    return await loadPeopleData();
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

