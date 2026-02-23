// ===============================
// Settings Manager - Slider bindings and persistence
// ===============================
"use strict";

var savedSettings = null;
var editMode = 'ads';  // 'ads' or 'hip' - which mode we're editing

// Function to update gun sliders to show current mode's values
function updateGunSliders() {
    var prefix = editMode === 'ads' ? 'ads' : 'hip';
    document.getElementById('gunX').value = gunModel[prefix + 'OffsetX'];
    document.getElementById('gunX-value').innerText = gunModel[prefix + 'OffsetX'];
    document.getElementById('gunY').value = gunModel[prefix + 'OffsetY'];
    document.getElementById('gunY-value').innerText = gunModel[prefix + 'OffsetY'];
    document.getElementById('gunZ').value = gunModel[prefix + 'OffsetZ'];
    document.getElementById('gunZ-value').innerText = gunModel[prefix + 'OffsetZ'];
    document.getElementById('gunScale').value = gunModel[prefix + 'Scale'];
    document.getElementById('gunScale-value').innerText = gunModel[prefix + 'Scale'];
    document.getElementById('gunRotX').value = gunModel[prefix + 'RotationX'];
    document.getElementById('gunRotX-value').innerText = gunModel[prefix + 'RotationX'];
    document.getElementById('gunRotY').value = gunModel[prefix + 'RotationY'];
    document.getElementById('gunRotY-value').innerText = gunModel[prefix + 'RotationY'];
    document.getElementById('gunRotZ').value = gunModel[prefix + 'RotationZ'];
    document.getElementById('gunRotZ-value').innerText = gunModel[prefix + 'RotationZ'];
}

// Function to update barrel sliders to show current mode's values
function updateBarrelSliders() {
    var prefix = editMode === 'ads' ? 'ads' : 'hip';
    document.getElementById('barrelYaw').value = gunModel[prefix + 'BarrelYaw'];
    document.getElementById('barrelYaw-value').innerText = gunModel[prefix + 'BarrelYaw'];
    document.getElementById('barrelX').value = gunModel[prefix + 'BarrelX'];
    document.getElementById('barrelX-value').innerText = gunModel[prefix + 'BarrelX'].toFixed(2);
    document.getElementById('barrelY').value = gunModel[prefix + 'BarrelY'];
    document.getElementById('barrelY-value').innerText = gunModel[prefix + 'BarrelY'].toFixed(2);
    document.getElementById('barrelZ').value = gunModel[prefix + 'BarrelZ'];
    document.getElementById('barrelZ-value').innerText = gunModel[prefix + 'BarrelZ'].toFixed(2);
}

// Function to update world offset sliders to show current mode's values
function updateWorldOffsetSliders() {
    var prefix = editMode === 'ads' ? 'ads' : 'hip';
    document.getElementById('gunWorldFwd').value = gunModel[prefix + 'WorldForward'];
    document.getElementById('gunWorldFwd-value').innerText = gunModel[prefix + 'WorldForward'];
    document.getElementById('gunWorldRight').value = gunModel[prefix + 'WorldRight'];
    document.getElementById('gunWorldRight-value').innerText = gunModel[prefix + 'WorldRight'];
    document.getElementById('gunWorldDown').value = gunModel[prefix + 'WorldDown'];
    document.getElementById('gunWorldDown-value').innerText = gunModel[prefix + 'WorldDown'];
}

// Unified function to set edit mode for both Gun and Barrel tabs
function setEditMode(mode) {
    editMode = mode;
    var isAds = mode === 'ads';
    var activeColor = '#4CAF50';
    var inactiveColor = '#555';
    var labelColor = isAds ? '#4CAF50' : '#ff9800';
    var labelText = isAds ? '[Editing ADS]' : '[Editing Hip]';

    // Update Gun Tab buttons
    document.getElementById('editADS').style.background = isAds ? activeColor : inactiveColor;
    document.getElementById('editHip').style.background = isAds ? inactiveColor : activeColor;
    document.getElementById('editModeLabel').innerText = labelText;
    document.getElementById('editModeLabel').style.color = labelColor;

    // Update Barrel Tab buttons
    document.getElementById('barrelEditADS').style.background = isAds ? activeColor : inactiveColor;
    document.getElementById('barrelEditHip').style.background = isAds ? inactiveColor : activeColor;
    document.getElementById('barrelEditModeLabel').innerText = labelText;
    document.getElementById('barrelEditModeLabel').style.color = labelColor;

    // Update sliders for all tabs
    updateGunSliders();
    updateBarrelSliders();
    updateWorldOffsetSliders();
}

