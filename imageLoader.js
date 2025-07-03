
// Use a Map for more flexible caching. Key is the person's absolute index.
export const imageDataCache = new Map();
let _shuffledPeople = [];
let _stepPixel = 20;

/**
 * Helper function to process a loaded image into pixel data.
 */
function processImageToPixelData(img, stepPixel) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = window.innerWidth / 4;
    canvas.height = window.innerHeight;

    const imgAspectRatio = img.width / img.height;
    const canvasAspectRatio = canvas.width / canvas.height;

    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

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

    for (let y = 0; y < canvas.height; y += stepPixel) {
        for (let x = 0; x < canvas.width; x += stepPixel) {
            const idx = (y * canvas.width + x) * 4;
            const a = data[idx + 3];

            if (a > 128) { // Only consider non-transparent pixels
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const invertedR = 255 - r;
                const invertedG = 255 - g;
                const invertedB = 255 - b;
                pixelData.push({
                    x: x,
                    y: y,
                    color: { r: invertedR, g: invertedG, b: invertedB }
                });
            }
        }
    }
    return pixelData;
}

/**
 * Loads a single image and returns its pixel data along with its original index.
 */
function loadImage(person, index, stepPixel) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = person.imageUrl;

        img.onload = () => {
            const pixels = processImageToPixelData(img, stepPixel);
            resolve({ index, pixels });
        };

        img.onerror = () => {
            console.warn(`Failed to load from URL: ${person.imageUrl}. Falling back to local path.`);
            img.src = `images/${person.englishName}.png`;
            img.onload = () => {
                const pixels = processImageToPixelData(img, stepPixel);
                resolve({ index, pixels });
            };
            img.onerror = () => {
                console.error(`Failed to load image for ${person.englishName} from all sources.`);
                reject(new Error(`Failed to load image for ${person.englishName}`));
            };
        };
    });
}

/**
 * Loads a specific batch of images and adds them to the cache.
 * @param {number} startIndex The starting index in the shuffledPeople array.
 * @param {number} batchSize The number of images to load.
 */
export async function loadBatch(startIndex, batchSize) {
    const batchList = _shuffledPeople.slice(startIndex, startIndex + batchSize);
    if (batchList.length === 0) return;

    console.log(`Requesting to load batch from index ${startIndex}...`);
    const promises = batchList.map((person, i) => {
        const personIndex = startIndex + i;
        // Only load if not already in cache
        if (!imageDataCache.has(personIndex)) {
            return loadImage(person, personIndex, _stepPixel);
        }
        return Promise.resolve(null); // Return a resolved promise for already cached items
    });

    const results = await Promise.allSettled(promises);
    let successCount = 0;
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            imageDataCache.set(result.value.index, result.value.pixels);
            successCount++;
        }
    });
    if (successCount > 0) {
        console.log(`Successfully loaded and cached ${successCount} new images from batch starting at ${startIndex}.`);
    }
}

/**
 * Removes a specific batch of images from the cache to free up memory.
 * @param {number} startIndex The starting index of the batch to remove.
 * @param {number} batchSize The number of images to remove.
 */
export function cleanupBatch(startIndex, batchSize) {
    console.log(`Cleaning up image batch from index ${startIndex} to ${startIndex + batchSize - 1}.`);
    for (let i = 0; i < batchSize; i++) {
        imageDataCache.delete(startIndex + i);
    }
}

/**
 * Initializes the image loader with data and pre-loads the first two batches.
 * @param {Array} people The shuffled list of people data.
 * @param {number} stepPixel The stepping interval for pixel sampling.
 * @param {number} batchSize The size of one batch.
 */
export async function initializeImageLoader(people, stepPixel, batchSize) {
    _shuffledPeople = people;
    _stepPixel = stepPixel;
    console.log("Loading initial image batches (for indices 0 and 1)...");
    // Load batch 0 and 1 in parallel to have a buffer
    await Promise.all([
        loadBatch(0, batchSize),
        loadBatch(batchSize, batchSize)
    ]);
    console.log("Initial image batches are loaded and cached.");
}
