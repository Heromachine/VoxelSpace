// ===============================
// Weapon UI — DOM-based (crisp at any resolution)
//
// Weapon slots and pickup prompt are HTML elements so they render
// at full CSS pixel resolution regardless of the game canvas scale.
// ===============================
"use strict";

function DrawWeaponUI(ctx) {
    var scale = uiScale.weaponUI;

    // ── Weapon slots ──────────────────────────────────────────
    var slotsEl = document.getElementById('weapon-slots-ui');
    if (!slotsEl) return;

    touchControls.weaponSlots = [];

    // Apply uiScale to slot and gap sizes
    var slotPx = Math.round(50 * scale);
    slotsEl.style.gap = Math.round(10 * scale) + 'px';

    // Rebuild slot elements only when weapon count changes
    if (slotsEl.children.length !== playerWeapons.length) {
        slotsEl.innerHTML = '';
        for (var j = 0; j < playerWeapons.length; j++) {
            var div = document.createElement('div');
            div.className = 'ws-slot';
            div.innerHTML = '<span class="ws-letter"></span><span class="ws-ammo"></span>';
            slotsEl.appendChild(div);
        }
    }

    var slotEls = slotsEl.querySelectorAll('.ws-slot');
    for (var i = 0; i < playerWeapons.length; i++) {
        var slotData = playerWeapons[i];
        var weapon   = weapons[slotData.type];
        var isActive = (i === currentWeaponIndex);
        var el       = slotEls[i];
        if (!el) continue;

        // Size
        el.style.width  = slotPx + 'px';
        el.style.height = slotPx + 'px';

        // Border / background — weapon colour when active
        el.style.borderColor = isActive ? weapon.color   : 'rgba(80,160,220,0.2)';
        el.style.borderWidth = isActive ? '2px'          : '1px';
        el.style.background  = isActive ? weapon.bgColor : 'rgba(8,15,22,0.82)';

        var letterEl = el.querySelector('.ws-letter');
        var ammoEl   = el.querySelector('.ws-ammo');

        letterEl.textContent  = weapon.letter;
        letterEl.style.color  = isActive ? '#c0d8e8' : 'rgba(138,176,200,0.4)';
        letterEl.style.fontSize = Math.round(22 * scale) + 'px';

        var ammoText        = slotData.ammo === Infinity ? '\u221E' : String(slotData.ammo);
        ammoEl.textContent  = ammoText;
        ammoEl.style.color  = slotData.isReloading ? '#cc6666' : '#8ab0c8';
        ammoEl.style.fontSize = Math.round(10 * scale) + 'px';

        // Touch hitbox — CSS pixel coords match touch event clientX/clientY
        var rect = el.getBoundingClientRect();
        touchControls.weaponSlots.push({
            x: rect.left, y: rect.top,
            w: rect.width, h: rect.height,
            index: i
        });
    }

    // ── Pickup prompt ─────────────────────────────────────────
    var promptEl = document.getElementById('pickup-prompt');
    if (promptEl) {
        if (nearbyWeapon) {
            var weaponDef = weapons[nearbyWeapon.type];
            promptEl.textContent = '[E]  Pick up ' + weaponDef.name;
            promptEl.style.display = 'block';
            var pr = promptEl.getBoundingClientRect();
            touchControls.pickupHitbox = {
                x: pr.left, y: pr.top,
                w: pr.width, h: pr.height
            };
        } else {
            promptEl.style.display  = 'none';
            touchControls.pickupHitbox = null;
        }
    }
}