// Setup all sliders and event listeners
function setupSliders() {
    // Tab switching for controls panel
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tabId = this.getAttribute('data-tab');
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(function(tab) {
                tab.style.display = 'none';
            });
            // Deactivate all buttons
            document.querySelectorAll('.tab-btn').forEach(function(b) {
                b.style.background = '#333';
                b.style.color = '#aaa';
            });
            // Show selected tab
            document.getElementById('tab-' + tabId).style.display = 'block';
            // Activate button
            this.style.background = '#555';
            this.style.color = 'white';
        });
    });

    // Scope mode toggle buttons
    document.getElementById('scopeModeForward').addEventListener('click', function() {
        setScopeMode('forward');
    });
    document.getElementById('scopeModeFocal').addEventListener('click', function() {
        setScopeMode('focal');
    });

    // Camera FOV slider
    document.getElementById('fov').addEventListener('input', function(e){
        camera.baseFocalLength = parseInt(e.target.value);
        camera.focalLength = camera.baseFocalLength;
        document.getElementById('fov-value').innerText = camera.baseFocalLength;
    });

    // Pitch offset slider
    document.getElementById('pitchOffset').addEventListener('input', function(e){
        pitchOffset = parseInt(e.target.value);
        document.getElementById('pitchOffset-value').innerText = pitchOffset;
    });

    // Target FPS slider
    document.getElementById('targetFPS').addEventListener('input', function(e){
        targetFPS = parseInt(e.target.value);
        frameDuration = 1000 / targetFPS;
        document.getElementById('targetFPS-value').innerText = targetFPS;
    });

    // Draw distance slider
    document.getElementById('drawDistance').addEventListener('input', function(e){
        camera.distance = parseInt(e.target.value);
        document.getElementById('drawDistance-value').innerText = camera.distance;
    });

    // Player height slider
    document.getElementById('playerHeight').addEventListener('input', function(e){
        playerHeightOffset = parseInt(e.target.value);
        document.getElementById('playerHeight-value').innerText = playerHeightOffset;
    });

    // Standing height slider
    document.getElementById('normalHeight').addEventListener('input', function(e){
        player.normalHeight = parseInt(e.target.value);
        document.getElementById('normalHeight-value').innerText = player.normalHeight;
    });

    // Crouch height slider
    document.getElementById('crouchHeight').addEventListener('input', function(e){
        player.crouchHeight = parseInt(e.target.value);
        document.getElementById('crouchHeight-value').innerText = player.crouchHeight;
    });

    // Jump min strength slider
    document.getElementById('jumpMin').addEventListener('input', function(e){
        player.jumpMinStrength = parseInt(e.target.value);
        document.getElementById('jumpMin-value').innerText = player.jumpMinStrength;
    });

    // Jump max strength slider
    document.getElementById('jumpMax').addEventListener('input', function(e){
        player.jumpMaxStrength = parseInt(e.target.value);
        document.getElementById('jumpMax-value').innerText = player.jumpMaxStrength;
    });

    // Walk speed slider
    document.getElementById('walkSpeed').addEventListener('input', function(e){
        player.moveSpeed = parseFloat(e.target.value);
        document.getElementById('walkSpeed-value').innerText = player.moveSpeed.toFixed(1);
    });

    // Sprint multiplier slider
    document.getElementById('sprintMultiplier').addEventListener('input', function(e){
        player.sprintMultiplier = parseFloat(e.target.value);
        document.getElementById('sprintMultiplier-value').innerText = player.sprintMultiplier.toFixed(1);
    });

    // Bullet size slider
    document.getElementById('bulletSize').addEventListener('input', function(e){
        bulletSize = parseFloat(e.target.value);
        document.getElementById('bulletSize-value').innerText = bulletSize;
    });

    // Barrel distance slider
    document.getElementById('barrelDistance').addEventListener('input', function(e){
        gunModel.barrelDistance = parseInt(e.target.value);
        document.getElementById('barrelDistance-value').innerText = gunModel.barrelDistance;
    });

    // Hit Detection sliders
    document.getElementById('hitscanDist').addEventListener('input', function(e){
        hitscanDist = parseInt(e.target.value);
        document.getElementById('hitscanDist-value').innerText = hitscanDist;
    });
    document.getElementById('ccdMaxDist').addEventListener('input', function(e){
        ccdMaxDist = parseInt(e.target.value);
        document.getElementById('ccdMaxDist-value').innerText = ccdMaxDist;
    });
    document.getElementById('showHitRanges').addEventListener('change', function(e){
        showHitRanges = e.target.checked;
    });

    // GMD (Gun Mechanics Debug) controls
    document.getElementById('showGMD').addEventListener('change', function(e){
        showGMD = e.target.checked;
    });
    document.getElementById('showTestTarget').addEventListener('change', function(e){
        testTarget.enabled = e.target.checked;
    });
    document.getElementById('showMinimaps').addEventListener('change', function(e){
        showMinimaps = e.target.checked;
    });
    document.getElementById('targetDistance').addEventListener('input', function(e){
        var dist = parseInt(e.target.value);
        document.getElementById('targetDistance-value').innerText = dist;
        testTarget.distance = dist;
        positionTestTarget();
    });
    document.getElementById('targetRadius').addEventListener('input', function(e){
        testTarget.radius = parseFloat(e.target.value);
        document.getElementById('targetRadius-value').innerText = testTarget.radius.toFixed(1);
    });
    document.getElementById('resetHitCount').addEventListener('click', function(){
        testTarget.hits = 0;
        testTarget.misses = 0;
        testTarget.bulletHitPos = null;
    });

    // Gun Tab edit mode buttons
    document.getElementById('editADS').addEventListener('click', function() {
        setEditMode('ads');
    });
    document.getElementById('editHip').addEventListener('click', function() {
        setEditMode('hip');
    });

    // Gun viewmodel sliders - update based on current edit mode
    document.getElementById('gunX').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsOffsetX = val;
        else gunModel.hipOffsetX = val;
        document.getElementById('gunX-value').innerText = val;
    });
    document.getElementById('gunY').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsOffsetY = val;
        else gunModel.hipOffsetY = val;
        document.getElementById('gunY-value').innerText = val;
    });
    document.getElementById('gunZ').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsOffsetZ = val;
        else gunModel.hipOffsetZ = val;
        document.getElementById('gunZ-value').innerText = val;
    });
    document.getElementById('gunScale').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsScale = val;
        else gunModel.hipScale = val;
        document.getElementById('gunScale-value').innerText = val;
    });
    document.getElementById('gunRotX').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsRotationX = val;
        else gunModel.hipRotationX = val;
        document.getElementById('gunRotX-value').innerText = val;
    });
    document.getElementById('gunRotY').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsRotationY = val;
        else gunModel.hipRotationY = val;
        document.getElementById('gunRotY-value').innerText = val;
    });
    document.getElementById('gunRotZ').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsRotationZ = val;
        else gunModel.hipRotationZ = val;
        document.getElementById('gunRotZ-value').innerText = val;
    });

    // Barrel Tab edit mode buttons (use shared setEditMode)
    document.getElementById('barrelEditADS').addEventListener('click', function() {
        setEditMode('ads');
    });
    document.getElementById('barrelEditHip').addEventListener('click', function() {
        setEditMode('hip');
    });

    // Barrel yaw slider - update based on current edit mode
    document.getElementById('barrelYaw').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsBarrelYaw = val;
        else gunModel.hipBarrelYaw = val;
        document.getElementById('barrelYaw-value').innerText = val;
    });

    // Barrel position sliders - update based on current edit mode
    document.getElementById('barrelX').addEventListener('input', function(e){
        var val = parseFloat(e.target.value);
        if (editMode === 'ads') gunModel.adsBarrelX = val;
        else gunModel.hipBarrelX = val;
        document.getElementById('barrelX-value').innerText = val.toFixed(2);
    });
    document.getElementById('barrelY').addEventListener('input', function(e){
        var val = parseFloat(e.target.value);
        if (editMode === 'ads') gunModel.adsBarrelY = val;
        else gunModel.hipBarrelY = val;
        document.getElementById('barrelY-value').innerText = val.toFixed(2);
    });
    document.getElementById('barrelZ').addEventListener('input', function(e){
        var val = parseFloat(e.target.value);
        if (editMode === 'ads') gunModel.adsBarrelZ = val;
        else gunModel.hipBarrelZ = val;
        document.getElementById('barrelZ-value').innerText = val.toFixed(2);
    });

    // Gun world offset sliders - update based on current edit mode
    document.getElementById('gunWorldFwd').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsWorldForward = val;
        else gunModel.hipWorldForward = val;
        document.getElementById('gunWorldFwd-value').innerText = val;
    });
    document.getElementById('gunWorldRight').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsWorldRight = val;
        else gunModel.hipWorldRight = val;
        document.getElementById('gunWorldRight-value').innerText = val;
    });
    document.getElementById('gunWorldDown').addEventListener('input', function(e){
        var val = parseInt(e.target.value);
        if (editMode === 'ads') gunModel.adsWorldDown = val;
        else gunModel.hipWorldDown = val;
        document.getElementById('gunWorldDown-value').innerText = val;
    });

    // UI Scale sliders
    document.getElementById('uiScaleAll').addEventListener('input', function(e){
        var scale = parseFloat(e.target.value);
        uiScale.all = scale;
        document.getElementById('uiScaleAll-value').innerText = scale.toFixed(1);
        // Update all individual scales
        uiScale.crosshair = scale;
        uiScale.healthbar = scale;
        uiScale.jumpbar = scale;
        uiScale.minimap = scale;
        uiScale.weaponUI = scale;
        // Update slider displays
        document.getElementById('uiScaleCrosshair').value = scale;
        document.getElementById('uiScaleCrosshair-value').innerText = scale.toFixed(1);
        document.getElementById('uiScaleHealthbar').value = scale;
        document.getElementById('uiScaleHealthbar-value').innerText = scale.toFixed(1);
        document.getElementById('uiScaleJumpbar').value = scale;
        document.getElementById('uiScaleJumpbar-value').innerText = scale.toFixed(1);
        document.getElementById('uiScaleMinimap').value = scale;
        document.getElementById('uiScaleMinimap-value').innerText = scale.toFixed(1);
        document.getElementById('uiScaleWeaponUI').value = scale;
        document.getElementById('uiScaleWeaponUI-value').innerText = scale.toFixed(1);
        applyUIScales();
    });
    document.getElementById('uiScaleCrosshair').addEventListener('input', function(e){
        uiScale.crosshair = parseFloat(e.target.value);
        document.getElementById('uiScaleCrosshair-value').innerText = uiScale.crosshair.toFixed(1);
        applyUIScales();
    });
    document.getElementById('uiScaleHealthbar').addEventListener('input', function(e){
        uiScale.healthbar = parseFloat(e.target.value);
        document.getElementById('uiScaleHealthbar-value').innerText = uiScale.healthbar.toFixed(1);
        applyUIScales();
    });
    document.getElementById('uiScaleJumpbar').addEventListener('input', function(e){
        uiScale.jumpbar = parseFloat(e.target.value);
        document.getElementById('uiScaleJumpbar-value').innerText = uiScale.jumpbar.toFixed(1);
        applyUIScales();
    });
    document.getElementById('uiScaleMinimap').addEventListener('input', function(e){
        uiScale.minimap = parseFloat(e.target.value);
        document.getElementById('uiScaleMinimap-value').innerText = uiScale.minimap.toFixed(1);
        applyUIScales();
    });
    document.getElementById('minimapZoomRange').addEventListener('input', function(e){
        minimapZoomRange = parseInt(e.target.value);
        document.getElementById('minimapZoomRange-value').innerText = minimapZoomRange;
    });
    document.getElementById('sideViewZoomRange').addEventListener('input', function(e){
        sideViewZoomRange = parseInt(e.target.value);
        document.getElementById('sideViewZoomRange-value').innerText = sideViewZoomRange;
    });
    document.getElementById('uiScaleWeaponUI').addEventListener('input', function(e){
        uiScale.weaponUI = parseFloat(e.target.value);
        document.getElementById('uiScaleWeaponUI-value').innerText = uiScale.weaponUI.toFixed(1);
        applyUIScales();
    });

    // Initialize sliders with ADS values
    updateGunSliders();
    updateBarrelSliders();
    updateWorldOffsetSliders();

    // Save button
    document.getElementById('saveSettings').addEventListener('click', function() {
        savedSettings = getAllSettings();
        localStorage.setItem('voxelSpaceSettings', JSON.stringify(savedSettings));
        ConfigLoader.copyToClipboard(gunModel);
        console.log('Settings saved to localStorage AND copied to clipboard as JSON');
        this.textContent = 'Saved + Copied!';
        setTimeout(() => this.textContent = 'Save', 2000);
    });

    // Reset button
    document.getElementById('resetSettings').addEventListener('click', function() {
        if (savedSettings) {
            applySettings(savedSettings);
            this.textContent = 'Reset!';
            setTimeout(() => this.textContent = 'Reset', 1000);
        }
    });
}

