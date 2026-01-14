/**
 * Main entry point for the GLB animation comparison interface
 */

import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import { GLTFLoaderAnimationStartMode } from "babylonjs-loaders";

import { createComparisonScene } from "./comparisonSceneController.js";
import ComparisonCharacterController from "./ComparisonCharacterController.js";
import { fetchComparisonPairs } from "./comparisonPairsAPI.js";

// Base URLs for animation files
const BASE_URL_DEFAULT = 'https://signcollect.nl/gebarenoverleg_media/fbx/';
const BASE_URL_PP = 'https://signcollect.nl/gebarenoverleg_media/fbx/post_processed/';

/**
 * Parse URL parameters
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        file: params.get('file')
    };
}

// Disable automatic animation playback
BABYLON.SceneLoader.OnPluginActivatedObservable.add(function (loader) {
    if (loader.name === "gltf") {
        loader.animationStartMode = GLTFLoaderAnimationStartMode.NONE;
    }
});

(async function () {
    console.log("Initializing comparison interface...");

    // Create scene
    const { engine, scene } = await createComparisonScene();

    // Initialize character controller with three characters
    const charController = new ComparisonCharacterController(scene);
    await charController.init();

    // Fetch comparison pairs from API
    const pairs = await fetchComparisonPairs();
    console.log(`Fetched ${pairs.length} comparison pairs`);

    // State
    let currentPair = null;
    let isLooping = true;  // Loop enabled by default
    let filteredPairs = [...pairs];

    // UI Elements
    const pairsList = document.getElementById('pairsList');
    const searchInput = document.getElementById('searchInput');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const playBtn = document.getElementById('playBtn');
    const loopBtn = document.getElementById('loopBtn');
    const resetBtn = document.getElementById('resetBtn');
    const videoToggleBtn = document.getElementById('videoToggleBtn');
    const videoPanel = document.getElementById('videoPanel');
    const videoClose = document.getElementById('videoClose');
    const sourceVideo = document.getElementById('sourceVideo');
    const videoNoSource = document.getElementById('videoNoSource');
    const timelineSlider = document.getElementById('timelineSlider');
    const frameDisplay = document.getElementById('frameDisplay');
    const resetViewBtn = document.getElementById('resetViewBtn');

    // Get camera from scene
    const camera = scene.activeCamera;

    // Video state
    let videoEnabled = true;  // Video enabled by default

    // Timeline state
    let isScrubbing = false;
    let maxFrames = 0;

    // Camera zoom state
    let zoomedCharacter = null;  // Which character is currently zoomed (0, 1, 2, or null)
    const DEFAULT_CAMERA_TARGET = new BABYLON.Vector3(0, 1.2, 0);
    const DEFAULT_CAMERA_RADIUS = 5;
    const ZOOMED_CAMERA_RADIUS = 3;

    /**
     * Render the pairs list
     */
    function renderList(filter = '') {
        pairsList.innerHTML = '';

        const filterLower = filter.toLowerCase();
        filteredPairs = pairs.filter(p => p.name.toLowerCase().includes(filterLower));

        if (filteredPairs.length === 0) {
            pairsList.innerHTML = '<div class="no-results">No matching animations found</div>';
            return;
        }

        filteredPairs.forEach(pair => {
            const item = document.createElement('div');
            item.className = 'pair-item' + (currentPair?.name === pair.name ? ' active' : '');

            item.innerHTML = `<div class="name">${pair.name}</div>`;
            item.addEventListener('click', () => loadPair(pair));

            pairsList.appendChild(item);
        });
    }

    /**
     * Load a comparison pair
     */
    async function loadPair(pair) {
        console.log(`Loading pair: ${pair.name}`);
        showLoading(true);

        currentPair = pair;

        try {
            // Reset characters first
            charController.resetBoth();

            // Load animations for retargeted characters
            const loadPromises = [
                charController.loadAnimationForCharacter(pair.ppFile, 1, 'pp'),
                charController.loadAnimationForCharacter(pair.defaultFile, 2, 'original')
            ];

            // Add presAnim if available (loaded as plain GLB, not retargeted)
            if (pair.presAnimFile) {
                loadPromises.push(
                    charController.loadPresAnimGLB(pair.presAnimFile)
                );
            }

            await Promise.all(loadPromises);

            // Load video if available
            loadVideo(pair);

            // Update timeline with new animation info
            updateTimelineRange();

            // Auto-play both animations and video
            playAll();

            // Update UI
            renderList(searchInput.value);
            updatePlayButton();

        } catch (error) {
            console.error('Error loading pair:', error);
            alert('Failed to load animations. Check console for details.');
        }

        showLoading(false);
    }

    /**
     * Load video for the current pair
     */
    function loadVideo(pair) {
        if (pair.videoFile) {
            sourceVideo.src = pair.videoFile;
            sourceVideo.style.display = 'block';
            videoNoSource.style.display = 'none';
            sourceVideo.load();
            console.log(`Loaded video: ${pair.videoFile}`);
        } else {
            sourceVideo.src = '';
            sourceVideo.style.display = 'none';
            videoNoSource.style.display = 'block';
            console.log('No video available for this animation');
        }
    }

    /**
     * Play all (animations + video synced)
     */
    function playAll() {
        charController.playBoth(isLooping);

        if (videoEnabled && currentPair?.videoFile) {
            sourceVideo.currentTime = 0;
            sourceVideo.loop = isLooping;
            sourceVideo.play().catch(e => console.log('Video play failed:', e));
        }
    }

    /**
     * Stop all (animations + video)
     */
    function stopAll() {
        charController.stopBoth();
        sourceVideo.pause();
    }

    /**
     * Reset all (animations + video)
     */
    function resetAll() {
        charController.resetBoth();
        sourceVideo.pause();
        sourceVideo.currentTime = 0;
    }

    /**
     * Show/hide loading overlay
     */
    function showLoading(show) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Update play button state
     */
    function updatePlayButton() {
        if (charController.isPlaying()) {
            playBtn.textContent = 'Pause';
        } else {
            playBtn.textContent = 'Play';
        }
    }

    // Event Listeners

    // Search input
    searchInput.addEventListener('input', (e) => {
        renderList(e.target.value);
    });

    // Play/Pause button
    playBtn.addEventListener('click', () => {
        if (charController.isPlaying()) {
            stopAll();
        } else {
            playAll();
        }
        updatePlayButton();
    });

    // Loop toggle button
    loopBtn.addEventListener('click', () => {
        isLooping = !isLooping;
        loopBtn.textContent = `Loop: ${isLooping ? 'On' : 'Off'}`;
        loopBtn.classList.toggle('active', isLooping);
        charController.setLooping(isLooping);
        sourceVideo.loop = isLooping;
    });

    // Reset button
    resetBtn.addEventListener('click', () => {
        resetAll();
        updatePlayButton();
    });

    // Video toggle button
    videoToggleBtn.addEventListener('click', () => {
        videoEnabled = !videoEnabled;
        videoToggleBtn.textContent = `Video: ${videoEnabled ? 'On' : 'Off'}`;
        videoToggleBtn.classList.toggle('active', videoEnabled);
        videoPanel.classList.toggle('hidden', !videoEnabled);

        if (!videoEnabled) {
            sourceVideo.pause();
        }
    });

    // Video close button
    videoClose.addEventListener('click', () => {
        videoEnabled = false;
        videoToggleBtn.textContent = 'Video: Off';
        videoToggleBtn.classList.remove('active');
        videoPanel.classList.add('hidden');
        sourceVideo.pause();
    });

    // ==================== TIMELINE FUNCTIONALITY ====================

    /**
     * Update timeline range after loading animation
     */
    function updateTimelineRange() {
        const info = charController.getAnimationInfo();
        maxFrames = info.maxFrames;
        timelineSlider.max = 1000;  // Use 1000 steps for smooth scrubbing
        timelineSlider.value = 0;
        updateFrameDisplay(0);
    }

    /**
     * Update frame display text
     */
    function updateFrameDisplay(frame) {
        frameDisplay.textContent = `${Math.round(frame)} / ${Math.round(maxFrames)}`;
    }

    // Timeline slider input (while dragging)
    timelineSlider.addEventListener('input', (e) => {
        isScrubbing = true;
        const normalizedPosition = e.target.value / 1000;

        // Pause playback while scrubbing
        if (charController.isPlaying()) {
            stopAll();
            updatePlayButton();
        }

        // Seek animations
        charController.seekToPosition(normalizedPosition);

        // Update frame display
        updateFrameDisplay(normalizedPosition * maxFrames);

        // Sync video if available
        if (sourceVideo.src && sourceVideo.duration) {
            sourceVideo.currentTime = normalizedPosition * sourceVideo.duration;
        }
    });

    // Timeline slider change (after releasing)
    timelineSlider.addEventListener('change', () => {
        isScrubbing = false;
    });

    // ==================== CLICK-TO-ZOOM FUNCTIONALITY ====================

    /**
     * Zoom camera to focus on a specific character
     */
    function zoomToCharacter(charIndex) {
        const targetX = charController.getCharacterPosition(charIndex);
        const newTarget = new BABYLON.Vector3(targetX, 1.2, 0);

        // Animate camera target
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraTargetX",
            camera,
            "target.x",
            30,  // fps
            15,  // total frames (0.5 second)
            camera.target.x,
            targetX,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        // Animate camera radius (zoom in)
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraRadius",
            camera,
            "radius",
            30,
            15,
            camera.radius,
            ZOOMED_CAMERA_RADIUS,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        zoomedCharacter = charIndex;
        resetViewBtn.classList.add('active');
    }

    /**
     * Reset camera to default view (all characters visible)
     */
    function resetCameraView() {
        // Animate camera target back to center
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraTargetX",
            camera,
            "target.x",
            30,
            15,
            camera.target.x,
            DEFAULT_CAMERA_TARGET.x,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        // Animate camera radius (zoom out)
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraRadius",
            camera,
            "radius",
            30,
            15,
            camera.radius,
            DEFAULT_CAMERA_RADIUS,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        zoomedCharacter = null;
        resetViewBtn.classList.remove('active');
    }

    // Click handler for character selection
    scene.onPointerDown = (evt, pickResult) => {
        // Only handle left clicks
        if (evt.button !== 0) return;

        if (pickResult.hit) {
            const charIndex = charController.getCharacterFromMesh(pickResult.pickedMesh);
            if (charIndex !== null) {
                // Only zoom if clicking a different character
                if (zoomedCharacter !== charIndex) {
                    zoomToCharacter(charIndex);
                }
                // If clicking same character, do nothing (allow camera rotation)
            }
        }
    };

    // Reset View button
    resetViewBtn.addEventListener('click', () => {
        resetCameraView();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Space to play/pause
        if (e.code === 'Space' && document.activeElement !== searchInput) {
            e.preventDefault();
            playBtn.click();
        }
        // R to reset
        if (e.code === 'KeyR' && document.activeElement !== searchInput) {
            e.preventDefault();
            resetBtn.click();
        }
        // L to toggle loop
        if (e.code === 'KeyL' && document.activeElement !== searchInput) {
            e.preventDefault();
            loopBtn.click();
        }
        // Escape to clear search
        if (e.code === 'Escape') {
            searchInput.value = '';
            renderList('');
            searchInput.blur();
        }
        // / to focus search
        if (e.code === 'Slash' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        // V to toggle video
        if (e.code === 'KeyV' && document.activeElement !== searchInput) {
            e.preventDefault();
            videoToggleBtn.click();
        }
    });

    /**
     * Fetch video file URL for a given base name
     */
    async function fetchVideoFile(baseName) {
        try {
            const response = await fetch(`https://signcollect.nl/animDB/getVideoFile.php?name=${encodeURIComponent(baseName)}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.success ? data.videoFile : null;
        } catch (error) {
            console.warn('Failed to fetch video file:', error);
            return null;
        }
    }

    /**
     * Load animation from URL parameters
     * Transforms: CHILI_250228_1.fbx ->
     *   default: .../fbx/CHILI_250228_1.glb
     *   pp: .../fbx/post_processed/CHILI_250228_1.glb
     */
    async function loadFromUrlParams() {
        const { file } = getUrlParams();
        if (!file) return false;

        // Transform filename: CHILI_250228_1.fbx or .glb -> .glb for both
        const baseName = file.replace(/\.(fbx|glb)$/i, '');

        // Fetch video file URL
        const videoFile = await fetchVideoFile(baseName);

        const pair = {
            name: baseName,
            ppFile: BASE_URL_PP + baseName + '.glb',
            defaultFile: BASE_URL_DEFAULT + baseName + '.glb',
            presAnimFile: null,
            videoFile: videoFile
        };

        await loadPair(pair);
        return true;
    }

    // Initial render
    renderList();

    // Check for URL parameters and auto-load if present
    const loadedFromUrl = await loadFromUrlParams();
    if (loadedFromUrl) {
        console.log('Loaded animation from URL parameters');
    }

    // Initialize UI state for defaults (loop and video enabled)
    loopBtn.textContent = 'Loop: On';
    loopBtn.classList.add('active');
    videoToggleBtn.textContent = 'Video: On';
    videoToggleBtn.classList.add('active');
    videoPanel.classList.remove('hidden');

    // Start render loop with timeline sync
    engine.runRenderLoop(() => {
        scene.render();

        // Sync timeline slider with animation playback (only when not scrubbing)
        if (!isScrubbing && charController.isPlaying() && maxFrames > 0) {
            const position = charController.getCurrentPosition();
            timelineSlider.value = position * 1000;
            updateFrameDisplay(position * maxFrames);
        }
    });

    console.log("Comparison interface initialized");
})();
