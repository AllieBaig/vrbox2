

/*
Purpose: Camera management and control system for Summer Afternoon Three.js game
Key features: First-person camera, smooth movement, mouse look, camera constraints, transitions
Dependencies: Three.js
Related helpers: Input.js, Character.js, main.js
Function names: init, update, handleResize, setPosition, lookAt, smoothTransition, destroy
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 10:50 | File: js/modules/Camera.js
*/

export class Camera {
constructor(renderer) {
this.renderer = renderer;
this.camera = null;

```
    // Camera configuration
    this.config = {
        fov: 75,
        near: 0.1,
        far: 1000,
        initialPosition: { x: 0, y: 5, z: 10 },
        initialRotation: { x: 0, y: 0, z: 0 }
    };
    
    // Mouse look settings
    this.mouseLook = {
        sensitivity: 0.002,
        pitch: 0,
        yaw: 0,
        pitchLimit: Math.PI / 2 - 0.1,
        smoothing: 0.1,
        targetPitch: 0,
        targetYaw: 0
    };
    
    // Camera movement
    this.movement = {
        speed: 10,
        sprintMultiplier: 2,
        smoothing: 0.15,
        velocity: new THREE.Vector3(),
        targetVelocity: new THREE.Vector3(),
        position: new THREE.Vector3(),
        targetPosition: new THREE.Vector3()
    };
    
    // Camera shake
    this.shake = {
        intensity: 0,
        duration: 0,
        frequency: 20,
        decay: 0.95,
        offset: new THREE.Vector3()
    };
    
    // State
    this.isLocked = false;
    this.isFirstPerson = true;
    this.followTarget = null;
    this.followOffset = new THREE.Vector3(0, 2, 5);
    
    // Raycaster for collision detection
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2;
}

async init() {
    try {
        console.log('📷 Initializing camera...');
        
        // Create perspective camera
        this.camera = new THREE.PerspectiveCamera(
            this.config.fov,
            window.innerWidth / window.innerHeight,
            this.config.near,
            this.config.far
        );
        
        // Set initial position and rotation
        this.camera.position.set(
            this.config.initialPosition.x,
            this.config.initialPosition.y,
            this.config.initialPosition.z
        );
        
        this.camera.rotation.set(
            this.config.initialRotation.x,
            this.config.initialRotation.y,
            this.config.initialRotation.z
        );
        
        // Initialize movement tracking
        this.movement.position.copy(this.camera.position);
        this.movement.targetPosition.copy(this.camera.position);
        
        // Setup pointer lock for first-person controls
        this.setupPointerLock();
        
        // Setup camera group for shake effects
        this.cameraGroup = new THREE.Group();
        this.cameraGroup.add(this.camera);
        
        console.log('✅ Camera initialized successfully');
        
    } catch (error) {
        console.error('❌ Camera initialization failed:', error);
        throw error;
    }
}

setupPointerLock() {
    const canvas = this.renderer.domElement;
    
    // Pointer lock change event
    const onPointerLockChange = () => {
        this.isLocked = document.pointerLockElement === canvas;
        
        if (this.isLocked) {
            console.log('🔒 Pointer locked - camera control enabled');
            document.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        } else {
            console.log('🔓 Pointer unlocked - camera control disabled');
            document.removeEventListener('mousemove', this.onMouseMove.bind(this), false);
        }
    };
    
    // Pointer lock error event
    const onPointerLockError = () => {
        console.warn('⚠️ Pointer lock failed');
    };
    
    // Add event listeners
    document.addEventListener('pointerlockchange', onPointerLockChange, false);
    document.addEventListener('pointerlockerror', onPointerLockError, false);
    
    // Click to lock pointer
    canvas.addEventListener('click', () => {
        if (!this.isLocked) {
            canvas.requestPointerLock();
        }
    });
    
    this.pointerLockEvents = {
        change: onPointerLockChange,
        error: onPointerLockError
    };
}

onMouseMove(event) {
    if (!this.isLocked) return;
    
    // Update target rotation based on mouse movement
    this.mouseLook.targetYaw -= event.movementX * this.mouseLook.sensitivity;
    this.mouseLook.targetPitch -= event.movementY * this.mouseLook.sensitivity;
    
    // Clamp pitch to prevent over-rotation
    this.mouseLook.targetPitch = Math.max(
        -this.mouseLook.pitchLimit,
        Math.min(this.mouseLook.pitchLimit, this.mouseLook.targetPitch)
    );
}

update(deltaTime) {
    if (!this.camera) return;
    
    // Update mouse look smoothly
    this.updateMouseLook(deltaTime);
    
    // Update camera movement
    this.updateMovement(deltaTime);
    
    // Update camera shake
    this.updateShake(deltaTime);
    
    // Update follow target if set
    if (this.followTarget) {
        this.updateFollowTarget(deltaTime);
    }
    
    // Apply final transformations
    this.applyTransformations();
}

updateMouseLook(deltaTime) {
    // Smooth interpolation for mouse look
    const smoothing = 1 - Math.pow(1 - this.mouseLook.smoothing, deltaTime * 60);
    
    this.mouseLook.pitch += (this.mouseLook.targetPitch - this.mouseLook.pitch) * smoothing;
    this.mouseLook.yaw += (this.mouseLook.targetYaw - this.mouseLook.yaw) * smoothing;
    
    // Apply rotation to camera
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.mouseLook.yaw;
    this.camera.rotation.x = this.mouseLook.pitch;
}

updateMovement(deltaTime) {
    // Smooth velocity interpolation
    const smoothing = 1 - Math.pow(1 - this.movement.smoothing, deltaTime * 60);
    
    this.movement.velocity.lerp(this.movement.targetVelocity, smoothing);
    
    // Apply velocity to position
    const velocityDelta = this.movement.velocity.clone().multiplyScalar(deltaTime);
    this.movement.targetPosition.add(velocityDelta);
    
    // Smooth position interpolation
    this.movement.position.lerp(this.movement.targetPosition, smoothing);
}

updateShake(deltaTime) {
    if (this.shake.duration <= 0) {
        this.shake.offset.set(0, 0, 0);
        return;
    }
    
    // Decrease shake duration
    this.shake.duration -= deltaTime;
    
    // Generate random shake offset
    const intensity = this.shake.intensity * (this.shake.duration / 1000);
    const time = performance.now() * 0.001 * this.shake.frequency;
    
    this.shake.offset.x = Math.sin(time * 1.1) * intensity;
    this.shake.offset.y = Math.sin(time * 0.9) * intensity;
    this.shake.offset.z = Math.sin(time * 1.3) * intensity;
    
    // Apply decay
    this.shake.intensity *= this.shake.decay;
}

updateFollowTarget(deltaTime) {
    if (!this.followTarget) return;
    
    // Calculate target position based on follow target
    const targetPos = this.followTarget.position.clone();
    targetPos.add(this.followOffset);
    
    // Smooth follow
    this.movement.targetPosition.lerp(targetPos, deltaTime * 2);
    
    // Look at target
    if (this.followTarget.position) {
        const lookAtPos = this.followTarget.position.clone();
        lookAtPos.y += 1; // Look slightly above the target
        this.camera.lookAt(lookAtPos);
    }
}

applyTransformations() {
    // Apply movement position
    this.camera.position.copy(this.movement.position);
    
    // Apply shake offset
    this.camera.position.add(this.shake.offset);
}

moveForward(distance) {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0; // Keep movement horizontal
    direction.normalize();
    
    this.movement.targetVelocity.add(direction.multiplyScalar(distance));
}

moveRight(distance) {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    
    // Get right vector by crossing up and forward
    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0));
    right.normalize();
    
    this.movement.targetVelocity.add(right.multiplyScalar(distance));
}

moveUp(distance) {
    this.movement.targetVelocity.y += distance;
}

setVelocity(x, y, z) {
    this.movement.targetVelocity.set(x, y, z);
}

addVelocity(x, y, z) {
    this.movement.targetVelocity.add(new THREE.Vector3(x, y, z));
}

setPosition(x, y, z) {
    this.movement.position.set(x, y, z);
    this.movement.targetPosition.set(x, y, z);
    this.camera.position.set(x, y, z);
}

setRotation(pitch, yaw) {
    this.mouseLook.pitch = pitch;
    this.mouseLook.yaw = yaw;
    this.mouseLook.targetPitch = pitch;
    this.mouseLook.targetYaw = yaw;
}

lookAt(target) {
    if (target instanceof THREE.Vector3) {
        this.camera.lookAt(target);
    } else if (target && target.position) {
        this.camera.lookAt(target.position);
    }
}

addShake(intensity, duration) {
    this.shake.intensity = Math.max(this.shake.intensity, intensity);
    this.shake.duration = Math.max(this.shake.duration, duration);
}

setFollowTarget(target, offset = null) {
    this.followTarget = target;
    if (offset) {
        this.followOffset.copy(offset);
    }
}

clearFollowTarget() {
    this.followTarget = null;
}

switchToFirstPerson() {
    this.isFirstPerson = true;
    this.clearFollowTarget();
    console.log('👁️ Switched to first-person camera');
}

switchToThirdPerson(target = null) {
    this.isFirstPerson = false;
    if (target) {
        this.setFollowTarget(target);
    }
    console.log('👁️‍🗨️ Switched to third-person camera');
}

handleResize(width, height) {
    if (!this.camera) return;
    
    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    console.log(`📱 Camera aspect ratio updated: ${width}x${height}`);
}

screenToWorld(screenX, screenY, distance = 10) {
    // Convert screen coordinates to world coordinates
    const mouse = new THREE.Vector2();
    mouse.x = (screenX / window.innerWidth) * 2 - 1;
    mouse.y = -(screenY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    return raycaster.ray.at(distance, new THREE.Vector3());
}

getDirection() {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return direction;
}

getPosition() {
    return this.camera.position.clone();
}

getRotation() {
    return {
        pitch: this.mouseLook.pitch,
        yaw: this.mouseLook.yaw
    };
}

raycastFromCamera(objects, recursive = true) {
    // Cast ray from camera center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    return this.raycaster.intersectObjects(objects, recursive);
}

smoothTransition(targetPosition, targetRotation, duration = 1000) {
    // Smooth camera transition animation
    return new Promise((resolve) => {
        const startPos = this.camera.position.clone();
        const startRot = {
            pitch: this.mouseLook.pitch,
            yaw: this.mouseLook.yaw
        };
        
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate position
            this.camera.position.lerpVectors(startPos, targetPosition, easeProgress);
            this.movement.position.copy(this.camera.position);
            this.movement.targetPosition.copy(this.camera.position);
            
            // Interpolate rotation
            if (targetRotation) {
                this.mouseLook.pitch = startRot.pitch + (targetRotation.pitch - startRot.pitch) * easeProgress;
                this.mouseLook.yaw = startRot.yaw + (targetRotation.yaw - startRot.yaw) * easeProgress;
                this.mouseLook.targetPitch = this.mouseLook.pitch;
                this.mouseLook.targetYaw = this.mouseLook.yaw;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        };
        
        animate();
    });
}

destroy() {
    console.log('🧹 Cleaning up camera...');
    
    try {
        // Remove pointer lock events
        if (this.pointerLockEvents) {
            document.removeEventListener('pointerlockchange', this.pointerLockEvents.change);
            document.removeEventListener('pointerlockerror', this.pointerLockEvents.error);
            document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        }
        
        // Exit pointer lock if active
        if (this.isLocked && document.exitPointerLock) {
            document.exitPointerLock();
        }
        
        // Clear references
        this.camera = null;
        this.followTarget = null;
        this.raycaster = null;
        this.cameraGroup = null;
        
        console.log('✅ Camera cleanup complete');
        
    } catch (error) {
        console.error('❌ Camera cleanup failed:', error);
    }
}
```

}

