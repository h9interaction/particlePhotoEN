// 환경 변수 로드
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

// Firebase 조건부 로드
let firebase = null;
try {
  firebase = require('./firebase');
} catch (error) {
  console.log('Firebase 모듈을 로드할 수 없습니다. 로컬 파일 시스템을 사용합니다.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

// 미들웨어 설정
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.')); // 현재 디렉토리를 정적 파일 서버로 설정

// 파일 업로드 보안 설정
const allowedFileTypes = process.env.ALLOWED_FILE_TYPES ? 
  process.env.ALLOWED_FILE_TYPES.split(',') : 
  ['image/jpeg', 'image/png', 'image/gif'];

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 기본 10MB

// 파일 필터링 함수
const fileFilter = (req, file, cb) => {
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`지원하지 않는 파일 타입입니다. 허용된 타입: ${allowedFileTypes.join(', ')}`), false);
  }
};

// 이미지 업로드 설정
const storage = multer.diskStorage({
    destination: './images/',
    filename: (req, file, cb) => {
        // 임시 파일명으로 저장 (timestamp + 확장자)
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: maxFileSize
    }
});

const PEOPLE_PATH = './images/people.json';

// 현재 데이터 조회
app.get('/api/items', async (req, res) => {
    try {
        // words.js 파일 읽기
        const wordsContent = await fs.readFile('./words.js', 'utf8');

        // originWords 배열 추출
        const wordsMatch = wordsContent.match(/export const originWords\s*=\s*\[([\s\S]*?)\]/);
        const textsMatch = wordsContent.match(/export const originTexts\s*=\s*\[([\s\S]*?)\]/);

        let words = [];
        let texts = [];

        if (wordsMatch) {
            const wordsString = wordsMatch[1];
            words = parseArrayFromString(wordsString);
        }

        if (textsMatch) {
            const textsString = textsMatch[1];
            texts = parseArrayFromString(textsString);
        }

        // images.json 파일 읽기
        let images = [];
        try {
            const imagesContent = await fs.readFile('./images/images.json', 'utf8');
            images = JSON.parse(imagesContent);
        } catch (error) {
            console.warn('images.json 파일이 없습니다.');
        }

        res.json({ words, texts, images });
    } catch (error) {
        console.error('데이터 조회 실패:', error);
        res.status(500).json({ error: error.message });
    }
});

// 항목 추가 (이미지 업로드 + 파일 업데이트)
app.post('/api/items', upload.single('image'), async (req, res) => {
    try {
        const { koreanName, englishName } = req.body;
        console.log('req.file:', req.file);
        console.log('oldPath:', req.file.path);
        console.log('newPath:', path.join(req.file.destination, `${englishName}.png`));
        // 업로드된 파일의 경로
        const oldPath = req.file.path;
        const newPath = path.join(req.file.destination, `${englishName}.png`);
        // 파일명 변경
        await fs.rename(oldPath, newPath);

        // 1. words.js 업데이트
        await updateWordsJS(koreanName, englishName);

        // 2. images.json 업데이트
        await updateImagesJSON(englishName);

        // 3. index.html 업데이트
        await updateIndexHTML(englishName);

        res.json({
            success: true,
            message: '항목이 성공적으로 추가되었습니다.',
            filename: `${englishName}.png`
        });

    } catch (error) {
        console.error('항목 추가 실패:', error);
        res.status(500).json({ error: error.message });
    }
});

// 항목 삭제
app.delete('/api/items/:englishName', async (req, res) => {
    try {
        const { englishName } = req.params;

        // 1. 이미지 파일 삭제
        try {
            await fs.unlink(`./images/${englishName}.png`);
        } catch (error) {
            console.warn(`이미지 파일 삭제 실패: ${englishName}.png`);
        }

        // 2. 파일들에서 제거
        await removeFromFiles(englishName);

        res.json({
            success: true,
            message: '항목이 성공적으로 삭제되었습니다.'
        });

    } catch (error) {
        console.error('항목 삭제 실패:', error);
        res.status(500).json({ error: error.message });
    }
});

