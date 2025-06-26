

/*
Purpose: User interface management system for Summer Afternoon Three.js game
Key features: UI panels, settings management, HUD elements, notifications, responsive design
Dependencies: None (pure DOM manipulation)
Related helpers: Audio.js, Input.js, main.js
Function names: init, update, showPanel, hidePanel, updateHUD, showNotification, destroy
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 11:20 | File: js/modules/UI.js
*/

export class UI {
constructor() {
// UI elements
this.elements = {
overlay: null,
settingsPanel: null,
instructionsPanel: null,
menuButton: null,
statsPanel: null,
notificationContainer: null,
loadingScreen: null,
audioWarning: null
};

```
    // UI state
    this.state = {
        settingsOpen: false,
        statsVisible: false,
        notificationsEnabled: true,
        currentTheme: 'default',
        isMobile: false
    };
    
    // Settings configuration
    this.settings = {
        graphics: {
            quality: 'medium',
            shadows: true,
            particles: true,
            fov: 75
        },
        audio: {
            master: 70,
            music: 50,
            effects: 80,
            ambient: 60
        },
        controls: {
            mouseSensitivity: 50,
            invertY: false,
            showCrosshair: true
        },
        display: {
            fullscreen: false,
            vsync: true,
            showFPS: false,
            showStats: false
        }
    };
    
    // Notification system
    this.notifications = {
        queue: [],
        maxVisible: 3,
        defaultDuration: 3000,
        types: {
            info: { icon: 'ℹ️', color: '#4facfe' },
            success: { icon: '✅', color: '#00ff88' },
            warning: { icon: '⚠️', color: '#ffaa00' },
            error: { icon: '❌', color: '#ff4444' }
        }
    };
    
    // HUD elements
    this.hud = {
        crosshair: null,
        compass: null,
        minimap: null,
        timeDisplay: null,
        weatherDisplay: null
    };
    
    // Animation system
    this.animations = {
        active: new Map(),
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    };
    
    // Event listeners storage
    this.eventListeners = [];
    
    // Responsive breakpoints
    this.breakpoints = {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
    };
    
    // Update frequency
    this.updateFrequency = 30; // 30 FPS for UI
    this.lastUpdate = 0;
}

async init() {
    try {
        console.log('🖥️ Initializing UI system...');
        
        // Get UI elements
        this.getUIElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize settings
        this.initializeSettings();
        
        // Setup responsive design
        this.setupResponsiveDesign();
        
        // Create HUD elements
        this.createHUDElements();
        
        // Setup notifications
        this.setupNotifications();
        
        // Load saved settings
        this.loadSettings();
        
        // Apply initial theme
        this.applyTheme(this.state.currentTheme);
        
        console.log('✅ UI system initialized successfully');
        
    } catch (error) {
        console.error('❌ UI initialization failed:', error);
        throw error;
    }
}

getUIElements() {
    // Get references to UI elements
    this.elements.overlay = document.getElementById('ui-overlay');
    this.elements.settingsPanel = document.getElementById('settings-panel');
    this.elements.instructionsPanel = document.querySelector('.instructions-panel');
    this.elements.menuButton = document.getElementById('menu-button');
    this.elements.statsPanel = document.getElementById('stats-panel');
    this.elements.loadingScreen = document.getElementById('loading-screen');
    this.elements.audioWarning = document.getElementById('audio-warning');
    
    // Create notification container if it doesn't exist
    if (!document.getElementById('notification-container')) {
        this.createNotificationContainer();
    }
    this.elements.notificationContainer = document.getElementById('notification-container');
    
    console.log('📋 UI elements referenced');
}

setupEventListeners() {
    // Menu button
    if (this.elements.menuButton) {
        const menuHandler = () => this.toggleSettings();
        this.elements.menuButton.addEventListener('click', menuHandler);
        this.eventListeners.push({
            element: this.elements.menuButton,
            event: 'click',
            handler: menuHandler
        });
    }
    
    // Close settings button
    const closeSettingsBtn = document.getElementById('close-settings');
    if (closeSettingsBtn) {
        const closeHandler = () => this.hideSettings();
        closeSettingsBtn.addEventListener('click', closeHandler);
        this.eventListeners.push({
            element: closeSettingsBtn,
            event: 'click',
            handler: closeHandler
        });
    }
    
    // Settings panel clicks (prevent event bubbling)
    if (this.elements.settingsPanel) {
        const preventHandler = (e) => e.stopPropagation();
        this.elements.settingsPanel.addEventListener('click', preventHandler);
        this.eventListeners.push({
            element: this.elements.settingsPanel,
            event: 'click',
            handler: preventHandler
        });
    }
    
    // Overlay clicks (close settings)
    if (this.elements.overlay) {
        const overlayHandler = (e) => {
            if (e.target === this.elements.overlay && this.state.settingsOpen) {
                this.hideSettings();
            }
        };
        this.elements.overlay.addEventListener('click', overlayHandler);
        this.eventListeners.push({
            element: this.elements.overlay,
            event: 'click',
            handler: overlayHandler
        });
    }
    
    // Settings controls
    this.setupSettingsControls();
    
    // Window resize
    const resizeHandler = () => this.handleResize();
    window.addEventListener('resize', resizeHandler);
    this.eventListeners.push({
        element: window,
        event: 'resize',
        handler: resizeHandler
    });
    
    // Keyboard shortcuts
    const keyHandler = (e) => this.handleKeyboard(e);
    document.addEventListener('keydown', keyHandler);
    this.eventListeners.push({
        element: document,
        event: 'keydown',
        handler: keyHandler
    });
    
    console.log('🎯 UI event listeners setup');
}

setupSettingsControls() {
    // Graphics quality
    const graphicsQuality = document.getElementById('graphics-quality');
    if (graphicsQuality) {
        const handler = (e) => this.updateSetting('graphics', 'quality', e.target.value);
        graphicsQuality.addEventListener('change', handler);
        this.eventListeners.push({
            element: graphicsQuality,
            event: 'change',
            handler: handler
        });
    }
    
    // Audio volume
    const audioVolume = document.getElementById('audio-volume');
    if (audioVolume) {
        const handler = (e) => this.updateSetting('audio', 'master', parseInt(e.target.value));
        audioVolume.addEventListener('input', handler);
        this.eventListeners.push({
            element: audioVolume,
            event: 'input',
            handler: handler
        });
    }
    
    // Add more setting controls as needed
    this.setupAdvancedSettings();
}

setupAdvancedSettings() {
    // Create advanced settings if they don't exist
    this.createAdvancedSettingsUI();
    
    // Mouse sensitivity
    const mouseSensitivity = document.getElementById('mouse-sensitivity');
    if (mouseSensitivity) {
        const handler = (e) => this.updateSetting('controls', 'mouseSensitivity', parseInt(e.target.value));
        mouseSensitivity.addEventListener('input', handler);
        this.eventListeners.push({
            element: mouseSensitivity,
            event: 'input',
            handler: handler
        });
    }
    
    // Fullscreen toggle
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    if (fullscreenToggle) {
        const handler = () => this.toggleFullscreen();
        fullscreenToggle.addEventListener('click', handler);
        this.eventListeners.push({
            element: fullscreenToggle,
            event: 'click',
            handler: handler
        });
    }
    
    // Stats toggle
    const statsToggle = document.getElementById('stats-toggle');
    if (statsToggle) {
        const handler = () => this.toggleStats();
        statsToggle.addEventListener('click', handler);
        this.eventListeners.push({
            element: statsToggle,
            event: 'click',
            handler: handler
        });
    }
}

createAdvancedSettingsUI() {
    const settingsPanel = this.elements.settingsPanel;
    if (!settingsPanel || document.getElementById('mouse-sensitivity')) return;
    
    // Create additional settings HTML
    const advancedHTML = `
        <div class="setting-item">
            <label for="mouse-sensitivity">Mouse Sensitivity:</label>
            <input type="range" id="mouse-sensitivity" min="1" max="100" value="50">
            <span id="sensitivity-value">50</span>
        </div>
        <div class="setting-item">
            <label>
                <input type="checkbox" id="invert-mouse"> Invert Mouse Y
            </label>
        </div>
        <div class="setting-item">
            <label>
                <input type="checkbox" id="show-crosshair" checked> Show Crosshair
            </label>
        </div>
        <div class="setting-item">
            <button id="fullscreen-toggle" class="ui-button">Toggle Fullscreen</button>
        </div>
        <div class="setting-item">
            <button id="stats-toggle" class="ui-button">Toggle Stats</button>
        </div>
    `;
    
    // Insert before close button
    const closeButton = settingsPanel.querySelector('#close-settings');
    if (closeButton) {
        closeButton.insertAdjacentHTML('beforebegin', advancedHTML);
    }
}

initializeSettings() {
    // Apply default settings to UI elements
    this.updateUIFromSettings();
    
    // Setup setting validation
    this.validateSettings();
    
    console.log('⚙️ Settings initialized');
}

updateUIFromSettings() {
    // Graphics quality
    const graphicsQuality = document.getElementById('graphics-quality');
    if (graphicsQuality) {
        graphicsQuality.value = this.settings.graphics.quality;
    }
    
    // Audio volume
    const audioVolume = document.getElementById('audio-volume');
    if (audioVolume) {
        audioVolume.value = this.settings.audio.master;
    }
    
    // Mouse sensitivity
    const mouseSensitivity = document.getElementById('mouse-sensitivity');
    const sensitivityValue = document.getElementById('sensitivity-value');
    if (mouseSensitivity) {
        mouseSensitivity.value = this.settings.controls.mouseSensitivity;
        if (sensitivityValue) {
            sensitivityValue.textContent = this.settings.controls.mouseSensitivity;
        }
    }
    
    // Checkboxes
    const invertMouse = document.getElementById('invert-mouse');
    if (invertMouse) {
        invertMouse.checked = this.settings.controls.invertY;
    }
    
    const showCrosshair = document.getElementById('show-crosshair');
    if (showCrosshair) {
        showCrosshair.checked = this.settings.controls.showCrosshair;
    }
}

validateSettings() {
    // Validate and clamp setting values
    this.settings.audio.master = Math.max(0, Math.min(100, this.settings.audio.master));
    this.settings.controls.mouseSensitivity = Math.max(1, Math.min(100, this.settings.controls.mouseSensitivity));
    
    // Validate enums
    const validQualities = ['low', 'medium', 'high'];
    if (!validQualities.includes(this.settings.graphics.quality)) {
        this.settings.graphics.quality = 'medium';
    }
}

setupResponsiveDesign() {
    this.state.isMobile = window.innerWidth <= this.breakpoints.mobile;
    this.applyResponsiveLayout();
    
    console.log('📱 Responsive design setup');
}

createHUDElements() {
    // Create crosshair
    this.createCrosshair();
    
    // Create time/weather display
    this.createStatusDisplay();
    
    // Create compass
    this.createCompass();
    
    console.log('🎯 HUD elements created');
}

createCrosshair() {
    if (document.getElementById('crosshair')) return;
    
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    crosshair.className = 'crosshair';
    crosshair.innerHTML = `
        <div class="crosshair-dot"></div>
        <div class="crosshair-lines">
            <div class="crosshair-line crosshair-top"></div>
            <div class="crosshair-line crosshair-right"></div>
            <div class="crosshair-line crosshair-bottom"></div>
            <div class="crosshair-line crosshair-left"></div>
        </div>
    `;
    
    // Add crosshair styles
    const style = document.createElement('style');
    style.textContent = `
        .crosshair {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 200;
        }
        .crosshair-dot {
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            margin: auto;
        }
        .crosshair-lines {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        .crosshair-line {
            position: absolute;
            background: rgba(255, 255, 255, 0.6);
        }
        .crosshair-top, .crosshair-bottom {
            width: 2px;
            height: 8px;
            left: 50%;
            transform: translateX(-50%);
        }
        .crosshair-top { top: -12px; }
        .crosshair-bottom { top: 8px; }
        .crosshair-left, .crosshair-right {
            width: 8px;
            height: 2px;
            top: 50%;
            transform: translateY(-50%);
        }
        .crosshair-left { left: -12px; }
        .crosshair-right { left: 8px; }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(crosshair);
    this.hud.crosshair = crosshair;
    
    // Show/hide based on settings
    this.updateCrosshairVisibility();
}

createStatusDisplay() {
    if (document.getElementById('status-display')) return;
    
    const statusDisplay = document.createElement('div');
    statusDisplay.id = 'status-display';
    statusDisplay.className = 'status-display';
    statusDisplay.innerHTML = `
        <div class="status-item">
            <span class="status-icon">🕐</span>
            <span id="time-display">14:30</span>
        </div>
        <div class="status-item">
            <span class="status-icon">🌤️</span>
            <span id="weather-display">Clear</span>
        </div>
    `;
    
    // Add status display styles
    const style = document.createElement('style');
    style.textContent = `
        .status-display {
            position: fixed;
            top: 20px;
            right: 80px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
            z-index: 150;
        }
        .status-item {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.6);
            padding: 8px 12px;
            border-radius: 20px;
            color: white;
            font-size: 0.9rem;
            backdrop-filter: blur(5px);
        }
        .status-icon {
            font-size: 1.1rem;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(statusDisplay);
    this.hud.timeDisplay = document.getElementById('time-display');
    this.hud.weatherDisplay = document.getElementById('weather-display');
}

createCompass() {
    if (document.getElementById('compass')) return;
    
    const compass = document.createElement('div');
    compass.id = 'compass';
    compass.className = 'compass';
    compass.innerHTML = `
        <div class="compass-ring">
            <div class="compass-needle"></div>
            <div class="compass-labels">
                <span class="compass-n">N</span>
                <span class="compass-e">E</span>
                <span class="compass-s">S</span>
                <span class="compass-w">W</span>
            </div>
        </div>
    `;
    
    // Add compass styles
    const style = document.createElement('style');
    style.textContent = `
        .compass {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 80px;
            pointer-events: none;
            z-index: 150;
        }
        .compass-ring {
            width: 100%;
            height: 100%;
            border: 2px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(5px);
            position: relative;
        }
        .compass-needle {
            position: absolute;
            top: 5px;
            left: 50%;
            transform: translateX(-50%);
            width: 2px;
            height: 30px;
            background: linear-gradient(to bottom, #ff4444, #ffaa00);
            border-radius: 1px;
            transform-origin: bottom center;
        }
        .compass-labels {
            position: absolute;
            width: 100%;
            height: 100%;
            color: white;
            font-size: 0.7rem;
            font-weight: bold;
        }
        .compass-n { position: absolute; top: 2px; left: 50%; transform: translateX(-50%); }
        .compass-e { position: absolute; right: 2px; top: 50%; transform: translateY(-50%); }
        .compass-s { position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); }
        .compass-w { position: absolute; left: 2px; top: 50%; transform: translateY(-50%); }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(compass);
    this.hud.compass = compass;
}

createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    
    // Add notification styles
    const style = document.createElement('style');
    style.textContent = `
        .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
            z-index: 300;
            max-width: 300px;
        }
        .notification {
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            backdrop-filter: blur(10px);
            border-left: 4px solid;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
            pointer-events: auto;
            cursor: pointer;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }
        .notification.show {
            transform: translateX(0);
        }
        .notification-icon {
            font-size: 1.2rem;
            flex-shrink: 0;
        }
        .notification-content {
            flex: 1;
        }
        .notification-title {
            font-weight: bold;
            margin-bottom: 2px;
        }
        .notification-message {
            opacity: 0.9;
            font-size: 0.8rem;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(container);
}

setupNotifications() {
    // Setup notification click handler for dismissal
    if (this.elements.notificationContainer) {
        const clickHandler = (e) => {
            const notification = e.target.closest('.notification');
            if (notification) {
                this.dismissNotification(notification);
            }
        };
        this.elements.notificationContainer.addEventListener('click', clickHandler);
        this.eventListeners.push({
            element: this.elements.notificationContainer,
            event: 'click',
            handler: clickHandler
        });
    }
    
    console.log('🔔 Notification system setup');
}

update(deltaTime) {
    const now = performance.now();
    
    // Throttle UI updates
    if (now - this.lastUpdate < 1000 / this.updateFrequency) {
        return;
    }
    this.lastUpdate = now;
    
    // Update HUD elements
    this.updateHUD();
    
    // Update notifications
    this.updateNotifications();
    
    // Update animations
    this.updateAnimations(deltaTime);
}

updateHUD() {
    // Update time display
    if (this.hud.timeDisplay) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        this.hud.timeDisplay.textContent = timeString;
    }
    
    // Update compass (would need camera rotation data)
    this.updateCompass();
}

updateCompass(cameraRotation = 0) {
    if (this.hud.compass) {
        const needle = this.hud.compass.querySelector('.compass-needle');
        if (needle) {
            needle.style.transform = `translateX(-50%) rotate(${cameraRotation}rad)`;
        }
    }
}

updateNotifications() {
    // Process notification queue
    if (this.notifications.queue.length > 0) {
        const visibleCount = this.elements.notificationContainer.children.length;
        
        if (visibleCount < this.notifications.maxVisible) {
            const notification = this.notifications.queue.shift();
            this.displayNotification(notification);
        }
    }
}

updateAnimations(deltaTime) {
    // Update active animations
    for (const [id, animation] of this.animations.active) {
        animation.elapsed += deltaTime * 1000; // Convert to milliseconds
        
        if (animation.elapsed >= animation.duration) {
            // Animation complete
            animation.complete();
            this.animations.active.delete(id);
        } else {
            // Update animation
            const progress = animation.elapsed / animation.duration;
            animation.update(this.easeInOutCubic(progress));
        }
    }
}

// Public API methods

showSettings() {
    if (this.state.settingsOpen) return;
    
    this.state.settingsOpen = true;
    if (this.elements.settingsPanel) {
        this.elements.settingsPanel.classList.remove('hidden');
    }
    
    this.showNotification('Settings opened', 'info');
}

hideSettings() {
    if (!this.state.settingsOpen) return;
    
    this.state.settingsOpen = false;
    if (this.elements.settingsPanel) {
        this.elements.settingsPanel.classList.add('hidden');
    }
    
    // Save settings when closing
    this.saveSettings();
}

toggleSettings() {
    if (this.state.settingsOpen) {
        this.hideSettings();
    } else {
        this.showSettings();
    }
}

toggleStats() {
    this.state.statsVisible = !this.state.statsVisible;
    
    if (this.elements.statsPanel) {
        if (this.state.statsVisible) {
            this.elements.statsPanel.classList.remove('hidden');
        } else {
            this.elements.statsPanel.classList.add('hidden');
        }
    }
    
    this.updateSetting('display', 'showStats', this.state.statsVisible);
}

toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            this.updateSetting('display', 'fullscreen', true);
            this.showNotification('Entered fullscreen', 'success');
        }).catch(() => {
            this.showNotification('Fullscreen not supported', 'warning');
        });
    } else {
        document.exitFullscreen().then(() => {
            this.updateSetting('display', 'fullscreen', false);
            this.showNotification('Exited fullscreen', 'info');
        });
    }
}

showNotification(message, type = 'info', title = null, duration = null) {
    if (!this.state.notificationsEnabled) return;
    
    const notification = {
        id: Date.now() + Math.random(),
        type: type,
        title: title,
        message: message,
        duration: duration || this.notifications.defaultDuration,
        timestamp: Date.now()
    };
    
    this.notifications.queue.push(notification);
}

displayNotification(notification) {
    const notificationEl = document.createElement('div');
    notificationEl.className = 'notification';
    notificationEl.dataset.id = notification.id;
    
    const typeConfig = this.notifications.types[notification.type] || this.notifications.types.info;
    notificationEl.style.borderLeftColor = typeConfig.color;
    
    notificationEl.innerHTML = `
        <div class="notification-icon">${typeConfig.icon}</div>
        <div class="notification-content">
            ${notification.title ? `<div class="notification-title">${notification.title}</div>` : ''}
            <div class="notification-message">${notification.message}</div>
        </div>
    `;
    
    this.elements.notificationContainer.appendChild(notificationEl);
    
    // Trigger show animation
    setTimeout(() => {
        notificationEl.classList.add('show');
    }, 10);
    
    // Auto-dismiss
    setTimeout(() => {
        this.dismissNotification(notificationEl);
    }, notification.duration);
}

dismissNotification(notificationEl) {
    notificationEl.classList.remove('show');
    
    setTimeout(() => {
        if (notificationEl.parentNode) {
            notificationEl.parentNode.removeChild(notificationEl);
        }
    }, 300);
}

updateSetting(category, key, value) {
    if (this.settings[category] && this.settings[category].hasOwnProperty(key)) {
        this.settings[category][key] = value;
        
        // Apply setting immediately
        this.applySetting(category, key, value);
        
        // Update UI element if needed
        this.updateSettingUI(category, key, value);
        
        console.log(`⚙️ Setting updated: ${category}.${key} = ${value}`);
    }
}

applySetting(category, key, value) {
    // Apply setting changes to the game
    switch (category) {
        case 'controls':
            if (key === 'showCrosshair') {
                this.updateCrosshairVisibility();
            }
            break;
        case 'display':
            if (key === 'showStats') {
                // Stats visibility is handled in toggleStats
            }
            break;
        // Add more setting applications as needed
    }
}

updateSettingUI(category, key, value) {
    // Update UI elements to reflect setting changes
    if (category === 'controls' && key === 'mouseSensitivity') {
        const sensitivityValue = document.getElementById('sensitivity-value');
        if (sensitivityValue) {
            sensitivityValue.textContent = value;
        }
    }
}

updateCrosshairVisibility() {
    if (this.hud.crosshair) {
        this.hud.crosshair.style.display = this.settings.controls.showCrosshair ? 'block' : 'none';
    }
}

saveSettings() {
    try {
        localStorage.setItem('summerAfternoonSettings', JSON.stringify(this.settings));
        console.log('💾 Settings saved');
    } catch (error) {
        console.warn('⚠️ Failed to save settings:', error);
    }
}

loadSettings() {
    try {
        const saved = localStorage.getItem('summerAfternoonSettings');
        if (saved) {
            const loadedSettings = JSON.parse(saved);
            
            // Merge with defaults (in case new settings were added)
            this.settings = this.deepMerge(this.settings, loadedSettings);
            
            // Update UI to reflect loaded settings
            this.updateUIFromSettings();
            
            console.log('📁 Settings loaded');
        }
```