// Get all current settings for saving
function getAllSettings() {
    return {
        fov: camera.baseFocalLength,
        pitchOffset: pitchOffset,
        targetFPS: targetFPS,
        drawDistance: camera.distance,
        playerHeight: playerHeightOffset,
        normalHeight: player.normalHeight,
        crouchHeight: player.crouchHeight,
        jumpMin: player.jumpMinStrength,
        jumpMax: player.jumpMaxStrength,
        walkSpeed: player.moveSpeed,
        sprintMultiplier: player.sprintMultiplier,
        bulletSize: bulletSize,
        barrelDistance: gunModel.barrelDistance,
        // Gun position
        adsOffsetX: gunModel.adsOffsetX,
        adsOffsetY: gunModel.adsOffsetY,
        adsOffsetZ: gunModel.adsOffsetZ,
        adsScale: gunModel.adsScale,
        adsRotationX: gunModel.adsRotationX,
        adsRotationY: gunModel.adsRotationY,
        adsRotationZ: gunModel.adsRotationZ,
        hipOffsetX: gunModel.hipOffsetX,
        hipOffsetY: gunModel.hipOffsetY,
        hipOffsetZ: gunModel.hipOffsetZ,
        hipScale: gunModel.hipScale,
        hipRotationX: gunModel.hipRotationX,
        hipRotationY: gunModel.hipRotationY,
        hipRotationZ: gunModel.hipRotationZ,
        // Barrel
        adsBarrelX: gunModel.adsBarrelX,
        adsBarrelY: gunModel.adsBarrelY,
        adsBarrelZ: gunModel.adsBarrelZ,
        adsBarrelYaw: gunModel.adsBarrelYaw,
        hipBarrelX: gunModel.hipBarrelX,
        hipBarrelY: gunModel.hipBarrelY,
        hipBarrelZ: gunModel.hipBarrelZ,
        hipBarrelYaw: gunModel.hipBarrelYaw,
        // World offset
        adsWorldForward: gunModel.adsWorldForward,
        adsWorldRight: gunModel.adsWorldRight,
        adsWorldDown: gunModel.adsWorldDown,
        hipWorldForward: gunModel.hipWorldForward,
        hipWorldRight: gunModel.hipWorldRight,
        hipWorldDown: gunModel.hipWorldDown,
        // UI Scale
        uiScaleAll: uiScale.all,
        uiScaleCrosshair: uiScale.crosshair,
        uiScaleHealthbar: uiScale.healthbar,
        uiScaleJumpbar: uiScale.jumpbar,
        uiScaleMinimap: uiScale.minimap,
        uiScaleWeaponUI: uiScale.weaponUI,
        minimapZoomRange: minimapZoomRange,
        sideViewZoomRange: sideViewZoomRange,
        // Scope and debug
        scopeMode: scopeMode,
        showHitRanges: showHitRanges,
        showGMD: showGMD,
        showMinimaps: showMinimaps,
        showTestTarget: testTarget.enabled,
        targetDistance: testTarget.distance,
        targetRadius: testTarget.radius
    };
}

