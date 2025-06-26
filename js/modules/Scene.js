

/*
Purpose: Three.js scene setup and management for Summer Afternoon game
Key features: Scene initialization, fog effects, skybox, background setup, scene hierarchy
Dependencies: Three.js
Related helpers: Lighting.js, Environment.js, main.js
Function names: init, createSkybox, setupFog, addObject, removeObject, destroy
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 10:45 | File: js/modules/Scene.js
*/

export class Scene {
constructor() {
this.scene = null;
this.skybox = null;
this.fog = null;

```
    // Scene configuration
    this.config = {
        fogColor: 0x87CEEB,      // Sky blue
        fogNear: 50,
        fogFar: 200,
        skyboxSize: 500,
        backgroundColor: 0x87CEEB
    };
    
    // Object tracking
    this.sceneObjects = new Map();
    this.objectCount = 0;
}

async init() {
    try {
        console.log('🎬 Initializing scene...');
        
        // Create the main scene
        this.scene = new THREE.Scene();
        this.scene.name = 'SummerAfternoonScene';
        
        // Set background color
        this.scene.background = new THREE.Color(this.config.backgroundColor);
        
        // Setup fog for atmospheric depth
        this.setupFog();
        
        // Create skybox
        await this.createSkybox();
        
        // Setup scene hierarchy groups
        this.setupSceneGroups();
        
        console.log('✅ Scene initialized successfully');
        
    } catch (error) {
        console.error('❌ Scene initialization failed:', error);
        throw error;
    }
}

setupFog() {
    // Create atmospheric fog
    this.fog = new THREE.Fog(
        this.config.fogColor,
        this.config.fogNear,
        this.config.fogFar
    );
    
    this.scene.fog = this.fog;
    
    console.log('🌫️ Fog configured');
}

async createSkybox() {
    try {
        // Create skybox geometry
        const skyboxGeometry = new THREE.SphereGeometry(
            this.config.skyboxSize,
            32,
            16
        );
        
        // Create gradient skybox material
        const skyboxMaterial = this.createSkyboxMaterial();
        
        // Create skybox mesh
        this.skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.skybox.name = 'Skybox';
        
        // Scale skybox inside-out
        this.skybox.scale.setScalar(-1);
        
        // Add to scene
        this.scene.add(this.skybox);
        
        console.log('☁️ Skybox created');
        
    } catch (error) {
        console.warn('⚠️ Skybox creation failed, using color background:', error);
        // Fallback to simple color background
        this.scene.background = new THREE.Color(this.config.backgroundColor);
    }
}

createSkyboxMaterial() {
    // Create a gradient sky shader
    const vertexShader = `
        varying vec3 vWorldPosition;
        
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        
        varying vec3 vWorldPosition;
        
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
    `;
    
    const skyboxMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            topColor: { value: new THREE.Color(0x4facfe) },      // Light blue
            bottomColor: { value: new THREE.Color(0x87CEEB) },  // Sky blue
            offset: { value: 33 },
            exponent: { value: 0.6 }
        },
        side: THREE.BackSide
    });
    
    return skyboxMaterial;
}

setupSceneGroups() {
    // Create organized groups for different object types
    const groups = {
        environment: new THREE.Group(),
        vegetation: new THREE.Group(),
        characters: new THREE.Group(),
        effects: new THREE.Group(),
        ui3d: new THREE.Group()
    };
    
    // Name the groups
    groups.environment.name = 'EnvironmentGroup';
    groups.vegetation.name = 'VegetationGroup';
    groups.characters.name = 'CharactersGroup';
    groups.effects.name = 'EffectsGroup';
    groups.ui3d.name = 'UI3DGroup';
    
    // Add groups to scene
    Object.values(groups).forEach(group => {
        this.scene.add(group);
    });
    
    // Store references
    this.groups = groups;
    
    console.log('📁 Scene groups created');
}

addObject(object, groupName = null) {
    if (!object) {
        console.warn('⚠️ Attempted to add null object to scene');
        return false;
    }
    
    try {
        // Add to appropriate group or directly to scene
        if (groupName && this.groups[groupName]) {
            this.groups[groupName].add(object);
        } else {
            this.scene.add(object);
        }
        
        // Track the object
        const objectId = `object_${this.objectCount++}`;
        object.userData.sceneId = objectId;
        this.sceneObjects.set(objectId, {
            object: object,
            group: groupName,
            addedAt: Date.now()
        });
        
        console.log(`➕ Added object "${object.name || 'Unnamed'}" to scene`);
        return true;
        
    } catch (error) {
        console.error('❌ Failed to add object to scene:', error);
        return false;
    }
}

removeObject(object) {
    if (!object) {
        console.warn('⚠️ Attempted to remove null object from scene');
        return false;
    }
    
    try {
        // Remove from parent (group or scene)
        if (object.parent) {
            object.parent.remove(object);
        }
        
        // Remove from tracking
        if (object.userData.sceneId) {
            this.sceneObjects.delete(object.userData.sceneId);
        }
        
        // Dispose of geometries and materials
        this.disposeObject(object);
        
        console.log(`➖ Removed object "${object.name || 'Unnamed'}" from scene`);
        return true;
        
    } catch (error) {
        console.error('❌ Failed to remove object from scene:', error);
        return false;
    }
}

disposeObject(object) {
    // Recursively dispose of object and its children
    object.traverse((child) => {
        if (child.geometry) {
            child.geometry.dispose();
        }
        
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(material => this.disposeMaterial(material));
            } else {
                this.disposeMaterial(child.material);
            }
        }
    });
}

disposeMaterial(material) {
    // Dispose of material and its textures
    if (material.map) material.map.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.roughnessMap) material.roughnessMap.dispose();
    if (material.metalnessMap) material.metalnessMap.dispose();
    if (material.emissiveMap) material.emissiveMap.dispose();
    if (material.aoMap) material.aoMap.dispose();
    if (material.envMap) material.envMap.dispose();
    
    material.dispose();
}

getObjectsByGroup(groupName) {
    if (!this.groups[groupName]) {
        console.warn(`⚠️ Group "${groupName}" does not exist`);
        return [];
    }
    
    return this.groups[groupName].children;
}

getObjectCount() {
    return {
        total: this.sceneObjects.size,
        environment: this.groups.environment?.children.length || 0,
        vegetation: this.groups.vegetation?.children.length || 0,
        characters: this.groups.characters?.children.length || 0,
        effects: this.groups.effects?.children.length || 0,
        ui3d: this.groups.ui3d?.children.length || 0
    };
}

updateFog(near, far, color) {
    if (this.fog) {
        this.fog.near = near || this.fog.near;
        this.fog.far = far || this.fog.far;
        if (color !== undefined) {
            this.fog.color.setHex(color);
        }
    }
}

updateSkybox(topColor, bottomColor) {
    if (this.skybox && this.skybox.material && this.skybox.material.uniforms) {
        if (topColor !== undefined) {
            this.skybox.material.uniforms.topColor.value.setHex(topColor);
        }
        if (bottomColor !== undefined) {
            this.skybox.material.uniforms.bottomColor.value.setHex(bottomColor);
        }
    }
}

setTimeOfDay(hour) {
    // Update scene based on time of day (0-24)
    const normalizedHour = Math.max(0, Math.min(24, hour));
    
    // Calculate colors based on time
    let skyTop, skyBottom, fogColor;
    
    if (normalizedHour >= 6 && normalizedHour <= 18) {
        // Daytime
        const dayProgress = (normalizedHour - 6) / 12;
        skyTop = this.interpolateColor(0x4facfe, 0x87CEEB, dayProgress);
        skyBottom = this.interpolateColor(0x87CEEB, 0x98FB98, dayProgress);
        fogColor = 0x87CEEB;
    } else {
        // Nighttime
        skyTop = 0x191970;    // Midnight blue
        skyBottom = 0x2F4F4F; // Dark slate gray
        fogColor = 0x2F4F4F;
    }
    
    // Update skybox and fog
    this.updateSkybox(skyTop, skyBottom);
    this.updateFog(null, null, fogColor);
}

interpolateColor(color1, color2, factor) {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return c1.lerp(c2, factor).getHex();
}

raycast(raycaster, recursive = true) {
    // Perform raycasting against scene objects
    const intersects = raycaster.intersectObjects(
        this.scene.children,
        recursive
    );
    
    return intersects;
}

destroy() {
    console.log('🧹 Cleaning up scene...');
    
    try {
        // Remove all tracked objects
        this.sceneObjects.forEach((data, id) => {
            this.removeObject(data.object);
        });
        this.sceneObjects.clear();
        
        // Dispose of skybox
        if (this.skybox) {
            this.disposeObject(this.skybox);
            this.skybox = null;
        }
        
        // Clear scene
        if (this.scene) {
            this.scene.clear();
            this.scene = null;
        }
        
        // Clear references
        this.groups = null;
        this.fog = null;
        
        console.log('✅ Scene cleanup complete');
        
    } catch (error) {
        console.error('❌ Scene cleanup failed:', error);
    }
}
```

}