// 항목 편집 (이름/이미지 교체)
app.post('/api/items/:oldEnglishName/edit', upload.single('image'), async (req, res) => {
    try {
        const { oldEnglishName, oldKoreanName, newEnglishName, newKoreanName } = req.body;
        const oldImagePath = path.join('./images/', `${oldEnglishName}.png`);
        const newImagePath = path.join('./images/', `${newEnglishName}.png`);
        // 1. 이미지 교체(업로드 시)
        if (req.file) {
            // 새 이미지가 업로드된 경우: 무조건 newEnglishName.png로 저장
            await fs.writeFile(newImagePath, await fs.readFile(req.file.path));
            await fs.unlink(req.file.path);
            // oldEnglishName이 다르면 기존 파일 삭제
            if (oldEnglishName !== newEnglishName) {
                await fs.unlink(oldImagePath).catch(() => { });
            }
        } else if (oldEnglishName !== newEnglishName) {
            // 이미지 업로드 없이 이름만 바뀌면 파일명 변경
            await fs.rename(oldImagePath, newImagePath);
        }
        // 2. words.js, images.json, index.html 업데이트
        await updateWordsAndFilesOnEdit(oldEnglishName, oldKoreanName, newEnglishName, newKoreanName);
        res.json({ success: true, message: '항목이 성공적으로 수정되었습니다.' });
    } catch (error) {
        console.error('항목 편집 실패:', error);
        res.status(500).json({ error: error.message });
    }
});

// 편집 시 words.js, images.json, index.html 동기화 함수
async function updateWordsAndFilesOnEdit(oldEnglishName, oldKoreanName, newEnglishName, newKoreanName) {
    // words.js
    const content = await fs.readFile('./words.js', 'utf8');
    const wordsMatch = content.match(/(export const originWords\s*=\s*\[)([\s\S]*?)(\])/);
    const textsMatch = content.match(/(export const originTexts\s*=\s*\[)([\s\S]*?)(\])/);
    if (wordsMatch && textsMatch) {
        let wordsArray = parseArrayFromString(wordsMatch[2]);
        let textsArray = parseArrayFromString(textsMatch[2]);
        const idx = wordsArray.indexOf(oldEnglishName);
        if (idx !== -1) {
            wordsArray[idx] = newEnglishName;
            textsArray[idx] = newKoreanName;
        }
        const newWordsContent = wordsMatch[1] + wordsArray.map(word => `    "${word}"`).join(',\n') + wordsMatch[3];
        const newTextsContent = textsMatch[1] + textsArray.map(text => `    "${text}"`).join(',\n') + textsMatch[3];
        const newContent = content.replace(wordsMatch[0], newWordsContent).replace(textsMatch[0], newTextsContent);
        await fs.writeFile('./words.js', newContent, 'utf8');
    }
    // images.json
    let images = [];
    try {
        const imagesContent = await fs.readFile('./images/images.json', 'utf8');
        images = JSON.parse(imagesContent);
    } catch { }
    const imgIdx = images.indexOf(`${oldEnglishName}.png`);
    if (imgIdx !== -1) {
        images[imgIdx] = `${newEnglishName}.png`;
    }
    await fs.writeFile('./images/images.json', JSON.stringify(images, null, 4), 'utf8');
    // index.html
    const htmlContent = await fs.readFile('./index.html', 'utf8');
    const imageTagRegex = new RegExp(`<img src=\"images/${oldEnglishName}\.png\" alt=\"\">`, 'g');
    const newHtmlContent = htmlContent.replace(imageTagRegex, `<img src=\"images/${newEnglishName}.png\" alt=\"\">`);
    await fs.writeFile('./index.html', newHtmlContent, 'utf8');
}

// words.js 업데이트 함수
async function updateWordsJS(koreanName, englishName) {
    try {
        const content = await fs.readFile('./words.js', 'utf8');

        // originWords 배열에 추가
        const wordsMatch = content.match(/(export const originWords\s*=\s*\[)([\s\S]*?)(\])/);
        if (wordsMatch) {
            const newWordsContent = wordsMatch[1] +
                (wordsMatch[2].trim() ? wordsMatch[2] + ',\n    ' : '\n    ') +
                `"${englishName}"` +
                wordsMatch[3];

            // originTexts 배열에 추가
            const textsMatch = content.match(/(export const originTexts\s*=\s*\[)([\s\S]*?)(\])/);
            if (textsMatch) {
                const newTextsContent = textsMatch[1] +
                    (textsMatch[2].trim() ? textsMatch[2] + ',\n    ' : '\n    ') +
                    `"${koreanName}"` +
                    textsMatch[3];

                const newContent = content
                    .replace(wordsMatch[0], newWordsContent)
                    .replace(textsMatch[0], newTextsContent);

                await fs.writeFile('./words.js', newContent, 'utf8');
            }
        }
    } catch (error) {
        console.error('words.js 업데이트 실패:', error);
        throw error;
    }
}

