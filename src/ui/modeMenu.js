// ===============================
// Mode Menu — Single Player vs Multiplayer
// ===============================
"use strict";

var ModeMenu = (function () {

    var _bound = false;

    function show() {
        var el = document.getElementById('mode-menu');
        if (el) el.style.display = 'flex';
        if (!_bound) {
            _bound = true;
            bindEvents();
        }
    }

    function hide() {
        var el = document.getElementById('mode-menu');
        if (el) el.style.display = 'none';
    }

    function bindEvents() {
        var spBtn = document.getElementById('mode-sp');
        if (spBtn) {
            spBtn.addEventListener('click', function () {
                hide();
                // Single player: start game directly, no login
                Init();
                requestAnimationFrame(Draw);
            });
        }

        var mpBtn = document.getElementById('mode-mp');
        if (mpBtn) {
            mpBtn.addEventListener('click', function () {
                hide();
                // Multiplayer: go through login → clan → game
                StartMultiplayer();
            });
        }
    }

    return { show: show, hide: hide };

}());
