

/*
Purpose: Player character system for Summer Afternoon Three.js game
Key features: Character representation, movement physics, collision detection, animations, state management
Dependencies: Three.js, Camera.js, Environment.js
Related helpers: Input.js, Audio.js, MathUtils.js
Function names: init, update, move, jump, applyGravity, checkCollisions, setState, destroy
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 11:05 | File: js/modules/Character.js
*/

import { MathUtils } from ‘../utils/MathUtils.js’;

export class Character {
constructor(scene, camera) {
this.scene = scene;
this.camera = camera;

```
    // Character representation (invisible in first-person)
    this.characterMesh = null;
    this.characterGroup = new THREE.Group();
    
    // Physics properties
    this.physics = {
        position: new THREE.Vector3(0, 5, 10),
        velocity: new THREE.Vector3(),
        acceleration: new THREE.Vector3(),
        groundHeight: 0,
        isGrounded: false,
        gravity: -25,
        jumpForce: 12,
        friction: 0.85,
        airResistance: 0.98,
        maxSpeed: 12,
        sprintMultiplier: 1.8
    };
    
    // Movement configuration
    this.movement = {
        speed: 8,
        sprintSpeed: 14,
        acceleration: 25,
        deceleration: 20,
        rotationSpeed: 3,
        smoothing: 0.1,
        bobbing: {
            enabled: true,
            amplitude: 0.1,
            frequency: 8,
            time: 0
        }
    };
    
    // Character states
    this.state = {
        current: 'idle', // idle, walking, running, jumping, falling
        previous: 'idle',
        isMoving: false,
        isSprinting: false,
        isJumping: false,
        isFalling: false,
        canJump: true,
        jumpCooldown: 0
    };
    
    // Input tracking
    this.input = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        jump: false,
        mouseX: 0,
        mouseY: 0
    };
    
    // Collision detection
    this.collision = {
        radius: 0.8,
        height: 1.8,
        stepHeight: 0.5,
        raycaster: new THREE.Raycaster(),
        directions: [
            new THREE.Vector3(1, 0, 0),   // Right
            new THREE.Vector3(-1, 0, 0),  // Left
            new THREE.Vector3(0, 0, 1),   // Forward
            new THREE.Vector3(0, 0, -1),  // Backward
            new THREE.Vector3(0, -1, 0)   // Down
        ]
    };
    
    // Audio events
    this.audio = {
        footstepTimer: 0,
        footstepInterval: 0.5,
        lastFootstepTime: 0,
        jumpSoundPlayed: false,
        landingSoundPlayed: true
    };
    
    // Visual effects
    this.effects = {
        dustParticles: null,
        footprints: [],
        headBob: new THREE.Vector3(),
        breathingOffset: new THREE.Vector3()
    };
    
    // Performance
    this.updateFrequency = 60;
    this.lastUpdate = 0;
}

async init() {
    try {
        console.log('🚶 Initializing character...');
        
        // Create character visual representation (for third-person view)
        this.createCharacterMesh();
        
        // Set initial position
        this.setPosition(this.physics.position);
        
        // Setup collision raycaster
        this.collision.raycaster.far = this.collision.radius * 2;
        
        // Initialize effects
        this.initializeEffects();
        
        // Add character group to scene
        this.characterGroup.name = 'CharacterGroup';
        this.scene.add(this.characterGroup);
        
        console.log('✅ Character initialized successfully');
        
    } catch (error) {
        console.error('❌ Character initialization failed:', error);
        throw error;
    }
}

createCharacterMesh() {
    // Simple character representation (capsule shape)
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4169E1,
        transparent: true,
        opacity: 0.8
    });
    
    this.characterMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.characterMesh.name = 'CharacterBody';
    this.characterMesh.castShadow = true;
    this.characterMesh.visible = false; // Hidden in first-person mode
    
    // Add simple "eyes" to show direction
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.4, 0.25);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.4, 0.25);
    
    this.characterMesh.add(leftEye);
    this.characterMesh.add(rightEye);
    
    // Add to character group
    this.characterGroup.add(this.characterMesh);
}

initializeEffects() {
    // Initialize dust particle system for footsteps
    this.createDustParticles();
    
    // Initialize head bobbing
    this.movement.bobbing.time = 0;
}

createDustParticles() {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    
    const material = new THREE.PointsMaterial({
        color: 0xD2B48C,
        size: 0.1,
        transparent: true,
        opacity: 0.6
    });
    
    this.effects.dustParticles = new THREE.Points(geometry, material);
    this.effects.dustParticles.visible = false;
    this.characterGroup.add(this.effects.dustParticles);
}

update(deltaTime) {
    const now = performance.now();
    
    // Throttle updates for performance
    if (now - this.lastUpdate < 1000 / this.updateFrequency) {
        return;
    }
    this.lastUpdate = now;
    
    // Update physics
    this.updatePhysics(deltaTime);
    
    // Update movement and state
    this.updateMovement(deltaTime);
    
    // Update collision detection
    this.updateCollisions();
    
    // Update visual effects
    this.updateEffects(deltaTime);
    
    // Update audio
    this.updateAudio(deltaTime);
    
    // Update camera position to follow character
    this.updateCamera();
    
    // Update character state
    this.updateState();
}

updatePhysics(deltaTime) {
    // Apply gravity
    if (!this.physics.isGrounded) {
        this.physics.acceleration.y = this.physics.gravity;
    } else {
        this.physics.acceleration.y = 0;
        this.physics.velocity.y = 0;
    }
    
    // Apply air resistance
    this.physics.velocity.multiplyScalar(this.physics.airResistance);
    
    // Apply ground friction when grounded
    if (this.physics.isGrounded) {
        this.physics.velocity.x *= this.physics.friction;
        this.physics.velocity.z *= this.physics.friction;
    }
    
    // Integrate velocity
    this.physics.velocity.add(
        this.physics.acceleration.clone().multiplyScalar(deltaTime)
    );
    
    // Clamp horizontal velocity to max speed
    const horizontalVel = new THREE.Vector2(this.physics.velocity.x, this.physics.velocity.z);
    const currentSpeed = horizontalVel.length();
    const maxSpeed = this.state.isSprinting ? 
        this.physics.maxSpeed * this.physics.sprintMultiplier : 
        this.physics.maxSpeed;
    
    if (currentSpeed > maxSpeed) {
        horizontalVel.normalize().multiplyScalar(maxSpeed);
        this.physics.velocity.x = horizontalVel.x;
        this.physics.velocity.z = horizontalVel.y;
    }
    
    // Integrate position
    this.physics.position.add(
        this.physics.velocity.clone().multiplyScalar(deltaTime)
    );
    
    // Reset acceleration
    this.physics.acceleration.set(0, 0, 0);
}

updateMovement(deltaTime) {
    // Calculate movement input
    const inputVector = new THREE.Vector3();
    
    if (this.input.forward) inputVector.z -= 1;
    if (this.input.backward) inputVector.z += 1;
    if (this.input.left) inputVector.x -= 1;
    if (this.input.right) inputVector.x += 1;
    
    // Normalize input to prevent faster diagonal movement
    if (inputVector.length() > 0) {
        inputVector.normalize();
        this.state.isMoving = true;
    } else {
        this.state.isMoving = false;
    }
    
    // Apply camera rotation to movement
    if (this.camera && this.camera.camera) {
        const cameraDirection = new THREE.Vector3();
        this.camera.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();
        
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
        
        // Transform input relative to camera
        const worldMovement = new THREE.Vector3();
        worldMovement.addScaledVector(cameraDirection, -inputVector.z);
        worldMovement.addScaledVector(cameraRight, inputVector.x);
        
        // Apply movement force
        const moveSpeed = this.state.isSprinting ? this.movement.sprintSpeed : this.movement.speed;
        const force = worldMovement.multiplyScalar(moveSpeed * deltaTime * this.movement.acceleration);
        
        if (this.physics.isGrounded) {
            this.physics.velocity.add(force);
        } else {
            // Reduced air control
            this.physics.velocity.add(force.multiplyScalar(0.3));
        }
    }
    
    // Handle jumping
    if (this.input.jump && this.canJump()) {
        this.jump();
    }
    
    // Update jump cooldown
    if (this.state.jumpCooldown > 0) {
        this.state.jumpCooldown -= deltaTime;
    }
    
    // Update head bobbing
    if (this.state.isMoving && this.physics.isGrounded) {
        this.movement.bobbing.time += deltaTime * this.movement.bobbing.frequency;
        const bobAmount = Math.sin(this.movement.bobbing.time) * this.movement.bobbing.amplitude;
        this.effects.headBob.y = bobAmount;
    } else {
        this.effects.headBob.y = MathUtils.lerp(this.effects.headBob.y, 0, deltaTime * 5);
    }
}

updateCollisions() {
    // Ground collision
    this.checkGroundCollision();
    
    // Wall collisions
    this.checkWallCollisions();
    
    // Update character position
    this.characterGroup.position.copy(this.physics.position);
    this.characterGroup.position.add(this.effects.headBob);
}

checkGroundCollision() {
    // Cast ray downward to check for ground
    this.collision.raycaster.set(
        this.physics.position,
        new THREE.Vector3(0, -1, 0)
    );
    
    // Check collision with terrain and objects
    const intersects = this.collision.raycaster.intersectObjects(
        this.scene.children, 
        true
    );
    
    if (intersects.length > 0) {
        const groundDistance = intersects[0].distance;
        const groundY = intersects[0].point.y;
        
        // Check if character is on ground
        if (groundDistance <= this.collision.height / 2 + 0.1) {
            this.physics.isGrounded = true;
            this.physics.groundHeight = groundY;
            
            // Snap to ground if falling through
            if (this.physics.position.y < groundY + this.collision.height / 2) {
                this.physics.position.y = groundY + this.collision.height / 2;
                this.physics.velocity.y = 0;
                
                // Landing sound
                if (this.state.isFalling && !this.audio.landingSoundPlayed) {
                    this.playLandingSound();
                    this.audio.landingSoundPlayed = true;
                }
                
                this.state.isFalling = false;
            }
        } else {
            this.physics.isGrounded = false;
            this.audio.landingSoundPlayed = false;
            
            if (this.physics.velocity.y < 0) {
                this.state.isFalling = true;
            }
        }
    } else {
        this.physics.isGrounded = false;
        this.audio.landingSoundPlayed = false;
        
        if (this.physics.velocity.y < 0) {
            this.state.isFalling = true;
        }
    }
}

checkWallCollisions() {
    // Check horizontal collisions
    const horizontalDirections = [
        new THREE.Vector3(1, 0, 0),   // Right
        new THREE.Vector3(-1, 0, 0),  // Left  
        new THREE.Vector3(0, 0, 1),   // Forward
        new THREE.Vector3(0, 0, -1)   // Backward
    ];
    
    for (const direction of horizontalDirections) {
        this.collision.raycaster.set(
            this.physics.position,
            direction
        );
        
        const intersects = this.collision.raycaster.intersectObjects(
            this.scene.children,
            true
        );
        
        if (intersects.length > 0 && intersects[0].distance < this.collision.radius) {
            // Stop movement in collision direction
            const dot = this.physics.velocity.dot(direction);
            if (dot > 0) {
                this.physics.velocity.sub(direction.clone().multiplyScalar(dot));
            }
            
            // Push character away from wall
            const pushback = direction.clone().multiplyScalar(-(this.collision.radius - intersects[0].distance));
            this.physics.position.add(pushback);
        }
    }
}

updateEffects(deltaTime) {
    // Update dust particles if moving
    if (this.state.isMoving && this.physics.isGrounded) {
        this.updateDustParticles(deltaTime);
    }
    
    // Update breathing animation
    const breathingTime = performance.now() * 0.001;
    this.effects.breathingOffset.y = Math.sin(breathingTime * 0.5) * 0.02;
}

updateDustParticles(deltaTime) {
    // Simple dust particle animation
    if (this.effects.dustParticles && this.audio.footstepTimer <= 0) {
        // Trigger dust particles on footstep
        this.createFootstepDust();
        this.audio.footstepTimer = this.audio.footstepInterval;
    }
    
    if (this.audio.footstepTimer > 0) {
        this.audio.footstepTimer -= deltaTime;
    }
}

createFootstepDust() {
    // Create small dust effect at foot position
    const dustPosition = this.physics.position.clone();
    dustPosition.y = this.physics.groundHeight + 0.1;
    
    // Simple dust visual effect would be implemented here
    console.log('💨 Footstep dust at', dustPosition);
}

updateAudio(deltaTime) {
    // Play footstep sounds
    if (this.state.isMoving && this.physics.isGrounded) {
        this.audio.footstepTimer -= deltaTime;
        
        if (this.audio.footstepTimer <= 0) {
            this.playFootstepSound();
            
            // Adjust interval based on movement speed
            this.audio.footstepInterval = this.state.isSprinting ? 0.3 : 0.5;
            this.audio.footstepTimer = this.audio.footstepInterval;
        }
    }
}

updateCamera() {
    if (!this.camera) return;
    
    // Update camera position to character position plus head bob and breathing
    const cameraPosition = this.physics.position.clone();
    cameraPosition.add(this.effects.headBob);
    cameraPosition.add(this.effects.breathingOffset);
    
    // Smooth camera following
    this.camera.setPosition(cameraPosition.x, cameraPosition.y, cameraPosition.z);
}

updateState() {
    this.state.previous = this.state.current;
    
    // Determine current state
    if (!this.physics.isGrounded) {
        if (this.physics.velocity.y > 0) {
            this.state.current = 'jumping';
            this.state.isJumping = true;
            this.state.isFalling = false;
        } else {
            this.state.current = 'falling';
            this.state.isJumping = false;
            this.state.isFalling = true;
        }
    } else {
        this.state.isJumping = false;
        this.state.isFalling = false;
        
        if (this.state.isMoving) {
            this.state.current = this.state.isSprinting ? 'running' : 'walking';
        } else {
            this.state.current = 'idle';
        }
    }
    
    // Log state changes
    if (this.state.current !== this.state.previous) {
        console.log(`🎭 Character state: ${this.state.previous} → ${this.state.current}`);
    }
}

// Input methods
setInput(inputType, value) {
    if (this.input.hasOwnProperty(inputType)) {
        this.input[inputType] = value;
    }
}

move(direction, speed = 1) {
    const moveVector = direction.clone().normalize().multiplyScalar(speed);
    this.physics.velocity.add(moveVector);
}

jump() {
    if (!this.canJump()) return false;
    
    this.physics.velocity.y = this.physics.jumpForce;
    this.physics.isGrounded = false;
    this.state.jumpCooldown = 0.2; // Prevent double jumping
    this.audio.jumpSoundPlayed = false;
    
    // Play jump sound
    this.playJumpSound();
    
    console.log('🦘 Character jumped');
    return true;
}

canJump() {
    return this.physics.isGrounded && this.state.jumpCooldown <= 0;
}

setPosition(position) {
    this.physics.position.copy(position);
    this.characterGroup.position.copy(position);
    
    if (this.camera) {
        this.camera.setPosition(position.x, position.y, position.z);
    }
}

getPosition() {
    return this.physics.position.clone();
}

getVelocity() {
    return this.physics.velocity.clone();
}

getState() {
    return { ...this.state };
}

setSprinting(isSprinting) {
    this.state.isSprinting = isSprinting;
    this.input.sprint = isSprinting;
}

// Audio methods (to be connected with Audio module)
playFootstepSound() {
    // This would trigger the audio system
    console.log('👣 Footstep sound');
}

playJumpSound() {
    // This would trigger the audio system
    console.log('🎵 Jump sound');
}

playLandingSound() {
    // This would trigger the audio system
    console.log('🎵 Landing sound');
}

// Utility methods
getDistanceToGround() {
    return this.physics.position.y - this.physics.groundHeight;
}

isMoving() {
    return this.state.isMoving;
}

isGrounded() {
    return this.physics.isGrounded;
}

setVisible(visible) {
    if (this.characterMesh) {
        this.characterMesh.visible = visible;
    }
}

// Debug methods
enableDebugMode() {
    this.setVisible(true);
    
    // Add debug helpers
    const helper = new THREE.BoxHelper(this.characterMesh, 0x00FF00);
    this.characterGroup.add(helper);
    
    console.log('🐛 Character debug mode enabled');
}

disableDebugMode() {
    this.setVisible(false);
    
    // Remove debug helpers
    const helpers = this.characterGroup.children.filter(child => child.type === 'LineSegments');
    helpers.forEach(helper => this.characterGroup.remove(helper));
    
    console.log('🐛 Character debug mode disabled');
}

destroy() {
    console.log('🧹 Cleaning up character...');
    
    try {
        // Remove from scene
        if (this.characterGroup.parent) {
            this.characterGroup.parent.remove(this.characterGroup);
        }
        
        // Dispose of geometries and materials
        this.characterGroup.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        // Clear references
        this.scene = null;
        this.camera = null;
        this.characterMesh = null;
        this.characterGroup = null;
        this.collision.raycaster = null;
        
        console.log('✅ Character cleanup complete');
        
    } catch (error) {
        console.error('❌ Character cleanup failed:', error);
    }
}
```

}

