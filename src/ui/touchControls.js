// ===============================
// Touch Controls Drawing
// ===============================
"use strict";

function DrawTouchControls(ctx) {
    if (!touchControls.enabled) return;

    var sw = screendata.canvas.width;
    var sh = screendata.canvas.height;
    var isPortrait = sw < sh;
    var r  = touchControls.stickRadius;

    ctx.save();

    // ── Portrait: dark controls background panel ───────────────────
    if (isPortrait && touchControls.controlsTop > 0) {
        var ct = touchControls.controlsTop;
        ctx.fillStyle = 'rgba(0, 5, 12, 0.85)';
        ctx.fillRect(0, ct, sw, sh - ct);
        ctx.strokeStyle = 'rgba(80,150,220,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, ct); ctx.lineTo(sw, ct);
        ctx.stroke();
    }

    ctx.globalAlpha  = 0.75;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // ── Helper: draw a joystick ring + indicator ───────────────────
    function drawStick(stick, posX, posY, label) {
        // Outer ring
        ctx.beginPath();
        ctx.arc(posX, posY, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(50,90,130,0.3)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,170,255,0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner indicator: clamped to ring boundary
        var ix = posX, iy = posY;
        if (stick.active) {
            var dx = stick.currentX - stick.startX;
            var dy = stick.currentY - stick.startY;
            var dist = Math.hypot(dx, dy);
            if (dist > r) { dx = (dx / dist) * r; dy = (dy / dist) * r; }
            ix = stick.startX + dx;
            iy = stick.startY + dy;
        }
        ctx.beginPath();
        ctx.arc(ix, iy, r * 0.34, 0, Math.PI * 2);
        ctx.fillStyle = stick.active ? 'rgba(120,190,255,0.9)' : 'rgba(100,160,220,0.5)';
        ctx.fill();

        // Label above ring
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = 'rgba(140,190,240,0.6)';
        ctx.fillText(label, posX, posY - r - 10);
    }

    // ── Helper: draw a round action button ─────────────────────────
    function drawButton(btn, label, fillActive, fillIdle, stroke) {
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
        ctx.fillStyle = btn.active ? fillActive : fillIdle;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = 'bold ' + (btn.radius > 30 ? 14 : 11) + 'px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(label, btn.x, btn.y);
    }

    // Joysticks
    drawStick(touchControls.leftStick,  touchControls.leftStickPos.x,  touchControls.leftStickPos.y,  'MOVE');
    drawStick(touchControls.rightStick, touchControls.rightStickPos.x, touchControls.rightStickPos.y, 'LOOK');

    // FIRE (red)
    drawButton(touchControls.shootButton, 'FIRE',
        'rgba(220,50,50,0.85)', 'rgba(160,35,35,0.5)', 'rgba(255,80,80,0.8)');

    // JUMP (blue)
    drawButton(touchControls.jumpButton, 'JUMP',
        'rgba(50,150,255,0.85)', 'rgba(30,100,200,0.5)', 'rgba(80,180,255,0.8)');

    // ZOOM / ADS (yellow when active = ADS on, grey when off)
    var zb   = touchControls.zoomButton;
    var zLbl = input.aimToggled ? 'HIP' : 'ADS';
    drawButton(zb, zLbl,
        'rgba(255,200,40,0.85)',
        input.aimToggled ? 'rgba(200,155,30,0.65)' : 'rgba(120,100,30,0.45)',
        input.aimToggled ? 'rgba(255,220,80,0.9)'  : 'rgba(180,150,40,0.6)');

    // SWAP (purple)
    drawButton(touchControls.swapButton, 'SWAP',
        'rgba(160,80,255,0.85)', 'rgba(100,50,200,0.5)', 'rgba(180,110,255,0.8)');

    ctx.restore();
}
