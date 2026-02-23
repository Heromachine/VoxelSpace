// ===============================
// Global State Variables
// ===============================
"use strict";

var camera = {
    x: 0, y: 0, height: 78, angle: 0, horizon: 100,
    distance: 2000, velocityY: 0,
    baseFocalLength: 300,  // normal FOV
    focalLength: 300,      // current focal length
    // ADS camera offset (moves camera forward for zoom effect)
    adsOffset: 0,          // current offset
    baseX: 0, baseY: 0     // actual player position (before ADS offset)
};

var player={health:100,isCrouching:false,moveSpeed:1.5,sprintMultiplier:2,
            // Charged jump system
            jumpMinStrength:3,      // tap jump
            jumpMaxStrength:12,     // fully charged (basketball player ~1m vertical)
            jumpChargeTime:0,       // current charge time in ms
            jumpMaxChargeTime:1000, // 1 second to fully charge
            isChargingJump:false,
            crouchHeight:40,normalHeight:78,
            // Weapon state
            wasSwapping:false,wasPickingUp:false,wasShooting:false};

// Weapon definitions
var weapons = {
    testgun: {
        name: "Test Gun",
        letter: "T",
        color: "#00FFFF",      // Cyan
        bgColor: "#008888",
        magazine: Infinity,
        maxMagazine: Infinity,
        reloadTime: 0,
        fireRate: 100,
        fireMode: "auto",
        damage: 50,
        bulletSpeed: 15,
        adsZoom: 1.5,
        useScope: true         // Has picture-in-picture scope for testing
    },
    rifle: {
        name: "Rifle",
        letter: "R",
        color: "#8B00FF",      // Purple
        bgColor: "#4B0082",
        magazine: 30,
        maxMagazine: 30,
        reloadTime: 2000,
        fireRate: 100,         // Fast auto fire
        fireMode: "auto",
        damage: 15,
        bulletSpeed: 12,
        adsZoom: 1.8           // 1.8x zoom when aiming
    },
    pistol: {
        name: "Pistol",
        letter: "P",
        color: "#C0C0C0",      // Silver
        bgColor: "#808080",
        magazine: 12,
        maxMagazine: 12,
        reloadTime: 1000,
        fireRate: 200,         // Semi-auto
        fireMode: "semi",
        damage: 25,
        bulletSpeed: 10,
        adsZoom: 1.3           // 1.3x zoom (minimal for pistol)
    },
    sniper: {
        name: "Sniper",
        letter: "S",
        color: "#228B22",      // Forest green
        bgColor: "#006400",
        magazine: 5,
        maxMagazine: 5,
        reloadTime: 3000,
        fireRate: 1000,        // Slow but powerful
        fireMode: "semi",
        damage: 100,
        bulletSpeed: 20,
        adsZoom: 4.0,          // 4x scope zoom (base)
        useScope: true,        // Has picture-in-picture scope
        ccdOnly: true          // No hitscan, CCD only for realistic bullet travel
    }
};

// Player's current weapons (2 slots)
var playerWeapons = [
    { type: "testgun", ammo: Infinity, isReloading: false, lastShot: 0 },
    { type: "sniper", ammo: 5, isReloading: false, lastShot: 0 }
];
var currentWeaponIndex = 0;  // Which weapon is active (0 or 1)
var prevSwapButton = false;  // For edge detection on Y button

// Weapons on ground
var groundWeapons = [];
var nearbyWeapon = null;     // Weapon player can pick up

// Legacy gun object for compatibility
var gun={magazine:200,maxMagazine:200,reloadTime:1000,isReloading:false,lastShot:0,fireRate:300};
var items=[];  // unified bullets + hearts + pickups
var lastBullet=null,lastBulletDestroyedPos=null,lastBulletDestroyedReason=null,lastBulletScreen=null;
var map={width:1024,height:1024,shift:10,altitude:new Uint8Array(1024*1024),color:new Uint32Array(1024*1024)};
var screendata={canvas:null,context:null,imagedata:null,bufarray:null,buf8:null,buf32:null,backgroundcolor:0xFFE09090,depthBuffer:null};
var input={forward:false,backward:false,left:false,right:false,jump:false,sprint:false,crouch:false,shoot:false,reload:false,aim:false,mouseX:0,mouseY:0,
       // Gamepad analog values (for smooth movement)
       moveX:0,moveY:0,lookX:0,lookY:0,
       // Gamepad button states (separate from keyboard/mouse)
       gpShoot:false,gpAim:false,gpCrouch:false,gpSprint:false,gpReload:false,gpJumpHeld:false,
       // Weapon controls
       swapWeapon:false,gpSwapWeapon:false,pickupWeapon:false,gpPickupWeapon:false,
       // ADS toggle state
       aimToggled:false,prevGpAim:false};

