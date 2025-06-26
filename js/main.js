

/*
Purpose: Main game initialization and core game loop for Summer Afternoon Three.js game
Key features: Scene setup, game loop, module coordination, error handling, loading management
Dependencies: Three.js, all game modules (Scene, Camera, Lighting, etc.)
Related helpers: Scene.js, Camera.js, Input.js, UI.js, Audio.js
Function names: init, animate, handleResize, showError, updateLoadingProgress
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 10:40 | File: js/main.js
*/

import { Scene } from ‘./modules/Scene.js’;
import { Camera } from ‘./modules/Camera.js’;
import { Lighting } from ‘./modules/Lighting.js’;
import { Environment } from ‘./modules/Environment.js’;
import { Character } from ‘./modules/Character.js’;
import { Input } from ‘./modules/Input.js’;
import { Audio } from ‘./modules/Audio.js’;
import { UI } from ‘./modules/UI.js’;

class SummerAfternoonGame {
constructor() {
this.renderer = null;
this.scene = null;
this.camera = null;
this.lighting = null;
this.environment = null;
this.character = null;
this.input = null;
this.audio = null;
this.ui = null;

```
    this.clock = new THREE.Clock();
    this.deltaTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    
    this.loadingProgress = 0;
    this.totalLoadingSteps = 7;
    
    // Performance monitoring
    this.frameCount = 0;
    this.lastFPSUpdate = 0;
    this.currentFPS = 60;
    
    // Error handling
    this.setupErrorHandling();
    
    // Initialize the game
    this.init();
}

async init() {
    try {
        console.log('🌅 Initializing Summer Afternoon Game...');
        
        // Update loading screen
        this.updateLoadingProgress(0, 'Setting up renderer...');
        
        // Setup renderer
        await this.setupRenderer();
        this.updateLoadingProgress(1, 'Creating scene...');
        
        // Initialize core systems
        this.scene = new Scene();
        await this.scene.init();
        this.updateLoadingProgress(2, 'Setting up camera...');
        
        this.camera = new Camera(this.renderer);
        await this.camera.init();
        this.updateLoadingProgress(3, 'Configuring lighting...');
        
        this.lighting = new Lighting(this.scene.scene);
        await this.lighting.init();
        this.updateLoadingProgress(4, 'Generating environment...');
        
        this.environment = new Environment(this.scene.scene);
        await this.environment.init();
        this.updateLoadingProgress(5, 'Creating character...');
        
        this.character = new Character(this.scene.scene, this.camera);
        await this.character.init();
        this.updateLoadingProgress(6, 'Setting up controls...');
        
        // Initialize input and UI systems
        this.input = new Input(this.camera, this.character);
        await this.input.init();
        
        this.ui = new UI();
        await this.ui.init();
        this.updateLoadingProgress(7, 'Starting audio...');
        
        // Initialize audio last (requires user interaction)
        this.audio = new Audio();
        await this.audio.init();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start the game loop
        this.start();
        
        console.log('✅ Game initialized successfully!');
        
    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        this.showError('Failed to initialize the game. Please refresh the page.');
    }
}

setupRenderer() {
    return new Promise((resolve) => {
        try {
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: false,
                powerPreference: 'high-performance'
            });
            
            // Configure renderer
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.2;
            
            // Add to DOM
            const gameContainer = document.getElementById('game-container');
            gameContainer.appendChild(this.renderer.domElement);
            
            resolve();
        } catch (error) {
            throw new Error(`Renderer setup failed: ${error.message}`);
        }
    });
}

setupEventListeners() {
    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Visibility change (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            this.pause();
        } else {
            this.resume();
        }
    });
    
    // Focus events
    window.addEventListener('blur', () => this.pause());
    window.addEventListener('focus', () => this.resume());
    
    // Escape key for menu
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Escape') {
            this.ui.toggleSettings();
        }
    });
}

setupErrorHandling() {
    // Global error handlers
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        this.showError('An unexpected error occurred. Please refresh the page.');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        this.showError('A network or loading error occurred. Please check your connection.');
    });
}

updateLoadingProgress(step, message) {
    this.loadingProgress = (step / this.totalLoadingSteps) * 100;
    
    const progressBar = document.getElementById('loading-progress');
    const loadingText = document.getElementById('loading-text');
    
    if (progressBar) {
        progressBar.style.width = `${this.loadingProgress}%`;
    }
    
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    console.log(`📈 Loading: ${this.loadingProgress.toFixed(1)}% - ${message}`);
}

start() {
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    const uiOverlay = document.getElementById('ui-overlay');
    
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
    
    if (uiOverlay) {
        uiOverlay.classList.remove('hidden');
    }
    
    // Start game loop
    this.isRunning = true;
    this.isPaused = false;
    this.animate();
    
    console.log('🎮 Game started!');
}

pause() {
    if (this.isRunning) {
        this.isPaused = true;
        this.audio?.pause();
        console.log('⏸️ Game paused');
    }
}

resume() {
    if (this.isRunning && this.isPaused) {
        this.isPaused = false;
        this.audio?.resume();
        console.log('▶️ Game resumed');
    }
}

animate() {
    if (!this.isRunning) return;
    
    requestAnimationFrame(this.animate.bind(this));
    
    if (this.isPaused) return;
    
    // Calculate delta time
    this.deltaTime = this.clock.getDelta();
    
    // Update systems
    try {
        this.input?.update(this.deltaTime);
        this.character?.update(this.deltaTime);
        this.camera?.update(this.deltaTime);
        this.environment?.update(this.deltaTime);
        this.lighting?.update(this.deltaTime);
        this.audio?.update(this.deltaTime);
        this.ui?.update(this.deltaTime);
        
        // Render the scene
        this.renderer.render(this.scene.scene, this.camera.camera);
        
        // Update performance stats
        this.updatePerformanceStats();
        
    } catch (error) {
        console.error('Animation loop error:', error);
        this.showError('Rendering error occurred. The game may be unstable.');
    }
}

updatePerformanceStats() {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFPSUpdate >= 1000) {
        this.currentFPS = Math.round((this.frameCount * 1000) / (now - this.lastFPSUpdate));
        this.frameCount = 0;
        this.lastFPSUpdate = now;
        
        // Update UI
        const fpsCounter = document.getElementById('fps-counter');
        const objectCount = document.getElementById('object-count');
        const triangleCount = document.getElementById('triangle-count');
        
        if (fpsCounter) fpsCounter.textContent = this.currentFPS;
        if (objectCount && this.scene) {
            objectCount.textContent = this.scene.scene.children.length;
        }
        if (triangleCount && this.renderer) {
            triangleCount.textContent = this.renderer.info.render.triangles;
        }
    }
}

handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update camera
    if (this.camera) {
        this.camera.handleResize(width, height);
    }
    
    // Update renderer
    if (this.renderer) {
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    
    console.log(`📱 Screen resized: ${width}x${height}`);
}

showError(message) {
    const errorModal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    const reloadButton = document.getElementById('reload-button');
    
    if (errorModal && errorMessage) {
        errorMessage.textContent = message;
        errorModal.classList.remove('hidden');
        
        if (reloadButton) {
            reloadButton.onclick = () => {
                window.location.reload();
            };
        }
    }
    
    // Pause the game
    this.pause();
}

destroy() {
    console.log('🧹 Cleaning up game resources...');
    
    this.isRunning = false;
    
    // Cleanup systems
    this.audio?.destroy();
    this.input?.destroy();
    this.character?.destroy();
    this.environment?.destroy();
    this.lighting?.destroy();
    this.camera?.destroy();
    this.scene?.destroy();
    
    // Cleanup renderer
    if (this.renderer) {
        this.renderer.dispose();
        const canvas = this.renderer.domElement;
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    console.log('✅ Game cleanup complete');
}
```

}

// Initialize the game when the page loads
let game = null;

document.addEventListener(‘DOMContentLoaded’, () => {
console.log(‘🌅 Starting Summer Afternoon Game…’);

```
// Check for WebGL support
if (!window.WebGLRenderingContext) {
    document.body.innerHTML = `
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>WebGL Not Supported</h2>
            <p>Your browser doesn't support WebGL, which is required for this game.</p>
            <p>Please try using a modern browser like Chrome, Firefox, or Safari.</p>
        </div>
    `;
    return;
}

// Create game instance
try {
    game = new SummerAfternoonGame();
} catch (error) {
    console.error('Failed to create game instance:', error);
}
```

});

// Cleanup on page unload
window.addEventListener(‘beforeunload’, () => {
if (game) {
game.destroy();
game = null;
}
});

// Export for debugging
window.SummerAfternoonGame = { game };

