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
                // Multiplayer: login → clan → game
                // Future: insert game mode selection screen after clan selection
                StartMultiplayer();
            });
        }

        var adminBtn = document.getElementById('mode-admin');
        if (adminBtn) {
            adminBtn.addEventListener('click', function () {
                hide();
                // Admin: login to verify identity, then start single-player with dev tools
                LoginScreen.show(function () {
                    beginAdminGame();
                });
            });
        }
    }

    return { show: show, hide: hide };

}());
