// ===============================
// Scope Manager - handles scope rendering modes
// ===============================
"use strict";

// Render sniper scope - uses modular scope system
function RenderSniperScope() {
    if (!activeScope) return;

    // Store main hiddeny reference for scope to restore
    var mainHiddeny = hiddeny;

    // Render functions to pass to scope module
    var renderFuncs = {
        DrawBackground: DrawBackground,
        RenderCube: RenderCube,
        Render: Render,
        RenderItems: RenderItems,
        RenderTestTarget: RenderTestTarget
    };

    // Call the active scope's render method
    activeScope.render(screendata, camera, renderFuncs, mainHiddeny);
}

// Switch between scope modes
function setScopeMode(mode) {
    scopeMode = mode;
    if (mode === 'forward') {
        activeScope = ScopeForwardPosition;
        document.getElementById('scopeModeForward').style.background = '#4CAF50';
        document.getElementById('scopeModeFocal').style.background = '#555';
        document.getElementById('scopeModeDesc').textContent = 'Camera moves forward (may clip through walls)';
    } else {
        activeScope = ScopeFocalLength;
        document.getElementById('scopeModeForward').style.background = '#555';
        document.getElementById('scopeModeFocal').style.background = '#4CAF50';
        document.getElementById('scopeModeDesc').textContent = 'Same position, focal length zoom (no wall clipping)';
    }
}
