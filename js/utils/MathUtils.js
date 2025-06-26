

/*
Purpose: Mathematical utility functions for Summer Afternoon Three.js game
Key features: Noise generation, interpolation, random functions, vector math, easing functions
Dependencies: None (pure JavaScript math)
Related helpers: Environment.js, Character.js, Camera.js
Function names: noise, lerp, random, clamp, smoothstep, easeInOut, vectorDistance, normalizeAngle
MIT License: https://github.com/AllieBaig/vrbox/blob/main/LICENSE
Timestamp: 2025-06-26 11:25 | File: js/utils/MathUtils.js
*/

export class MathUtils {
// Constants
static PI = Math.PI;
static TWO_PI = Math.PI * 2;
static HALF_PI = Math.PI * 0.5;
static DEG_TO_RAD = Math.PI / 180;
static RAD_TO_DEG = 180 / Math.PI;
static EPSILON = 0.000001;
static GOLDEN_RATIO = 1.618033988749895;

```
// Perlin noise implementation
static noiseTable = null;
static noiseTableSize = 256;

/**
 * Initialize noise generation tables
 */
static initNoise() {
    if (this.noiseTable) return;
    
    // Create permutation table for Perlin noise
    this.noiseTable = new Array(this.noiseTableSize * 2);
    const p = new Array(this.noiseTableSize);
    
    // Fill with sequential numbers
    for (let i = 0; i < this.noiseTableSize; i++) {
        p[i] = i;
    }
    
    // Shuffle using Fisher-Yates algorithm
    for (let i = this.noiseTableSize - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    
    // Duplicate the table
    for (let i = 0; i < this.noiseTableSize; i++) {
        this.noiseTable[i] = this.noiseTable[i + this.noiseTableSize] = p[i];
    }
}

/**
 * Generate 1D Perlin noise
 * @param {number} x - X coordinate
 * @returns {number} Noise value between -1 and 1
 */
static noise1D(x) {
    this.initNoise();
    
    const X = Math.floor(x) & 255;
    x -= Math.floor(x);
    
    const u = this.fade(x);
    
    return this.lerp(
        this.grad1D(this.noiseTable[X], x),
        this.grad1D(this.noiseTable[X + 1], x - 1),
        u
    );
}

/**
 * Generate 2D Perlin noise
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} Noise value between -1 and 1
 */
static noise(x, y) {
    this.initNoise();
    
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const A = this.noiseTable[X] + Y;
    const AA = this.noiseTable[A];
    const AB = this.noiseTable[A + 1];
    const B = this.noiseTable[X + 1] + Y;
    const BA = this.noiseTable[B];
    const BB = this.noiseTable[B + 1];
    
    return this.lerp(
        this.lerp(
            this.grad2D(this.noiseTable[AA], x, y),
            this.grad2D(this.noiseTable[BA], x - 1, y),
            u
        ),
        this.lerp(
            this.grad2D(this.noiseTable[AB], x, y - 1),
            this.grad2D(this.noiseTable[BB], x - 1, y - 1),
            u
        ),
        v
    );
}

/**
 * Generate 3D Perlin noise
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} z - Z coordinate
 * @returns {number} Noise value between -1 and 1
 */
static noise3D(x, y, z) {
    this.initNoise();
    
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    
    const A = this.noiseTable[X] + Y;
    const AA = this.noiseTable[A] + Z;
    const AB = this.noiseTable[A + 1] + Z;
    const B = this.noiseTable[X + 1] + Y;
    const BA = this.noiseTable[B] + Z;
    const BB = this.noiseTable[B + 1] + Z;
    
    return this.lerp(
        this.lerp(
            this.lerp(
                this.grad3D(this.noiseTable[AA], x, y, z),
                this.grad3D(this.noiseTable[BA], x - 1, y, z),
                u
            ),
            this.lerp(
                this.grad3D(this.noiseTable[AB], x, y - 1, z),
                this.grad3D(this.noiseTable[BB], x - 1, y - 1, z),
                u
            ),
            v
        ),
        this.lerp(
            this.lerp(
                this.grad3D(this.noiseTable[AA + 1], x, y, z - 1),
                this.grad3D(this.noiseTable[BA + 1], x - 1, y, z - 1),
                u
            ),
            this.lerp(
                this.grad3D(this.noiseTable[AB + 1], x, y - 1, z - 1),
                this.grad3D(this.noiseTable[BB + 1], x - 1, y - 1, z - 1),
                u
            ),
            v
        ),
        w
    );
}

/**
 * Fractal/Octave noise for more complex patterns
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} octaves - Number of octaves
 * @param {number} persistence - Amplitude persistence
 * @returns {number} Fractal noise value
 */
static fractalNoise(x, y, octaves = 4, persistence = 0.5) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        total += this.noise(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }
    
    return total / maxValue;
}

/**
 * Simplex noise (alternative to Perlin noise)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} Simplex noise value
 */
static simplexNoise(x, y) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    
    let i1, j1;
    if (x0 > y0) {
        i1 = 1;
        j1 = 0;
    } else {
        i1 = 0;
        j1 = 1;
    }
    
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    
    const ii = i & 255;
    const jj = j & 255;
    
    this.initNoise();
    const gi0 = this.noiseTable[ii + this.noiseTable[jj]] % 12;
    const gi1 = this.noiseTable[ii + i1 + this.noiseTable[jj + j1]] % 12;
    const gi2 = this.noiseTable[ii + 1 + this.noiseTable[jj + 1]] % 12;
    
    const grad3 = [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let n0 = t0 < 0 ? 0.0 : Math.pow(t0, 4) * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    let n1 = t1 < 0 ? 0.0 : Math.pow(t1, 4) * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    let n2 = t2 < 0 ? 0.0 : Math.pow(t2, 4) * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    
    return 70.0 * (n0 + n1 + n2);
}

// Helper functions for noise generation
static fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

static grad1D(hash, x) {
    return (hash & 1) === 0 ? x : -x;
}

static grad2D(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

static grad3D(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

// Basic math utilities

/**
 * Linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
static lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Inverse linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} value - Value to find factor for
 * @returns {number} Interpolation factor
 */
static inverseLerp(a, b, value) {
    return (value - a) / (b - a);
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Clamp a value between 0 and 1
 * @param {number} value - Value to clamp
 * @returns {number} Clamped value
 */
static clamp01(value) {
    return this.clamp(value, 0, 1);
}

/**
 * Smoothstep interpolation
 * @param {number} edge0 - Lower edge
 * @param {number} edge1 - Upper edge
 * @param {number} x - Input value
 * @returns {number} Smooth interpolated value
 */
static smoothstep(edge0, edge1, x) {
    const t = this.clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}

/**
 * Smootherstep interpolation (even smoother than smoothstep)
 * @param {number} edge0 - Lower edge
 * @param {number} edge1 - Upper edge
 * @param {number} x - Input value
 * @returns {number} Smoother interpolated value
 */
static smootherstep(edge0, edge1, x) {
    const t = this.clamp01((x - edge0) / (edge1 - edge0));
    return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Random number between min and max
 * @param {number} min - Minimum value (default: 0)
 * @param {number} max - Maximum value (default: 1)
 * @returns {number} Random number
 */
static random(min = 0, max = 1) {
    return min + Math.random() * (max - min);
}

/**
 * Random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
static randomInt(min, max) {
    return Math.floor(this.random(min, max + 1));
}

/**
 * Random boolean
 * @param {number} probability - Probability of true (0-1, default: 0.5)
 * @returns {boolean} Random boolean
 */
static randomBool(probability = 0.5) {
    return Math.random() < probability;
}

/**
 * Pick random element from array
 * @param {Array} array - Array to pick from
 * @returns {*} Random element
 */
static randomChoice(array) {
    return array[this.randomInt(0, array.length - 1)];
}

/**
 * Shuffle array in place (Fisher-Yates algorithm)
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
static shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Angle utilities

/**
 * Normalize angle to -PI to PI range
 * @param {number} angle - Angle in radians
 * @returns {number} Normalized angle
 */
static normalizeAngle(angle) {
    while (angle > Math.PI) angle -= this.TWO_PI;
    while (angle < -Math.PI) angle += this.TWO_PI;
    return angle;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
static degToRad(degrees) {
    return degrees * this.DEG_TO_RAD;
}

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
static radToDeg(radians) {
    return radians * this.RAD_TO_DEG;
}

/**
 * Lerp between two angles (shortest path)
 * @param {number} a - Start angle in radians
 * @param {number} b - End angle in radians
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated angle
 */
static lerpAngle(a, b, t) {
    const delta = this.normalizeAngle(b - a);
    return a + delta * t;
}

// Vector utilities

/**
 * Calculate distance between two 2D points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} Distance
 */
static distance2D(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance between two 3D points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} z1 - Z coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @param {number} z2 - Z coordinate of second point
 * @returns {number} Distance
 */
static distance3D(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate squared distance (faster when you only need to compare distances)
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} Squared distance
 */
static distanceSquared2D(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

/**
 * Normalize a 2D vector
 * @param {number} x - X component
 * @param {number} y - Y component
 * @returns {Object} Normalized vector {x, y}
 */
static normalize2D(x, y) {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
}

/**
 * Calculate dot product of two 2D vectors
 * @param {number} x1 - X component of first vector
 * @param {number} y1 - Y component of first vector
 * @param {number} x2 - X component of second vector
 * @param {number} y2 - Y component of second vector
 * @returns {number} Dot product
 */
static dot2D(x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2;
}

/**
 * Calculate cross product of two 2D vectors (returns scalar)
 * @param {number} x1 - X component of first vector
 * @param {number} y1 - Y component of first vector
 * @param {number} x2 - X component of second vector
 * @param {number} y2 - Y component of second vector
 * @returns {number} Cross product (z component)
 */
static cross2D(x1, y1, x2, y2) {
    return x1 * y2 - y1 * x2;
}

// Easing functions

/**
 * Ease in (quadratic)
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeInQuad(t) {
    return t * t;
}

/**
 * Ease out (quadratic)
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeOutQuad(t) {
    return t * (2 - t);
}

/**
 * Ease in-out (quadratic)
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Ease in (cubic)
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeInCubic(t) {
    return t * t * t;
}

/**
 * Ease out (cubic)
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeOutCubic(t) {
    return (--t) * t * t + 1;
}

/**
 * Ease in-out (cubic)
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

/**
 * Ease in (sine)
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeInSine(t) {
    return 1 - Math.cos(t * this.HALF_PI);
}

/**
 * Ease out (sine)
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeOutSine(t) {
    return Math.sin(t * this.HALF_PI);
}

/**
 * Ease in-out (sine)
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeInOutSine(t) {
    return -(Math.cos(this.PI * t) - 1) / 2;
}

/**
 * Elastic ease out
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Bounce ease out
 * @param {number} t - Time factor (0-1)
 * @returns {number} Eased value
 */
static easeOutBounce(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
        return n1 * t * t;
    } else if (t < 2 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
}

// Utility functions

/**
 * Check if value is approximately equal (within epsilon)
 * @param {number} a - First value
 * @param {number} b - Second value
 * @param {number} epsilon - Tolerance (default: EPSILON)
 * @returns {boolean} True if approximately equal
 */
static approximately(a, b, epsilon = this.EPSILON) {
    return Math.abs(a - b) < epsilon;
}

/**
 * Round to specified number of decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded value
 */
static roundTo(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * Map a value from one range to another
 * @param {number} value - Input value
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number} Mapped value
 */
static map(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Check if point is inside circle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} radius - Circle radius
 * @returns {boolean} True if point is inside circle
 */
static pointInCircle(px, py, cx, cy, radius) {
    return this.distanceSquared2D(px, py, cx, cy) <= radius * radius;
}

/**
 * Check if point is inside rectangle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} rx - Rectangle X
 * @param {number} ry - Rectangle Y
 * @param {number} rw - Rectangle width
 * @param {number} rh - Rectangle height
 * @returns {boolean} True if point is inside rectangle
 */
static pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Calculate factorial
 * @param {number} n - Number
 * @returns {number} Factorial of n
 */
static factorial(n) {
    if (n <= 1) return 1;
    return n * this.factorial(n - 1);
}

/**
 * Calculate greatest common divisor
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} GCD
 */
static gcd(a, b) {
    return b === 0 ? a : this.gcd(b, a % b);
}

/**
 * Calculate least common multiple
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} LCM
 */
static lcm(a, b) {
    return Math.abs(a * b) / this.gcd(a, b);
}

/**
 * Check if number is prime
 * @param {number} n - Number to check
 * @returns {boolean} True if prime
 */
static isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    
    return true;
}
```

}

