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
    var r  = touchControls.stickRadius;

    // Left stick (move) – bottom-left
    touchControls.leftStickPos  = { x: r + 30, y: sh - r - 80 };
    // Right stick (look) – floats wherever thumb lands; resting position is center-right
    touchControls.rightStickPos = { x: sw - r - 140, y: sh - r - 80 };

    // FIRE – large button, far right, easy right-thumb reach
    touchControls.shootButton.x      = sw - 90;
    touchControls.shootButton.y      = sh - 110;
    touchControls.shootButton.radius = 45;

    // JUMP – left side, to the right of the move stick, same row
    touchControls.jumpButton.x      = r + 30 + 110;  // ~190px from left
    touchControls.jumpButton.y      = sh - 110;
    touchControls.jumpButton.radius = 32;

    // SWAP WEAPON – right side, lower corner
    touchControls.swapButton.x      = sw - 200;
    touchControls.swapButton.y      = sh - 65;
    touchControls.swapButton.radius = 28;
}

function handleTouchStart(e) {
    e.preventDefault();
    if (!touchControls.enabled) enableTouchControls();

    for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];
        var x = touch.clientX;
        var y = touch.clientY;
        var sw = screendata.canvas.width;
        var sh = screendata.canvas.height;

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

        // FIRE button
        var sb = touchControls.shootButton;
        if (Math.hypot(x - sb.x, y - sb.y) < sb.radius) {
            sb.active = true;
            sb.touchId = touch.identifier;
            input.shoot = true;
            continue;
        }

        // JUMP button (hold to charge, release to jump)
        var jb = touchControls.jumpButton;
        if (Math.hypot(x - jb.x, y - jb.y) < jb.radius) {
            jb.active = true;
            jb.touchId = touch.identifier;
            input.jump = true;
            continue;
        }

        // SWAP WEAPON button
        var wb = touchControls.swapButton;
        if (Math.hypot(x - wb.x, y - wb.y) < wb.radius) {
            wb.active = true;
            wb.touchId = touch.identifier;
            input.swapWeapon = true;
            continue;
        }

        // Double-tap center of screen = toggle ADS (iron sights)
        var centerLeft  = sw * 0.3;
        var centerRight = sw * 0.7;
        if (x >= centerLeft && x <= centerRight) {
            var now = Date.now();
            if (now - touchControls.lastCenterTapTime < 350) {
                input.aimToggled = !input.aimToggled;
                touchControls.lastCenterTapTime = 0; // reset so triple-tap doesn't re-toggle
            } else {
                touchControls.lastCenterTapTime = now;
            }
        }

        // Left half = movement stick, right half = look stick
        if (x < sw / 2) {
            if (!touchControls.leftStick.active) {
                touchControls.leftStick.active  = true;
                touchControls.leftStick.touchId = touch.identifier;
                touchControls.leftStick.startX  = x;
                touchControls.leftStick.startY  = y;
                touchControls.leftStick.currentX = x;
                touchControls.leftStick.currentY = y;
            }
        } else {
            if (!touchControls.rightStick.active) {
                touchControls.rightStick.active  = true;
                touchControls.rightStick.touchId = touch.identifier;
                touchControls.rightStick.startX  = x;
                touchControls.rightStick.startY  = y;
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
            touchControls.leftStick.active  = false;
            touchControls.leftStick.touchId = null;
            input.moveX = 0;
            input.moveY = 0;
        }
        if (touchControls.rightStick.touchId === touch.identifier) {
            touchControls.rightStick.active  = false;
            touchControls.rightStick.touchId = null;
        }
        if (touchControls.shootButton.touchId === touch.identifier) {
            touchControls.shootButton.active  = false;
            touchControls.shootButton.touchId = null;
            input.shoot = false;
        }
        if (touchControls.jumpButton.touchId === touch.identifier) {
            touchControls.jumpButton.active  = false;
            touchControls.jumpButton.touchId = null;
            input.jump = false;  // release triggers the jump
        }
        if (touchControls.swapButton.touchId === touch.identifier) {
            touchControls.swapButton.active  = false;
            touchControls.swapButton.touchId = null;
        }
    }
}

function updateTouchInput() {
    if (!touchControls.enabled) return;

    var ls = touchControls.leftStick;
    var rs = touchControls.rightStick;
    var r  = touchControls.stickRadius;
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

    // Right stick - look (horizontal = angle, vertical = horizon)
    if (rs.active) {
        var dx = rs.currentX - rs.startX;
        var dy = rs.currentY - rs.startY;
        var dist = Math.hypot(dx, dy);
        if (dist > dz) {
            camera.angle += dx * 0.003;
            camera.horizon = Math.max(-400, Math.min(600, camera.horizon - dy * 0.5));
            rs.startX = rs.currentX;
            rs.startY = rs.currentY;
        }
    }
}
