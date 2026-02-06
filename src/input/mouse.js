// ===============================
// Mouse Input Handlers
// ===============================
"use strict";

function DetectMouseDown(e){
    if(e.button===0) input.shoot=true;
    if(e.button===2) input.aimToggled = !input.aimToggled; // Right-click toggles ADS
}

function DetectMouseUp(e){
    if(e.button===0) input.shoot=false;
    // ADS is now toggle, no action on mouse up
}

function DetectMouseMove(e){
    camera.angle=(camera.angle-e.movementX*0.002)%(2*Math.PI);
    if(camera.angle<0)camera.angle+=2*Math.PI;
    camera.horizon=Math.max(-400,Math.min(600,camera.horizon-e.movementY*0.2));
}

function DetectMouseWheel(e){
    // Only handle zoom when ADS with sniper scope
    var currentSlot = playerWeapons[currentWeaponIndex];
    var currentWeapon = weapons[currentSlot.type];
    if(input.aimToggled && currentWeapon.useScope && activeScope){
        e.preventDefault();
        activeScope.handleZoom(e.deltaY);
    }
}
