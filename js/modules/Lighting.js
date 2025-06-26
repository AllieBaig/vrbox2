

/*
Purpose: Comprehensive lighting system for Summer Afternoon Three.js game
Key features: Dynamic sun lighting, ambient lighting, shadows, time-of-day cycles, atmospheric effects
Dependencies: Three.js
Related helpers: Scene.js, Environment.js, main.js
Function names: init, update, setSunPosition, setTimeOfDay, createShadows, updateAtmosphere, destroy
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 10:55 | File: js/modules/Lighting.js
*/

export class Lighting {
constructor(scene) {
this.scene = scene;

```
    // Light references
    this.sunLight = null;
    this.ambientLight = null;
    this.hemisphereLight = null;
    this.sunHelper = null;
    
    // Lighting configuration
    this.config = {
        sun: {
            color: 0xffffff,
            intensity: 1.0,
            distance: 100,
            angle: Math.PI / 4,
            penumbra: 0.1,
            decay: 2,
            castShadow: true,
            shadowMapSize: 2048,
            shadowCameraNear: 0.5,
            shadowCameraFar: 200,
            shadowCameraLeft: -50,
            shadowCameraRight: 50,
            shadowCameraTop: 50,
            shadowCameraBottom: -50
        },
        ambient: {
            color: 0x404040,
            intensity: 0.3
        },
        hemisphere: {
            skyColor: 0x87CEEB,
            groundColor: 0x8FBC8F,
            intensity: 0.4
        }
    };
    
    // Time of day system
    this.timeOfDay = {
        hour: 14, // 2 PM - summer afternoon
        speed: 0.1, // How fast time passes
        sunPath: {
            radius: 80,
            height: 40,
            centerX: 0,
            centerZ: 0
        }
    };
    
    // Dynamic lighting effects
    this.effects = {
        sunFlicker: {
            enabled: false,
            intensity: 0.1,
            frequency: 0.5,
            baseIntensity: 1.0
        },
        cloudShadows: {
            enabled: true,
            speed: 0.02,
            intensity: 0.3,
            scale: 50
        }
    };
    
    // Performance settings
    this.performance = {
        enableShadows: true,
        shadowQuality: 'medium', // low, medium, high
        updateFrequency: 60 // Updates per second
    };
    
    this.lastUpdate = 0;
}

async init() {
    try {
        console.log('💡 Initializing lighting system...');
        
        // Create ambient lighting
        this.createAmbientLighting();
        
        // Create directional sun light
        this.createSunLight();
        
        // Create hemisphere lighting for realistic sky/ground bounce
        this.createHemisphereLight();
        
        // Setup shadows
        if (this.performance.enableShadows) {
            this.setupShadows();
        }
        
        // Set initial time of day
        this.setTimeOfDay(this.timeOfDay.hour);
        
        console.log('✅ Lighting system initialized successfully');
        
    } catch (error) {
        console.error('❌ Lighting initialization failed:', error);
        throw error;
    }
}

createAmbientLighting() {
    // Basic ambient light for overall scene illumination
    this.ambientLight = new THREE.AmbientLight(
        this.config.ambient.color,
        this.config.ambient.intensity
    );
    this.ambientLight.name = 'AmbientLight';
    
    this.scene.add(this.ambientLight);
    console.log('🌙 Ambient light created');
}

createSunLight() {
    // Create directional light to simulate the sun
    this.sunLight = new THREE.DirectionalLight(
        this.config.sun.color,
        this.config.sun.intensity
    );
    
    this.sunLight.name = 'SunLight';
    this.sunLight.castShadow = this.config.sun.castShadow;
    
    // Position the sun
    this.sunLight.position.set(50, 50, 50);
    this.sunLight.target.position.set(0, 0, 0);
    
    // Add to scene
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
    
    console.log('☀️ Sun light created');
}

createHemisphereLight() {
    // Hemisphere light for realistic sky/ground lighting
    this.hemisphereLight = new THREE.HemisphereLight(
        this.config.hemisphere.skyColor,
        this.config.hemisphere.groundColor,
        this.config.hemisphere.intensity
    );
    
    this.hemisphereLight.name = 'HemisphereLight';
    this.hemisphereLight.position.set(0, 50, 0);
    
    this.scene.add(this.hemisphereLight);
    console.log('🌈 Hemisphere light created');
}

setupShadows() {
    if (!this.sunLight) return;
    
    // Configure shadow camera
    const shadowCamera = this.sunLight.shadow.camera;
    shadowCamera.near = this.config.sun.shadowCameraNear;
    shadowCamera.far = this.config.sun.shadowCameraFar;
    shadowCamera.left = this.config.sun.shadowCameraLeft;
    shadowCamera.right = this.config.sun.shadowCameraRight;
    shadowCamera.top = this.config.sun.shadowCameraTop;
    shadowCamera.bottom = this.config.sun.shadowCameraBottom;
    
    // Set shadow map size based on quality
    let mapSize;
    switch (this.performance.shadowQuality) {
        case 'low': mapSize = 1024; break;
        case 'high': mapSize = 4096; break;
        default: mapSize = 2048; break;
    }
    
    this.sunLight.shadow.mapSize.width = mapSize;
    this.sunLight.shadow.mapSize.height = mapSize;
    
    // Shadow bias to prevent shadow acne
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.normalBias = 0.02;
    
    // Soft shadows
    this.sunLight.shadow.radius = 5;
    this.sunLight.shadow.blurSamples = 25;
    
    console.log(`🔲 Shadows configured (${this.performance.shadowQuality} quality)`);
}

update(deltaTime) {
    const now = performance.now();
    
    // Throttle updates for performance
    if (now - this.lastUpdate < 1000 / this.performance.updateFrequency) {
        return;
    }
    this.lastUpdate = now;
    
    // Update time of day
    this.updateTimeOfDay(deltaTime);
    
    // Update dynamic effects
    this.updateEffects(deltaTime);
    
    // Update sun position based on time
    this.updateSunPosition();
    
    // Update atmospheric lighting
    this.updateAtmosphere();
}

updateTimeOfDay(deltaTime) {
    // Advance time
    this.timeOfDay.hour += this.timeOfDay.speed * deltaTime;
    
    // Wrap around 24 hours
    if (this.timeOfDay.hour >= 24) {
        this.timeOfDay.hour -= 24;
    }
}

updateSunPosition() {
    if (!this.sunLight) return;
    
    // Calculate sun position based on time of day
    const hour = this.timeOfDay.hour;
    const sunAngle = ((hour - 6) / 12) * Math.PI; // Sun rises at 6 AM, sets at 6 PM
    
    const sunPath = this.timeOfDay.sunPath;
    const x = sunPath.centerX + Math.cos(sunAngle) * sunPath.radius;
    const y = sunPath.height + Math.sin(sunAngle) * sunPath.height;
    const z = sunPath.centerZ + Math.sin(sunAngle) * sunPath.radius * 0.3;
    
    this.sunLight.position.set(x, Math.max(y, 5), z);
    
    // Update shadow camera position to follow sun
    if (this.sunLight.castShadow) {
        this.updateShadowCamera();
    }
}

updateShadowCamera() {
    // Keep shadow camera focused on origin but positioned relative to sun
    const shadowCamera = this.sunLight.shadow.camera;
    const sunPos = this.sunLight.position;
    
    // Position shadow camera
    shadowCamera.position.copy(sunPos);
    shadowCamera.lookAt(0, 0, 0);
    shadowCamera.updateProjectionMatrix();
}

updateEffects(deltaTime) {
    const time = performance.now() * 0.001;
    
    // Sun flicker effect
    if (this.effects.sunFlicker.enabled && this.sunLight) {
        const flicker = this.effects.sunFlicker;
        const flickerValue = Math.sin(time * flicker.frequency * Math.PI * 2) * flicker.intensity;
        this.sunLight.intensity = flicker.baseIntensity + flickerValue;
    }
    
    // Cloud shadow effect (simulated)
    if (this.effects.cloudShadows.enabled && this.sunLight) {
        const clouds = this.effects.cloudShadows;
        const cloudShadow = Math.sin(time * clouds.speed) * clouds.intensity;
        const baseShadow = this.getLightIntensityForTime();
        this.sunLight.intensity = baseShadow * (1 - Math.max(0, cloudShadow));
    }
}

updateAtmosphere() {
    const hour = this.timeOfDay.hour;
    
    // Update light colors and intensities based on time of day
    const lightingData = this.calculateLightingForTime(hour);
    
    // Update sun light
    if (this.sunLight) {
        this.sunLight.color.setHex(lightingData.sunColor);
        this.sunLight.intensity = lightingData.sunIntensity;
    }
    
    // Update ambient light
    if (this.ambientLight) {
        this.ambientLight.color.setHex(lightingData.ambientColor);
        this.ambientLight.intensity = lightingData.ambientIntensity;
    }
    
    // Update hemisphere light
    if (this.hemisphereLight) {
        this.hemisphereLight.color.setHex(lightingData.skyColor);
        this.hemisphereLight.groundColor.setHex(lightingData.groundColor);
        this.hemisphereLight.intensity = lightingData.hemisphereIntensity;
    }
}

calculateLightingForTime(hour) {
    // Define lighting parameters for different times of day
    const timeData = {
        6: { // Dawn
            sunColor: 0xFFB366,
            sunIntensity: 0.3,
            ambientColor: 0x66B3FF,
            ambientIntensity: 0.2,
            skyColor: 0xFFB366,
            groundColor: 0x8B4513,
            hemisphereIntensity: 0.3
        },
        12: { // Noon
            sunColor: 0xFFFFFF,
            sunIntensity: 1.0,
            ambientColor: 0x87CEEB,
            ambientIntensity: 0.3,
            skyColor: 0x87CEEB,
            groundColor: 0x8FBC8F,
            hemisphereIntensity: 0.4
        },
        14: { // Afternoon (default)
            sunColor: 0xFFF8DC,
            sunIntensity: 0.9,
            ambientColor: 0x87CEEB,
            ambientIntensity: 0.3,
            skyColor: 0x87CEEB,
            groundColor: 0x9ACD32,
            hemisphereIntensity: 0.4
        },
        18: { // Sunset
            sunColor: 0xFF6347,
            sunIntensity: 0.4,
            ambientColor: 0xFF6347,
            ambientIntensity: 0.2,
            skyColor: 0xFF6347,
            groundColor: 0x8B4513,
            hemisphereIntensity: 0.3
        },
        22: { // Night
            sunColor: 0x4169E1,
            sunIntensity: 0.1,
            ambientColor: 0x191970,
            ambientIntensity: 0.1,
            skyColor: 0x191970,
            groundColor: 0x2F4F4F,
            hemisphereIntensity: 0.2
        }
    };
    
    // Find the two closest time periods and interpolate
    const times = Object.keys(timeData).map(Number).sort((a, b) => a - b);
    let beforeTime = times[0];
    let afterTime = times[times.length - 1];
    
    for (let i = 0; i < times.length - 1; i++) {
        if (hour >= times[i] && hour <= times[i + 1]) {
            beforeTime = times[i];
            afterTime = times[i + 1];
            break;
        }
    }
    
    // Calculate interpolation factor
    const factor = (hour - beforeTime) / (afterTime - beforeTime);
    const clampedFactor = Math.max(0, Math.min(1, factor));
    
    // Interpolate between the two time periods
    const before = timeData[beforeTime];
    const after = timeData[afterTime];
    
    return {
        sunColor: this.interpolateColor(before.sunColor, after.sunColor, clampedFactor),
        sunIntensity: this.lerp(before.sunIntensity, after.sunIntensity, clampedFactor),
        ambientColor: this.interpolateColor(before.ambientColor, after.ambientColor, clampedFactor),
        ambientIntensity: this.lerp(before.ambientIntensity, after.ambientIntensity, clampedFactor),
        skyColor: this.interpolateColor(before.skyColor, after.skyColor, clampedFactor),
        groundColor: this.interpolateColor(before.groundColor, after.groundColor, clampedFactor),
        hemisphereIntensity: this.lerp(before.hemisphereIntensity, after.hemisphereIntensity, clampedFactor)
    };
}

interpolateColor(color1, color2, factor) {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return c1.lerp(c2, factor).getHex();
}

lerp(a, b, factor) {
    return a + (b - a) * factor;
}

getLightIntensityForTime() {
    const hour = this.timeOfDay.hour;
    
    if (hour >= 6 && hour <= 18) {
        // Daytime - calculate intensity based on sun position
        const midday = 12;
        const distanceFromMidday = Math.abs(hour - midday);
        return Math.max(0.1, 1.0 - (distanceFromMidday / 6) * 0.7);
    } else {
        // Nighttime
        return 0.1;
    }
}

setTimeOfDay(hour) {
    this.timeOfDay.hour = Math.max(0, Math.min(24, hour));
    this.updateSunPosition();
    this.updateAtmosphere();
    
    console.log(`⏰ Time set to ${hour.toFixed(1)}:00`);
}

setSunPosition(x, y, z) {
    if (this.sunLight) {
        this.sunLight.position.set(x, y, z);
        if (this.sunLight.castShadow) {
            this.updateShadowCamera();
        }
    }
}

setSunIntensity(intensity) {
    if (this.sunLight) {
        this.sunLight.intensity = intensity;
        this.effects.sunFlicker.baseIntensity = intensity;
    }
}

setSunColor(color) {
    if (this.sunLight) {
        this.sunLight.color.setHex(color);
    }
}

setAmbientIntensity(intensity) {
    if (this.ambientLight) {
        this.ambientLight.intensity = intensity;
    }
}

enableSunFlicker(intensity = 0.1, frequency = 0.5) {
    this.effects.sunFlicker.enabled = true;
    this.effects.sunFlicker.intensity = intensity;
    this.effects.sunFlicker.frequency = frequency;
    this.effects.sunFlicker.baseIntensity = this.sunLight ? this.sunLight.intensity : 1.0;
}

disableSunFlicker() {
    this.effects.sunFlicker.enabled = false;
    if (this.sunLight) {
        this.sunLight.intensity = this.effects.sunFlicker.baseIntensity;
    }
}

enableCloudShadows(speed = 0.02, intensity = 0.3) {
    this.effects.cloudShadows.enabled = true;
    this.effects.cloudShadows.speed = speed;
    this.effects.cloudShadows.intensity = intensity;
}

disableCloudShadows() {
    this.effects.cloudShadows.enabled = false;
}

enableShadows() {
    this.performance.enableShadows = true;
    if (this.sunLight) {
        this.sunLight.castShadow = true;
        this.setupShadows();
    }
}

disableShadows() {
    this.performance.enableShadows = false;
    if (this.sunLight) {
        this.sunLight.castShadow = false;
    }
}

setShadowQuality(quality) {
    this.performance.shadowQuality = quality;
    if (this.performance.enableShadows) {
        this.setupShadows();
    }
}

createLightHelper() {
    if (this.sunLight && !this.sunHelper) {
        this.sunHelper = new THREE.DirectionalLightHelper(this.sunLight, 5);
        this.scene.add(this.sunHelper);
    }
}

removeLightHelper() {
    if (this.sunHelper) {
        this.scene.remove(this.sunHelper);
        this.sunHelper = null;
    }
}

destroy() {
    console.log('🧹 Cleaning up lighting system...');
    
    try {
        // Remove light helpers
        this.removeLightHelper();
        
        // Remove lights from scene
        if (this.sunLight) {
            this.scene.remove(this.sunLight);
            this.scene.remove(this.sunLight.target);
            this.sunLight = null;
        }
        
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
            this.ambientLight = null;
        }
        
        if (this.hemisphereLight) {
            this.scene.remove(this.hemisphereLight);
            this.hemisphereLight = null;
        }
        
        // Clear references
        this.scene = null;
        
        console.log('✅ Lighting cleanup complete');
        
    } catch (error) {
        console.error('❌ Lighting cleanup failed:', error);
    }
}
```

}

