// ===============================
// Dev Admin Login Screen
// Simplified login: username + password only.
// Auto-assigns clan, loads admin map directly.
// ===============================
"use strict";

var DevAdminLoginScreen = (function () {

    var _onComplete = null;
    var _bound      = false;

    function show(onComplete) {
        _onComplete = onComplete;
        var el = document.getElementById("dev-admin-login-screen");
        if (el) el.style.display = "flex";
        // Focus username field for fast entry
        setTimeout(function () {
            var u = document.getElementById("dev-admin-username");
            if (u) u.focus();
        }, 50);
        if (!_bound) {
            _bound = true;
            bindEvents();
        }
    }

    function hide() {
        var el = document.getElementById("dev-admin-login-screen");
        if (el) el.style.display = "none";
    }

    function setStatus(msg, isError) {
        var el = document.getElementById("dev-admin-status");
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? "#e05050" : "#60c080";
    }

    function bindEvents() {
        var loginBtn = document.getElementById("dev-admin-login-btn");
        if (loginBtn) {
            loginBtn.addEventListener("click", function () {
                handleLogin();
            });
        }

        var pwField = document.getElementById("dev-admin-password");
        if (pwField) {
            pwField.addEventListener("keydown", function (e) {
                if (e.key === "Enter") handleLogin();
            });
        }

        var unField = document.getElementById("dev-admin-username");
        if (unField) {
            unField.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    var pw = document.getElementById("dev-admin-password");
                    if (pw) pw.focus();
                }
            });
        }
    }

    async function handleLogin() {
        var username = (document.getElementById("dev-admin-username") || {}).value || "";
        var password = (document.getElementById("dev-admin-password") || {}).value || "";

        username = username.trim();
        if (!username || !password) {
            setStatus("Enter username and password.", true);
            return;
        }
        if (password.length < 8) {
            setStatus("Password must be at least 8 characters.", true);
            return;
        }

        setStatus("Authenticating...", false);
        try {
            await NakamaClient.loginUsername(username, password);
            hide();
            if (_onComplete) _onComplete();
        } catch (e) {
            console.error("Dev Admin login failed:", e);
            setStatus("Login failed. Check credentials or server connection.", true);
        }
    }

    return { show: show, hide: hide };

})();
