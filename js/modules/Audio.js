

/*
Purpose: Comprehensive audio management system for Summer Afternoon Three.js game
Key features: 3D positional audio, ambient sounds, music management, sound effects, audio contexts
Dependencies: Three.js, Web Audio API
Related helpers: Character.js, Environment.js, UI.js
Function names: init, update, playSound, playMusic, setVolume, create3DSound, destroy
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 11:15 | File: js/modules/Audio.js
*/

export class Audio {
constructor() {
// Audio context and nodes
this.audioContext = null;
this.masterGainNode = null;
this.musicGainNode = null;
this.effectsGainNode = null;
this.ambienceGainNode = null;

```
    // Audio listener for 3D audio
    this.listener = null;
    
    // Audio configuration
    this.config = {
        masterVolume: 0.7,
        musicVolume: 0.5,
        effectsVolume: 0.8,
        ambienceVolume: 0.6,
        fadeTime: 1.0,
        maxDistance: 50,
        rolloffFactor: 1,
        dopplerFactor: 1
    };
    
    // Audio library
    this.sounds = new Map();
    this.music = new Map();
    this.ambientSounds = new Map();
    
    // Currently playing audio
    this.currentMusic = null;
    this.playingSounds = new Map();
    this.playingAmbient = new Map();
    
    // Audio pools for performance
    this.soundPools = new Map();
    this.poolSizes = {
        footstep: 5,
        jump: 3,
        landing: 3,
        wind: 2,
        birds: 3
    };
    
    // 3D Audio sources
    this.positionalSources = new Map();
    
    // Audio loading
    this.loadingQueue = [];
    this.loadedAudio = new Map();
    this.totalAudioFiles = 0;
    this.loadedAudioFiles = 0;
    
    // Environmental audio
    this.environment = {
        weather: {
            current: 'clear',
            sounds: new Map()
        },
        timeOfDay: {
            current: 14, // 2 PM
            sounds: new Map()
        },
        location: {
            current: 'meadow',
            sounds: new Map()
        }
    };
    
    // Audio effects processing
    this.effects = {
        reverb: null,
        filter: null,
        compressor: null,
        enabled: true
    };
    
    // State management
    this.state = {
        initialized: false,
        suspended: false,
        muted: false,
        fadingOut: false,
        fadingIn: false
    };
    
    // Performance monitoring
    this.stats = {
        activeSources: 0,
        maxSources: 32,
        cpuUsage: 0
    };
}

async init() {
    try {
        console.log('🔊 Initializing audio system...');
        
        // Create audio context
        await this.createAudioContext();
        
        // Setup audio nodes
        this.setupAudioNodes();
        
        // Setup 3D audio listener
        this.setup3DAudio();
        
        // Setup audio effects
        this.setupAudioEffects();
        
        // Create sound pools
        this.createSoundPools();
        
        // Load audio files
        await this.loadAudioFiles();
        
        // Setup environmental audio
        this.setupEnvironmentalAudio();
        
        // Start ambient sounds
        this.startAmbientSounds();
        
        this.state.initialized = true;
        console.log('✅ Audio system initialized successfully');
        
    } catch (error) {
        console.error('❌ Audio initialization failed:', error);
        
        // Fallback: disable audio system
        this.state.initialized = false;
        console.warn('⚠️ Running without audio');
    }
}

async createAudioContext() {
    try {
        // Create audio context with fallback
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        // Handle audio context state
        if (this.audioContext.state === 'suspended') {
            console.log('🔇 Audio context suspended - waiting for user interaction');
            this.state.suspended = true;
            
            // Setup user interaction handler
            this.setupUserInteractionHandler();
        }
        
        console.log('🎵 Audio context created');
        
    } catch (error) {
        throw new Error(`Failed to create audio context: ${error.message}`);
    }
}

setupUserInteractionHandler() {
    const resumeAudio = async () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            this.state.suspended = false;
            console.log('🔊 Audio context resumed');
            
            // Remove event listeners
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
            
            // Hide audio warning if present
            const audioWarning = document.getElementById('audio-warning');
            if (audioWarning) {
                audioWarning.classList.add('hidden');
            }
        }
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', resumeAudio);
    document.addEventListener('keydown', resumeAudio);
    document.addEventListener('touchstart', resumeAudio);
    
    // Show audio warning
    const audioWarning = document.getElementById('audio-warning');
    if (audioWarning) {
        audioWarning.classList.remove('hidden');
        audioWarning.addEventListener('click', resumeAudio);
    }
}

setupAudioNodes() {
    if (!this.audioContext) return;
    
    // Create master gain node
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.gain.value = this.config.masterVolume;
    this.masterGainNode.connect(this.audioContext.destination);
    
    // Create category gain nodes
    this.musicGainNode = this.audioContext.createGain();
    this.musicGainNode.gain.value = this.config.musicVolume;
    this.musicGainNode.connect(this.masterGainNode);
    
    this.effectsGainNode = this.audioContext.createGain();
    this.effectsGainNode.gain.value = this.config.effectsVolume;
    this.effectsGainNode.connect(this.masterGainNode);
    
    this.ambienceGainNode = this.audioContext.createGain();
    this.ambienceGainNode.gain.value = this.config.ambienceVolume;
    this.ambienceGainNode.connect(this.masterGainNode);
    
    console.log('🎛️ Audio nodes setup');
}

setup3DAudio() {
    if (!this.audioContext) return;
    
    // Create audio listener
    this.listener = this.audioContext.listener;
    
    // Set listener properties
    if (this.listener.forwardX) {
        // Modern Web Audio API
        this.listener.forwardX.value = 0;
        this.listener.forwardY.value = 0;
        this.listener.forwardZ.value = -1;
        this.listener.upX.value = 0;
        this.listener.upY.value = 1;
        this.listener.upZ.value = 0;
    } else {
        // Legacy Web Audio API
        this.listener.setOrientation(0, 0, -1, 0, 1, 0);
    }
    
    console.log('🎧 3D audio listener setup');
}

setupAudioEffects() {
    if (!this.audioContext || !this.effects.enabled) return;
    
    try {
        // Create reverb
        this.effects.reverb = this.createReverb();
        
        // Create filter
        this.effects.filter = this.audioContext.createBiquadFilter();
        this.effects.filter.type = 'lowpass';
        this.effects.filter.frequency.value = 8000;
        
        // Create compressor
        this.effects.compressor = this.audioContext.createDynamicsCompressor();
        this.effects.compressor.threshold.value = -24;
        this.effects.compressor.knee.value = 30;
        this.effects.compressor.ratio.value = 12;
        this.effects.compressor.attack.value = 0.003;
        this.effects.compressor.release.value = 0.25;
        
        console.log('🎚️ Audio effects setup');
        
    } catch (error) {
        console.warn('⚠️ Audio effects setup failed:', error);
        this.effects.enabled = false;
    }
}

createReverb() {
    const convolver = this.audioContext.createConvolver();
    
    // Create impulse response for reverb
    const length = this.audioContext.sampleRate * 2;
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            const decay = Math.pow(1 - (i / length), 2);
            channelData[i] = (Math.random() * 2 - 1) * decay * 0.1;
        }
    }
    
    convolver.buffer = impulse;
    return convolver;
}

createSoundPools() {
    Object.entries(this.poolSizes).forEach(([soundName, poolSize]) => {
        const pool = [];
        for (let i = 0; i < poolSize; i++) {
            pool.push({
                source: null,
                gainNode: null,
                playing: false,
                id: `${soundName}_${i}`
            });
        }
        this.soundPools.set(soundName, pool);
    });
    
    console.log('🏊 Audio pools created');
}

async loadAudioFiles() {
    console.log('📁 Loading audio files...');
    
    // Define audio files to load
    const audioFiles = {
        music: {
            'summer-afternoon': 'assets/audio/summer-afternoon-main.mp3',
            'peaceful-meadow': 'assets/audio/peaceful-meadow.mp3'
        },
        effects: {
            'footstep-grass-1': 'assets/audio/footstep-grass-1.mp3',
            'footstep-grass-2': 'assets/audio/footstep-grass-2.mp3',
            'jump': 'assets/audio/jump.mp3',
            'landing': 'assets/audio/landing.mp3'
        },
        ambient: {
            'birds-chirping': 'assets/audio/birds-chirping.mp3',
            'wind-gentle': 'assets/audio/wind-gentle.mp3',
            'insects-summer': 'assets/audio/insects-summer.mp3'
        }
    };
    
    // Calculate total files
    this.totalAudioFiles = Object.values(audioFiles).reduce(
        (total, category) => total + Object.keys(category).length, 0
    );
    
    // Load all categories
    await Promise.all([
        this.loadAudioCategory('music', audioFiles.music),
        this.loadAudioCategory('effects', audioFiles.effects),
        this.loadAudioCategory('ambient', audioFiles.ambient)
    ]);
    
    console.log(`✅ Loaded ${this.loadedAudioFiles}/${this.totalAudioFiles} audio files`);
}

async loadAudioCategory(category, files) {
    const loadPromises = Object.entries(files).map(async ([name, url]) => {
        try {
            const audioBuffer = await this.loadAudioFile(url);
            
            switch (category) {
                case 'music':
                    this.music.set(name, audioBuffer);
                    break;
                case 'effects':
                    this.sounds.set(name, audioBuffer);
                    break;
                case 'ambient':
                    this.ambientSounds.set(name, audioBuffer);
                    break;
            }
            
            this.loadedAudioFiles++;
            console.log(`📀 Loaded ${category}: ${name}`);
            
        } catch (error) {
            console.warn(`⚠️ Failed to load ${category} ${name}:`, error);
        }
    });
    
    await Promise.all(loadPromises);
}

async loadAudioFile(url) {
    return new Promise((resolve, reject) => {
        // For demo purposes, we'll create a simple procedural audio buffer
        // In a real implementation, you would fetch and decode the actual audio file
        
        try {
            // Create a simple tone as placeholder
            const duration = 1; // 1 second
            const sampleRate = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);
            
            // Generate different tones based on filename
            let frequency = 440; // Default A4
            if (url.includes('footstep')) frequency = 200;
            if (url.includes('jump')) frequency = 600;
            if (url.includes('birds')) frequency = 1000;
            if (url.includes('wind')) frequency = 100;
            
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                data[i] = Math.sin(2 * Math.PI * frequency * t) * 0.1 * Math.exp(-t * 2);
            }
            
            resolve(buffer);
            
        } catch (error) {
            reject(error);
        }
    });
}

setupEnvironmentalAudio() {
    // Setup weather sounds
    this.environment.weather.sounds.set('clear', ['birds-chirping', 'wind-gentle']);
    this.environment.weather.sounds.set('windy', ['wind-gentle']);
    this.environment.weather.sounds.set('rain', ['rain-light']);
    
    // Setup time of day sounds
    this.environment.timeOfDay.sounds.set('morning', ['birds-chirping']);
    this.environment.timeOfDay.sounds.set('afternoon', ['insects-summer', 'wind-gentle']);
    this.environment.timeOfDay.sounds.set('evening', ['wind-gentle']);
    this.environment.timeOfDay.sounds.set('night', ['night-crickets']);
    
    // Setup location sounds
    this.environment.location.sounds.set('meadow', ['birds-chirping', 'wind-gentle']);
    this.environment.location.sounds.set('forest', ['wind-trees', 'birds-distant']);
    
    console.log('🌍 Environmental audio configured');
}

startAmbientSounds() {
    // Start appropriate ambient sounds for current environment
    const timeCategory = this.getTimeCategory(this.environment.timeOfDay.current);
    const ambientSounds = this.environment.timeOfDay.sounds.get(timeCategory) || [];
    
    ambientSounds.forEach(soundName => {
        if (this.ambientSounds.has(soundName)) {
            this.playAmbientLoop(soundName);
        }
    });
    
    console.log('🎵 Ambient sounds started');
}

update(deltaTime) {
    if (!this.state.initialized || this.state.suspended) return;
    
    // Update 3D audio listener position (would be connected to camera)
    this.update3DListener();
    
    // Update environmental audio
    this.updateEnvironmentalAudio();
    
    // Update positional audio sources
    this.updatePositionalSources();
    
    // Update audio stats
    this.updateStats();
    
    // Clean up finished sounds
    this.cleanupFinishedSounds();
}

update3DListener() {
    // In a real implementation, this would get position/orientation from camera
    // For now, we'll use a simple placeholder
    
    if (this.listener && this.listener.positionX) {
        // Modern Web Audio API
        this.listener.positionX.value = 0;
        this.listener.positionY.value = 5;
        this.listener.positionZ.value = 10;
    } else if (this.listener && this.listener.setPosition) {
        // Legacy Web Audio API
        this.listener.setPosition(0, 5, 10);
    }
}

updateEnvironmentalAudio() {
    // Update ambient sounds based on time of day, weather, etc.
    // This would be called when environment changes
}

updatePositionalSources() {
    // Update 3D positioned audio sources
    for (const [id, source] of this.positionalSources) {
        if (source.playing && source.pannerNode) {
            // Update position if object has moved
            // This would be connected to actual 3D objects in the scene
        }
    }
}

updateStats() {
    this.stats.activeSources = this.playingSounds.size + this.playingAmbient.size;
}

cleanupFinishedSounds() {
    // Remove references to finished sounds
    for (const [id, sound] of this.playingSounds) {
        if (!sound.playing) {
            this.playingSounds.delete(id);
        }
    }
}

// Public API methods

playSound(soundName, options = {}) {
    if (!this.state.initialized || this.state.muted) return null;
    
    const audioBuffer = this.sounds.get(soundName);
    if (!audioBuffer) {
        console.warn(`⚠️ Sound not found: ${soundName}`);
        return null;
    }
    
    // Get audio source from pool or create new one
    const audioSource = this.getAudioSourceFromPool(soundName) || this.createAudioSource();
    
    // Configure audio source
    audioSource.buffer = audioBuffer;
    audioSource.loop = options.loop || false;
    
    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = options.volume || 1.0;
    
    // Connect audio chain
    audioSource.connect(gainNode);
    gainNode.connect(this.effectsGainNode);
    
    // Apply 3D positioning if specified
    if (options.position) {
        const pannerNode = this.create3DPanner(options.position);
        gainNode.connect(pannerNode);
        pannerNode.connect(this.effectsGainNode);
    }
    
    // Play sound
    audioSource.start(0);
    
    // Track playing sound
    const soundId = `${soundName}_${Date.now()}`;
    this.playingSounds.set(soundId, {
        source: audioSource,
        gainNode: gainNode,
        playing: true,
        startTime: this.audioContext.currentTime
    });
    
    // Handle sound end
    audioSource.onended = () => {
        this.playingSounds.delete(soundId);
        this.returnAudioSourceToPool(soundName, audioSource);
    };
    
    return soundId;
}

playMusic(musicName, fadeIn = true) {
    if (!this.state.initialized || this.state.muted) return false;
    
    const audioBuffer = this.music.get(musicName);
    if (!audioBuffer) {
        console.warn(`⚠️ Music not found: ${musicName}`);
        return false;
    }
    
    // Stop current music
    if (this.currentMusic) {
        this.stopMusic(fadeIn);
    }
    
    // Create music source
    const musicSource = this.audioContext.createBufferSource();
    musicSource.buffer = audioBuffer;
    musicSource.loop = true;
    
    // Create gain node for fading
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = fadeIn ? 0 : 1;
    
    // Connect audio chain
    musicSource.connect(gainNode);
    gainNode.connect(this.musicGainNode);
    
    // Start playing
    musicSource.start(0);
    
    // Fade in if requested
    if (fadeIn) {
        gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + this.config.fadeTime);
    }
    
    // Store current music
    this.currentMusic = {
        source: musicSource,
        gainNode: gainNode,
        name: musicName
    };
    
    console.log(`🎶 Playing music: ${musicName}`);
    return true;
}

stopMusic(fadeOut = true) {
    if (!this.currentMusic) return;
    
    if (fadeOut) {
        // Fade out music
        this.currentMusic.gainNode.gain.linearRampToValueAtTime(
            0, 
            this.audioContext.currentTime + this.config.fadeTime
        );
        
        // Stop after fade
        setTimeout(() => {
            if (this.currentMusic) {
                this.currentMusic.source.stop();
                this.currentMusic = null;
            }
        }, this.config.fadeTime * 1000);
    } else {
        // Stop immediately
        this.currentMusic.source.stop();
        this.currentMusic = null;
    }
    
    console.log('🎶 Music stopped');
}

playAmbientLoop(soundName, volume = 1.0) {
    if (!this.state.initialized || this.state.muted) return null;
    
    const audioBuffer = this.ambientSounds.get(soundName);
    if (!audioBuffer) {
        console.warn(`⚠️ Ambient sound not found: ${soundName}`);
        return null;
    }
    
    // Check if already playing
    if (this.playingAmbient.has(soundName)) {
        return this.playingAmbient.get(soundName).id;
    }
    
    // Create ambient source
    const ambientSource = this.audioContext.createBufferSource();
    ambientSource.buffer = audioBuffer;
    ambientSource.loop = true;
    
    // Create gain node
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;
    
    // Connect audio chain
    ambientSource.connect(gainNode);
    gainNode.connect(this.ambienceGainNode);
    
    // Start playing
    ambientSource.start(0);
    
    // Track ambient sound
    const ambientId = `ambient_${soundName}`;
    this.playingAmbient.set(soundName, {
        id: ambientId,
        source: ambientSource,
        gainNode: gainNode,
        playing: true
    });
    
    console.log(`🌿 Playing ambient: ${soundName}`);
    return ambientId;
}

stopAmbientLoop(soundName, fadeOut = true) {
    const ambient = this.playingAmbient.get(soundName);
    if (!ambient) return;
    
    if (fadeOut) {
        ambient.gainNode.gain.linearRampToValueAtTime(
            0, 
            this.audioContext.currentTime + this.config.fadeTime
        );
        
        setTimeout(() => {
            ambient.source.stop();
            this.playingAmbient.delete(soundName);
        }, this.config.fadeTime * 1000);
    } else {
        ambient.source.stop();
        this.playingAmbient.delete(soundName);
    }
    
    console.log(`🌿 Stopped ambient: ${soundName}`);
}

create3DSound(soundName, position, options = {}) {
    if (!this.state.initialized || this.state.muted) return null;
    
    const audioBuffer = this.sounds.get(soundName);
    if (!audioBuffer) return null;
    
    // Create 3D positioned sound
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    const pannerNode = this.create3DPanner(position);
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = options.volume || 1.0;
    
    // Connect audio chain
    source.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(this.effectsGainNode);
    
    // Start playing
    source.start(0);
    
    const soundId = `3d_${soundName}_${Date.now()}`;
    this.positionalSources.set(soundId, {
        source: source,
        pannerNode: pannerNode,
        gainNode: gainNode,
        position: position,
        playing: true
    });
    
    // Cleanup when finished
    source.onended = () => {
        this.positionalSources.delete(soundId);
    };
    
    return soundId;
}

create3DPanner(position) {
    const pannerNode = this.audioContext.createPanner();
    
    // Configure panner
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse';
    pannerNode.refDistance = 1;
    pannerNode.maxDistance = this.config.maxDistance;
    pannerNode.rolloffFactor = this.config.rolloffFactor;
    
    // Set position
    if (pannerNode.positionX) {
        // Modern Web Audio API
        pannerNode.positionX.value = position.x;
        pannerNode.positionY.value = position.y;
        pannerNode.positionZ.value = position.z;
    } else {
        // Legacy Web Audio API
        pannerNode.setPosition(position.x, position.y, position.z);
    }
    
    return pannerNode;
}

// Volume controls
setMasterVolume(volume) {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGainNode) {
        this.masterGainNode.gain.value = this.config.masterVolume;
    }
}

setMusicVolume(volume) {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGainNode) {
        this.musicGainNode.gain.value = this.config.musicVolume;
    }
}

setEffectsVolume(volume) {
    this.config.effectsVolume = Math.max(0, Math.min(1, volume));
    if (this.effectsGainNode) {
        this.effectsGainNode.gain.value = this.config.effectsVolume;
    }
}

setAmbienceVolume(volume) {
    this.config.ambienceVolume = Math.max(0, Math.min(1, volume));
    if (this.ambienceGainNode) {
        this.ambienceGainNode.gain.value = this.config.ambienceVolume;
    }
}

// Utility methods
getAudioSourceFromPool(soundName) {
    const pool = this.soundPools.get(soundName);
    if (!pool) return null;
    
    const availableSource = pool.find(item => !item.playing);
    if (availableSource) {
        availableSource.playing = true;
        return this.audioContext.createBufferSource();
    }
    
    return null;
}

returnAudioSourceToPool(soundName, source) {
    const pool = this.soundPools.get(soundName);
    if (!pool) return;
    
    const poolItem = pool.find(item => item.source === source);
    if (poolItem) {
        poolItem.playing = false;
        poolItem.source = null;
    }
}

createAudioSource() {
    return this.audioContext.createBufferSource();
}

getTimeCategory(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
}

mute() {
    this.state.muted = true;
    if (this.masterGainNode) {
        this.masterGainNode.gain.value = 0;
    }
}

unmute() {
    this.state.muted = false;
    if (this.masterGainNode) {
        this.masterGainNode.gain.value = this.config.masterVolume;
    }
}

pause() {
    if (this.audioContext && this.audioContext.state === 'running') {
        this.audioContext.suspend();
    }
}

resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }
}

getStats() {
    return { ...this.stats };
}

destroy() {
    console.log('🧹 Cleaning up audio system...');
    
    try {
        // Stop all playing sounds
        this.playingSounds.forEach(sound => {
            if (sound.source) {
                sound.source.stop();
            }
        });
        this.playingSounds.clear();
        
        // Stop all ambient sounds
        this.playingAmbient.forEach(ambient => {
            if (ambient.source) {
                ambient.source.stop();
            }
        });
        this.playingAmbient.clear();
        
        // Stop music
        if (this.currentMusic) {
            this.currentMusic.source.stop();
            this.currentMusic = null;
        }
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Clear all references
        this.sounds.clear();
        this.music.clear();
        this.ambientSounds.clear();
        this.soundPools.clear();
        this.positionalSources.clear();
        
        console.log('✅ Audio cleanup complete');
        
    } catch (error) {
        console.error('❌ Audio cleanup failed:', error);
    }
}
```

}

