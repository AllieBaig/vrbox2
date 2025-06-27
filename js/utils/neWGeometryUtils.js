

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

}