// images.json 업데이트 함수
async function updateImagesJSON(englishName) {
    try {
        let images = [];
        try {
            const content = await fs.readFile('./images/images.json', 'utf8');
            images = JSON.parse(content);
        } catch (error) {
            console.warn('images.json 파일이 없어 새로 생성합니다.');
        }

        images.push(`${englishName}.png`);
        await fs.writeFile('./images/images.json', JSON.stringify(images, null, 4), 'utf8');
    } catch (error) {
        console.error('images.json 업데이트 실패:', error);
        throw error;
    }
}

// index.html 업데이트 함수
async function updateIndexHTML(englishName) {
    try {
        const content = await fs.readFile('./index.html', 'utf8');

        // 새로운 이미지 태그 추가
        const newImageTag = `    <img src="images/${englishName}.png" alt="">\n`;

        // </div> 태그 앞에 추가 (숨겨진 이미지 섹션)
        const insertPosition = content.lastIndexOf('  </div>');
        if (insertPosition !== -1) {
            const newContent = content.slice(0, insertPosition) + newImageTag + content.slice(insertPosition);
            await fs.writeFile('./index.html', newContent, 'utf8');
        }
    } catch (error) {
        console.error('index.html 업데이트 실패:', error);
        throw error;
    }
}

// 파일들에서 항목 제거 함수
async function removeFromFiles(englishName) {
    try {
        // 1. words.js에서 제거
        const wordsContent = await fs.readFile('./words.js', 'utf8');
        const wordsMatch = wordsContent.match(/(export const originWords\s*=\s*\[)([\s\S]*?)(\])/);
        const textsMatch = wordsContent.match(/(export const originTexts\s*=\s*\[)([\s\S]*?)(\])/);

        if (wordsMatch && textsMatch) {
            const wordsArray = parseArrayFromString(wordsMatch[2]);
            const textsArray = parseArrayFromString(textsMatch[2]);

            const wordIndex = wordsArray.indexOf(englishName);
            if (wordIndex !== -1) {
                wordsArray.splice(wordIndex, 1);
                textsArray.splice(wordIndex, 1);

                const newWordsContent = wordsMatch[1] +
                    wordsArray.map(word => `    "${word}"`).join(',\n') +
                    wordsMatch[3];
                const newTextsContent = textsMatch[1] +
                    textsArray.map(text => `    "${text}"`).join(',\n') +
                    textsMatch[3];

                const newContent = wordsContent
                    .replace(wordsMatch[0], newWordsContent)
                    .replace(textsMatch[0], newTextsContent);

                await fs.writeFile('./words.js', newContent, 'utf8');
            }
        }

        // 2. images.json에서 제거
        try {
            const imagesContent = await fs.readFile('./images/images.json', 'utf8');
            let images = JSON.parse(imagesContent);
            images = images.filter(img => img !== `${englishName}.png`);
            await fs.writeFile('./images/images.json', JSON.stringify(images, null, 4), 'utf8');
        } catch (error) {
            console.warn('images.json 파일이 없습니다.');
        }

        // 3. index.html에서 제거
        const htmlContent = await fs.readFile('./index.html', 'utf8');
        const imageTagRegex = new RegExp(`\\s*<img src="images/${englishName}\\.png" alt="">\\s*\\n?`, 'g');
        const newHtmlContent = htmlContent.replace(imageTagRegex, '');
        await fs.writeFile('./index.html', newHtmlContent, 'utf8');

    } catch (error) {
        console.error('파일에서 항목 제거 실패:', error);
        throw error;
    }
}

// 문자열 배열 파싱 함수
function parseArrayFromString(arrayString) {
    const matches = arrayString.match(/"([^"]*)"/g);
    if (matches) {
        return matches.map(match => match.slice(1, -1));
    }
    return [];
}

// Firestore에서 people 목록 조회
app.get('/api/people', async (req, res) => {
    try {
        console.log('GET /api/people 요청 받음');
        if (firebase && firebase.db) {
            const snapshot = await firebase.db.collection('people').get();
            const people = snapshot.docs.map(doc => doc.data());
            console.log(`${people.length}개의 people 데이터 반환`);
            res.json(people);
        } else {
            // 로컬 파일 시스템 사용 (Firebase 미설정 시)
            let people = [];
            try {
                const peopleContent = await fs.readFile('./images/people.json', 'utf8');
                people = JSON.parse(peopleContent);
            } catch (error) {
                console.log('people.json 파일이 없어 빈 배열 반환');
            }
            res.json(people);
        }
    } catch (error) {
        console.error('GET /api/people 에러:', error);
        res.status(500).json({ error: error.message });
    }
});