// Apply loaded settings
function applySettings(s) {
    if (s.fov !== undefined) {
        camera.baseFocalLength = s.fov;
        camera.focalLength = s.fov;
        document.getElementById('fov').value = s.fov;
        document.getElementById('fov-value').innerText = s.fov;
    }
    if (s.pitchOffset !== undefined) {
        pitchOffset = s.pitchOffset;
        document.getElementById('pitchOffset').value = s.pitchOffset;
        document.getElementById('pitchOffset-value').innerText = s.pitchOffset;
    }
    if (s.targetFPS !== undefined) {
        targetFPS = s.targetFPS;
        frameDuration = 1000 / targetFPS;
        document.getElementById('targetFPS').value = s.targetFPS;
        document.getElementById('targetFPS-value').innerText = s.targetFPS;
    }
    if (s.drawDistance !== undefined) {
        camera.distance = s.drawDistance;
        document.getElementById('drawDistance').value = s.drawDistance;
        document.getElementById('drawDistance-value').innerText = s.drawDistance;
    }
    if (s.playerHeight !== undefined) {
        playerHeightOffset = s.playerHeight;
        document.getElementById('playerHeight').value = s.playerHeight;
        document.getElementById('playerHeight-value').innerText = s.playerHeight;
    }
    if (s.normalHeight !== undefined) {
        player.normalHeight = s.normalHeight;
        document.getElementById('normalHeight').value = s.normalHeight;
        document.getElementById('normalHeight-value').innerText = s.normalHeight;
    }
    if (s.crouchHeight !== undefined) {
        player.crouchHeight = s.crouchHeight;
        document.getElementById('crouchHeight').value = s.crouchHeight;
        document.getElementById('crouchHeight-value').innerText = s.crouchHeight;
    }
    if (s.jumpMin !== undefined) {
        player.jumpMinStrength = s.jumpMin;
        document.getElementById('jumpMin').value = s.jumpMin;
        document.getElementById('jumpMin-value').innerText = s.jumpMin;
    }
    if (s.jumpMax !== undefined) {
        player.jumpMaxStrength = s.jumpMax;
        document.getElementById('jumpMax').value = s.jumpMax;
        document.getElementById('jumpMax-value').innerText = s.jumpMax;
    }
    if (s.walkSpeed !== undefined) {
        player.moveSpeed = s.walkSpeed;
        document.getElementById('walkSpeed').value = s.walkSpeed;
        document.getElementById('walkSpeed-value').innerText = s.walkSpeed.toFixed(1);
    }
    if (s.sprintMultiplier !== undefined) {
        player.sprintMultiplier = s.sprintMultiplier;
        document.getElementById('sprintMultiplier').value = s.sprintMultiplier;
        document.getElementById('sprintMultiplier-value').innerText = s.sprintMultiplier.toFixed(1);
    }
    if (s.bulletSize !== undefined) {
        bulletSize = s.bulletSize;
        document.getElementById('bulletSize').value = s.bulletSize;
        document.getElementById('bulletSize-value').innerText = s.bulletSize;
    }
    if (s.barrelDistance !== undefined) {
        gunModel.barrelDistance = s.barrelDistance;
        document.getElementById('barrelDistance').value = s.barrelDistance;
        document.getElementById('barrelDistance-value').innerText = s.barrelDistance;
    }
    // Gun position - ADS
    if (s.adsOffsetX !== undefined) {
        gunModel.adsOffsetX = s.adsOffsetX;
        gunModel.adsOffsetY = s.adsOffsetY;
        gunModel.adsOffsetZ = s.adsOffsetZ;
        gunModel.adsScale = s.adsScale;
        gunModel.adsRotationX = s.adsRotationX;
        gunModel.adsRotationY = s.adsRotationY;
        gunModel.adsRotationZ = s.adsRotationZ;
    }
    // Gun position - Hip
    if (s.hipOffsetX !== undefined) {
        gunModel.hipOffsetX = s.hipOffsetX;
        gunModel.hipOffsetY = s.hipOffsetY;
        gunModel.hipOffsetZ = s.hipOffsetZ;
        gunModel.hipScale = s.hipScale;
        gunModel.hipRotationX = s.hipRotationX;
        gunModel.hipRotationY = s.hipRotationY;
        gunModel.hipRotationZ = s.hipRotationZ;
    }
    // Barrel - ADS
    if (s.adsBarrelX !== undefined) {
        gunModel.adsBarrelX = s.adsBarrelX;
        gunModel.adsBarrelY = s.adsBarrelY;
        gunModel.adsBarrelZ = s.adsBarrelZ;
        gunModel.adsBarrelYaw = s.adsBarrelYaw;
    }
    // Barrel - Hip
    if (s.hipBarrelX !== undefined) {
        gunModel.hipBarrelX = s.hipBarrelX;
        gunModel.hipBarrelY = s.hipBarrelY;
        gunModel.hipBarrelZ = s.hipBarrelZ;
        gunModel.hipBarrelYaw = s.hipBarrelYaw;
    }
    // World offset - ADS
    if (s.adsWorldForward !== undefined) {
        gunModel.adsWorldForward = s.adsWorldForward;
        gunModel.adsWorldRight = s.adsWorldRight;
        gunModel.adsWorldDown = s.adsWorldDown;
    }
    // World offset - Hip
    if (s.hipWorldForward !== undefined) {
        gunModel.hipWorldForward = s.hipWorldForward;
        gunModel.hipWorldRight = s.hipWorldRight;
        gunModel.hipWorldDown = s.hipWorldDown;
    }
    // UI Scale
    if (s.uiScaleAll !== undefined) {
        uiScale.all = s.uiScaleAll;
        document.getElementById('uiScaleAll').value = s.uiScaleAll;
        document.getElementById('uiScaleAll-value').innerText = s.uiScaleAll.toFixed(1);
    }
    if (s.uiScaleCrosshair !== undefined) {
        uiScale.crosshair = s.uiScaleCrosshair;
        document.getElementById('uiScaleCrosshair').value = s.uiScaleCrosshair;
        document.getElementById('uiScaleCrosshair-value').innerText = s.uiScaleCrosshair.toFixed(1);
    }
    if (s.uiScaleHealthbar !== undefined) {
        uiScale.healthbar = s.uiScaleHealthbar;
        document.getElementById('uiScaleHealthbar').value = s.uiScaleHealthbar;
        document.getElementById('uiScaleHealthbar-value').innerText = s.uiScaleHealthbar.toFixed(1);
    }
    if (s.uiScaleJumpbar !== undefined) {
        uiScale.jumpbar = s.uiScaleJumpbar;
        document.getElementById('uiScaleJumpbar').value = s.uiScaleJumpbar;
        document.getElementById('uiScaleJumpbar-value').innerText = s.uiScaleJumpbar.toFixed(1);
    }
    if (s.uiScaleMinimap !== undefined) {
        uiScale.minimap = s.uiScaleMinimap;
        document.getElementById('uiScaleMinimap').value = s.uiScaleMinimap;
        document.getElementById('uiScaleMinimap-value').innerText = s.uiScaleMinimap.toFixed(1);
    }
    if (s.uiScaleWeaponUI !== undefined) {
        uiScale.weaponUI = s.uiScaleWeaponUI;
        document.getElementById('uiScaleWeaponUI').value = s.uiScaleWeaponUI;
        document.getElementById('uiScaleWeaponUI-value').innerText = s.uiScaleWeaponUI.toFixed(1);
    }
    if (s.minimapZoomRange !== undefined) {
        minimapZoomRange = s.minimapZoomRange;
        document.getElementById('minimapZoomRange').value = s.minimapZoomRange;
        document.getElementById('minimapZoomRange-value').innerText = s.minimapZoomRange;
    }
    if (s.sideViewZoomRange !== undefined) {
        sideViewZoomRange = s.sideViewZoomRange;
        document.getElementById('sideViewZoomRange').value = s.sideViewZoomRange;
        document.getElementById('sideViewZoomRange-value').innerText = s.sideViewZoomRange;
    }
    if (s.scopeMode !== undefined) {
        setScopeMode(s.scopeMode);
    }
    // Debug/GMD
    if (s.showHitRanges !== undefined) {
        showHitRanges = s.showHitRanges;
        document.getElementById('showHitRanges').checked = s.showHitRanges;
    }
    if (s.showGMD !== undefined) {
        showGMD = s.showGMD;
        document.getElementById('showGMD').checked = s.showGMD;
    }
    if (s.showMinimaps !== undefined) {
        showMinimaps = s.showMinimaps;
        document.getElementById('showMinimaps').checked = s.showMinimaps;
    }
    if (s.showTestTarget !== undefined) {
        testTarget.enabled = s.showTestTarget;
        document.getElementById('showTestTarget').checked = s.showTestTarget;
    }
    if (s.targetDistance !== undefined) {
        testTarget.distance = s.targetDistance;
        document.getElementById('targetDistance').value = s.targetDistance;
        document.getElementById('targetDistance-value').innerText = s.targetDistance;
    }
    if (s.targetRadius !== undefined) {
        testTarget.radius = s.targetRadius;
        document.getElementById('targetRadius').value = s.targetRadius;
        document.getElementById('targetRadius-value').innerText = s.targetRadius.toFixed(1);
    }
    // Update sliders
    updateGunSliders();
    updateBarrelSliders();
    updateWorldOffsetSliders();
    applyUIScales();
}

