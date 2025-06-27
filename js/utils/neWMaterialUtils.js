

/*
Purpose: Material creation utilities for Summer Afternoon Three.js game - Part 1
Key features: Terrain materials, vegetation materials, basic shaders, material caching
Dependencies: Three.js
Related helpers: Environment.js, GeometryUtils.js, MathUtils.js
Function names: createTerrainMaterial, createGrassMaterial, createTreeMaterial, createFlowerMaterial
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 11:35 | File: js/utils/MaterialUtils.js (Part 1)
*/

export class MaterialUtils {
// Material cache for performance
static materialCache = new Map();
static textureCache = new Map();

```
// Common shader chunks
static shaderChunks = {
    // Wind animation for vegetation
    windVertex: `
        uniform float time;
        uniform float windStrength;
        uniform vec2 windDirection;
        
        vec3 applyWind(vec3 position, vec3 normal, float intensity) {
            float windEffect = sin(time * 2.0 + position.x * 0.1 + position.z * 0.1) * windStrength * intensity;
            vec3 windOffset = vec3(windDirection.x, 0.0, windDirection.y) * windEffect;
            return position + windOffset * (position.y * 0.5); // More effect higher up
        }
    `,
    
    // Noise functions
    noise3D: `
        vec3 mod289(vec3 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 mod289(vec4 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 permute(vec4 x) {
            return mod289(((x*34.0)+1.0)*x);
        }
        
        vec4 taylorInvSqrt(vec4 r) {
            return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            
            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            
            i = mod289(i);
            vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
    `,
    
    // Fog calculation
    fog: `
        vec3 applyFog(vec3 color, float distance, vec3 fogColor, float fogNear, float fogFar) {
            float fogFactor = clamp((distance - fogNear) / (fogFar - fogNear), 0.0, 1.0);
            return mix(color, fogColor, fogFactor);
        }
    `
};

/**
 * Create terrain material with grass and dirt blending
 * @param {Object} options - Material configuration
 * @returns {THREE.ShaderMaterial} Terrain material
 */
static createTerrainMaterial(options = {}) {
    const config = {
        grassColor: 0x7CFC00,
        dirtColor: 0x8B4513,
        rockColor: 0x696969,
        textureRepeat: 20,
        blendSharpness: 5.0,
        enableFog: true,
        ...options
    };
    
    const cacheKey = `terrain_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const vertexShader = `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vElevation;
        
        void main() {
            vPosition = position;
            vNormal = normal;
            vUv = uv * ${config.textureRepeat.toFixed(1)};
            vElevation = position.y;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 grassColor;
        uniform vec3 dirtColor;
        uniform vec3 rockColor;
        uniform float blendSharpness;
        uniform bool enableFog;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vElevation;
        
        ${this.shaderChunks.noise3D}
        ${this.shaderChunks.fog}
        
        void main() {
            // Calculate slope (steepness)
            float slope = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
            
            // Height-based blending
            float heightFactor = clamp(vElevation * 0.1, 0.0, 1.0);
            
            // Noise for natural variation
            float noise = snoise(vPosition * 0.1) * 0.5 + 0.5;
            
            // Blend between materials based on slope and height
            vec3 color = grassColor;
            
            // Add dirt on slopes
            float dirtBlend = smoothstep(0.3, 0.7, slope + noise * 0.2);
            color = mix(color, dirtColor, dirtBlend);
            
            // Add rock on steep slopes and high elevations
            float rockBlend = smoothstep(0.6, 0.9, slope + heightFactor * 0.3);
            color = mix(color, rockColor, rockBlend);
            
            // Add subtle texture variation
            float textureNoise = snoise(vPosition * 2.0) * 0.1;
            color += textureNoise;
            
            gl_FragColor = vec4(color, 1.0);
            
            // Apply fog if enabled
            if (enableFog) {
                float distance = length(vPosition);
                gl_FragColor.rgb = applyFog(gl_FragColor.rgb, distance, vec3(0.5, 0.8, 0.9), 50.0, 200.0);
            }
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            grassColor: { value: new THREE.Color(config.grassColor) },
            dirtColor: { value: new THREE.Color(config.dirtColor) },
            rockColor: { value: new THREE.Color(config.rockColor) },
            blendSharpness: { value: config.blendSharpness },
            enableFog: { value: config.enableFog }
        },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create animated grass material with wind effects
 * @param {Object} options - Material configuration
 * @returns {THREE.ShaderMaterial} Grass material
 */
static createGrassMaterial(options = {}) {
    const config = {
        color: 0x228B22,
        windStrength: 0.3,
        windDirection: [1, 0.5],
        ...options
    };
    
    const cacheKey = `grass_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const vertexShader = `
        uniform float time;
        uniform float windStrength;
        uniform vec2 windDirection;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vWindEffect;
        
        ${this.shaderChunks.windVertex}
        
        void main() {
            vPosition = position;
            vNormal = normal;
            vUv = uv;
            
            // Apply wind effect (stronger at top of grass)
            float windIntensity = uv.y; // Top of grass = 1, bottom = 0
            vec3 windPosition = applyWind(position, normal, windIntensity);
            vWindEffect = windIntensity;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(windPosition, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 grassColor;
        uniform float time;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vWindEffect;
        
        void main() {
            // Base grass color
            vec3 color = grassColor;
            
            // Gradient from dark at bottom to light at top
            float heightGradient = vUv.y * 0.3 + 0.7;
            color *= heightGradient;
            
            // Add some random variation
            float variation = sin(vPosition.x * 10.0) * sin(vPosition.z * 10.0) * 0.1;
            color += variation;
            
            // Slight transparency
            float alpha = 0.9;
            
            gl_FragColor = vec4(color, alpha);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            grassColor: { value: new THREE.Color(config.color) },
            time: { value: 0 },
            windStrength: { value: config.windStrength },
            windDirection: { value: new THREE.Vector2(...config.windDirection) }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create tree material (trunk and leaves)
 * @param {Object} options - Material configuration
 * @returns {Object} Object with trunk and leaves materials
 */
static createTreeMaterial(options = {}) {
    const config = {
        trunkColor: 0x8B4513,
        leavesColor: 0x228B22,
        ...options
    };
    
    const cacheKey = `tree_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    // Trunk material
    const trunkMaterial = new THREE.MeshLambertMaterial({
        color: config.trunkColor,
        map: this.createBarkTexture()
    });
    
    // Leaves material with wind animation
    const leavesVertexShader = `
        uniform float time;
        uniform float windStrength;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
            vPosition = position;
            vNormal = normal;
            vUv = uv;
            
            // Apply gentle wind sway to leaves
            vec3 windPosition = position;
            float windEffect = sin(time * 1.5 + position.x * 0.1 + position.z * 0.1) * windStrength;
            windPosition.x += windEffect * 0.3;
            windPosition.z += windEffect * 0.2;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(windPosition, 1.0);
        }
    `;
    
    const leavesFragmentShader = `
        uniform vec3 leavesColor;
        uniform float time;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
            vec3 color = leavesColor;
            
            // Add some variation to leaves
            float variation = sin(vPosition.x * 5.0) * sin(vPosition.y * 5.0) * sin(vPosition.z * 5.0);
            color += variation * 0.1;
            
            // Fresnel effect for more realistic leaves
            float fresnel = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.0);
            color += fresnel * 0.2;
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    
    const leavesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            leavesColor: { value: new THREE.Color(config.leavesColor) },
            time: { value: 0 },
            windStrength: { value: 0.1 }
        },
        vertexShader: leavesVertexShader,
        fragmentShader: leavesFragmentShader,
        side: THREE.DoubleSide
    });
    
    const materials = {
        trunk: trunkMaterial,
        leaves: leavesMaterial
    };
    
    this.materialCache.set(cacheKey, materials);
    return materials;
}

/**
 * Create flower material
 * @param {Object} options - Material configuration
 * @returns {THREE.MeshLambertMaterial} Flower material
 */
static createFlowerMaterial(options = {}) {
    const config = {
        color: 0xFFFFFF,
        ...options
    };
    
    const cacheKey = `flower_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const material = new THREE.MeshLambertMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create rock material with procedural texture
 * @param {Object} options - Material configuration
 * @returns {THREE.MeshLambertMaterial} Rock material
 */
static createRockMaterial(options = {}) {
    const config = {
        color: 0x696969,
        roughness: 0.9,
        metalness: 0.1,
        ...options
    };
    
    const cacheKey = `rock_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const material = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: config.roughness,
        metalness: config.metalness,
        map: this.createRockTexture()
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create procedural bark texture
 * @returns {THREE.DataTexture} Bark texture
 */
static createBarkTexture() {
    if (this.textureCache.has('bark')) {
        return this.textureCache.get('bark');
    }
    
    const size = 128;
    const data = new Uint8Array(size * size * 3);
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const index = (i * size + j) * 3;
            
            // Create bark-like pattern
            const x = i / size;
            const y = j / size;
            
            // Base brown color
            let r = 139;
            let g = 69;
            let b = 19;
            
            // Add noise for texture
            const noise1 = Math.sin(x * 20) * Math.sin(y * 25) * 30;
            const noise2 = Math.sin(x * 50) * Math.sin(y * 40) * 15;
            
            r = Math.max(0, Math.min(255, r + noise1 + noise2));
            g = Math.max(0, Math.min(255, g + noise1 * 0.7 + noise2 * 0.8));
            b = Math.max(0, Math.min(255, b + noise1 * 0.5 + noise2 * 0.6));
            
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
        }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    this.textureCache.set('bark', texture);
    return texture;
}

/**
 * Create procedural rock texture
 * @returns {THREE.DataTexture} Rock texture
 */
static createRockTexture() {
    if (this.textureCache.has('rock')) {
        return this.textureCache.get('rock');
    }
    
    const size = 128;
    const data = new Uint8Array(size * size * 3);
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const index = (i * size + j) * 3;
            
            // Create rock-like pattern
            const x = i / size;
            const y = j / size;
            
            // Base gray color
            let gray = 105 + Math.random() * 50; // Random variation
            
            // Add fractal noise
            const noise1 = Math.sin(x * 15) * Math.sin(y * 12) * 20;
            const noise2 = Math.sin(x * 30) * Math.sin(y * 35) * 10;
            const noise3 = Math.sin(x * 60) * Math.sin(y * 55) * 5;
            
            gray = Math.max(0, Math.min(255, gray + noise1 + noise2 + noise3));
            
            data[index] = gray;
            data[index + 1] = gray;
            data[index + 2] = gray;
        }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    this.textureCache.set('rock', texture);
    return texture;
}
```

/*
Purpose: Material creation utilities for Summer Afternoon Three.js game - Part 2
Key features: Water materials, sky materials, building materials, cloud materials, advanced shaders
Dependencies: Three.js - Extends Part 1
Related helpers: Environment.js, GeometryUtils.js, MathUtils.js
Function names: createWaterMaterial, createSkyMaterial, createCloudMaterial, createBuildingMaterial
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 11:40 | File: js/utils/MaterialUtils.js (Part 2)
*/

// NOTE: This is Part 2 of MaterialUtils.js - Add these methods to the MaterialUtils class from Part 1

```
/**
 * Create water material with animated waves and reflections
 * @param {Object} options - Material configuration
 * @returns {THREE.ShaderMaterial} Water material
 */
static createWaterMaterial(options = {}) {
    const config = {
        color: 0x006994,
        opacity: 0.8,
        waveHeight: 0.1,
        waveSpeed: 1.0,
        ...options
    };
    
    const cacheKey = `water_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const vertexShader = `
        uniform float time;
        uniform float waveHeight;
        uniform float waveSpeed;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vWave;
        
        void main() {
            vPosition = position;
            vUv = uv;
            
            // Create wave animation
            float wave1 = sin(position.x * 0.1 + time * waveSpeed) * waveHeight;
            float wave2 = sin(position.z * 0.15 + time * waveSpeed * 1.2) * waveHeight * 0.7;
            float wave3 = sin((position.x + position.z) * 0.08 + time * waveSpeed * 0.8) * waveHeight * 0.5;
            
            vec3 newPosition = position;
            newPosition.y += wave1 + wave2 + wave3;
            vWave = wave1 + wave2 + wave3;
            
            // Calculate modified normal for lighting
            vec3 newNormal = normal;
            float dx = cos(position.x * 0.1 + time * waveSpeed) * 0.01;
            float dz = cos(position.z * 0.15 + time * waveSpeed * 1.2) * 0.007;
            newNormal = normalize(vec3(-dx, 1.0, -dz));
            vNormal = newNormal;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 waterColor;
        uniform float time;
        uniform float opacity;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vWave;
        
        void main() {
            vec3 color = waterColor;
            
            // Add foam on wave peaks
            float foam = smoothstep(0.05, 0.1, abs(vWave));
            color = mix(color, vec3(1.0), foam * 0.3);
            
            // Simple fresnel effect
            float fresnel = pow(1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 2.0);
            color += fresnel * 0.1;
            
            // Animate color slightly
            color += sin(time * 0.5) * 0.05;
            
            gl_FragColor = vec4(color, opacity);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            waterColor: { value: new THREE.Color(config.color) },
            time: { value: 0 },
            opacity: { value: config.opacity },
            waveHeight: { value: config.waveHeight },
            waveSpeed: { value: config.waveSpeed }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create sky material with gradient and clouds
 * @param {Object} options - Material configuration
 * @returns {THREE.ShaderMaterial} Sky material
 */
static createSkyMaterial(options = {}) {
    const config = {
        topColor: 0x4facfe,
        bottomColor: 0x87CEEB,
        cloudiness: 0.3,
        ...options
    };
    
    const cacheKey = `sky_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const vertexShader = `
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            vUv = uv;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float cloudiness;
        uniform float time;
        
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        ${this.shaderChunks.noise3D}
        
        void main() {
            // Calculate height gradient
            float h = normalize(vWorldPosition + 33.0).y;
            vec3 color = mix(bottomColor, topColor, max(pow(max(h, 0.0), 0.6), 0.0));
            
            // Add procedural clouds
            vec2 cloudUv = vUv * 3.0;
            float cloudNoise = snoise(vec3(cloudUv * 0.5, time * 0.1)) * 0.5 + 0.5;
            cloudNoise += snoise(vec3(cloudUv * 1.0, time * 0.05)) * 0.25;
            cloudNoise += snoise(vec3(cloudUv * 2.0, time * 0.15)) * 0.125;
            
            float clouds = smoothstep(0.4, 0.8, cloudNoise) * cloudiness;
            color = mix(color, vec3(1.0), clouds);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(config.topColor) },
            bottomColor: { value: new THREE.Color(config.bottomColor) },
            cloudiness: { value: config.cloudiness },
            time: { value: 0 }
        },
        vertexShader,
        fragmentShader,
        side: THREE.BackSide
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create cloud material for sky effects
 * @param {Object} options - Material configuration
 * @returns {THREE.ShaderMaterial} Cloud material
 */
static createCloudMaterial(options = {}) {
    const config = {
        color: 0xFFFFFF,
        opacity: 0.8,
        speed: 0.5,
        ...options
    };
    
    const cacheKey = `cloud_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const vertexShader = `
        uniform float time;
        uniform float speed;
        
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
            vPosition = position;
            vUv = uv;
            
            // Gentle floating animation
            vec3 newPosition = position;
            newPosition.x += sin(time * speed + position.y * 0.1) * 0.1;
            newPosition.y += cos(time * speed * 0.7 + position.x * 0.1) * 0.05;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 cloudColor;
        uniform float time;
        uniform float opacity;
        
        varying vec3 vPosition;
        varying vec2 vUv;
        
        ${this.shaderChunks.noise3D}
        
        void main() {
            vec3 color = cloudColor;
            
            // Add volume to clouds with noise
            float density = snoise(vPosition * 0.5 + time * 0.1) * 0.5 + 0.5;
            density += snoise(vPosition * 1.0 + time * 0.05) * 0.25;
            
            // Fade edges
            float edge = smoothstep(0.0, 0.2, density) * smoothstep(1.0, 0.8, density);
            
            gl_FragColor = vec4(color, opacity * edge);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            cloudColor: { value: new THREE.Color(config.color) },
            time: { value: 0 },
            opacity: { value: config.opacity },
            speed: { value: config.speed }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create path/road material
 * @param {Object} options - Material configuration
 * @returns {THREE.MeshLambertMaterial} Path material
 */
static createPathMaterial(options = {}) {
    const config = {
        color: 0xD2B48C,
        roughness: 0.8,
        ...options
    };
    
    const cacheKey = `path_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const material = new THREE.MeshLambertMaterial({
        color: config.color,
        map: this.createPathTexture()
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create building material
 * @param {Object} options - Material configuration
 * @returns {THREE.MeshLambertMaterial} Building material
 */
static createBuildingMaterial(options = {}) {
    const config = {
        wallColor: 0xDDDDDD,
        roofColor: 0x8B4513,
        type: 'wall', // 'wall' or 'roof'
        ...options
    };
    
    const cacheKey = `building_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const color = config.type === 'roof' ? config.roofColor : config.wallColor;
    const material = new THREE.MeshLambertMaterial({
        color: color
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create procedural path texture
 * @returns {THREE.DataTexture} Path texture
 */
static createPathTexture() {
    if (this.textureCache.has('path')) {
        return this.textureCache.get('path');
    }
    
    const size = 128;
    const data = new Uint8Array(size * size * 3);
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const index = (i * size + j) * 3;
            
            // Create dirt path pattern
            const x = i / size;
            const y = j / size;
            
            // Base tan/brown color
            let r = 210;
            let g = 180;
            let b = 140;
            
            // Add dirt variation
            const variation = Math.random() * 40 - 20;
            r = Math.max(0, Math.min(255, r + variation));
            g = Math.max(0, Math.min(255, g + variation * 0.8));
            b = Math.max(0, Math.min(255, b + variation * 0.6));
            
            // Add some small rocks/pebbles
            if (Math.random() < 0.05) {
                const rockShade = Math.random() * 60 + 60;
                r = g = b = rockShade;
            }
            
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
        }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    this.textureCache.set('path', texture);
    return texture;
}

/**
 * Create windmill material
 * @param {Object} options - Material configuration
 * @returns {THREE.MeshLambertMaterial} Windmill material
 */
static createWindmillMaterial(options = {}) {
    const config = {
        towerColor: 0xF5F5DC,
        bladeColor: 0x8B4513,
        type: 'tower', // 'tower' or 'blade'
        ...options
    };
    
    const cacheKey = `windmill_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const color = config.type === 'blade' ? config.bladeColor : config.towerColor;
    const material = new THREE.MeshLambertMaterial({
        color: color
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create fence material
 * @param {Object} options - Material configuration
 * @returns {THREE.MeshLambertMaterial} Fence material
 */
static createFenceMaterial(options = {}) {
    const config = {
        color: 0x8B4513,
        weathered: true,
        ...options
    };
    
    const cacheKey = `fence_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    let color = config.color;
    if (config.weathered) {
        // Make slightly grayer for weathered look
        const c = new THREE.Color(color);
        c.multiplyScalar(0.8);
        color = c.getHex();
    }
    
    const material = new THREE.MeshLambertMaterial({
        color: color,
        map: config.weathered ? this.createWeatheredWoodTexture() : null
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create weathered wood texture
 * @returns {THREE.DataTexture} Weathered wood texture
 */
static createWeatheredWoodTexture() {
    if (this.textureCache.has('weatheredWood')) {
        return this.textureCache.get('weatheredWood');
    }
    
    const size = 128;
    const data = new Uint8Array(size * size * 3);
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const index = (i * size + j) * 3;
            
            // Create weathered wood pattern
            const x = i / size;
            const y = j / size;
            
            // Base wood color
            let r = 139;
            let g = 90;
            let b = 43;
            
            // Add wood grain
            const grain = Math.sin(y * 40 + Math.sin(x * 10) * 2) * 20;
            
            // Add weathering
            const weathering = Math.random() * 30 - 15;
            
            r = Math.max(0, Math.min(255, r + grain + weathering));
            g = Math.max(0, Math.min(255, g + grain * 0.7 + weathering));
            b = Math.max(0, Math.min(255, b + grain * 0.5 + weathering));
            
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
        }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    this.textureCache.set('weatheredWood', texture);
    return texture;
}

/**
 * Create particle material for effects
 * @param {Object} options - Material configuration
 * @returns {THREE.PointsMaterial} Particle material
 */
static createParticleMaterial(options = {}) {
    const config = {
        color: 0xFFFFFF,
        size: 1.0,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        ...options
    };
    
    const cacheKey = `particle_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const material = new THREE.PointsMaterial({
        color: config.color,
        size: config.size,
        transparent: config.transparent,
        opacity: config.opacity,
        blending: config.blending,
        vertexColors: true,
        sizeAttenuation: true
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create animated flag material
 * @param {Object} options - Material configuration
 * @returns {THREE.ShaderMaterial} Flag material
 */
static createFlagMaterial(options = {}) {
    const config = {
        color: 0xFF0000,
        windStrength: 0.5,
        ...options
    };
    
    const cacheKey = `flag_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const vertexShader = `
        uniform float time;
        uniform float windStrength;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
            vUv = uv;
            vNormal = normal;
            
            // Apply wave motion to flag
            vec3 newPosition = position;
            float wave = sin(position.x * 5.0 + time * 3.0) * windStrength * position.x * 0.1;
            newPosition.y += wave;
            newPosition.z += wave * 0.5;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 flagColor;
        uniform float time;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
            vec3 color = flagColor;
            
            // Add some shading based on wave deformation
            float shade = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)) * 0.3 + 0.7;
            color *= shade;
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            flagColor: { value: new THREE.Color(config.color) },
            time: { value: 0 },
            windStrength: { value: config.windStrength }
        },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Create glowing material for special effects
 * @param {Object} options - Material configuration
 * @returns {THREE.ShaderMaterial} Glowing material
 */
static createGlowMaterial(options = {}) {
    const config = {
        color: 0xFFFF00,
        intensity: 1.0,
        ...options
    };
    
    const cacheKey = `glow_${JSON.stringify(config)}`;
    if (this.materialCache.has(cacheKey)) {
        return this.materialCache.get(cacheKey);
    }
    
    const vertexShader = `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 glowColor;
        uniform float intensity;
        uniform float time;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            // Fresnel glow effect
            float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            
            // Pulsing animation
            float pulse = sin(time * 2.0) * 0.3 + 0.7;
            
            vec3 color = glowColor * intensity * fresnel * pulse;
            
            gl_FragColor = vec4(color, fresnel * 0.8);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: new THREE.Color(config.color) },
            intensity: { value: config.intensity },
            time: { value: 0 }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
}

/**
 * Update time-based materials
 * @param {number} deltaTime - Time delta
 */
static updateMaterials(deltaTime) {
    const currentTime = performance.now() * 0.001;
    
    // Update all cached materials that have time uniforms
    for (const material of this.materialCache.values()) {
        if (material.uniforms && material.uniforms.time) {
            material.uniforms.time.value = currentTime;
        }
    }
}

/**
 * Clear material cache
 */
static clearCache() {
    // Dispose of all cached materials
    for (const material of this.materialCache.values()) {
        if (material.dispose) {
            material.dispose();
        } else if (material.trunk && material.leaves) {
            // Tree material object
            material.trunk.dispose();
            material.leaves.dispose();
        }
    }
    
    // Dispose of all cached textures
    for (const texture of this.textureCache.values()) {
        texture.dispose();
    }
    
    this.materialCache.clear();
    this.textureCache.clear();
    
    console.log('🧹 Material cache cleared');
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
static getCacheStats() {
    return {
        materialCount: this.materialCache.size,
        textureCount: this.textureCache.size,
        totalMemoryEstimate: (this.materialCache.size + this.textureCache.size) * 0.5 + ' MB'
    };
}
```

// End of MaterialUtils class - Remember to close the class bracket when combining with Part 1
}

}

