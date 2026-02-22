// ===============================
// Keyboard Input Handlers
// ===============================
"use strict";

function DetectKeysDown(e){
    switch(e.keyCode){
        case 87:input.forward=true;break;
        case 83:input.backward=true;break;
        case 65:input.left=true;break;
        case 68:input.right=true;break;
        case 32:input.jump=true;break;
        case 16:input.sprint=true;break;
        case 67:input.crouch=true;break;
        case 82:input.reload=true;break;
        case 81:input.swapWeapon=true;break;
        case 69:input.pickupWeapon=true;break;
        case 90: // Z - cycle zoom presets (admin only)
            if(!isAdmin) break;
            var zoomPresets=[20,50,100,200,300];
            var idx=zoomPresets.indexOf(minimapZoomRange);
            minimapZoomRange=zoomPresets[(idx+1)%zoomPresets.length];
            document.getElementById('minimapZoomRange').value=minimapZoomRange;
            document.getElementById('minimapZoomRange-value').innerText=minimapZoomRange;
            var sidePresets=[20,50,100,200,300,500];
            var sidx=sidePresets.indexOf(sideViewZoomRange);
            sideViewZoomRange=sidePresets[(sidx+1)%sidePresets.length];
            document.getElementById('sideViewZoomRange').value=sideViewZoomRange;
            document.getElementById('sideViewZoomRange-value').innerText=sideViewZoomRange;
            break;
        case 84:if(isAdmin)positionTestTarget();break; // T - reposition target (admin only)
        case 71:if(isAdmin)testTarget.enabled=!testTarget.enabled;break; // G - toggle target (admin only)
        case 27: // ESC - toggle settings panel (admin only)
            if(!isAdmin) break;
            var ctrl=document.getElementById('controls');
            ctrl.style.display=ctrl.style.display==='none'?'block':'none';
            break;
        case 9: // Tab — show scoreboard
            e.preventDefault();
            showScoreboard = true;
            break;
    }
    if(!updaterunning){time=Date.now();Draw();}
}

function DetectKeysUp(e){
    switch(e.keyCode){
        case 87:input.forward=false;break;
        case 83:input.backward=false;break;
        case 65:input.left=false;break;
        case 68:input.right=false;break;
        case 32:input.jump=false;break;
        case 16:input.sprint=false;break;
        case 67:input.crouch=false;break;
        case 82:input.reload=false;break;
        case 81:input.swapWeapon=false;break;
        case 69:input.pickupWeapon=false;break;
        case 9:
            showScoreboard = false;
            break;
    }
}
