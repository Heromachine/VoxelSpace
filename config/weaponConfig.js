/**
 * Weapon Configuration - Real World Scale
 * VoxelSpace Engine
 *
 * Scale values are relative to player height (1.0 = same as player height)
 * Based on real-world weapon dimensions compared to average human height (~6ft/1.83m)
 */

var WeaponConfig = {
    // ===================
    // Real World Scale Reference
    // ===================
    // Player height = 1.0 (reference unit)
    // All weapon lengths are proportional to player height

    // ===================
    // Weapon Definitions
    // ===================
    weapons: {
        pistol: {
            name: "Pistol",
            // Real: ~8 inches (Glock 17) vs 72 inch human = 0.11
            lengthScale: 0.11,      // 11% of player height
            widthScale: 0.02,       // Narrow profile
            heightScale: 0.08,      // Grip height

            // Visual representation
            barrelLengthRatio: 0.5, // Barrel is 50% of total length
            gripLengthRatio: 0.4,   // Grip is 40% of total length

            // Icon display
            iconColor: '#808080',
            iconOutline: '#C0C0C0'
        },

        rifle: {
            name: "Assault Rifle",
            // Real: ~33 inches (M4 Carbine) vs 72 inch human = 0.46
            lengthScale: 0.46,      // 46% of player height
            widthScale: 0.03,       // Slightly wider than pistol
            heightScale: 0.12,      // With magazine

            // Visual representation
            barrelLengthRatio: 0.45, // Barrel is 45% of total length
            stockLengthRatio: 0.3,   // Stock is 30% of total length
            gripLengthRatio: 0.15,   // Grip is 15% of total length

            // Icon display
            iconColor: '#4B0082',
            iconOutline: '#8B00FF'
        },

        sniper: {
            name: "Sniper Rifle",
            // Real: ~43 inches (M24 SWS) vs 72 inch human = 0.60
            lengthScale: 0.60,      // 60% of player height
            widthScale: 0.03,       // Similar to rifle
            heightScale: 0.10,      // Slimmer profile

            // Visual representation
            barrelLengthRatio: 0.55, // Longer barrel
            stockLengthRatio: 0.30,  // Stock
            scopeScale: 0.08,        // Scope size relative to weapon

            // Icon display
            iconColor: '#006400',
            iconOutline: '#228B22'
        },

        shotgun: {
            name: "Shotgun",
            // Real: ~40 inches (Remington 870) vs 72 inch human = 0.56
            lengthScale: 0.56,      // 56% of player height
            widthScale: 0.04,       // Thicker barrel
            heightScale: 0.10,

            // Visual representation
            barrelLengthRatio: 0.50,
            stockLengthRatio: 0.35,

            // Icon display
            iconColor: '#8B4513',
            iconOutline: '#D2691E'
        },

        smg: {
            name: "SMG",
            // Real: ~20 inches (MP5) vs 72 inch human = 0.28
            lengthScale: 0.28,      // 28% of player height
            widthScale: 0.025,
            heightScale: 0.10,

            // Visual representation
            barrelLengthRatio: 0.35,
            stockLengthRatio: 0.25,
            gripLengthRatio: 0.20,

            // Icon display
            iconColor: '#2F4F4F',
            iconOutline: '#708090'
        },

        lmg: {
            name: "LMG",
            // Real: ~44 inches (M249 SAW) vs 72 inch human = 0.61
            lengthScale: 0.61,      // 61% of player height
            widthScale: 0.05,       // Bulkier
            heightScale: 0.14,      // Box magazine

            // Visual representation
            barrelLengthRatio: 0.45,
            stockLengthRatio: 0.25,
            boxMagScale: 0.12,      // Ammo box

            // Icon display
            iconColor: '#556B2F',
            iconOutline: '#6B8E23'
        },

        launcher: {
            name: "Rocket Launcher",
            // Real: ~40 inches (RPG-7) vs 72 inch human = 0.56
            lengthScale: 0.56,      // 56% of player height
            widthScale: 0.08,       // Wide tube
            heightScale: 0.08,

            // Visual representation
            tubeDiameterRatio: 0.15, // Tube diameter relative to length

            // Icon display
            iconColor: '#3d3d3d',
            iconOutline: '#5a5a5a'
        }
    },

    // ===================
    // Helper Functions
    // ===================

    /**
     * Get weapon length in world units based on player height
     * @param {string} weaponType - The weapon type key (e.g., 'pistol', 'rifle')
     * @param {number} playerHeight - The player's total height in world units
     * @returns {number} Weapon length in world units
     */
    getWeaponLength: function(weaponType, playerHeight) {
        var weapon = this.weapons[weaponType];
        if (!weapon) {
            console.warn('Unknown weapon type:', weaponType);
            return playerHeight * 0.2; // Default fallback
        }
        return playerHeight * weapon.lengthScale;
    },

    /**
     * Get weapon dimensions for rendering
     * @param {string} weaponType - The weapon type key
     * @param {number} playerHeight - The player's total height in world units
     * @returns {object} Object with length, width, height in world units
     */
    getWeaponDimensions: function(weaponType, playerHeight) {
        var weapon = this.weapons[weaponType];
        if (!weapon) {
            return { length: playerHeight * 0.2, width: playerHeight * 0.02, height: playerHeight * 0.05 };
        }
        return {
            length: playerHeight * weapon.lengthScale,
            width: playerHeight * weapon.widthScale,
            height: playerHeight * weapon.heightScale
        };
    },

    /**
     * Get the current weapon's scale for minimap/side view rendering
     * @param {string} weaponType - The weapon type key
     * @returns {number} Scale factor (0.0 to 1.0)
     */
    getWeaponScale: function(weaponType) {
        var weapon = this.weapons[weaponType];
        return weapon ? weapon.lengthScale : 0.2;
    }
};
