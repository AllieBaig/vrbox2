

/*
Purpose: Geometry creation utilities for Summer Afternoon Three.js game - Part 1
Key features: Tree shapes, grass, flowers, basic vegetation geometry
Dependencies: Three.js, MathUtils.js
Related helpers: Environment.js, MathUtils.js, MaterialUtils.js
Function names: createTreeTrunk, createTreeCrown, createGrassBlade, createFlower, addTrunkIrregularities
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 11:30 | File: js/utils/GeometryUtils.js (Part 1)
*/

import { MathUtils } from ‘./MathUtils.js’;

export class GeometryUtils {
/**
* Create a tree trunk geometry with natural variations
* @param {Object} options - Configuration options
* @returns {THREE.CylinderGeometry} Tree trunk geometry
*/
static createTreeTrunk(options = {}) {
const config = {
height: 4,
radiusTop: 0.1,
radiusBottom: 0.3,
radialSegments: 8,
heightSegments: 6,
irregularity: 0.1,
taper: 0.7,
…options
};

```
    // Create base cylinder
    const geometry = new THREE.CylinderGeometry(
        config.radiusTop,
        config.radiusBottom,
        config.height,
        config.radialSegments,
        config.heightSegments
    );
    
    // Add natural irregularities
    this.addTrunkIrregularities(geometry, config);
    
    // Store configuration in geometry for reference
    geometry.parameters = config;
    
    return geometry;
}

/**
 * Add natural irregularities to tree trunk
 * @param {THREE.CylinderGeometry} geometry - Trunk geometry
 * @param {Object} config - Configuration
 */
static addTrunkIrregularities(geometry, config) {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;
    
    for (let i = 0; i < vertexCount; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        
        // Calculate height ratio (0 at bottom, 1 at top)
        const heightRatio = (y + config.height / 2) / config.height;
        
        // Add noise-based irregularities
        const angle = Math.atan2(z, x);
        const radius = Math.sqrt(x * x + z * z);
        
        const noiseScale = 0.5;
        const noiseValue = MathUtils.noise(
            angle * noiseScale,
            y * noiseScale * 0.3
        );
        
        // Apply irregularity (stronger at bottom)
        const irregularityStrength = config.irregularity * (1 - heightRatio * 0.5);
        const radiusMultiplier = 1 + noiseValue * irregularityStrength;
        
        positions[i * 3] = x * radiusMultiplier;
        positions[i * 3 + 2] = z * radiusMultiplier;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
}

/**
 * Create tree crown geometry based on tree type
 * @param {string} treeType - Type of tree (oak, pine, birch)
 * @param {Object} options - Configuration options
 * @returns {THREE.Geometry} Tree crown geometry
 */
static createTreeCrown(treeType, options = {}) {
    const config = {
        size: 2,
        height: 2,
        segments: 8,
        irregularity: 0.2,
        ...options
    };
    
    switch (treeType) {
        case 'oak':
            return this.createOakCrown(config);
        case 'pine':
            return this.createPineCrown(config);
        case 'birch':
            return this.createBirchCrown(config);
        default:
            return this.createGenericCrown(config);
    }
}

/**
 * Create oak tree crown (rounded, full)
 * @param {Object} config - Configuration
 * @returns {THREE.Geometry} Oak crown geometry
 */
static createOakCrown(config) {
    // Create multiple spheres for a fuller look
    const group = new THREE.Group();
    const mainRadius = config.size;
    
    // Main crown sphere
    const mainGeometry = new THREE.SphereGeometry(
        mainRadius,
        config.segments,
        config.segments / 2
    );
    
    // Add irregularities to main sphere
    this.addSphereIrregularities(mainGeometry, config.irregularity);
    
    // Create additional smaller spheres for fuller appearance
    const subSphereCount = 3 + Math.floor(Math.random() * 3);
    const geometries = [mainGeometry];
    
    for (let i = 0; i < subSphereCount; i++) {
        const subRadius = mainRadius * MathUtils.random(0.3, 0.6);
        const subGeometry = new THREE.SphereGeometry(
            subRadius,
            Math.max(6, config.segments - 2),
            Math.max(3, config.segments / 2 - 1)
        );
        
        // Position sub-spheres around main sphere
        const angle = (i / subSphereCount) * Math.PI * 2;
        const distance = mainRadius * MathUtils.random(0.4, 0.8);
        const height = MathUtils.random(-mainRadius * 0.3, mainRadius * 0.3);
        
        // Translate sub-sphere
        const positions = subGeometry.attributes.position.array;
        for (let j = 0; j < positions.length; j += 3) {
            positions[j] += Math.cos(angle) * distance;
            positions[j + 1] += height;
            positions[j + 2] += Math.sin(angle) * distance;
        }
        
        this.addSphereIrregularities(subGeometry, config.irregularity * 0.7);
        geometries.push(subGeometry);
    }
    
    // Merge geometries
    return this.mergeGeometries(geometries);
}

/**
 * Create pine tree crown (conical)
 * @param {Object} config - Configuration
 * @returns {THREE.Geometry} Pine crown geometry
 */
static createPineCrown(config) {
    const geometry = new THREE.ConeGeometry(
        config.size,
        config.height,
        config.segments,
        Math.max(3, Math.floor(config.segments / 2))
    );
    
    // Add natural variations to pine cone shape
    this.addConeIrregularities(geometry, config);
    
    // Store configuration
    geometry.parameters = { ...config, height: config.height };
    
    return geometry;
}

/**
 * Create birch tree crown (tall, narrow)
 * @param {Object} config - Configuration
 * @returns {THREE.Geometry} Birch crown geometry
 */
static createBirchCrown(config) {
    // Birch trees have a more oval, upright crown
    const geometry = new THREE.SphereGeometry(
        config.size * 0.8,
        config.segments,
        config.segments / 2
    );
    
    // Scale vertically to make it taller
    const positions = geometry.attributes.position.array;
    for (let i = 1; i < positions.length; i += 3) {
        positions[i] *= 1.4; // Make 40% taller
    }
    
    this.addSphereIrregularities(geometry, config.irregularity * 0.8);
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    // Store configuration
    geometry.parameters = { ...config, height: config.size * 1.4 };
    
    return geometry;
}

/**
 * Create generic tree crown
 * @param {Object} config - Configuration
 * @returns {THREE.Geometry} Generic crown geometry
 */
static createGenericCrown(config) {
    const geometry = new THREE.SphereGeometry(
        config.size,
        config.segments,
        config.segments / 2
    );
    
    this.addSphereIrregularities(geometry, config.irregularity);
    
    // Store configuration
    geometry.parameters = { ...config, height: config.size };
    
    return geometry;
}

/**
 * Add irregularities to sphere geometry
 * @param {THREE.SphereGeometry} geometry - Sphere geometry
 * @param {number} strength - Irregularity strength
 */
static addSphereIrregularities(geometry, strength) {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;
    
    for (let i = 0; i < vertexCount; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        
        // Calculate spherical coordinates
        const radius = Math.sqrt(x * x + y * y + z * z);
        const theta = Math.atan2(z, x);
        const phi = Math.acos(y / radius);
        
        // Add noise
        const noiseScale = 2;
        const noiseValue = MathUtils.noise3D(
            x * noiseScale,
            y * noiseScale,
            z * noiseScale
        );
        
        const radiusMultiplier = 1 + noiseValue * strength;
        const newRadius = radius * radiusMultiplier;
        
        // Convert back to Cartesian
        positions[i * 3] = newRadius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = newRadius * Math.cos(phi);
        positions[i * 3 + 2] = newRadius * Math.sin(phi) * Math.sin(theta);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
}

/**
 * Add irregularities to cone geometry
 * @param {THREE.ConeGeometry} geometry - Cone geometry
 * @param {Object} config - Configuration
 */
static addConeIrregularities(geometry, config) {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;
    
    for (let i = 0; i < vertexCount; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        
        // Calculate height ratio (0 at top, 1 at bottom)
        const heightRatio = (y + config.height / 2) / config.height;
        
        if (heightRatio > 0.1) { // Don't modify the tip
            const angle = Math.atan2(z, x);
            const radius = Math.sqrt(x * x + z * z);
            
            const noiseValue = MathUtils.noise(
                angle * 1.5,
                y * 0.5
            );
            
            const irregularityStrength = config.irregularity * heightRatio;
            const radiusMultiplier = 1 + noiseValue * irregularityStrength;
            
            positions[i * 3] = x * radiusMultiplier;
            positions[i * 3 + 2] = z * radiusMultiplier;
        }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
}

/**
 * Create grass blade geometry
 * @param {Object} options - Configuration options
 * @returns {THREE.Geometry} Grass blade geometry
 */
static createGrassBlade(options = {}) {
    const config = {
        height: 0.5,
        width: 0.02,
        segments: 3,
        bend: 0.1,
        ...options
    };
    
    const geometry = new THREE.PlaneGeometry(
        config.width,
        config.height,
        1,
        config.segments
    );
    
    // Add natural bend to grass blade
    this.addGrassBend(geometry, config);
    
    return geometry;
}

/**
 * Add natural bend to grass blade
 * @param {THREE.PlaneGeometry} geometry - Grass geometry
 * @param {Object} config - Configuration
 */
static addGrassBend(geometry, config) {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;
    
    for (let i = 0; i < vertexCount; i++) {
        const y = positions[i * 3 + 1];
        
        // Calculate height ratio (0 at bottom, 1 at top)
        const heightRatio = (y + config.height / 2) / config.height;
        
        if (heightRatio > 0) {
            // Apply bend (quadratic curve)
            const bendAmount = config.bend * heightRatio * heightRatio;
            const bendDirection = MathUtils.random(-1, 1);
            
            positions[i * 3] += bendAmount * bendDirection;
        }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
}

/**
 * Create flower geometry based on flower type
 * @param {string} flowerType - Type of flower
 * @param {Object} options - Configuration options
 * @returns {THREE.Geometry} Flower geometry
 */
static createFlower(flowerType, options = {}) {
    const config = {
        size: 0.1,
        petalCount: 5,
        stemHeight: 0.3,
        ...options
    };
    
    switch (flowerType) {
        case 'daisy':
            return this.createDaisy(config);
        case 'wildflower':
            return this.createWildflower(config);
        case 'poppy':
            return this.createPoppy(config);
        default:
            return this.createGenericFlower(config);
    }
}

/**
 * Create daisy flower geometry
 * @param {Object} config - Configuration
 * @returns {THREE.Geometry} Daisy geometry
 */
static createDaisy(config) {
    const group = new THREE.Group();
    const geometries = [];
    
    // Create center
    const centerGeometry = new THREE.CircleGeometry(config.size * 0.3, 8);
    geometries.push(centerGeometry);
    
    // Create petals
    const petalCount = config.petalCount || 8;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petalGeometry = this.createPetal(config.size * 0.6, config.size * 0.2);
        
        // Position and rotate petal
        const positions = petalGeometry.attributes.position.array;
        for (let j = 0; j < positions.length; j += 3) {
            const x = positions[j];
            const y = positions[j + 1];
            
            // Rotate around origin
            positions[j] = x * Math.cos(angle) - y * Math.sin(angle);
            positions[j + 1] = x * Math.sin(angle) + y * Math.cos(angle);
            
            // Move to petal position
            positions[j] += Math.cos(angle) * config.size * 0.4;
            positions[j + 1] += Math.sin(angle) * config.size * 0.4;
        }
        
        petalGeometry.attributes.position.needsUpdate = true;
        geometries.push(petalGeometry);
    }
    
    // Create stem if needed
    if (config.stemHeight > 0) {
        const stemGeometry = this.createStem(config.stemHeight, config.size * 0.05);
        geometries.push(stemGeometry);
    }
    
    return this.mergeGeometries(geometries);
}

/**
 * Create wildflower geometry
 * @param {Object} config - Configuration
 * @returns {THREE.Geometry} Wildflower geometry
 */
static createWildflower(config) {
    // Simple 4-petal flower
    const modifiedConfig = { ...config, petalCount: 4 };
    return this.createDaisy(modifiedConfig);
}

/**
 * Create poppy flower geometry
 * @param {Object} config - Configuration
 * @returns {THREE.Geometry} Poppy geometry
 */
static createPoppy(config) {
    // Larger petals, fewer count
    const modifiedConfig = { 
        ...config, 
        petalCount: 4,
        size: config.size * 1.3
    };
    return this.createDaisy(modifiedConfig);
}

/**
 * Create generic flower geometry
 * @param {Object} config - Configuration
 * @returns {THREE.Geometry} Generic flower geometry
 */
static createGenericFlower(config) {
    return this.createDaisy(config);
}

/**
 * Create a single petal geometry
 * @param {number} length - Petal length
 * @param {number} width - Petal width
 * @returns {THREE.Geometry} Petal geometry
 */
static createPetal(length, width) {
    const geometry = new THREE.PlaneGeometry(width, length, 2, 3);
    
    // Shape the petal to be more natural
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        
        // Make petal pointed at tip and wider at base
        const yRatio = (y + length / 2) / length;
        const widthScale = Math.sin(yRatio * Math.PI) * 0.8 + 0.2;
        
        positions[i] = x * widthScale;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
}

/**
 * Create stem geometry
 * @param {number} height - Stem height
 * @param {number} radius - Stem radius
 * @returns {THREE.Geometry} Stem geometry
 */
static createStem(height, radius) {
    const geometry = new THREE.CylinderGeometry(
        radius * 0.5,
        radius,
        height,
        6,
        3
    );
    
    // Position stem below flower
    const positions = geometry.attributes.position.array;
    for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= height / 2;
    }
    
    geometry.attributes.position.needsUpdate = true;
    
    return geometry;
}

/**
 * Merge multiple geometries into one
 * @param {Array<THREE.Geometry>} geometries - Array of geometries to merge
 * @returns {THREE.BufferGeometry} Merged geometry
 */
static mergeGeometries(geometries) {
    if (geometries.length === 0) return new THREE.BufferGeometry();
    if (geometries.length === 1) return geometries[0];
    
    // Use Three.js BufferGeometryUtils if available, otherwise simple merge
    if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeGeometries) {
        return THREE.BufferGeometryUtils.mergeGeometries(geometries);
    }
    
    // Fallback: simple merge
    const mergedGeometry = geometries[0].clone();
    
    for (let i = 1; i < geometries.length; i++) {
        // This is a simplified merge - in production you'd want a more robust solution
        console.warn('BufferGeometryUtils not available, using simplified geometry merge');
    }
    
    return mergedGeometry;
}
```

/*
Purpose: Geometry creation utilities for Summer Afternoon Three.js game - Part 2
Key features: Rocks, terrain, water, buildings, paths, environmental structures
Dependencies: Three.js, MathUtils.js - Extends Part 1
Related helpers: Environment.js, MathUtils.js, MaterialUtils.js
Function names: createRock, createTerrain, createWaterSurface, createSimpleBuilding, createPath
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 11:35 | File: js/utils/GeometryUtils.js (Part 2)
*/

// NOTE: This is Part 2 of GeometryUtils.js - Add these methods to the GeometryUtils class from Part 1

```
/**
 * Create rock geometry with natural irregularities
 * @param {Object} options - Configuration options
 * @returns {THREE.Geometry} Rock geometry
 */
static createRock(options = {}) {
    const config = {
        size: 1,
        irregularity: 0.3,
        segments: 8,
        ...options
    };
    
    // Start with a basic shape (sphere or box)
    let geometry;
    
    if (MathUtils.randomBool()) {
        // Sphere-based rock
        geometry = new THREE.SphereGeometry(
            config.size,
            config.segments,
            config.segments / 2
        );
    } else {
        // Box-based rock
        geometry = new THREE.BoxGeometry(
            config.size,
            config.size * 0.8,
            config.size * 0.9
        );
    }
    
    // Add natural irregularities
    this.addRockIrregularities(geometry, config);
    
    return geometry;
}

/**
 * Add natural irregularities to rock geometry
 * @param {THREE.Geometry} geometry - Rock geometry
 * @param {Object} config - Configuration
 */
static addRockIrregularities(geometry, config) {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;
    
    for (let i = 0; i < vertexCount; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        
        // Apply multiple octaves of noise for complex surface
        const noiseScale1 = 1.5;
        const noiseScale2 = 3.0;
        const noiseScale3 = 6.0;
        
        const noise1 = MathUtils.noise3D(x * noiseScale1, y * noiseScale1, z * noiseScale1);
        const noise2 = MathUtils.noise3D(x * noiseScale2, y * noiseScale2, z * noiseScale2) * 0.5;
        const noise3 = MathUtils.noise3D(x * noiseScale3, y * noiseScale3, z * noiseScale3) * 0.25;
        
        const totalNoise = noise1 + noise2 + noise3;
        const displacement = totalNoise * config.irregularity;
        
        // Calculate normal direction for displacement
        const length = Math.sqrt(x * x + y * y + z * z);
        if (length > 0) {
            const normalX = x / length;
            const normalY = y / length;
            const normalZ = z / length;
            
            positions[i * 3] += normalX * displacement;
            positions[i * 3 + 1] += normalY * displacement;
            positions[i * 3 + 2] += normalZ * displacement;
        }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
}

/**
 * Create terrain geometry with height variation
 * @param {Object} options - Configuration options
 * @returns {THREE.PlaneGeometry} Terrain geometry
 */
static createTerrain(options = {}) {
    const config = {
        size: 100,
        segments: 50,
        heightVariation: 5,
        noiseScale: 0.1,
        octaves: 4,
        persistence: 0.5,
        ...options
    };
    
    const geometry = new THREE.PlaneGeometry(
        config.size,
        config.size,
        config.segments,
        config.segments
    );
    
    // Apply height variation
    this.applyTerrainHeights(geometry, config);
    
    return geometry;
}

/**
 * Apply height variation to terrain
 * @param {THREE.PlaneGeometry} geometry - Terrain geometry
 * @param {Object} config - Configuration
 */
static applyTerrainHeights(geometry, config) {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;
    
    for (let i = 0; i < vertexCount; i++) {
        const x = positions[i * 3];
        const z = positions[i * 3 + 2];
        
        // Generate height using fractal noise
        const height = MathUtils.fractalNoise(
            x * config.noiseScale,
            z * config.noiseScale,
            config.octaves,
            config.persistence
        ) * config.heightVariation;
        
        positions[i * 3 + 1] = height;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
}

/**
 * Create water surface geometry with animated waves
 * @param {Object} options - Configuration options
 * @returns {THREE.PlaneGeometry} Water geometry
 */
static createWaterSurface(options = {}) {
    const config = {
        size: 50,
        segments: 32,
        waveHeight: 0.2,
        waveFrequency: 0.1,
        ...options
    };
    
    const geometry = new THREE.PlaneGeometry(
        config.size,
        config.size,
        config.segments,
        config.segments
    );
    
    // Store wave configuration for animation
    geometry.userData = {
        waveConfig: config,
        originalPositions: Float32Array.from(geometry.attributes.position.array)
    };
    
    return geometry;
}

/**
 * Animate water surface (to be called in update loop)
 * @param {THREE.PlaneGeometry} waterGeometry - Water geometry
 * @param {number} time - Current time
 */
static animateWaterSurface(waterGeometry, time) {
    if (!waterGeometry.userData || !waterGeometry.userData.waveConfig) return;
    
    const config = waterGeometry.userData.waveConfig;
    const originalPositions = waterGeometry.userData.originalPositions;
    const positions = waterGeometry.attributes.position.array;
    
    for (let i = 0; i < positions.length; i += 3) {
        const x = originalPositions[i];
        const z = originalPositions[i + 2];
        
        // Create wave pattern
        const wave1 = Math.sin(x * config.waveFrequency + time) * config.waveHeight;
        const wave2 = Math.sin(z * config.waveFrequency * 1.3 + time * 1.2) * config.waveHeight * 0.7;
        const wave3 = Math.sin((x + z) * config.waveFrequency * 0.7 + time * 0.8) * config.waveHeight * 0.5;
        
        positions[i + 1] = wave1 + wave2 + wave3;
    }
    
    waterGeometry.attributes.position.needsUpdate = true;
    waterGeometry.computeVertexNormals();
}

/**
 * Create a simple cloud geometry
 * @param {Object} options - Configuration options
 * @returns {THREE.Geometry} Cloud geometry
 */
static createCloud(options = {}) {
    const config = {
        size: 5,
        puffCount: 5,
        irregularity: 0.3,
        ...options
    };
    
    const geometries = [];
    
    // Create multiple spheres to form cloud
    for (let i = 0; i < config.puffCount; i++) {
        const puffSize = config.size * MathUtils.random(0.5, 1.0);
        const puffGeometry = new THREE.SphereGeometry(puffSize, 8, 6);
        
        // Position puff
        const angle = (i / config.puffCount) * Math.PI * 2;
        const distance = config.size * MathUtils.random(0.3, 0.8);
        const height = MathUtils.random(-config.size * 0.2, config.size * 0.2);
        
        const positions = puffGeometry.attributes.position.array;
        for (let j = 0; j < positions.length; j += 3) {
            positions[j] += Math.cos(angle) * distance;
            positions[j + 1] += height;
            positions[j + 2] += Math.sin(angle) * distance;
        }
        
        this.addSphereIrregularities(puffGeometry, config.irregularity);
        geometries.push(puffGeometry);
    }
    
    return this.mergeGeometries(geometries);
}

/**
 * Create a simple path/road geometry
 * @param {Array<THREE.Vector3>} points - Path points
 * @param {Object} options - Configuration options
 * @returns {THREE.Geometry} Path geometry
 */
static createPath(points, options = {}) {
    const config = {
        width: 2,
        segments: 10,
        ...options
    };
    
    if (points.length < 2) {
        return new THREE.BufferGeometry();
    }
    
    const vertices = [];
    const indices = [];
    const uvs = [];
    
    // Generate path geometry along points
    for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        
        // Calculate direction and perpendicular
        const direction = new THREE.Vector3().subVectors(next, current).normalize();
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        
        // Create quad for this segment
        const v1 = current.clone().add(perpendicular.clone().multiplyScalar(config.width / 2));
        const v2 = current.clone().sub(perpendicular.clone().multiplyScalar(config.width / 2));
        const v3 = next.clone().add(perpendicular.clone().multiplyScalar(config.width / 2));
        const v4 = next.clone().sub(perpendicular.clone().multiplyScalar(config.width / 2));
        
        const baseIndex = vertices.length / 3;
        
        // Add vertices
        vertices.push(v1.x, v1.y, v1.z);
        vertices.push(v2.x, v2.y, v2.z);
        vertices.push(v3.x, v3.y, v3.z);
        vertices.push(v4.x, v4.y, v4.z);
        
        // Add UVs
        const uv = i / (points.length - 1);
        uvs.push(0, uv, 1, uv, 0, uv + 1 / (points.length - 1), 1, uv + 1 / (points.length - 1));
        
        // Add indices for two triangles
        indices.push(
            baseIndex, baseIndex + 1, baseIndex + 2,
            baseIndex + 1, baseIndex + 3, baseIndex + 2
        );
    }
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
}

/**
 * Create a simple fence geometry
 * @param {Array<THREE.Vector3>} points - Fence line points
 * @param {Object} options - Configuration options
 * @returns {THREE.Group} Fence group with posts and rails
 */
static createFence(points, options = {}) {
    const config = {
        postHeight: 1.5,
        postWidth: 0.1,
        railHeight: 0.05,
        railCount: 3,
        postSpacing: 2,
        ...options
    };
    
    const fenceGroup = new THREE.Group();
    
    if (points.length < 2) return fenceGroup;
    
    // Calculate total distance and post positions
    let totalDistance = 0;
    const distances = [0];
    
    for (let i = 1; i < points.length; i++) {
        const segmentDistance = points[i].distanceTo(points[i - 1]);
        totalDistance += segmentDistance;
        distances.push(totalDistance);
    }
    
    // Place posts
    const postCount = Math.floor(totalDistance / config.postSpacing) + 1;
    const postPositions = [];
    
    for (let i = 0; i <= postCount; i++) {
        const targetDistance = (i / postCount) * totalDistance;
        const position = this.getPositionAlongPath(points, distances, targetDistance);
        postPositions.push(position);
        
        // Create post geometry
        const postGeometry = new THREE.BoxGeometry(
            config.postWidth,
            config.postHeight,
            config.postWidth
        );
        
        const post = new THREE.Mesh(postGeometry);
        post.position.copy(position);
        post.position.y += config.postHeight / 2;
        
        fenceGroup.add(post);
    }
    
    // Create rails between posts
    for (let i = 0; i < postPositions.length - 1; i++) {
        const start = postPositions[i];
        const end = postPositions[i + 1];
        const distance = start.distanceTo(end);
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        
        for (let r = 0; r < config.railCount; r++) {
            const railY = (config.postHeight / config.railCount) * (r + 0.5);
            
            const railGeometry = new THREE.BoxGeometry(
                distance,
                config.railHeight,
                config.railHeight
            );
            
            const rail = new THREE.Mesh(railGeometry);
            rail.position.copy(start).add(end).multiplyScalar(0.5);
            rail.position.y = railY;
            
            // Rotate rail to face correct direction
            rail.lookAt(end);
            rail.rotateY(Math.PI / 2);
            
            fenceGroup.add(rail);
        }
    }
    
    return fenceGroup;
}

/**
 * Get position along a path at a specific distance
 * @param {Array<THREE.Vector3>} points - Path points
 * @param {Array<number>} distances - Cumulative distances
 * @param {number} targetDistance - Target distance along path
 * @returns {THREE.Vector3} Position along path
 */
static getPositionAlongPath(points, distances, targetDistance) {
    // Find the segment containing the target distance
    for (let i = 1; i < distances.length; i++) {
        if (targetDistance <= distances[i]) {
            const segmentStart = distances[i - 1];
            const segmentEnd = distances[i];
            const segmentLength = segmentEnd - segmentStart;
            const segmentProgress = (targetDistance - segmentStart) / segmentLength;
            
            return new THREE.Vector3().lerpVectors(
                points[i - 1],
                points[i],
                segmentProgress
            );
        }
    }
    
    // If target distance is beyond the path, return the last point
    return points[points.length - 1].clone();
}

/**
 * Create a simple building/structure geometry
 * @param {Object} options - Configuration options
 * @returns {THREE.Group} Building group
 */
static createSimpleBuilding(options = {}) {
    const config = {
        width: 4,
        height: 3,
        depth: 4,
        roofHeight: 1,
        roofType: 'pitched', // 'pitched', 'flat', 'hip'
        ...options
    };
    
    const buildingGroup = new THREE.Group();
    
    // Create main structure
    const wallGeometry = new THREE.BoxGeometry(
        config.width,
        config.height,
        config.depth
    );
    
    const walls = new THREE.Mesh(wallGeometry);
    walls.position.y = config.height / 2;
    buildingGroup.add(walls);
    
    // Create roof
    let roofGeometry;
    switch (config.roofType) {
        case 'pitched':
            roofGeometry = this.createPitchedRoof(config);
            break;
        case 'hip':
            roofGeometry = this.createHipRoof(config);
            break;
        default:
            roofGeometry = new THREE.BoxGeometry(
                config.width + 0.2,
                0.2,
                config.depth + 0.2
            );
    }
    
    const roof = new THREE.Mesh(roofGeometry);
    roof.position.y = config.height + config.roofHeight / 2;
    buildingGroup.add(roof);
    
    return buildingGroup;
}

/**
 * Create pitched roof geometry
 * @param {Object} config - Building configuration
 * @returns {THREE.Geometry} Pitched roof geometry
 */
static createPitchedRoof(config) {
    const vertices = [];
    const indices = [];
    
    const halfWidth = config.width / 2 + 0.1;
    const halfDepth = config.depth / 2 + 0.1;
    const roofHeight = config.roofHeight;
    
    // Roof vertices
    vertices.push(
        // Bottom rectangle
        -halfWidth, 0, -halfDepth,
        halfWidth, 0, -halfDepth,
        halfWidth, 0, halfDepth,
        -halfWidth, 0, halfDepth,
        // Top ridge
        0, roofHeight, -halfDepth,
        0, roofHeight, halfDepth
    );
    
    // Roof faces
    indices.push(
        // Front face
        0, 4, 1,
        // Back face
        3, 2, 5,
        // Left face
        0, 3, 5, 0, 5, 4,
        // Right face
        1, 4, 5, 1, 5, 2
    );
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
}

/**
 * Create hip roof geometry
 * @param {Object} config - Building configuration
 * @returns {THREE.Geometry} Hip roof geometry
 */
static createHipRoof(config) {
    // Simplified hip roof as a pyramid
    const geometry = new THREE.ConeGeometry(
        Math.max(config.width, config.depth) * 0.7,
        config.roofHeight,
        4
    );
    
    // Rotate to align with building
    geometry.rotateY(Math.PI / 4);
    
    return geometry;
}

/**
 * Create procedural cave entrance geometry
 * @param {Object} options - Configuration options
 * @returns {THREE.Geometry} Cave entrance geometry
 */
static createCaveEntrance(options = {}) {
    const config = {
        width: 3,
        height: 2.5,
        depth: 2,
        irregularity: 0.4,
        segments: 16,
        ...options
    };
    
    // Start with a cylinder
    const geometry = new THREE.CylinderGeometry(
        config.width / 2,
        config.width / 2,
        config.depth,
        config.segments,
        1
    );
    
    // Rotate to face forward
    geometry.rotateX(Math.PI / 2);
    
    // Add irregularities to make it look like a natural cave
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        
        // Add noise-based irregularities
        const noiseValue = MathUtils.noise3D(x * 2, y * 2, z * 2);
        const displacement = noiseValue * config.irregularity;
        
        // Apply displacement radially
        const radius = Math.sqrt(x * x + y * y);
        if (radius > 0) {
            const normalX = x / radius;
            const normalY = y / radius;
            
            positions[i] += normalX * displacement;
            positions[i + 1] += normalY * displacement;
        }
        
        // Vary height
        if (Math.abs(y) > config.height / 2 - 0.5) {
            const heightNoise = MathUtils.noise(x * 1.5, z * 1.5);
            positions[i + 1] += heightNoise * config.irregularity * 0.5;
        }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
}

/**
 * Create a decorative arch geometry
 * @param {Object} options - Configuration options
 * @returns {THREE.Geometry} Arch geometry
 */
static createArch(options = {}) {
    const config = {
        width: 3,
        height: 4,
        thickness: 0.5,
        segments: 16,
        ...options
    };
    
    const outerRadius = config.width / 2;
    const innerRadius = outerRadius - config.thickness;
    
    // Create the arch shape
    const shape = new THREE.Shape();
    
    // Outer arc
    shape.absarc(0, 0, outerRadius, 0, Math.PI, false);
    shape.lineTo(-outerRadius, config.height - outerRadius);
    shape.lineTo(-outerRadius + config.thickness, config.height - outerRadius);
    shape.lineTo(-outerRadius + config.thickness, 0);
    
    // Inner arc (hole)
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI, false);
    hole.lineTo(-innerRadius, config.height - outerRadius);
    hole.lineTo(innerRadius, config.height - outerRadius);
    shape.holes.push(hole);
    
    // Extrude the shape
    const extrudeSettings = {
        depth: config.thickness,
        bevelEnabled: false,
        curveSegments: config.segments
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Center the geometry
    geometry.translate(0, -(config.height - outerRadius), -config.thickness / 2);
    
    return geometry;
}

/**
 * Create a windmill geometry
 * @param {Object} options - Configuration options
 * @returns {THREE.Group} Windmill group
 */
static createWindmill(options = {}) {
    const config = {
        towerHeight: 8,
        towerRadius: 0.5,
        bladeLength: 3,
        bladeCount: 4,
        ...options
    };
    
    const windmillGroup = new THREE.Group();
    
    // Create tower
    const towerGeometry = new THREE.CylinderGeometry(
        config.towerRadius * 0.8,
        config.towerRadius,
        config.towerHeight,
        8
    );
    
    const tower = new THREE.Mesh(towerGeometry);
    tower.position.y = config.towerHeight / 2;
    windmillGroup.add(tower);
    
    // Create blade assembly
    const bladeGroup = new THREE.Group();
    bladeGroup.position.y = config.towerHeight;
    
    for (let i = 0; i < config.bladeCount; i++) {
        const angle = (i / config.bladeCount) * Math.PI * 2;
        
        // Create blade
        const bladeGeometry = new THREE.BoxGeometry(
            0.1,
            config.bladeLength,
            0.05
        );
        
        const blade = new THREE.Mesh(bladeGeometry);
        blade.position.y = config.bladeLength / 2;
        blade.rotation.z = angle;
        
        bladeGroup.add(blade);
    }
    
    windmillGroup.add(bladeGroup);
    
    // Store blade group for animation
    windmillGroup.userData = { bladeGroup };
    
    return windmillGroup;
}

/**
 * Create a well geometry
 * @param {Object} options - Configuration options
 * @returns {THREE.Group} Well group
 */
static createWell(options = {}) {
    const config = {
        radius: 1,
        height: 0.8,
        roofHeight: 1.5,
        postHeight: 2,
        ...options
    };
    
    const wellGroup = new THREE.Group();
    
    // Create well base (cylinder with hole)
    const wellGeometry = new THREE.CylinderGeometry(
        config.radius,
        config.radius,
        config.height,
        16
    );
    
    const well = new THREE.Mesh(wellGeometry);
    well.position.y = config.height / 2;
    wellGroup.add(well);
    
    // Create support posts
    const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, config.postHeight, 8);
    
    for (let i = 0; i < 2; i++) {
        const post = new THREE.Mesh(postGeometry);
        post.position.x = (i === 0 ? -1 : 1) * config.radius * 0.8;
        post.position.y = config.postHeight / 2;
        wellGroup.add(post);
    }
    
    // Create roof
    const roofGeometry = new THREE.ConeGeometry(config.radius * 1.2, config.roofHeight, 8);
    const roof = new THREE.Mesh(roofGeometry);
    roof.position.y = config.postHeight + config.roofHeight / 2;
    wellGroup.add(roof);
    
    return wellGroup;
}
```

// End of GeometryUtils class - Remember to close the class bracket when combining with Part 1
}

}