// Firestore 기반 동기화 함수
async function syncLegacyFilesFromFirestore() {
    if (!firebase || !firebase.db) {
        console.log('Firebase가 설정되지 않아 동기화를 건너뜁니다.');
        return;
    }
    
    try {
        // 1. Firestore에서 people 전체 목록 조회
        const snapshot = await firebase.db.collection('people').get();
        const people = snapshot.docs.map(doc => doc.data());

        // 2. words.js 생성
        const words = people.map(p => `    "${p.englishName}"`).join(',\n');
        const texts = people.map(p => `    "${p.koreanName}"`).join(',\n');
        const wordsJs = `export function shuffleArray(array) {\n    for (let i = array.length - 1; i > 0; i--) {\n        const j = Math.floor(Math.random() * (i + 1));\n        [array[i], array[j]] = [array[j], array[i]];\n    }\n    return array;\n}\nexport const originWords = [\n${words}\n];\n\nexport const originTexts = [\n${texts}\n];\n`;
        await fs.writeFile('./words.js', wordsJs, 'utf8');

        // 3. images.json 생성
        const images = people.map(p => p.imageFile || (p.englishName + '.png'));
        await fs.writeFile('./images/images.json', JSON.stringify(images, null, 4), 'utf8');

        // 4. index.html의 숨겨진 이미지 태그 영역 동기화
        let html = await fs.readFile('./index.html', 'utf8');
        html = html.replace(/(<div style="display: none;">)[\s\S]*?(<\/div>)/, (m, p1, p2) => {
            // imageUrl(Download URL) 우선 사용
            const tags = people.map(p => `    <img src="${p.imageUrl}" alt="">`).join('\n');
            return `${p1}\n${tags}\n${p2}`;
        });
        await fs.writeFile('./index.html', html, 'utf8');
    } catch (error) {
        console.error('Firestore 동기화 실패:', error);
    }
}

