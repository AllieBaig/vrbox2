

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

}

