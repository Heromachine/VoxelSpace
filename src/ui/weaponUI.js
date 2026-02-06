// ===============================
// Weapon UI - Ammo display and weapon slots
// ===============================
"use strict";

function DrawWeaponUI(ctx) {
    var scale = uiScale.weaponUI;
    var sw = screendata.canvas.width;
    var sh = screendata.canvas.height;

    // Clear weapon slot hitboxes
    touchControls.weaponSlots = [];

    // Weapon slots display (bottom right, above healthbar)
    var slotSize = Math.floor(50 * scale);
    var slotGap = Math.floor(10 * scale);
    var slotY = sh - Math.floor(80 * scale);

    for (var i = 0; i < playerWeapons.length; i++) {
        var slot = playerWeapons[i];
        var weapon = weapons[slot.type];
        var slotX = sw - ((playerWeapons.length - i) * (slotSize + slotGap));

        var isActive = (i === currentWeaponIndex);

        // Store hitbox for touch detection
        touchControls.weaponSlots.push({
            x: slotX, y: slotY,
            w: slotSize, h: slotSize,
            index: i
        });

        // Draw slot background
        ctx.fillStyle = isActive ? weapon.bgColor : 'rgba(50,50,50,0.8)';
        ctx.fillRect(slotX, slotY, slotSize, slotSize);

        // Draw slot border
        ctx.strokeStyle = isActive ? weapon.color : '#666';
        ctx.lineWidth = isActive ? 3 : 1;
        ctx.strokeRect(slotX, slotY, slotSize, slotSize);

        // Draw weapon letter
        ctx.fillStyle = isActive ? 'white' : '#888';
        ctx.font = 'bold ' + Math.floor(24 * scale) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(weapon.letter, slotX + slotSize/2, slotY + slotSize/2 + Math.floor(8 * scale));

        // Draw ammo count
        ctx.font = Math.floor(12 * scale) + 'px Arial';
        var ammoText = slot.ammo === Infinity ? '\u221E' : slot.ammo.toString();
        ctx.fillStyle = slot.isReloading ? '#ff6666' : 'white';
        ctx.fillText(ammoText, slotX + slotSize/2, slotY + slotSize - Math.floor(5 * scale));
    }

    ctx.textAlign = 'left';

    // Show pickup prompt if near a weapon
    if (nearbyWeapon) {
        var weaponDef = weapons[nearbyWeapon.type];
        var promptY = slotY - Math.floor(40 * scale);
        var promptX = sw - Math.floor(200 * scale);

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        var promptW = Math.floor(180 * scale);
        var promptH = Math.floor(30 * scale);
        ctx.fillRect(promptX, promptY, promptW, promptH);

        ctx.strokeStyle = weaponDef.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(promptX, promptY, promptW, promptH);

        ctx.fillStyle = 'white';
        ctx.font = Math.floor(14 * scale) + 'px Arial';
        ctx.fillText('[E] Pick up ' + weaponDef.name, promptX + Math.floor(10 * scale), promptY + Math.floor(20 * scale));

        // Store pickup hitbox for touch
        touchControls.pickupHitbox = {
            x: promptX, y: promptY,
            w: promptW, h: promptH
        };
    } else {
        touchControls.pickupHitbox = null;
    }
}