// Mobile touch controls
var touchControls = {
    enabled: false,        // Auto-enabled on touch devices
    leftStick: { active: false, touchId: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
    rightStick: { active: false, touchId: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
    stickRadius: 50,       // Radius of joystick circle
    stickDeadzone: 10,     // Deadzone before input registers
    leftStickPos: { x: 100, y: 0 },   // Will be set based on screen size
    rightStickPos: { x: 0, y: 0 },    // Will be set based on screen size
    weaponSlots: [],       // Hitboxes for weapon icons [{x, y, w, h, index}]
    pickupHitbox: null,    // Hitbox for pickup prompt
    shootButton: { x: 0, y: 0, radius: 40, active: false, touchId: null }
};

var debugUIVisible=true;  // Toggle with Start button
var playerHeightOffset=30; // Player eye height above terrain (min 30)
var bulletVertOffset=0;    // Vertical offset for bullet spawn (negative = below eye level)
var bulletFwdOffset=0;     // Forward offset for bullet spawn (weapon distance from camera)
var bulletHorizOffset=0;   // Horizontal offset for bullet spawn (left/right)
var bulletSize=0.75;       // Bullet rendering scale

// Hitscan/CCD hybrid system
var hitscanDistance=50;    // Distance for instant hitscan (world units)
var ccdMaxDistance=500;    // Max distance for CCD bullets before despawn
var showHitRanges=true;    // Show hitscan/CCD radius circles on minimap
var showGMD=true;          // Show Gun Mechanics Debug overlay
var showMinimaps=true;     // Show minimaps and legend overlays
var minimapZoomRange=200;  // Minimap zoom range in world units (10-300)
var sideViewZoomRange=300; // Side view zoom range in world units (10-500)

// Sniper scope mode - modular scope system
var scopeMode = 'forward';  // 'forward' or 'focal'
var activeScope = null;     // Will be set to ScopeForwardPosition or ScopeFocalLength

// UI Scale settings
var uiScale={
    all: 1.0,
    crosshair: 1.0,
    healthbar: 1.0,
    jumpbar: 1.0,
    minimap: 1.0,
    weaponUI: 1.0
};

var gamepad={
    connected:false,
    deadzone:0.15,
    lookSensitivity:0.05,
    // Previous button states for edge detection
    prevJump:false,
    prevStart:false,
    // Standard gamepad mapping (Xbox-style, works with most controllers)
    buttons:{
        jump:4,        // LB (Left Bumper) - hold to charge, release to jump
        crouch:1,      // B
        reload:2,      // X
        sprint:10,     // Left Stick Click
        sprintAlt:0,   // A button (alternative sprint)
        shoot:7,       // RT (Right Trigger as button)
        aim:6,         // LT (Left Trigger as button)
        start:9,       // Start button - toggle debug UI
        swapWeapon:3,  // Y button - swap weapons
        pickup:2       // X button - also pickup (context sensitive)
    },
    axes:{
        moveX:0,       // Left Stick X
        moveY:1,       // Left Stick Y
        lookX:2,       // Right Stick X
        lookY:3        // Right Stick Y
    }
};

var updaterunning=false,time=Date.now(),timelastframe=Date.now(),frames=0,pitchOffset=250,targetFPS=60,frameDuration=1000/targetFPS,lastFrameTime=0,hiddeny;

// ===============================
// Item textures
var textures = {
    bullet: (() => { let i = new Image(); i.src = "images/bullet.png"; return i; })(),
    heart:  (() => { let i = new Image(); i.src = "images/heart.png";  return i; })(),
    tree:   (() => { let i = new Image(); i.src = "images/tree.png";   return i; })(),
    player: (() => { let i = new Image(); i.src = "images/MC.png";     return i; })()
};

// ===============================
// 3D Cube - Blue, 100 units tall, placed in front of player start
var cube = {
    x: 0,       // world X position (centered in front of player)
    y: -80,     // world Y position (negative Y = in front at angle 0)
    z: 0,       // base height (will sit on terrain)
    size: 100,  // 100 feet/units tall (and wide/deep)
    color: 0xFF0000FF  // Blue in ABGR format
};

// Precomputed trig values for current frame (set in RenderCube)
var cubeSinYaw = 0, cubeCosYaw = 0;

// ===============================
// Gun Viewmodel (first-person weapon)
var gunModel = {
    vertices: [],      // Array of {x, y, z}
    faces: [],         // Array of vertex indices
    loaded: false,
    texture: null,
    // Current interpolated position (updated each frame)
    offsetX: 100,      // pixels from right
    offsetY: 50,       // pixels from bottom
    offsetZ: 0,        // depth offset
    scale: 300,        // rendering scale
    rotationX: 0,      // X-axis rotation in degrees
    rotationY: 0,      // Y-axis rotation in degrees
    rotationZ: 0,      // Z-axis rotation in degrees

    // ADS (Aim Down Sights) position - gun raised to eye level
    adsOffsetX: 0,     // centered for iron sights
    adsOffsetY: 100,   // raised up
    adsOffsetZ: 0,
    adsScale: 350,
    adsRotationX: 0,
    adsRotationY: 0,
    adsRotationZ: 0,

    // Hip fire position - gun held at hip/chest level
    hipOffsetX: 100,   // offset to the right
    hipOffsetY: 50,    // lower position
    hipOffsetZ: 0,
    hipScale: 300,
    hipRotationX: 0,
    hipRotationY: 0,
    hipRotationZ: 0,

    // Interpolation factor (0 = hip, 1 = ADS)
    adsLerp: 0,
    adsLerpSpeed: 0.15,  // how fast to transition

    // Barrel configuration (gun-relative: forward/up/right along gun direction)
    // Current/interpolated values (updated each frame based on adsLerp)
    barrelX: 0.26,     // forward along gun barrel
    barrelY: 0.08,     // up from gun center
    barrelZ: 0.0,      // right from gun center
    barrelYaw: 0,      // horizontal aim offset in degrees (left/right)

    // ADS barrel settings
    adsBarrelX: 0.26,
    adsBarrelY: 0.08,
    adsBarrelZ: 0.0,
    adsBarrelYaw: 0,

    // Hip barrel settings
    hipBarrelX: 0.26,
    hipBarrelY: 0.08,
    hipBarrelZ: 0.0,
    hipBarrelYaw: 0,

    barrelDistance: 5, // world units in front of barrel to spawn bullet

    // World-space offset from camera (where gun is held)
    // Current/interpolated values (updated each frame based on adsLerp)
    worldForward: 10,  // how far forward from camera
    worldRight: 15,    // how far right from camera
    worldDown: 8,      // how far down from camera eye level

    // ADS world offset settings
    adsWorldForward: 10,
    adsWorldRight: 15,
    adsWorldDown: 8,

    // Hip world offset settings
    hipWorldForward: 10,
    hipWorldRight: 15,
    hipWorldDown: 8,

    // Pivot mode: 'barrel' for ADS (pivot at bullet spawn), 'grip' for hip fire
    pivotMode: 'grip'  // current pivot mode
};

// ===============================
// Test Target - floating circle for gun mechanics testing
var testTarget = {
    enabled: false,
    x: 0,           // world X position (will be set relative to player)
    y: 0,           // world Y position
    z: 0,           // world Z position (height)
    radius: 2,      // target radius in world units
    distance: 30,   // distance from player to spawn target
    color: '#ff0000',
    ringColor: '#ffffff',
    // Calculated each frame
    playerDistance: 0,
    angleToTarget: 0,    // horizontal angle difference
    pitchToTarget: 0,    // vertical angle to target
    aimError: 0,         // how far off aim is from target center
    bulletHitPos: null,  // last bullet impact position relative to target
    hits: 0,
    misses: 0
};

// ── Admin / developer flag ───────────────────────────────────────────────────
// Set to true after login when the authenticated username is "heromachine".
// Dev features (settings menu, debug overlay, side-view minimap, etc.) are
// hidden for all other users.
var isAdmin = false;

// ===============================
// Multiplayer / Nakama State
var nakamaState = {
    remotePlayers: {},   // userId -> { userId, username, x, y, height, angle, health, lastSeen }
    myClan:        null, // "iron_ravens" | "ember_tide" | "silent_root"
    chatBubbles:   [],   // [ { senderId, x, y, emoji, shout, expiry } ]
    radarReveals:  {},   // userId -> { x, y, expiry } — players revealed by shout
    myKills: 0,
    myPing:  null,
};

// ===============================
// Scoreboard state
var showScoreboard = false;
