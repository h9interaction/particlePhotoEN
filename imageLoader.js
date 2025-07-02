import { loadPeopleData } from './peopleDataLoader.js';

export let imageDataArray = [];  // 2D 어레이로 각 이미지의 픽셀 데이터를 저장

// 이미지 로딩 후 처리
// imageList: [{ name: 'HongGildong', imageUrl: 'https://...' }, ...]
export async function loadImages(imageList, stepPixel = 20) {
    // imageList가 문자열 배열인 경우 (기존 호환성), people 데이터로 변환
    let processedImageList = imageList;
    
    if (imageList.length > 0 && typeof imageList[0] === 'string') {
        console.log('문자열 배열 감지, people 데이터로 변환 중...');
        try {
            const peopleData = await loadPeopleData();
            processedImageList = imageList.map(name => {
                const person = peopleData.find(p => p.englishName === name);
                return person || { englishName: name, imageUrl: null };
            });
        } catch (error) {
            console.warn('People 데이터 로드 실패, 기존 방식 사용:', error);
            // 기존 방식으로 fallback
            processedImageList = imageList.map(name => ({ englishName: name, imageUrl: null }));
        }
    }
    
    const promises = processedImageList.map(item => loadImage(item.englishName + '.png', item.imageUrl, stepPixel));

    // 모든 이미지가 로드되면, 이미지 데이터를 저장
    try {
        const results = await Promise.allSettled(promises);
        // 성공한 이미지만 필터링
        imageDataArray = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
        
        console.log(`총 ${imageList.length}개 중 ${imageDataArray.length}개 이미지 로딩 성공`);
        
        if (imageDataArray.length === 0) {
            throw new Error('로딩된 이미지가 없습니다.');
        }
    } catch (err) {
        console.error("Error loading images:", err);
        throw err;
    }
}

// imageName: 파일명, imageUrl: Download URL(있으면 우선 사용)
function loadImage(imageName, imageUrl, stepPixel) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        // imageUrl이 있으면 우선 사용, 없으면 로컬 images 폴더 fallback
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.getElementById("imageCanvas1");
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = window.innerWidth / 4;  // 화면의 1/4 크기로 설정
            canvas.height = window.innerHeight;
            canvas.style.display = 'none';

            // 이미지 비율에 맞게 캔버스 크기 조정
            const imgAspectRatio = img.width / img.height;
            const canvasAspectRatio = canvas.width / canvas.height;

            let drawWidth, drawHeight;
            let offsetX = 0, offsetY = 0;

            // 이미지가 캔버스에 가득 차도록 크롭
            if (imgAspectRatio > canvasAspectRatio) {
                // 이미지의 가로가 상대적으로 더 길면, 세로를 기준으로 크롭
                drawHeight = canvas.height;
                drawWidth = drawHeight * imgAspectRatio;
                offsetX = (canvas.width - drawWidth) / 2;  // 좌우 크롭
            } else {
                // 이미지의 세로가 상대적으로 더 길면, 가로를 기준으로 크롭
                drawWidth = canvas.width;
                drawHeight = drawWidth / imgAspectRatio;
                offsetY = (canvas.height - drawHeight) / 2;  // 상하 크롭
            }

            // 크롭된 이미지를 캔버스에 그리기
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const pixelData = [];

            for (let y = 0; y < drawHeight; y += stepPixel) {
                for (let x = 0; x < drawWidth; x += stepPixel) {
                    const idx = Math.floor(((y + offsetY) * canvas.width + (x + offsetX)) * 4);
                    if (x + offsetX >= 0 && y + offsetY >= 0 && x + offsetX < canvas.width && y + offsetY < canvas.height) {
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];

                        // 반전된 색상 계산
                        const invertedR = 255 - r;
                        const invertedG = 255 - g;
                        const invertedB = 255 - b;

                        pixelData.push({
                            x: Math.floor(x + offsetX),  // 실제 캔버스에서의 x 위치
                            y: Math.floor(y + offsetY),  // 실제 캔버스에서의 y 위치
                            color: { r: invertedR, g: invertedG, b: invertedB }
                        });
                    }
                }
            }

            resolve({ imageName: imageName, pixels: pixelData });
        };

        img.onerror = () => {
            // 만약 imageUrl이 없거나 실패했으면, fallback 시도
            if (imageUrl) {
                // imageUrl 실패 시 로컬 images 폴더 fallback
                img.src = `images/${imageName}`;
                img.onload = () => {
                    // (위와 동일한 onload 처리)
                    const canvas = document.getElementById("imageCanvas1");
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    canvas.width = window.innerWidth / 4;
                    canvas.height = window.innerHeight;
                    canvas.style.display = 'none';
                    const imgAspectRatio = img.width / img.height;
                    const canvasAspectRatio = canvas.width / canvas.height;
                    let drawWidth, drawHeight;
                    let offsetX = 0, offsetY = 0;
                    if (imgAspectRatio > canvasAspectRatio) {
                        drawHeight = canvas.height;
                        drawWidth = drawHeight * imgAspectRatio;
                        offsetX = (canvas.width - drawWidth) / 2;
                    } else {
                        drawWidth = canvas.width;
                        drawHeight = drawWidth / imgAspectRatio;
                        offsetY = (canvas.height - drawHeight) / 2;
                    }
                    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    const pixelData = [];
                    for (let y = 0; y < drawHeight; y += stepPixel) {
                        for (let x = 0; x < drawWidth; x += stepPixel) {
                            const idx = Math.floor(((y + offsetY) * canvas.width + (x + offsetX)) * 4);
                            if (x + offsetX >= 0 && y + offsetY >= 0 && x + offsetX < canvas.width && y + offsetY < canvas.height) {
                                const r = data[idx];
                                const g = data[idx + 1];
                                const b = data[idx + 2];
                                const invertedR = 255 - r;
                                const invertedG = 255 - g;
                                const invertedB = 255 - b;
                                pixelData.push({
                                    x: Math.floor(x + offsetX),
                                    y: Math.floor(y + offsetY),
                                    color: { r: invertedR, g: invertedG, b: invertedB }
                                });
                            }
                        }
                    }
                    resolve({ imageName: imageName, pixels: pixelData });
                };
                img.onerror = () => reject(new Error('이미지 로드 실패'));
            } else {
                reject(new Error('이미지 로드 실패'));
            }
        };
    });
}
