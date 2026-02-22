// ===============================
// Login Screen
// ===============================
"use strict";

var LoginScreen = (function () {

    var _onComplete = null;  // callback(isAnonymous)

    function show(onComplete) {
        _onComplete = onComplete;
        var el = document.getElementById("login-screen");
        if (el) el.style.display = "flex";
        bindEvents();
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
        // Anonymous login
        var anonBtn = document.getElementById("login-anon-btn");
        if (anonBtn) {
            anonBtn.addEventListener("click", function () {
                handleAnon();
            });
        }

        // Username/password login form
        var loginBtn = document.getElementById("login-pw-btn");
        if (loginBtn) {
            loginBtn.addEventListener("click", function () {
                handleUsernameLogin();
            });
        }

        // Enter key on password field
        var pwField = document.getElementById("login-password");
        if (pwField) {
            pwField.addEventListener("keydown", function (e) {
                if (e.key === "Enter") handleUsernameLogin();
            });
        }

        // Steam (placeholder)
        var steamBtn = document.getElementById("login-steam-btn");
        if (steamBtn) {
            steamBtn.addEventListener("click", function () {
                setStatus("Steam login is not yet available.", true);
            });
        }
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
