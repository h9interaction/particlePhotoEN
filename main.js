import { initializePeopleData, shuffleArray } from './peopleDataLoader.js';
import { imageDataCache, initializeImageLoader, loadBatch, cleanupBatch } from './imageLoader.js';
import Particle from './Particle.js';

const canvasIds = ['imageCanvas1', 'imageCanvas2', 'imageCanvas3', 'imageCanvas4'];
const canvasContexts = {};
const particlePools = {};
let shuffledPeople = [];

// --- State Management ---
let nextPersonIndex = 0; 
const animationQueue = []; // The queue of canvasIds ready for the next animation

// --- Constants ---
const maxParticles = 3600;
const stepPixel = 26;
const TICK_INTERVAL = 4000; // The conductor's steady beat for starting animations
const EXPLOSION_START_DELAY = 2000;
const EXPLOSION_PARTICLE_DELAY = 4000;
const IMAGE_BATCH_SIZE = 4; 

// --- Initialization ---

window.onload = () => {
    canvasIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            canvasContexts[id] = canvas.getContext('2d', { 
                willReadFrequently: true,
                alpha: false,
                desynchronized: true
            });
        }
    });
    dataLoad();
};

async function dataLoad() {
    try {
        const peopleData = await initializePeopleData();
        if (!peopleData || !Array.isArray(peopleData) || peopleData.length === 0) {
            throw new Error('peopleData is empty');
        }
        shuffledPeople = shuffleArray([...peopleData]);
        console.log("People data shuffled. Initializing image loader...");

        await initializeImageLoader(shuffledPeople, stepPixel, IMAGE_BATCH_SIZE);

        canvasIds.forEach(id => {
            createParticles(id);
            animationQueue.push(id); // Prime the queue
        });

        startConductor();
    } catch (error) {
        console.error("Fatal error during initial data load:", error);
    }
}

function createParticles(canvasId) {
    particlePools[canvasId] = [];
    for (let i = 0; i < maxParticles; i++) {
        particlePools[canvasId].push(new Particle(0, 0, { r: 120, g: 120, b: 120 }, 0, 0, stepPixel));
    }
}

// --- Conductor (The new core logic) ---

function startConductor() {
    console.log("--- Conductor starting ---");
    // Start the first animation immediately.
    conductorTick();

    // Set the interval to start subsequent animations, creating the desired sequential start.
    setInterval(conductorTick, TICK_INTERVAL);
}

function conductorTick() {
    if (animationQueue.length === 0) {
        // console.log("Queue is empty, waiting for a canvas to finish.");
        return; // Nothing to do
    }

    const canvasId = animationQueue.shift(); // Get the next canvas from the front of the queue
    const personIndex = nextPersonIndex++;

    console.log(`Conductor tick: Starting ${canvasId} with person index ${personIndex}`);

    // --- Double Buffering Logic ---
    // This is the perfect place to manage the buffer, as it's tied to the assignment of a new index.
    const batchNumber = Math.floor(personIndex / IMAGE_BATCH_SIZE);
    if (personIndex % IMAGE_BATCH_SIZE === 0 && batchNumber > 0) {
        const batchToLoadIndex = (batchNumber + 1) * IMAGE_BATCH_SIZE;
        const batchToCleanupIndex = (batchNumber - 1) * IMAGE_BATCH_SIZE;

        console.log(`Triggering buffer update at person index ${personIndex}`);
        console.log(`  - Loading batch @ ${batchToLoadIndex}`);
        console.log(`  - Cleaning up batch @ ${batchToCleanupIndex}`);

        // Perform in the background
        cleanupBatch(batchToCleanupIndex, IMAGE_BATCH_SIZE);
        loadBatch(batchToLoadIndex, IMAGE_BATCH_SIZE).catch(console.error);
    }
    
    // Handle infinite looping of people data
    const loopedPersonIndex = personIndex % shuffledPeople.length;

    init(canvasId, loopedPersonIndex);
}

function onAnimationComplete(canvasId) {
    console.log(`${canvasId} finished. Returning to the back of the queue.`);
    animationQueue.push(canvasId); // Return the canvas to the end of the queue
}

// --- Animation Functions ---

const animationFrameIds = {};

function init(canvasId, personIndex) {
    const person = shuffledPeople[personIndex];
    const pixels = imageDataCache.get(personIndex);

    if (!pixels) {
        console.error(`Image data for index ${personIndex} not in cache! Will retry...`);
        // If data isn't ready, put the canvas back at the front of the queue to be picked up on the next tick.
        animationQueue.unshift(canvasId);
        nextPersonIndex--; // Decrement the counter since this attempt failed
        return;
    }

    const text = document.getElementById(canvasId + '_text');
    const canvas = document.getElementById(canvasId);
    const ctx = canvasContexts[canvasId];

    canvas.width = window.innerWidth / 4;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    cancelAnimation(canvasId);

    const originalText = person.englishName.replace(/([a-z])([A-Z])/g, '$1 $2');
    text.innerText = originalText.toUpperCase();
    text.classList.remove("hide");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let particles = activateParticles(particlePools[canvasId], pixels, canvas.width, canvas.height);

    function animate(timestamp) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allParticlesAtTarget = true;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.update(timestamp);
            p.draw(ctx);
            if (!p.isAtTarget()) allParticlesAtTarget = false;
        }

        if (!allParticlesAtTarget) {
            animationFrameIds[canvasId] = requestAnimationFrame(animate);
        } else {
            setTimeout(() => startExplosionAnimation(canvasId, particles, ctx), EXPLOSION_START_DELAY);
        }
    }
    animationFrameIds[canvasId] = requestAnimationFrame(animate);
}

function startExplosionAnimation(canvasId, particles, ctx) {
    document.getElementById(canvasId + '_text').classList.add('hide');

    for (let i = 0; i < particles.length; i++) {
        setTimeout(() => particles[i].explode(), Math.random() * EXPLOSION_PARTICLE_DELAY);
    }

    function explodeAnimation() {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        let allParticlesOutside = true;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.update(performance.now());
            if (p.pos.x > 0 && p.pos.x < ctx.canvas.width && p.pos.y > 0 && p.pos.y < ctx.canvas.height) {
                allParticlesOutside = false;
            }
            p.draw(ctx);
        }

        if (!allParticlesOutside) {
            animationFrameIds[canvasId] = requestAnimationFrame(explodeAnimation);
        } else {
            onAnimationComplete(canvasId);
        }
    }
    animationFrameIds[canvasId] = requestAnimationFrame(explodeAnimation);
}

function activateParticles(pool, imageData, canvasWidth, canvasHeight) {
    let activeParticles = [];
    const numParticles = Math.min(imageData.length, pool.length);
    for (let i = 0; i < numParticles; i++) {
        let particle = pool[i];
        const pixel = imageData[i];
        particle.reset(pixel.x, pixel.y, pixel.color, canvasWidth, canvasHeight, stepPixel);
        activeParticles.push(particle);
    }
    return activeParticles;
}

function cancelAnimation(canvasId) {
    if (animationFrameIds[canvasId]) {
        cancelAnimationFrame(animationFrameIds[canvasId]);
        animationFrameIds[canvasId] = null;
    }
}
