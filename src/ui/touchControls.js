// ===============================
// Touch Controls Drawing
// ===============================
"use strict";

function DrawTouchControls(ctx) {
    if (!touchControls.enabled) return;

    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Arial';

    var r = touchControls.stickRadius;

    // Draw left stick (movement)
    var ls = touchControls.leftStick;
    var lx = ls.active ? ls.startX : touchControls.leftStickPos.x;
    var ly = ls.active ? ls.startY : touchControls.leftStickPos.y;

    // Outer circle
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner stick position
    var stickX = lx;
    var stickY = ly;
    if (ls.active) {
        var dx = ls.currentX - ls.startX;
        var dy = ls.currentY - ls.startY;
        var dist = Math.hypot(dx, dy);
        if (dist > r) {
            dx = (dx / dist) * r;
            dy = (dy / dist) * r;
        }
        stickX = ls.startX + dx;
        stickY = ls.startY + dy;
    }
    ctx.beginPath();
    ctx.arc(stickX, stickY, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = ls.active ? 'rgba(255, 255, 255, 0.8)' : 'rgba(200, 200, 200, 0.6)';
    ctx.fill();

    // Label
    ctx.fillStyle = 'white';
    ctx.fillText('MOVE', lx, ly - r - 10);

    // Draw right stick (look)
    var rs = touchControls.rightStick;
    var rx = rs.active ? rs.startX : touchControls.rightStickPos.x;
    var ry = rs.active ? rs.startY : touchControls.rightStickPos.y;

    // Outer circle
    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner stick position
    stickX = rx;
    stickY = ry;
    if (rs.active) {
        var dx = rs.currentX - rs.startX;
        var dy = rs.currentY - rs.startY;
        var dist = Math.hypot(dx, dy);
        if (dist > r) {
            dx = (dx / dist) * r;
            dy = (dy / dist) * r;
        }
        stickX = rs.startX + dx;
        stickY = rs.startY + dy;
    }
    ctx.beginPath();
    ctx.arc(stickX, stickY, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = rs.active ? 'rgba(255, 255, 255, 0.8)' : 'rgba(200, 200, 200, 0.6)';
    ctx.fill();

    // Label
    ctx.fillText('LOOK', rx, ry - r - 10);

    // Draw shoot button
    var sb = touchControls.shootButton;
    ctx.beginPath();
    ctx.arc(sb.x, sb.y, sb.radius, 0, Math.PI * 2);
    ctx.fillStyle = sb.active ? 'rgba(255, 0, 0, 0.6)' : 'rgba(255, 100, 100, 0.4)';
    ctx.fill();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('FIRE', sb.x, sb.y + 5);

    ctx.globalAlpha = 1.0;
    ctx.textAlign = 'left';
}