app.post('/api/people', upload.single('image'), async (req, res) => {
    try {
        const { koreanName, englishName, organization, role, position, email } = req.body;
        const file = req.file;
        let imageUrl = '';

        // Firebase가 설정된 경우에만 Firebase 사용
        if (firebase && firebase.db && firebase.bucket) {
            if (file) {
                // 1. Storage에 이미지 업로드
                const storageFile = firebase.bucket.file(`images/${englishName}.png`);
                await storageFile.save(file.buffer, {
                    metadata: { contentType: file.mimetype }
                });
                // 2. Download URL(공개 링크) 생성
                const [url] = await storageFile.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491' // 충분히 먼 미래
                });
                imageUrl = url;
            }

            // 3. Firestore에 데이터 저장
            await firebase.db.collection('people').doc(englishName).set({
                koreanName, englishName, organization, role, position, email, imageUrl
            });
            // 4. 파일 동기화
            await syncLegacyFilesFromFirestore();
        } else {
            // 로컬 파일 시스템 사용
            if (file) {
                const imagePath = path.join('./images/', `${englishName}.png`);
                await fs.writeFile(imagePath, file.buffer);
                imageUrl = `images/${englishName}.png`;
            }
            
            // people.json에 데이터 추가
            let people = [];
            try {
                const peopleContent = await fs.readFile('./images/people.json', 'utf8');
                people = JSON.parse(peopleContent);
            } catch (error) {
                console.log('people.json 파일이 없어 새로 생성합니다.');
            }
            
            people.push({
                koreanName, englishName, organization, role, position, email, 
                imageFile: `${englishName}.png`
            });
            
            await fs.writeFile('./images/people.json', JSON.stringify(people, null, 2), 'utf8');
        }

        res.json({ success: true, message: '추가되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/people/:englishName', upload.single('image'), async (req, res) => {
    try {
        const { englishName } = req.params;
        const { koreanName, newEnglishName, organization, role, position, email } = req.body;
        const file = req.file;

        // Firebase가 설정된 경우에만 Firebase 사용
        if (firebase && firebase.db && firebase.bucket) {
            // Firestore에서 기존 데이터 조회
            const doc = await firebase.db.collection('people').doc(englishName).get();
            if (!doc.exists) return res.status(404).json({ error: 'Not found' });
            const person = doc.data();

            let imageUrl = person.imageUrl;

            // 이미지 교체 시 기존 이미지 삭제 후 새 이미지 업로드
            if (file) {
                // 기존 이미지 삭제
                await firebase.bucket.file(`images/${englishName}.png`).delete().catch(() => { });
                // 새 이미지 업로드
                const newFileName = `images/${newEnglishName || englishName}.png`;
                await firebase.bucket.file(newFileName).save(file.buffer, {
                    metadata: { contentType: file.mimetype }
                });
                // Download URL 생성
                const [url] = await firebase.bucket.file(newFileName).getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                });
                imageUrl = url;
            } else if (newEnglishName && newEnglishName !== englishName) {
                // 이름만 바뀌면 파일명 변경
                await firebase.bucket.file(`images/${englishName}.png`).move(`images/${newEnglishName}.png`);
                // Download URL 생성
                const [url] = await firebase.bucket.file(`images/${newEnglishName}.png`).getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                });
                imageUrl = url;
            }

            // Firestore 데이터 수정
            await firebase.db.collection('people').doc(newEnglishName || englishName).set({
                koreanName,
                englishName: newEnglishName || englishName,
                organization,
                role,
                position,
                email,
                imageUrl
            });

            // 기존 문서 삭제(이름이 바뀐 경우)
            if (newEnglishName && newEnglishName !== englishName) {
                await firebase.db.collection('people').doc(englishName).delete();
            }

            // 4. 파일 동기화
            await syncLegacyFilesFromFirestore();
        } else {
            // 로컬 파일 시스템 사용
            let people = [];
            try {
                const peopleContent = await fs.readFile('./images/people.json', 'utf8');
                people = JSON.parse(peopleContent);
            } catch (error) {
                return res.status(404).json({ error: 'Not found' });
            }
            
            const personIndex = people.findIndex(p => p.englishName === englishName);
            if (personIndex === -1) return res.status(404).json({ error: 'Not found' });
            
            // 이미지 처리
            if (file) {
                const imagePath = path.join('./images/', `${newEnglishName || englishName}.png`);
                await fs.writeFile(imagePath, file.buffer);
                
                // 기존 이미지 삭제
                if (newEnglishName && newEnglishName !== englishName) {
                    try {
                        await fs.unlink(path.join('./images/', `${englishName}.png`));
                    } catch (error) {
                        console.warn('기존 이미지 삭제 실패:', error);
                    }
                }
            } else if (newEnglishName && newEnglishName !== englishName) {
                // 파일명 변경
                try {
                    await fs.rename(
                        path.join('./images/', `${englishName}.png`),
                        path.join('./images/', `${newEnglishName}.png`)
                    );
                } catch (error) {
                    console.warn('이미지 파일명 변경 실패:', error);
                }
            }
            
            // 데이터 업데이트
            people[personIndex] = {
                koreanName,
                englishName: newEnglishName || englishName,
                organization,
                role,
                position,
                email,
                imageFile: `${newEnglishName || englishName}.png`
            };
            
            // 이름이 바뀐 경우 기존 항목 삭제
            if (newEnglishName && newEnglishName !== englishName) {
                people.splice(personIndex, 1);
            }
            
            await fs.writeFile('./images/people.json', JSON.stringify(people, null, 2), 'utf8');
        }

        res.json({ success: true, message: '수정되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/people/:englishName', async (req, res) => {
    try {
        const { englishName } = req.params;
        
        // Firebase가 설정된 경우에만 Firebase 사용
        if (firebase && firebase.db && firebase.bucket) {
            // Firestore에서 데이터 조회
            const doc = await firebase.db.collection('people').doc(englishName).get();
            if (!doc.exists) return res.status(404).json({ error: 'Not found' });
            const person = doc.data();
            // Storage에서 이미지 삭제
            if (person.imageUrl) {
                const fileName = `images/${englishName}.png`;
                await firebase.bucket.file(fileName).delete().catch(() => { });
            }
            // Firestore에서 문서 삭제
            await firebase.db.collection('people').doc(englishName).delete();
            // 4. 파일 동기화
            await syncLegacyFilesFromFirestore();
        } else {
            // 로컬 파일 시스템 사용
            let people = [];
            try {
                const peopleContent = await fs.readFile('./images/people.json', 'utf8');
                people = JSON.parse(peopleContent);
            } catch (error) {
                return res.status(404).json({ error: 'Not found' });
            }
            
            const personIndex = people.findIndex(p => p.englishName === englishName);
            if (personIndex === -1) return res.status(404).json({ error: 'Not found' });
            
            // 이미지 파일 삭제
            try {
                await fs.unlink(path.join('./images/', `${englishName}.png`));
            } catch (error) {
                console.warn('이미지 파일 삭제 실패:', error);
            }
            
            // 데이터에서 제거
            people.splice(personIndex, 1);
            await fs.writeFile('./images/people.json', JSON.stringify(people, null, 2), 'utf8');
        }
        
        res.json({ success: true, message: '삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// people.json → words.js, images.json, index.html 동기화
async function syncLegacyFilesFromPeople() {
    const people = JSON.parse(await fs.readFile(PEOPLE_PATH, 'utf8'));
    // words.js
    const words = people.map(p => `    "${p.englishName}"`).join(',\n');
    const texts = people.map(p => `    "${p.koreanName}"`).join(',\n');
    const wordsJs = `export function shuffleArray(array) {\n    for (let i = array.length - 1; i > 0; i--) {\n        const j = Math.floor(Math.random() * (i + 1));\n        [array[i], array[j]] = [array[j], array[i]];\n    }\n    return array;\n}\nexport const originWords = [\n${words}\n];\n\nexport const originTexts = [\n${texts}\n];\n`;
    await fs.writeFile('./words.js', wordsJs, 'utf8');
    // images.json
    const images = people.map(p => p.imageFile);
    await fs.writeFile('./images/images.json', JSON.stringify(images, null, 4), 'utf8');
    // index.html (숨겨진 이미지 태그 영역만 동기화)
    let html = await fs.readFile('./index.html', 'utf8');
    html = html.replace(/(<div style="display: none;">)[\s\S]*?(<\/div>)/, (m, p1, p2) => {
        const tags = people.map(p => `    <img src="images/${p.imageFile}" alt="">`).join('\n');
        return `${p1}\n${tags}\n${p2}`;
    });
    await fs.writeFile('./index.html', html, 'utf8');
}

// people.json → Firestore/Storage 마이그레이션 함수
async function migratePeopleToFirebase() {
    if (!firebase || !firebase.db || !firebase.bucket) {
        console.log('Firebase가 설정되지 않아 마이그레이션을 건너뜁니다.');
        return;
    }
    
    try {
        const people = JSON.parse(await fs.readFile(PEOPLE_PATH, 'utf8'));
        for (const person of people) {
            // 1. 이미지 파일 Storage 업로드
            const localImagePath = path.join('./images/', person.imageFile);
            const storageFile = firebase.bucket.file(`images/${person.imageFile}`);
            await storageFile.save(await fs.readFile(localImagePath), {
                metadata: { contentType: 'image/png' }
            });
            // 2. public URL 생성
            const imageUrl = `https://storage.googleapis.com/${firebase.bucket.name}/images/${person.imageFile}`;
            // 3. Firestore에 저장
            await firebase.db.collection('people').doc(person.englishName).set({
                ...person,
                imageUrl
            });
            console.log(`마이그레이션 완료: ${person.englishName}`);
        }
    } catch (error) {
        console.error('마이그레이션 실패:', error);
        throw error;
    }
}

// people.json → Firebase 마이그레이션 API (관리자만 사용)
app.post('/api/migrate/people-to-firebase', async (req, res) => {
    try {
        await migratePeopleToFirebase();
        res.json({ success: true, message: '마이그레이션 완료' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 에러 핸들링 미들웨어
app.use((error, req, res, next) => {
  console.error('서버 에러:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      error: `파일 크기가 너무 큽니다. 최대 ${maxFileSize / (1024 * 1024)}MB까지 업로드 가능합니다.` 
    });
  }
  
  if (error.message.includes('지원하지 않는 파일 타입')) {
    return res.status(400).json({ 
      error: error.message 
    });
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? '서버 내부 오류가 발생했습니다.' : error.message 
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: '요청한 리소스를 찾을 수 없습니다.' });
});

// 서버 실행 (직접 실행할 때만 listen)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
        console.log(`📊 관리자 페이지: http://localhost:${PORT}/admin.html`);
        console.log(`🏠 메인 페이지: http://localhost:${PORT}/index.html`);
        console.log(`🔒 환경: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 CORS 허용 도메인: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`);
        console.log(`📁 파일 업로드 제한: ${maxFileSize / (1024 * 1024)}MB, 타입: ${allowedFileTypes.join(', ')}`);
    });
}

// 테스트용 app 객체 export
module.exports = app;

