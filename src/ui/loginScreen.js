// ===============================
// Login Screen
// ===============================
"use strict";

var LoginScreen = (function () {

    var _onComplete = null;  // callback(isAnonymous)
    var _bound = false;

    function show(onComplete) {
        _onComplete = onComplete;
        var el = document.getElementById("login-screen");
        if (el) el.style.display = "flex";
        if (!_bound) {
            _bound = true;
            bindEvents();
        }
    }

    function hide() {
        var el = document.getElementById("login-screen");
        if (el) el.style.display = "none";
    }

    function setStatus(msg, isError) {
        var el = document.getElementById("login-status");
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? "#e05050" : "#60c080";
    }

    function bindEvents() {
        // Back to mode menu
        document.getElementById("login-back-btn").addEventListener("click", function () {
            hide();
            ModeMenu.show();
        });

        // Anonymous login
        document.getElementById("login-anon-btn").addEventListener("click", function () {
            handleAnon();
        });

        // Username/password login form
        document.getElementById("login-pw-btn").addEventListener("click", function () {
            handleUsernameLogin();
        });

        // Enter key on password field
        document.getElementById("login-password").addEventListener("keydown", function (e) {
            if (e.key === "Enter") handleUsernameLogin();
        });

        // Steam (placeholder)
        document.getElementById("login-steam-btn").addEventListener("click", function () {
            setStatus("Steam login is not yet available.", true);
        });
    }

    async function handleAnon() {
        setStatus("Connecting anonymously...", false);
        try {
            await NakamaClient.loginAnonymous();
            hide();
            if (_onComplete) _onComplete(true);  // isAnonymous = true
        } catch (e) {
            console.error("Anon login failed:", e);
            setStatus("Could not connect to server. Is it running?", true);
        }
    }

    async function handleUsernameLogin() {
        var username = (document.getElementById("login-username") || {}).value || "";
        var password = (document.getElementById("login-password") || {}).value || "";

        username = username.trim();
        if (!username || !password) {
            setStatus("Enter a username and password.", true);
            return;
        }
        if (password.length < 8) {
            setStatus("Password must be at least 8 characters.", true);
            return;
        }

        setStatus("Connecting...", false);
        try {
            await NakamaClient.loginUsername(username, password);
            hide();
            if (_onComplete) _onComplete(false);  // isAnonymous = false
        } catch (e) {
            console.error("Login failed:", e);
            setStatus("Login failed. Check credentials or server connection.", true);
        }
    }

    return { show: show, hide: hide };

})();
