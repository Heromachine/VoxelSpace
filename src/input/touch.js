// ===============================
// Touch Controls for Mobile
// ===============================
"use strict";

function enableTouchControls() {
    touchControls.enabled = true;
    updateTouchControlPositions();
}

function updateTouchControlPositions() {
    var sw = screendata.canvas.width;
    var sh = screendata.canvas.height;
    var r = touchControls.stickRadius;
    touchControls.leftStickPos = { x: r + 30, y: sh - r - 100 };
    touchControls.rightStickPos = { x: sw - r - 30, y: sh - r - 100 };
    touchControls.shootButton = { x: sw - 80, y: sh - 200, radius: 40, active: false, touchId: null };
}

function handleTouchStart(e) {
    e.preventDefault();
    if (!touchControls.enabled) enableTouchControls();

    for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];
        var x = touch.clientX;
        var y = touch.clientY;
        var sw = screendata.canvas.width;

        // Check weapon slot touches
        for (var j = 0; j < touchControls.weaponSlots.length; j++) {
            var slot = touchControls.weaponSlots[j];
            if (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) {
                if (slot.index !== currentWeaponIndex) {
                    currentWeaponIndex = slot.index;
                }
                return;
            }
        }

        // Check pickup hitbox
        if (touchControls.pickupHitbox && nearbyWeapon) {
            var ph = touchControls.pickupHitbox;
            if (x >= ph.x && x <= ph.x + ph.w && y >= ph.y && y <= ph.y + ph.h) {
                input.pickupWeapon = true;
                setTimeout(function() { input.pickupWeapon = false; }, 100);
                return;
            }
        }

        // Check shoot button
        var sb = touchControls.shootButton;
        var distToShoot = Math.hypot(x - sb.x, y - sb.y);
        if (distToShoot < sb.radius) {
            sb.active = true;
            sb.touchId = touch.identifier;
            input.shoot = true;
            continue;
        }

        // Left half = movement stick, Right half = look stick
        if (x < sw / 2) {
            if (!touchControls.leftStick.active) {
                touchControls.leftStick.active = true;
                touchControls.leftStick.touchId = touch.identifier;
                touchControls.leftStick.startX = x;
                touchControls.leftStick.startY = y;
                touchControls.leftStick.currentX = x;
                touchControls.leftStick.currentY = y;
            }
        } else {
            if (!touchControls.rightStick.active) {
                touchControls.rightStick.active = true;
                touchControls.rightStick.touchId = touch.identifier;
                touchControls.rightStick.startX = x;
                touchControls.rightStick.startY = y;
                touchControls.rightStick.currentX = x;
                touchControls.rightStick.currentY = y;
            }
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];

        if (touchControls.leftStick.active && touch.identifier === touchControls.leftStick.touchId) {
            touchControls.leftStick.currentX = touch.clientX;
            touchControls.leftStick.currentY = touch.clientY;
        }
        if (touchControls.rightStick.active && touch.identifier === touchControls.rightStick.touchId) {
            touchControls.rightStick.currentX = touch.clientX;
            touchControls.rightStick.currentY = touch.clientY;
        }
    }
}

function handleTouchEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];

        if (touchControls.leftStick.touchId === touch.identifier) {
            touchControls.leftStick.active = false;
            touchControls.leftStick.touchId = null;
            input.moveX = 0;
            input.moveY = 0;
        }
        if (touchControls.rightStick.touchId === touch.identifier) {
            touchControls.rightStick.active = false;
            touchControls.rightStick.touchId = null;
        }
        if (touchControls.shootButton.touchId === touch.identifier) {
            touchControls.shootButton.active = false;
            touchControls.shootButton.touchId = null;
            input.shoot = false;
        }
    }
}

function updateTouchInput() {
    if (!touchControls.enabled) return;

    var ls = touchControls.leftStick;
    var rs = touchControls.rightStick;
    var r = touchControls.stickRadius;
    var dz = touchControls.stickDeadzone;

    // Left stick - movement
    if (ls.active) {
        var dx = ls.currentX - ls.startX;
        var dy = ls.currentY - ls.startY;
        var dist = Math.hypot(dx, dy);
        if (dist > dz) {
            var norm = Math.min(dist, r) / r;
            input.moveX = (dx / dist) * norm;
            input.moveY = (dy / dist) * norm;
        } else {
            input.moveX = 0;
            input.moveY = 0;
        }
    }

    // Right stick - look
    if (rs.active) {
        var dx = rs.currentX - rs.startX;
        var dy = rs.currentY - rs.startY;
        var dist = Math.hypot(dx, dy);
        if (dist > dz) {
            var sensitivity = 0.003;
            camera.angle += dx * sensitivity;
            camera.pitch -= dy * sensitivity * 0.5;
            camera.pitch = Math.max(-1.2, Math.min(1.2, camera.pitch));
            rs.startX = rs.currentX;
            rs.startY = rs.currentY;
        }
    }
}
