

/*
Purpose: Comprehensive input handling system for Summer Afternoon Three.js game
Key features: Keyboard/mouse/touch input, key mapping, input buffering, context switching, accessibility
Dependencies: Three.js, Camera.js, Character.js
Related helpers: UI.js, main.js
Function names: init, update, handleKeyboard, handleMouse, handleTouch, mapInput, destroy
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 11:10 | File: js/modules/Input.js
*/

export class Input {
constructor(camera, character) {
this.camera = camera;
this.character = character;

```
    // Input states
    this.keys = new Map();
    this.mouseButtons = new Map();
    this.touches = new Map();
    
    // Input configuration
    this.config = {
        keyboard: {
            enabled: true,
            repeatDelay: 150,
            repeatRate: 50
        },
        mouse: {
            enabled: true,
            sensitivity: 1.0,
            invertY: false,
            smoothing: 0.1
        },
        touch: {
            enabled: true,
            sensitivity: 0.8,
            deadzone: 0.1,
            maxTouches: 10
        },
        gamepad: {
            enabled: true,
            deadzone: 0.15,
            sensitivity: 1.0
        }
    };
    
    // Key mappings
    this.keyMappings = new Map([
        // Movement
        ['KeyW', 'moveForward'],
        ['ArrowUp', 'moveForward'],
        ['KeyS', 'moveBackward'],
        ['ArrowDown', 'moveBackward'],
        ['KeyA', 'moveLeft'],
        ['ArrowLeft', 'moveLeft'],
        ['KeyD', 'moveRight'],
        ['ArrowRight', 'moveRight'],
        
        // Actions
        ['Space', 'jump'],
        ['ShiftLeft', 'sprint'],
        ['ShiftRight', 'sprint'],
        ['ControlLeft', 'crouch'],
        ['ControlRight', 'crouch'],
        
        // Interface
        ['Escape', 'menu'],
        ['Tab', 'inventory'],
        ['KeyE', 'interact'],
        ['KeyF', 'flashlight'],
        ['KeyM', 'map'],
        
        // Debug
        ['Backquote', 'console'],
        ['F1', 'help'],
        ['F3', 'debug'],
        ['F11', 'fullscreen']
    ]);
    
    // Action states
    this.actions = new Map([
        ['moveForward', false],
        ['moveBackward', false],
        ['moveLeft', false],
        ['moveRight', false],
        ['jump', false],
        ['sprint', false],
        ['crouch', false],
        ['menu', false],
        ['inventory', false],
        ['interact', false],
        ['flashlight', false],
        ['map', false],
        ['console', false],
        ['help', false],
        ['debug', false],
        ['fullscreen', false]
    ]);
    
    // Input contexts (different input modes)
    this.contexts = {
        current: 'game', // game, menu, inventory, chat
        stack: ['game'],
        modes: {
            game: {
                allowMovement: true,
                allowCamera: true,
                allowActions: true
            },
            menu: {
                allowMovement: false,
                allowCamera: false,
                allowActions: false
            },
            inventory: {
                allowMovement: false,
                allowCamera: true,
                allowActions: false
            }
        }
    };
    
    // Touch controls
    this.touchControls = {
        joystick: {
            active: false,
            startPos: new THREE.Vector2(),
            currentPos: new THREE.Vector2(),
            delta: new THREE.Vector2(),
            radius: 60,
            element: null
        },
        lookPad: {
            active: false,
            startPos: new THREE.Vector2(),
            currentPos: new THREE.Vector2(),
            delta: new THREE.Vector2(),
            element: null
        }
    };
    
    // Gamepad support
    this.gamepads = {
        connected: new Map(),
        buttonMappings: new Map([
            [0, 'jump'],      // A button
            [1, 'crouch'],    // B button
            [2, 'interact'],  // X button
            [3, 'inventory'], // Y button
            [4, 'sprint'],    // LB
            [5, 'sprint'],    // RB
            [9, 'menu']       // Menu button
        ]),
        axisMappings: new Map([
            [0, 'moveHorizontal'],  // Left stick X
            [1, 'moveVertical'],    // Left stick Y
            [2, 'lookHorizontal'],  // Right stick X
            [3, 'lookVertical']     // Right stick Y
        ])
    };
    
    // Input buffering for responsive controls
    this.inputBuffer = {
        enabled: true,
        maxSize: 10,
        bufferTime: 200, // milliseconds
        buffer: []
    };
    
    // Performance
    this.updateFrequency = 60;
    this.lastUpdate = 0;
    
    // Event listeners storage for cleanup
    this.eventListeners = [];
}

async init() {
    try {
        console.log('🎮 Initializing input system...');
        
        // Setup keyboard events
        this.setupKeyboardEvents();
        
        // Setup mouse events
        this.setupMouseEvents();
        
        // Setup touch events
        this.setupTouchEvents();
        
        // Setup gamepad events
        this.setupGamepadEvents();
        
        // Create touch controls UI if on mobile
        if (this.isMobileDevice()) {
            this.createTouchControls();
        }
        
        // Setup input context switching
        this.setupContextSwitching();
        
        console.log('✅ Input system initialized successfully');
        
    } catch (error) {
        console.error('❌ Input initialization failed:', error);
        throw error;
    }
}

setupKeyboardEvents() {
    if (!this.config.keyboard.enabled) return;
    
    const handleKeyDown = (event) => {
        if (this.shouldPreventDefault(event)) {
            event.preventDefault();
        }
        
        this.handleKeyDown(event.code, event);
    };
    
    const handleKeyUp = (event) => {
        if (this.shouldPreventDefault(event)) {
            event.preventDefault();
        }
        
        this.handleKeyUp(event.code, event);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    this.eventListeners.push(
        { element: document, event: 'keydown', handler: handleKeyDown },
        { element: document, event: 'keyup', handler: handleKeyUp }
    );
    
    console.log('⌨️ Keyboard events setup');
}

setupMouseEvents() {
    if (!this.config.mouse.enabled) return;
    
    const handleMouseMove = (event) => {
        this.handleMouseMove(event);
    };
    
    const handleMouseDown = (event) => {
        this.handleMouseDown(event.button, event);
    };
    
    const handleMouseUp = (event) => {
        this.handleMouseUp(event.button, event);
    };
    
    const handleWheel = (event) => {
        this.handleMouseWheel(event);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    this.eventListeners.push(
        { element: document, event: 'mousemove', handler: handleMouseMove },
        { element: document, event: 'mousedown', handler: handleMouseDown },
        { element: document, event: 'mouseup', handler: handleMouseUp },
        { element: document, event: 'wheel', handler: handleWheel }
    );
    
    console.log('🖱️ Mouse events setup');
}

setupTouchEvents() {
    if (!this.config.touch.enabled) return;
    
    const handleTouchStart = (event) => {
        event.preventDefault();
        this.handleTouchStart(event);
    };
    
    const handleTouchMove = (event) => {
        event.preventDefault();
        this.handleTouchMove(event);
    };
    
    const handleTouchEnd = (event) => {
        event.preventDefault();
        this.handleTouchEnd(event);
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    
    this.eventListeners.push(
        { element: document, event: 'touchstart', handler: handleTouchStart },
        { element: document, event: 'touchmove', handler: handleTouchMove },
        { element: document, event: 'touchend', handler: handleTouchEnd },
        { element: document, event: 'touchcancel', handler: handleTouchEnd }
    );
    
    console.log('👆 Touch events setup');
}

setupGamepadEvents() {
    if (!this.config.gamepad.enabled) return;
    
    const handleGamepadConnected = (event) => {
        this.handleGamepadConnected(event.gamepad);
    };
    
    const handleGamepadDisconnected = (event) => {
        this.handleGamepadDisconnected(event.gamepad);
    };
    
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);
    
    this.eventListeners.push(
        { element: window, event: 'gamepadconnected', handler: handleGamepadConnected },
        { element: window, event: 'gamepaddisconnected', handler: handleGamepadDisconnected }
    );
    
    console.log('🎮 Gamepad events setup');
}

setupContextSwitching() {
    // Handle escape key for context switching
    this.addActionListener('menu', (pressed) => {
        if (pressed) {
            this.toggleContext('menu');
        }
    });
    
    // Handle other context switches
    this.addActionListener('inventory', (pressed) => {
        if (pressed) {
            this.pushContext('inventory');
        }
    });
}

update(deltaTime) {
    const now = performance.now();
    
    // Throttle updates for performance
    if (now - this.lastUpdate < 1000 / this.updateFrequency) {
        return;
    }
    this.lastUpdate = now;
    
    // Update gamepad inputs
    this.updateGamepads();
    
    // Process input buffer
    this.processInputBuffer();
    
    // Update character inputs
    this.updateCharacterInputs();
    
    // Update camera inputs
    this.updateCameraInputs();
    
    // Clean expired buffered inputs
    this.cleanInputBuffer();
}

handleKeyDown(keyCode, event) {
    // Store key state
    this.keys.set(keyCode, {
        pressed: true,
        timestamp: performance.now(),
        repeat: event.repeat
    });
    
    // Map to action
    const action = this.keyMappings.get(keyCode);
    if (action) {
        this.setAction(action, true);
        this.bufferInput(action, true, performance.now());
    }
    
    // Handle special keys
    this.handleSpecialKeys(keyCode, true);
}

handleKeyUp(keyCode, event) {
    // Store key state
    this.keys.set(keyCode, {
        pressed: false,
        timestamp: performance.now(),
        repeat: false
    });
    
    // Map to action
    const action = this.keyMappings.get(keyCode);
    if (action) {
        this.setAction(action, false);
    }
    
    // Handle special keys
    this.handleSpecialKeys(keyCode, false);
}

handleMouseMove(event) {
    if (!this.isContextAllowed('allowCamera')) return;
    
    // Apply mouse sensitivity and smoothing
    const deltaX = event.movementX * this.config.mouse.sensitivity;
    const deltaY = event.movementY * this.config.mouse.sensitivity;
    
    // Invert Y if configured
    const finalDeltaY = this.config.mouse.invertY ? deltaY : -deltaY;
    
    // Send to camera
    if (this.camera && this.camera.onMouseMove) {
        this.camera.onMouseMove({
            movementX: deltaX,
            movementY: finalDeltaY
        });
    }
}

handleMouseDown(button, event) {
    this.mouseButtons.set(button, {
        pressed: true,
        timestamp: performance.now()
    });
    
    // Handle specific mouse buttons
    switch (button) {
        case 0: // Left click
            this.setAction('interact', true);
            break;
        case 2: // Right click
            this.setAction('crouch', true);
            break;
    }
}

handleMouseUp(button, event) {
    this.mouseButtons.set(button, {
        pressed: false,
        timestamp: performance.now()
    });
    
    // Handle specific mouse buttons
    switch (button) {
        case 0: // Left click
            this.setAction('interact', false);
            break;
        case 2: // Right click
            this.setAction('crouch', false);
            break;
    }
}

handleMouseWheel(event) {
    // Zoom or weapon switching could be handled here
    const delta = event.deltaY;
    console.log('🎯 Mouse wheel:', delta);
}

handleTouchStart(event) {
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchData = {
            id: touch.identifier,
            startPos: new THREE.Vector2(touch.clientX, touch.clientY),
            currentPos: new THREE.Vector2(touch.clientX, touch.clientY),
            timestamp: performance.now()
        };
        
        this.touches.set(touch.identifier, touchData);
        
        // Determine touch zone (left side = movement, right side = look)
        if (touch.clientX < window.innerWidth / 2) {
            this.handleMovementTouchStart(touchData);
        } else {
            this.handleLookTouchStart(touchData);
        }
    }
}

handleTouchMove(event) {
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        const touchData = this.touches.get(touch.identifier);
        
        if (touchData) {
            touchData.currentPos.set(touch.clientX, touch.clientY);
            
            // Update appropriate control
            if (touch.clientX < window.innerWidth / 2) {
                this.updateMovementTouch(touchData);
            } else {
                this.updateLookTouch(touchData);
            }
        }
    }
}

handleTouchEnd(event) {
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        this.touches.delete(touch.identifier);
    }
    
    // Reset touch controls
    this.resetTouchControls();
}

handleMovementTouchStart(touchData) {
    this.touchControls.joystick.active = true;
    this.touchControls.joystick.startPos.copy(touchData.startPos);
}

updateMovementTouch(touchData) {
    if (!this.touchControls.joystick.active) return;
    
    const delta = touchData.currentPos.clone().sub(touchData.startPos);
    const distance = delta.length();
    const maxDistance = this.touchControls.joystick.radius;
    
    if (distance > maxDistance) {
        delta.normalize().multiplyScalar(maxDistance);
    }
    
    // Convert to movement input
    const normalizedDelta = delta.divideScalar(maxDistance);
    
    if (normalizedDelta.length() > this.config.touch.deadzone) {
        this.setAction('moveForward', normalizedDelta.y < -this.config.touch.deadzone);
        this.setAction('moveBackward', normalizedDelta.y > this.config.touch.deadzone);
        this.setAction('moveLeft', normalizedDelta.x < -this.config.touch.deadzone);
        this.setAction('moveRight', normalizedDelta.x > this.config.touch.deadzone);
    }
}

handleLookTouchStart(touchData) {
    this.touchControls.lookPad.active = true;
    this.touchControls.lookPad.startPos.copy(touchData.startPos);
}

updateLookTouch(touchData) {
    if (!this.touchControls.lookPad.active) return;
    
    const delta = touchData.currentPos.clone().sub(touchData.startPos);
    
    // Apply touch sensitivity
    delta.multiplyScalar(this.config.touch.sensitivity * 0.01);
    
    // Send to camera
    if (this.camera && this.camera.onMouseMove) {
        this.camera.onMouseMove({
            movementX: delta.x,
            movementY: -delta.y
        });
    }
    
    // Reset start position for continuous look
    touchData.startPos.copy(touchData.currentPos);
}

resetTouchControls() {
    this.touchControls.joystick.active = false;
    this.touchControls.lookPad.active = false;
    
    // Reset movement actions
    this.setAction('moveForward', false);
    this.setAction('moveBackward', false);
    this.setAction('moveLeft', false);
    this.setAction('moveRight', false);
}

handleGamepadConnected(gamepad) {
    this.gamepads.connected.set(gamepad.index, gamepad);
    console.log(`🎮 Gamepad connected: ${gamepad.id}`);
}

handleGamepadDisconnected(gamepad) {
    this.gamepads.connected.delete(gamepad.index);
    console.log(`🎮 Gamepad disconnected: ${gamepad.id}`);
}

updateGamepads() {
    const gamepads = navigator.getGamepads();
    
    for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (!gamepad) continue;
        
        // Update stored gamepad data
        this.gamepads.connected.set(i, gamepad);
        
        // Process buttons
        this.processGamepadButtons(gamepad);
        
        // Process axes
        this.processGamepadAxes(gamepad);
    }
}

processGamepadButtons(gamepad) {
    for (let i = 0; i < gamepad.buttons.length; i++) {
        const button = gamepad.buttons[i];
        const action = this.gamepads.buttonMappings.get(i);
        
        if (action && button.pressed) {
            this.setAction(action, true);
        } else if (action) {
            this.setAction(action, false);
        }
    }
}

processGamepadAxes(gamepad) {
    const deadzone = this.config.gamepad.deadzone;
    
    for (let i = 0; i < gamepad.axes.length; i++) {
        const axisValue = gamepad.axes[i];
        const axisAction = this.gamepads.axisMappings.get(i);
        
        if (Math.abs(axisValue) > deadzone) {
            this.processGamepadAxis(axisAction, axisValue);
        }
    }
}

processGamepadAxis(axisAction, value) {
    switch (axisAction) {
        case 'moveHorizontal':
            this.setAction('moveLeft', value < -this.config.gamepad.deadzone);
            this.setAction('moveRight', value > this.config.gamepad.deadzone);
            break;
        case 'moveVertical':
            this.setAction('moveForward', value < -this.config.gamepad.deadzone);
            this.setAction('moveBackward', value > this.config.gamepad.deadzone);
            break;
        case 'lookHorizontal':
        case 'lookVertical':
            // Send to camera
            if (this.camera && this.camera.onMouseMove) {
                const isHorizontal = axisAction === 'lookHorizontal';
                this.camera.onMouseMove({
                    movementX: isHorizontal ? value * this.config.gamepad.sensitivity : 0,
                    movementY: !isHorizontal ? -value * this.config.gamepad.sensitivity : 0
                });
            }
            break;
    }
}

updateCharacterInputs() {
    if (!this.character || !this.isContextAllowed('allowMovement')) return;
    
    // Update character input states
    this.character.setInput('forward', this.getAction('moveForward'));
    this.character.setInput('backward', this.getAction('moveBackward'));
    this.character.setInput('left', this.getAction('moveLeft'));
    this.character.setInput('right', this.getAction('moveRight'));
    this.character.setInput('jump', this.getAction('jump'));
    this.character.setInput('sprint', this.getAction('sprint'));
}

updateCameraInputs() {
    if (!this.camera || !this.isContextAllowed('allowCamera')) return;
    
    // Camera inputs are handled directly in mouse/touch events
}

// Action management
setAction(action, value) {
    if (this.actions.has(action)) {
        this.actions.set(action, value);
    }
}

getAction(action) {
    return this.actions.get(action) || false;
}

addActionListener(action, callback) {
    // Simple action listener system
    if (!this.actionListeners) {
        this.actionListeners = new Map();
    }
    
    if (!this.actionListeners.has(action)) {
        this.actionListeners.set(action, []);
    }
    
    this.actionListeners.get(action).push(callback);
}

triggerActionListeners(action, value) {
    if (this.actionListeners && this.actionListeners.has(action)) {
        this.actionListeners.get(action).forEach(callback => {
            callback(value);
        });
    }
}

// Input buffering
bufferInput(action, value, timestamp) {
    if (!this.inputBuffer.enabled) return;
    
    this.inputBuffer.buffer.push({
        action,
        value,
        timestamp
    });
    
    // Limit buffer size
    if (this.inputBuffer.buffer.length > this.inputBuffer.maxSize) {
        this.inputBuffer.buffer.shift();
    }
}

processInputBuffer() {
    const now = performance.now();
    
    for (const input of this.inputBuffer.buffer) {
        if (now - input.timestamp <= this.inputBuffer.bufferTime) {
            // Process buffered input
            this.setAction(input.action, input.value);
            this.triggerActionListeners(input.action, input.value);
        }
    }
}

cleanInputBuffer() {
    const now = performance.now();
    this.inputBuffer.buffer = this.inputBuffer.buffer.filter(
        input => now - input.timestamp <= this.inputBuffer.bufferTime
    );
}

// Context management
pushContext(context) {
    if (this.contexts.modes[context]) {
        this.contexts.stack.push(context);
        this.contexts.current = context;
        console.log(`📝 Input context pushed: ${context}`);
    }
}

popContext() {
    if (this.contexts.stack.length > 1) {
        this.contexts.stack.pop();
        this.contexts.current = this.contexts.stack[this.contexts.stack.length - 1];
        console.log(`📝 Input context popped: ${this.contexts.current}`);
    }
}

toggleContext(context) {
    if (this.contexts.current === context) {
        this.popContext();
    } else {
        this.pushContext(context);
    }
}

isContextAllowed(permission) {
    const currentMode = this.contexts.modes[this.contexts.current];
    return currentMode && currentMode[permission];
}

// Utility methods
handleSpecialKeys(keyCode, pressed) {
    if (!pressed) return;
    
    switch (keyCode) {
        case 'F11':
            this.toggleFullscreen();
            break;
        case 'F3':
            this.toggleDebugMode();
            break;
    }
}

toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

toggleDebugMode() {
    // This would toggle debug overlays
    console.log('🐛 Debug mode toggled');
}

shouldPreventDefault(event) {
    // Prevent default for game controls but allow browser shortcuts
    const gameCodes = Array.from(this.keyMappings.keys());
    return gameCodes.includes(event.code) && this.isContextAllowed('allowMovement');
}

isMobileDevice() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

createTouchControls() {
    // This would create visual touch controls UI
    console.log('📱 Creating touch controls UI');
}

// Configuration methods
setSensitivity(type, value) {
    if (this.config[type]) {
        this.config[type].sensitivity = Math.max(0.1, Math.min(5.0, value));
    }
}

setKeyMapping(keyCode, action) {
    this.keyMappings.set(keyCode, action);
}

getKeyMapping(action) {
    for (const [key, mappedAction] of this.keyMappings) {
        if (mappedAction === action) {
            return key;
        }
    }
    return null;
}

resetToDefaults() {
    // Reset all configurations to defaults
    this.config.mouse.sensitivity = 1.0;
    this.config.touch.sensitivity = 0.8;
    this.config.gamepad.sensitivity = 1.0;
    
    console.log('🔄 Input settings reset to defaults');
}

destroy() {
    console.log('🧹 Cleaning up input system...');
    
    try {
        // Remove all event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners.length = 0;
        
        // Clear input states
        this.keys.clear();
        this.mouseButtons.clear();
        this.touches.clear();
        this.actions.clear();
        
        // Clear gamepads
        this.gamepads.connected.clear();
        
        // Clear input buffer
        this.inputBuffer.buffer.length = 0;
        
        // Clear references
        this.camera = null;
        this.character = null;
        
        console.log('✅ Input cleanup complete');
        
    } catch (error) {
        console.error('❌ Input cleanup failed:', error);
    }
}
```

}

