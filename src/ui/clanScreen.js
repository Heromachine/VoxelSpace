// ===============================
// Clan Selection Screen
// ===============================
"use strict";

var ClanScreen = (function () {

    var CLANS = [
        {
            id:    "iron_ravens",
            name:  "Iron Ravens",
            color: "#4a90d9",
            desc:  "Disciplined and strategic. Masters of long range and coordinated strikes."
        },
        {
            id:    "ember_tide",
            name:  "Ember Tide",
            color: "#d9643a",
            desc:  "Aggressive and relentless. Close-quarters specialists who never retreat."
        },
        {
            id:    "silent_root",
            name:  "Silent Root",
            color: "#3a8a4a",
            desc:  "Patient and elusive. Snipers and survivors who outlast everyone else."
        }
    ];

    var _onComplete  = null;  // callback(clanId)
    var _isAnonymous = false;

    function show(isAnonymous, onComplete) {
        _isAnonymous = isAnonymous;
        _onComplete  = onComplete;

        var el = document.getElementById("clan-screen");
        if (el) el.style.display = "flex";

        buildCards();
    }

    function hide() {
        var el = document.getElementById("clan-screen");
        if (el) el.style.display = "none";
    }

    function buildCards() {
        var container = document.getElementById("clan-cards");
        if (!container) return;
        container.innerHTML = "";

        CLANS.forEach(function (clan) {
            var card = document.createElement("div");
            card.className = "clan-card";
            card.style.borderColor = clan.color + "44";
            card.innerHTML =
                '<div class="clan-num" style="color:' + clan.color + '44">◆</div>' +
                '<div class="clan-name" style="color:' + clan.color + '">' + clan.name + '</div>' +
                '<p class="clan-desc">' + clan.desc + '</p>' +
                '<span class="clan-badge">Choose</span>';

            card.addEventListener("click", function () {
                selectClan(clan.id);
            });

            card.addEventListener("mouseenter", function () {
                card.style.background = "rgba(40,80,120,0.12)";
                card.style.borderColor = clan.color + "55";
            });
            card.addEventListener("mouseleave", function () {
                card.style.background = "rgba(255,255,255,0.03)";
                card.style.borderColor = clan.color + "44";
            });

            container.appendChild(card);
        });
    }

    async function selectClan(clanId) {
        nakamaState.myClan = clanId;

        // Persist to Nakama storage (skip for anonymous)
        if (!_isAnonymous) {
            var saved = await NakamaClient.readPlayerData() || {};
            saved.clan = clanId;
            await NakamaClient.writePlayerData(saved);
        }

        hide();
        if (_onComplete) _onComplete(clanId);
    }

    return { show: show, hide: hide };

})();
