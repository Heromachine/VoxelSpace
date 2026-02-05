/**
 * Scope System: Crop Zoom Mode (renamed from Focal Length)
 * VoxelSpace Engine
 *
 * This scope mode keeps Camera 2 at the same position as Camera 1,
 * renders at NORMAL focal length, then crops and scales the center for zoom.
 * This is "digital zoom" - no projection distortion, no wall clipping.
 *
 * ADVANTAGE: No see-through walls, no sprite bunching issues.
 */

var ScopeFocalLength = {
    name: "Crop Zoom",
    description: "Same position, crop center for zoom (no wall clipping)",

    // Zoom levels (crop factors - higher = more zoom, smaller source region)
    zoomLevels: [2, 4, 6],
    currentZoomIndex: 0,

    // Scope state
    active: false,
    size: 345,              // Scope diameter in pixels
    reticleColor: '#00FF00',

    // Buffer for Camera 2 rendering
    canvas: null,
    context: null,
    imagedata: null,
    bufarray: null,
    buf8: null,
    buf32: null,
    depthBuffer: null,
    scopeHiddeny: null,
    initialized: false,
    bufferWidth: 0,
    bufferHeight: 0,

    // Camera 2 state (crop zoom based)
    currentZoomFactor: 1,   // Smoothed zoom factor for cropping

    /**
     * Initialize scope buffer at same size as main canvas
     */
    initBuffer: function(width, height) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d');
        this.imagedata = this.context.createImageData(width, height);
        this.bufarray = new ArrayBuffer(width * height * 4);
        this.buf8 = new Uint8Array(this.bufarray);
        this.buf32 = new Uint32Array(this.bufarray);
        this.depthBuffer = new Float32Array(width * height);
        this.scopeHiddeny = new Int32Array(width);
        this.initialized = true;
        this.bufferWidth = width;
        this.bufferHeight = height;
    },

    /**
     * Update scope camera based on ADS state
     */
    updateCamera: function(isAiming, useScope) {
        if (isAiming && useScope) {
            var targetZoom = this.zoomLevels[this.currentZoomIndex];
            this.currentZoomFactor += (targetZoom - this.currentZoomFactor) * 0.15;
        } else {
            this.currentZoomFactor += (1 - this.currentZoomFactor) * 0.15;
        }
    },

    /**
     * Handle mouse wheel zoom
     */
    handleZoom: function(deltaY) {
        if (deltaY < 0) {
            // Zoom in
            this.currentZoomIndex = Math.min(this.currentZoomIndex + 1, this.zoomLevels.length - 1);
        } else if (deltaY > 0) {
            // Zoom out
            this.currentZoomIndex = Math.max(this.currentZoomIndex - 1, 0);
        }
    },

    /**
     * Render scope view - Camera 2 at same position, normal focal length, crop zoom
     * @param {Object} mainScreendata - Main screen data object
     * @param {Object} camera - Camera object
     * @param {Object} renderFuncs - Object containing render functions {DrawBackground, RenderCube, Render, RenderItems}
     * @param {Int32Array} mainHiddeny - Main hiddeny array
     */
    render: function(mainScreendata, camera, renderFuncs, mainHiddeny) {
        var currentSlot = playerWeapons[currentWeaponIndex];
        var currentWeapon = weapons[currentSlot.type];

        // Only render scope when ADS with a scoped weapon
        if (!input.aimToggled || !currentWeapon.useScope) {
            this.active = false;
            return;
        }

        this.active = true;

        var ctx = mainScreendata.context;
        var canvas = mainScreendata.canvas;
        var scopeSize = this.size;
        var scopeRadius = scopeSize / 2;

        // Position scope in center of screen
        var centerX = canvas.width / 2;
        var centerY = canvas.height / 2;

        // Get current zoom level
        var zoomLevel = this.zoomLevels[this.currentZoomIndex];

        // Initialize scope buffer at SAME SIZE as main canvas
        if (!this.initialized ||
            this.bufferWidth !== canvas.width ||
            this.bufferHeight !== canvas.height) {
            this.initBuffer(canvas.width, canvas.height);
        }

        // ========================================
        // CAMERA 2 RENDER - Same position, NORMAL focal length
        // ========================================

        // Save main camera state
        var mainCameraX = camera.x;
        var mainCameraY = camera.y;
        var mainFocalLength = camera.focalLength;

        // Camera 2 stays at SAME POSITION and SAME FOCAL LENGTH as Camera 1
        // Zoom is achieved by cropping the center, NOT by changing projection

        // Swap to scope buffer
        var origScreendata = {
            canvas: screendata.canvas,
            context: screendata.context,
            imagedata: screendata.imagedata,
            bufarray: screendata.bufarray,
            buf8: screendata.buf8,
            buf32: screendata.buf32,
            depthBuffer: screendata.depthBuffer
        };

        screendata.canvas = this.canvas;
        screendata.context = this.context;
        screendata.imagedata = this.imagedata;
        screendata.bufarray = this.bufarray;
        screendata.buf8 = this.buf8;
        screendata.buf32 = this.buf32;
        screendata.depthBuffer = this.depthBuffer;
        hiddeny = this.scopeHiddeny;

        // Render scope view at NORMAL focal length
        renderFuncs.DrawBackground();
        renderFuncs.RenderCube();
        renderFuncs.Render();
        renderFuncs.RenderItems();

        // Copy buffer to scope canvas
        this.imagedata.data.set(this.buf8);
        this.context.putImageData(this.imagedata, 0, 0);

        // Draw test target AFTER putImageData (canvas 2D operations must come after buffer copy)
        if (renderFuncs.RenderTestTarget) renderFuncs.RenderTestTarget();

        // Restore main screendata and camera
        screendata.canvas = origScreendata.canvas;
        screendata.context = origScreendata.context;
        screendata.imagedata = origScreendata.imagedata;
        screendata.bufarray = origScreendata.bufarray;
        screendata.buf8 = origScreendata.buf8;
        screendata.buf32 = origScreendata.buf32;
        screendata.depthBuffer = origScreendata.depthBuffer;
        hiddeny = mainHiddeny;
        camera.x = mainCameraX;
        camera.y = mainCameraY;
        camera.focalLength = mainFocalLength;

        // ========================================
        // DRAW SCOPE VIEW ON MAIN CANVAS - CROP ZOOM
        // ========================================
        this.drawScopeOverlay(ctx, centerX, centerY, scopeRadius, scopeSize, zoomLevel);
    },

    /**
     * Draw the scope overlay with crop zoom
     * @param {number} horizon - Camera horizon value (pitch offset)
     */
    drawScopeOverlay: function(ctx, centerX, centerY, scopeRadius, scopeSize, zoomLevel) {
        // Calculate crop region - smaller source = more zoom
        // At zoom 2x, we take half the scope size from center
        // At zoom 4x, we take quarter the scope size from center
        // NOTE: No horizon offset - scope shows exactly what it rendered, matching bullet trajectory
        var sourceSize = scopeSize / this.currentZoomFactor;
        var sourceX = centerX - sourceSize / 2;
        var sourceY = centerY - sourceSize / 2;

        // Draw cropped and scaled scope canvas, clipped to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, scopeRadius - 4, 0, Math.PI * 2);
        ctx.clip();

        // Draw from smaller center region, scale up to scope size (CROP ZOOM)
        ctx.drawImage(this.canvas,
            sourceX, sourceY, sourceSize, sourceSize,  // Source: smaller center region (horizon-adjusted)
            centerX - scopeRadius, centerY - scopeRadius, scopeSize, scopeSize   // Dest: full scope size
        );

        // Vignette effect
        var vignetteGradient = ctx.createRadialGradient(
            centerX, centerY, scopeRadius * 0.7,
            centerX, centerY, scopeRadius
        );
        vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
        vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(centerX - scopeRadius, centerY - scopeRadius, scopeSize, scopeSize);
        ctx.restore();

        // Draw scope border
        ctx.beginPath();
        ctx.arc(centerX, centerY, scopeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw reticle
        this.drawReticle(ctx, centerX, centerY, scopeRadius, zoomLevel);
    },

    /**
     * Draw mil-dot reticle
     */
    drawReticle: function(ctx, centerX, centerY, scopeRadius, zoomLevel) {
        ctx.strokeStyle = this.reticleColor;
        ctx.lineWidth = 1;

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(centerX - scopeRadius * 0.7, centerY);
        ctx.lineTo(centerX - 15, centerY);
        ctx.moveTo(centerX + 15, centerY);
        ctx.lineTo(centerX + scopeRadius * 0.7, centerY);
        ctx.stroke();

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - scopeRadius * 0.7);
        ctx.lineTo(centerX, centerY - 15);
        ctx.moveTo(centerX, centerY + 15);
        ctx.lineTo(centerX, centerY + scopeRadius * 0.7);
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
        ctx.fillStyle = this.reticleColor;
        ctx.fill();

        // Mil-dots
        var dotSpacing = scopeRadius * 0.15;
        for (var i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX - 15 - i * dotSpacing, centerY, 2, 0, Math.PI * 2);
            ctx.arc(centerX + 15 + i * dotSpacing, centerY, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX, centerY - 15 - i * dotSpacing, 2, 0, Math.PI * 2);
            ctx.arc(centerX, centerY + 15 + i * dotSpacing, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Zoom level indicator
        ctx.font = '14px monospace';
        ctx.fillStyle = this.reticleColor;
        ctx.fillText(zoomLevel + 'x', centerX - scopeRadius + 15, centerY + scopeRadius - 15);

        // Zoom level dots
        var dotY = centerY + scopeRadius - 30;
        for (var i = 0; i < this.zoomLevels.length; i++) {
            ctx.beginPath();
            ctx.arc(centerX - 15 + i * 15, dotY, i === this.currentZoomIndex ? 5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = i === this.currentZoomIndex ? this.reticleColor : '#666666';
            ctx.fill();
        }

        // Show mode indicator
        ctx.font = '10px monospace';
        ctx.fillStyle = '#888888';
        ctx.fillText('CROP', centerX + scopeRadius - 40, centerY + scopeRadius - 15);
    }
};
