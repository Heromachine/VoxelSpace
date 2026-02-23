// ===============================
// Touch Controls Drawing
// ===============================
"use strict";

function DrawTouchControls(ctx) {
    if (!touchControls.enabled) return;

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';

    var r = touchControls.stickRadius;

    // ── Left stick (MOVE) ──────────────────────────────────────────
    var ls = touchControls.leftStick;
    var lx = ls.active ? ls.startX : touchControls.leftStickPos.x;
    var ly = ls.active ? ls.startY : touchControls.leftStickPos.y;

    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100,100,100,0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    var stickX = lx, stickY = ly;
    if (ls.active) {
        var dx = ls.currentX - ls.startX;
        var dy = ls.currentY - ls.startY;
        var dist = Math.hypot(dx, dy);
        if (dist > r) { dx = (dx / dist) * r; dy = (dy / dist) * r; }
        stickX = ls.startX + dx;
        stickY = ls.startY + dy;
    }
    ctx.beginPath();
    ctx.arc(stickX, stickY, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = ls.active ? 'rgba(255,255,255,0.8)' : 'rgba(200,200,200,0.6)';
    ctx.fill();

    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('MOVE', lx, ly - r - 10);

    // ── Right stick (LOOK) ─────────────────────────────────────────
    var rs = touchControls.rightStick;
    var rx = rs.active ? rs.startX : touchControls.rightStickPos.x;
    var ry = rs.active ? rs.startY : touchControls.rightStickPos.y;

    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100,100,100,0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    stickX = rx; stickY = ry;
    if (rs.active) {
        var dx = rs.currentX - rs.startX;
        var dy = rs.currentY - rs.startY;
        var dist = Math.hypot(dx, dy);
        if (dist > r) { dx = (dx / dist) * r; dy = (dy / dist) * r; }
        stickX = rs.startX + dx;
        stickY = rs.startY + dy;
    }
    ctx.beginPath();
    ctx.arc(stickX, stickY, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = rs.active ? 'rgba(255,255,255,0.8)' : 'rgba(200,200,200,0.6)';
    ctx.fill();

    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('LOOK', rx, ry - r - 10);

    // ── FIRE button ────────────────────────────────────────────────
    var sb = touchControls.shootButton;
    ctx.beginPath();
    ctx.arc(sb.x, sb.y, sb.radius, 0, Math.PI * 2);
    ctx.fillStyle = sb.active ? 'rgba(255,60,60,0.75)' : 'rgba(200,60,60,0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,80,80,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('FIRE', sb.x, sb.y);

    // ── JUMP button ────────────────────────────────────────────────
    var jb = touchControls.jumpButton;
    ctx.beginPath();
    ctx.arc(jb.x, jb.y, jb.radius, 0, Math.PI * 2);
    ctx.fillStyle = jb.active ? 'rgba(80,180,255,0.75)' : 'rgba(60,140,220,0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,200,255,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('JUMP', jb.x, jb.y);

    // ── SWAP button ────────────────────────────────────────────────
    var wb = touchControls.swapButton;
    ctx.beginPath();
    ctx.arc(wb.x, wb.y, wb.radius, 0, Math.PI * 2);
    ctx.fillStyle = wb.active ? 'rgba(255,200,60,0.75)' : 'rgba(200,160,40,0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,80,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('SWAP', wb.x, wb.y);

    // ── ADS hint (double-tap center) ───────────────────────────────
    if (input.aimToggled) {
        var sw = screendata.canvas.width;
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = 'rgba(255,220,80,0.8)';
        ctx.fillText('[ ADS ]', sw / 2, 18);
    }

    ctx.restore();
}
