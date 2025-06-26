

/*
Purpose: Procedural environment generation for Summer Afternoon Three.js game
Key features: Terrain generation, tree placement, grass systems, rocks, flowers, LOD optimization
Dependencies: Three.js, GeometryUtils.js, MaterialUtils.js
Related helpers: Scene.js, Lighting.js, MathUtils.js
Function names: init, generateTerrain, placeTrees, createGrass, createFlowers, updateLOD, destroy
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 11:00 | File: js/modules/Environment.js
*/

import { GeometryUtils } from ‘../utils/GeometryUtils.js’;
import { MaterialUtils } from ‘../utils/MaterialUtils.js’;
import { MathUtils } from ‘../utils/MathUtils.js’;

export class Environment {
constructor(scene) {
this.scene = scene;

```
    // Environment objects
    this.terrain = null;
    this.trees = [];
    this.grassPatches = [];
    this.flowers = [];
    this.rocks = [];
    this.environmentGroup = new THREE.Group();
    
    // Generation parameters
    this.config = {
        terrain: {
            size: 200,
            segments: 64,
            heightVariation: 8,
            noiseScale: 0.05,
            textureRepeat: 20
        },
        trees: {
            count: 150,
            minDistance: 8,
            maxDistance: 80,
            minScale: 0.8,
            maxScale: 2.2,
            types: ['oak', 'pine', 'birch']
        },
        grass: {
            patchCount: 300,
            bladesPerPatch: 50,
            maxDistance: 60,
            minScale: 0.5,
            maxScale: 1.5,
            windStrength: 0.3
        },
        flowers: {
            count: 200,
            maxDistance: 50,
            types: ['daisy', 'wildflower', 'poppy'],
            colors: [0xFFFFFF, 0xFFFF00, 0xFF69B4, 0xFF4500, 0x9370DB]
        },
        rocks: {
            count: 80,
            minScale: 0.3,
            maxScale: 1.8,
            maxDistance: 70
        }
    };
    
    // LOD (Level of Detail) system
    this.lod = {
        enabled: true,
        distances: {
            high: 30,
            medium: 60,
            low: 100
        },
        updateFrequency: 10, // Updates per second
        lastUpdate: 0
    };
    
    // Wind animation
    this.wind = {
        time: 0,
        strength: 0.3,
        direction: new THREE.Vector2(1, 0.5).normalize(),
        frequency: 0.8
    };
    
    // Materials cache
    this.materials = {
        terrain: null,
        grass: null,
        tree: new Map(),
        flower: new Map(),
        rock: null
    };
    
    // Performance monitoring
    this.stats = {
        triangles: 0,
        objects: 0,
        visibleObjects: 0
    };
}

async init() {
    try {
        console.log('🌿 Initializing environment...');
        
        // Create materials
        await this.createMaterials();
        
        // Generate terrain
        await this.generateTerrain();
        
        // Place vegetation
        await this.placeVegetation();
        
        // Place rocks and other details
        await this.placeRocks();
        
        // Setup LOD system
        this.setupLOD();
        
        // Add environment group to scene
        this.environmentGroup.name = 'EnvironmentGroup';
        this.scene.add(this.environmentGroup);
        
        // Calculate stats
        this.updateStats();
        
        console.log('✅ Environment initialized successfully');
        console.log(`📊 Generated: ${this.stats.objects} objects, ${this.stats.triangles} triangles`);
        
    } catch (error) {
        console.error('❌ Environment initialization failed:', error);
        throw error;
    }
}

async createMaterials() {
    console.log('🎨 Creating environment materials...');
    
    // Terrain material
    this.materials.terrain = MaterialUtils.createTerrainMaterial({
        grassColor: 0x7CFC00,
        dirtColor: 0x8B4513,
        textureRepeat: this.config.terrain.textureRepeat
    });
    
    // Grass material
    this.materials.grass = MaterialUtils.createGrassMaterial({
        color: 0x228B22,
        windStrength: this.config.grass.windStrength
    });
    
    // Tree materials for different types
    this.materials.tree.set('oak', MaterialUtils.createTreeMaterial({ 
        trunkColor: 0x8B4513, 
        leavesColor: 0x228B22 
    }));
    this.materials.tree.set('pine', MaterialUtils.createTreeMaterial({ 
        trunkColor: 0x654321, 
        leavesColor: 0x006400 
    }));
    this.materials.tree.set('birch', MaterialUtils.createTreeMaterial({ 
        trunkColor: 0xF5F5DC, 
        leavesColor: 0x9ACD32 
    }));
    
    // Flower materials
    this.config.flowers.colors.forEach((color, index) => {
        this.materials.flower.set(index, MaterialUtils.createFlowerMaterial({ color }));
    });
    
    // Rock material
    this.materials.rock = MaterialUtils.createRockMaterial({
        color: 0x696969,
        roughness: 0.9
    });
}

async generateTerrain() {
    console.log('🏔️ Generating terrain...');
    
    const config = this.config.terrain;
    
    // Create terrain geometry
    const geometry = new THREE.PlaneGeometry(
        config.size, 
        config.size, 
        config.segments, 
        config.segments
    );
    
    // Apply height variation using noise
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        
        // Generate height using multiple octaves of noise
        let height = 0;
        height += MathUtils.noise(x * config.noiseScale, z * config.noiseScale) * config.heightVariation;
        height += MathUtils.noise(x * config.noiseScale * 2, z * config.noiseScale * 2) * config.heightVariation * 0.5;
        height += MathUtils.noise(x * config.noiseScale * 4, z * config.noiseScale * 4) * config.heightVariation * 0.25;
        
        vertices[i + 1] = height;
    }
    
    // Recalculate normals for proper lighting
    geometry.computeVertexNormals();
    
    // Create terrain mesh
    this.terrain = new THREE.Mesh(geometry, this.materials.terrain);
    this.terrain.name = 'Terrain';
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.receiveShadow = true;
    
    this.environmentGroup.add(this.terrain);
    
    console.log('✅ Terrain generated');
}

async placeVegetation() {
    console.log('🌳 Placing vegetation...');
    
    // Place trees
    await this.placeTrees();
    
    // Create grass patches
    await this.createGrassPatches();
    
    // Place flowers
    await this.placeFlowers();
    
    console.log('✅ Vegetation placed');
}

async placeTrees() {
    const config = this.config.trees;
    const placedPositions = [];
    
    for (let i = 0; i < config.count; i++) {
        let position;
        let attempts = 0;
        const maxAttempts = 50;
        
        // Find a valid position with minimum distance from other trees
        do {
            position = this.getRandomTerrainPosition(config.maxDistance);
            attempts++;
        } while (
            attempts < maxAttempts && 
            !this.isValidTreePosition(position, placedPositions, config.minDistance)
        );
        
        if (attempts >= maxAttempts) continue;
        
        // Create tree at position
        const tree = this.createTree(position);
        if (tree) {
            this.trees.push(tree);
            this.environmentGroup.add(tree);
            placedPositions.push(position);
        }
    }
    
    console.log(`🌲 Placed ${this.trees.length} trees`);
}

createTree(position) {
    const config = this.config.trees;
    const scale = MathUtils.random(config.minScale, config.maxScale);
    const treeType = config.types[Math.floor(Math.random() * config.types.length)];
    
    // Create tree group
    const treeGroup = new THREE.Group();
    treeGroup.position.copy(position);
    treeGroup.scale.setScalar(scale);
    treeGroup.name = `Tree_${treeType}`;
    
    // Create trunk
    const trunkGeometry = GeometryUtils.createTreeTrunk({
        height: 4 + Math.random() * 2,
        radiusTop: 0.1 + Math.random() * 0.1,
        radiusBottom: 0.2 + Math.random() * 0.1
    });
    
    const trunkMaterial = this.materials.tree.get(treeType).trunk;
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    trunk.position.y = trunk.geometry.parameters.height / 2;
    
    // Create leaves/crown
    const crownGeometry = GeometryUtils.createTreeCrown(treeType, {
        size: 2 + Math.random() * 1.5,
        height: 2 + Math.random() * 1
    });
    
    const crownMaterial = this.materials.tree.get(treeType).leaves;
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.castShadow = true;
    crown.position.y = trunk.geometry.parameters.height + crown.geometry.parameters?.height / 2 || 1;
    
    // Add some randomness to tree rotation
    treeGroup.rotation.y = Math.random() * Math.PI * 2;
    
    treeGroup.add(trunk);
    treeGroup.add(crown);
    
    // Store tree data for LOD
    treeGroup.userData = {
        type: 'tree',
        treeType: treeType,
        lodLevel: 'high',
        originalScale: scale
    };
    
    return treeGroup;
}

async createGrassPatches() {
    const config = this.config.grass;
    
    for (let i = 0; i < config.patchCount; i++) {
        const position = this.getRandomTerrainPosition(config.maxDistance);
        const grassPatch = this.createGrassPatch(position);
        
        if (grassPatch) {
            this.grassPatches.push(grassPatch);
            this.environmentGroup.add(grassPatch);
        }
    }
    
    console.log(`🌱 Created ${this.grassPatches.length} grass patches`);
}

createGrassPatch(position) {
    const config = this.config.grass;
    const scale = MathUtils.random(config.minScale, config.maxScale);
    
    // Create instanced grass geometry
    const grassGeometry = GeometryUtils.createGrassBlade();
    const grassMaterial = this.materials.grass;
    
    const instancedMesh = new THREE.InstancedMesh(
        grassGeometry, 
        grassMaterial, 
        config.bladesPerPatch
    );
    
    // Position grass blades randomly within patch
    const matrix = new THREE.Matrix4();
    const patchSize = 2;
    
    for (let i = 0; i < config.bladesPerPatch; i++) {
        const x = position.x + (Math.random() - 0.5) * patchSize;
        const z = position.z + (Math.random() - 0.5) * patchSize;
        const y = this.getTerrainHeightAt(x, z);
        
        const bladeScale = scale * (0.8 + Math.random() * 0.4);
        const rotation = Math.random() * Math.PI * 2;
        
        matrix.makeRotationY(rotation);
        matrix.scale(new THREE.Vector3(bladeScale, bladeScale, bladeScale));
        matrix.setPosition(x, y, z);
        
        instancedMesh.setMatrixAt(i, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.name = 'GrassPatch';
    instancedMesh.userData = {
        type: 'grass',
        lodLevel: 'high',
        windOffset: Math.random() * Math.PI * 2
    };
    
    return instancedMesh;
}

async placeFlowers() {
    const config = this.config.flowers;
    
    for (let i = 0; i < config.count; i++) {
        const position = this.getRandomTerrainPosition(config.maxDistance);
        const flower = this.createFlower(position);
        
        if (flower) {
            this.flowers.push(flower);
            this.environmentGroup.add(flower);
        }
    }
    
    console.log(`🌸 Placed ${this.flowers.length} flowers`);
}

createFlower(position) {
    const config = this.config.flowers;
    const colorIndex = Math.floor(Math.random() * config.colors.length);
    const flowerType = config.types[Math.floor(Math.random() * config.types.length)];
    
    // Create flower geometry
    const flowerGeometry = GeometryUtils.createFlower(flowerType);
    const flowerMaterial = this.materials.flower.get(colorIndex);
    
    const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
    flower.position.copy(position);
    flower.position.y = this.getTerrainHeightAt(position.x, position.z) + 0.1;
    flower.rotation.y = Math.random() * Math.PI * 2;
    flower.scale.setScalar(0.5 + Math.random() * 0.5);
    flower.name = `Flower_${flowerType}`;
    
    flower.userData = {
        type: 'flower',
        flowerType: flowerType,
        lodLevel: 'high',
        swayOffset: Math.random() * Math.PI * 2
    };
    
    return flower;
}

async placeRocks() {
    const config = this.config.rocks;
    
    for (let i = 0; i < config.count; i++) {
        const position = this.getRandomTerrainPosition(config.maxDistance);
        const rock = this.createRock(position);
        
        if (rock) {
            this.rocks.push(rock);
            this.environmentGroup.add(rock);
        }
    }
    
    console.log(`🪨 Placed ${this.rocks.length} rocks`);
}

createRock(position) {
    const config = this.config.rocks;
    const scale = MathUtils.random(config.minScale, config.maxScale);
    
    // Create rock geometry (irregular shape)
    const rockGeometry = GeometryUtils.createRock({
        size: 1,
        irregularity: 0.3
    });
    
    const rock = new THREE.Mesh(rockGeometry, this.materials.rock);
    rock.position.copy(position);
    rock.position.y = this.getTerrainHeightAt(position.x, position.z);
    rock.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.3
    );
    rock.scale.setScalar(scale);
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.name = 'Rock';
    
    rock.userData = {
        type: 'rock',
        lodLevel: 'high'
    };
    
    return rock;
}

getRandomTerrainPosition(maxDistance) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * maxDistance;
    
    return new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
    );
}

getTerrainHeightAt(x, z) {
    if (!this.terrain) return 0;
    
    // Sample terrain height using noise (same as generation)
    const config = this.config.terrain;
    let height = 0;
    height += MathUtils.noise(x * config.noiseScale, z * config.noiseScale) * config.heightVariation;
    height += MathUtils.noise(x * config.noiseScale * 2, z * config.noiseScale * 2) * config.heightVariation * 0.5;
    height += MathUtils.noise(x * config.noiseScale * 4, z * config.noiseScale * 4) * config.heightVariation * 0.25;
    
    return height;
}

isValidTreePosition(position, existingPositions, minDistance) {
    for (const existingPos of existingPositions) {
        if (position.distanceTo(existingPos) < minDistance) {
            return false;
        }
    }
    return true;
}

setupLOD() {
    if (!this.lod.enabled) return;
    
    console.log('🔍 Setting up LOD system...');
    // LOD system will be updated in the update method
}

update(deltaTime) {
    // Update wind animation
    this.updateWind(deltaTime);
    
    // Update LOD system
    if (this.lod.enabled) {
        this.updateLOD(deltaTime);
    }
    
    // Update grass and flower animations
    this.updateVegetationAnimations(deltaTime);
}

updateWind(deltaTime) {
    this.wind.time += deltaTime * this.wind.frequency;
    
    // Update wind uniforms in grass material
    if (this.materials.grass && this.materials.grass.uniforms) {
        this.materials.grass.uniforms.time.value = this.wind.time;
        this.materials.grass.uniforms.windStrength.value = this.wind.strength;
    }
}

updateLOD(deltaTime) {
    const now = performance.now();
    if (now - this.lod.lastUpdate < 1000 / this.lod.updateFrequency) {
        return;
    }
    this.lod.lastUpdate = now;
    
    // This would require camera position - simplified for now
    // In a real implementation, you'd check distance from camera to each object
    // and adjust their detail level accordingly
}

updateVegetationAnimations(deltaTime) {
    // Update flower swaying
    this.flowers.forEach(flower => {
        if (flower.userData.swayOffset !== undefined) {
            const sway = Math.sin(this.wind.time + flower.userData.swayOffset) * 0.1;
            flower.rotation.z = sway * this.wind.strength;
        }
    });
}

updateStats() {
    this.stats.objects = this.trees.length + this.grassPatches.length + this.flowers.length + this.rocks.length + 1; // +1 for terrain
    
    // Rough triangle count estimation
    this.stats.triangles = 0;
    this.stats.triangles += this.terrain ? this.terrain.geometry.attributes.position.count / 3 : 0;
    this.stats.triangles += this.trees.length * 200; // Estimated triangles per tree
    this.stats.triangles += this.grassPatches.length * this.config.grass.bladesPerPatch * 2; // 2 triangles per grass blade
    this.stats.triangles += this.flowers.length * 20; // Estimated triangles per flower
    this.stats.triangles += this.rocks.length * 50; // Estimated triangles per rock
}

getStats() {
    return { ...this.stats };
}

setWindStrength(strength) {
    this.wind.strength = Math.max(0, Math.min(2, strength));
}

setWindDirection(x, z) {
    this.wind.direction.set(x, z).normalize();
}

enableLOD() {
    this.lod.enabled = true;
    console.log('✅ LOD system enabled');
}

disableLOD() {
    this.lod.enabled = false;
    console.log('❌ LOD system disabled');
}

destroy() {
    console.log('🧹 Cleaning up environment...');
    
    try {
        // Remove all objects from scene
        if (this.environmentGroup.parent) {
            this.environmentGroup.parent.remove(this.environmentGroup);
        }
        
        // Dispose of geometries and materials
        this.environmentGroup.traverse((child) => {
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
        
        // Clear arrays
        this.trees.length = 0;
        this.grassPatches.length = 0;
        this.flowers.length = 0;
        this.rocks.length = 0;
        
        // Clear materials cache
        Object.values(this.materials).forEach(material => {
            if (material instanceof Map) {
                material.forEach(mat => mat.dispose && mat.dispose());
                material.clear();
            } else if (material && material.dispose) {
                material.dispose();
            }
        });
        
        // Clear references
        this.scene = null;
        this.terrain = null;
        this.environmentGroup = null;
        
        console.log('✅ Environment cleanup complete');
        
    } catch (error) {
        console.error('❌ Environment cleanup failed:', error);
    }
}
```

}
