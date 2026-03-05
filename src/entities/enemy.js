// ===============================
// Prowler Enemy - AI + Rendering
// ===============================
// Patrols in a circle around a pole point. If the player enters its vision
// cone it chases and attempts a melee attack. Has health + shield like the player.
"use strict";

// ---- Texture ----

function createEnemyTexture(color, outlineColor) {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var ctx = c.getContext('2d');

    // Dark outer ring
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fillStyle = outlineColor || '#440000';
    ctx.fill();

    // Main fill
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fillStyle = color || '#CC2200';
    ctx.fill();

    // Inner highlight
    ctx.beginPath();
    ctx.arc(25, 22, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();

    var img = new Image();
    img.src = c.toDataURL();
    return img;
}

// ---- Factory ----

function createProwler(poleX, poleY, options) {
    options = options || {};
    var startAngle = options.startAngle !== undefined ? options.startAngle : 0;
    var startRadius = options.startRadius || 40;
    return {
        // World position (updated every frame)
        x: poleX + Math.cos(startAngle) * startRadius,
        y: poleY + Math.sin(startAngle) * startRadius,
        z: 0,

        // Patrol anchor
        poleX: poleX,
        poleY: poleY,
        leashRadius: options.leashRadius || 60,

        // Orbit state
        walkAngle: startAngle,
        walkRadius: startRadius,
        walkRadiusDrift: 2,       // WU/s — positive drifts outward
        walkAngularSpeed: 0.4,    // rad/s

        // Facing
        faceAngle: startAngle + Math.PI / 2,

        // Vision
        visionRange: 80,
        visionHalfAngle: 0.5,    // ~28 degrees

        // Health / Shield (mirrors player system)
        health: 100,
        maxHealth: 100,
        shield: 100,
        maxShield: 100,
        shieldRegenRate: 5,      // HP/s
        shieldRegenDelay: 4000,  // ms after last damage before regen starts
        lastDamageTime: 0,

        // Movement
        speed: 3,                // WU/s patrol speed
        chaseSpeed: 7,           // WU/s chase speed

        // Melee
        attackRange: 6,
        attackCooldown: 1000,    // ms between swings
        lastAttackTime: 0,
        damage: 15,

        // Collision
        hitRadius: 10,

        // State machine
        state: 'patrol',         // 'patrol' | 'chase' | 'attack' | 'dead'

        // Respawn
        respawnDelay: 6000,      // ms before respawning at pole
        deadTime: 0,

        // Rendering
        texture: createEnemyTexture(
            options.color        || '#CC2200',
            options.outlineColor || '#440000'
        )
    };
}

// ---- Update Loop ----

function updateEnemies(current, deltaTime) {
    var seconds = deltaTime / 30;

    enemies.forEach(function(e) {
        // ── Dead / Respawn ────────────────────────────────────────────
        if (e.state === 'dead') {
            if (current - e.deadTime >= e.respawnDelay) {
                // Respawn at pole with full health and shield
                e.x      = e.poleX + Math.cos(e.walkAngle) * (e.leashRadius * 0.5);
                e.y      = e.poleY + Math.sin(e.walkAngle) * (e.leashRadius * 0.5);
                e.z      = getRawTerrainHeight(e.x, e.y);
                e.health = e.maxHealth;
                e.shield = e.maxShield;
                e.lastDamageTime = 0;
                e.state  = 'patrol';
            }
            return; // skip all other logic while dead
        }

        // Death check
        if (e.health <= 0) {
            e.state   = 'dead';
            e.deadTime = current;
            return;
        }

        // Ground-snap
        e.z = getRawTerrainHeight(e.x, e.y);

        // Shield regen
        if (e.shield < e.maxShield && (current - e.lastDamageTime) >= e.shieldRegenDelay) {
            e.shield = Math.min(e.maxShield, e.shield + e.shieldRegenRate * seconds);
        }

        var px = camera.x, py = camera.y;
        var distToPlayer = Math.hypot(px - e.x, py - e.y);

        // ── Patrol ──────────────────────────────────────────────────
        if (e.state === 'patrol') {
            // Advance orbit angle
            e.walkAngle += e.walkAngularSpeed * seconds;

            // Slowly breathe the orbit radius in and out
            e.walkRadius += e.walkRadiusDrift * seconds;
            if (e.walkRadius > e.leashRadius) {
                e.walkRadius = e.leashRadius;
                e.walkRadiusDrift = -Math.abs(e.walkRadiusDrift);
            }
            if (e.walkRadius < e.leashRadius * 0.3) {
                e.walkRadius = e.leashRadius * 0.3;
                e.walkRadiusDrift = Math.abs(e.walkRadiusDrift);
            }

            var targetX = e.poleX + Math.cos(e.walkAngle) * e.walkRadius;
            var targetY = e.poleY + Math.sin(e.walkAngle) * e.walkRadius;
            var toTarget = Math.atan2(targetY - e.y, targetX - e.x);

            e.x += Math.cos(toTarget) * e.speed * seconds;
            e.y += Math.sin(toTarget) * e.speed * seconds;
            e.faceAngle = toTarget;

            // Vision cone check
            if (distToPlayer <= e.visionRange) {
                var angleToPlayer = Math.atan2(py - e.y, px - e.x);
                var diff = angleToPlayer - e.faceAngle;
                while (diff >  Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                if (Math.abs(diff) <= e.visionHalfAngle) {
                    e.state = 'chase';
                }
            }

        // ── Chase ────────────────────────────────────────────────────
        } else if (e.state === 'chase') {
            var angleToPlayer = Math.atan2(py - e.y, px - e.x);
            e.faceAngle = angleToPlayer;
            e.x += Math.cos(angleToPlayer) * e.chaseSpeed * seconds;
            e.y += Math.sin(angleToPlayer) * e.chaseSpeed * seconds;

            if (distToPlayer <= e.attackRange) {
                e.state = 'attack';
            }

            // Give up if stretched too far from pole
            if (Math.hypot(e.x - e.poleX, e.y - e.poleY) > e.leashRadius * 3) {
                e.state = 'patrol';
            }

        // ── Attack ───────────────────────────────────────────────────
        } else if (e.state === 'attack') {
            e.faceAngle = Math.atan2(py - e.y, px - e.x);

            if (distToPlayer <= e.attackRange) {
                if (current - e.lastAttackTime >= e.attackCooldown) {
                    // Melee damage — absorbs through player's shield first
                    var dmg = e.damage;
                    var absorbed = Math.min(player.shield, dmg);
                    player.shield = Math.max(0, player.shield - absorbed);
                    player.health = Math.max(0, player.health - (dmg - absorbed));
                    player.lastDamageTime = current;
                    e.lastAttackTime = current;
                }
            } else {
                e.state = 'chase';
            }
        }
    });
}

// ---- Screen-space Health / Shield Bars ----

function DrawEnemyBars(ctx) {
    if (!enemies.length) return;

    var sw   = screendata.canvas.width;
    var sh   = screendata.canvas.height;
    var sinY = Math.sin(camera.angle);
    var cosY = Math.cos(camera.angle);
    var focal = camera.focalLength;

    enemies.forEach(function(e) {
        if (e.state === 'dead') return;

        var dx = e.x - camera.x;
        var dy = e.y - camera.y;

        // Ground-plane forward distance (same projection as itemRenderer)
        var groundForward = -dx * sinY - dy * cosY;
        if (groundForward < 0.5 || groundForward > camera.distance) return;

        var right    = dx * cosY - dy * sinY;
        var screenX  = right * (sw / 2) / groundForward + sw / 2;

        // Project a point 40 units above the enemy's feet
        var topZ    = e.z + 40;
        var screenY = (camera.height - topZ) * focal / groundForward + camera.horizon;

        // Bar width scales with distance (bigger when close)
        var barW = Math.max(24, Math.min(64, 1200 / groundForward));
        var barH = Math.max(3, Math.round(barW / 12));
        var gap  = Math.max(2, Math.round(barH * 0.6));
        var bx   = Math.round(screenX - barW / 2);

        var shieldY = Math.round(screenY) - barH - gap - barH;
        var healthY = Math.round(screenY) - barH;

        var shieldFrac = e.shield / e.maxShield;
        var healthFrac = e.health / e.maxHealth;

        // Shield bar (blue)
        ctx.fillStyle = 'rgba(8,15,22,0.75)';
        ctx.fillRect(bx - 1, shieldY - 1, barW + 2, barH + 2);
        ctx.fillStyle = 'rgba(60,160,220,0.9)';
        ctx.fillRect(bx, shieldY, Math.round(barW * shieldFrac), barH);

        // Health bar (red)
        ctx.fillStyle = 'rgba(8,15,22,0.75)';
        ctx.fillRect(bx - 1, healthY - 1, barW + 2, barH + 2);
        ctx.fillStyle = 'rgba(175,50,60,0.9)';
        ctx.fillRect(bx, healthY, Math.round(barW * healthFrac), barH);
    });
}