// Load settings from localStorage or JSON
function loadSettings() {
    ConfigLoader.loadAll().then(function(jsonLoaded) {
        // Only admin can benefit from cached localStorage settings
        if (isAdmin) {
            var stored = localStorage.getItem('voxelSpaceSettings');
            if (stored) {
                try {
                    savedSettings = JSON.parse(stored);
                    console.log('Loading saved settings from localStorage');
                    applySettings(savedSettings);
                    if (jsonLoaded) {
                        ConfigLoader.applyWeapons();
                        ConfigLoader.applyGamepad();
                    }
                    return;
                } catch(e) {
                    console.log('Could not load saved settings:', e);
                }
            }
        }

        // Everyone else (and admin fallback): use hardcoded JSON files only
        if (jsonLoaded && ConfigLoader.gunModel) {
            ConfigLoader.applyGunModel(gunModel);
            ConfigLoader.applyWeapons();
            ConfigLoader.applyGamepad();
            console.log('Settings loaded from data/*.json files');
        }
    });
}

// Debug functions
window.clearVoxelSettings = function() {
    localStorage.removeItem('voxelSpaceSettings');
    console.log('Saved settings cleared. Refresh to use defaults from JSON.');
};

window.reloadJsonConfigs = function() {
    ConfigLoader.loadAll().then(function(loaded) {
        if (loaded) {
            ConfigLoader.applyGunModel(gunModel);
            ConfigLoader.applyWeapons();
            ConfigLoader.applyGamepad();
            console.log('JSON configs reloaded and applied');
        }
    });
};
