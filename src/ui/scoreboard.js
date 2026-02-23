// ===============================
// Scoreboard (Tab key)
// ===============================
"use strict";

function DrawScoreboard() {
    if (!showScoreboard) return;

    var ctx = screendata.context;
    if (!ctx) return;

    var W = screendata.canvas.width;
    var H = screendata.canvas.height;

    // Build player list
    var now = Date.now();
    var myId = NakamaClient.getUserId();
    var rows = [];

    // Self
    rows.push({
        username: NakamaClient.getUsername() || 'You',
        kills:    nakamaState.myKills,
        ping:     nakamaState.myPing,
        isSelf:   true
    });

    // Remote players
    var rpIds = Object.keys(nakamaState.remotePlayers);
    for (var i = 0; i < rpIds.length; i++) {
        var rp = nakamaState.remotePlayers[rpIds[i]];
        if (!rp || now - rp.lastSeen > 5000) continue;
        rows.push({
            username: rp.username || '?',
            kills:    rp.kills  || 0,
            ping:     rp.ping   != null ? rp.ping : null,
            isSelf:   false
        });
    }

    // Sort by kills descending, self always on top
    rows.sort(function(a, b) {
        if (a.isSelf) return -1;
        if (b.isSelf) return  1;
        return (b.kills || 0) - (a.kills || 0);
    });

    // Panel size
    var rowH   = 24;
    var panelW = 420;
    var panelH = 72 + rows.length * rowH + 20;
    var px = Math.floor((W - panelW) / 2);
    var py = Math.floor((H - panelH) / 2);

    // Background
    ctx.save();
    ctx.fillStyle = 'rgba(8,15,22,0.92)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = 'rgba(80,160,220,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, panelW, panelH);

    // Title
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = '#5a90b0';
    ctx.textAlign = 'center';
    ctx.fillText('SCOREBOARD', px + panelW / 2, py + 22);

    // Column positions
    var nameX  = px + 16;
    var killX  = px + panelW - 90;
    var pingX  = px + panelW - 16;
    var headY  = py + 48;

    // Column headers
    ctx.font = '10px Arial';
    ctx.fillStyle = 'rgba(138,176,200,0.45)';
    ctx.textAlign = 'left';
    ctx.fillText('PLAYER', nameX, headY);
    ctx.textAlign = 'right';
    ctx.fillText('KILLS', killX, headY);
    ctx.fillText('PING', pingX, headY);

    // Divider
    ctx.strokeStyle = 'rgba(80,160,220,0.15)';
    ctx.beginPath();
    ctx.moveTo(px + 8, headY + 5);
    ctx.lineTo(px + panelW - 8, headY + 5);
    ctx.stroke();

    // Rows
    for (var r = 0; r < rows.length; r++) {
        var p   = rows[r];
        var ry  = headY + 10 + (r + 1) * rowH;

        // Self highlight
        if (p.isSelf) {
            ctx.fillStyle = 'rgba(80,160,220,0.08)';
            ctx.fillRect(px + 4, ry - rowH + 6, panelW - 8, rowH);
        }

        // Name
        ctx.textAlign = 'left';
        ctx.font = p.isSelf ? 'bold 13px Arial' : '13px Arial';
        ctx.fillStyle = p.isSelf ? '#c0d8e8' : '#8ab0c8';
        ctx.fillText((p.isSelf ? '► ' : '   ') + p.username, nameX, ry);

        // Kills
        ctx.textAlign = 'right';
        ctx.font = '13px Arial';
        ctx.fillStyle = p.isSelf ? '#c0d8e8' : '#8ab0c8';
        ctx.fillText(String(p.kills || 0), killX, ry);

        // Ping
        var pingStr, pingColor;
        if (p.ping === null || p.ping === undefined) {
            pingStr  = '-';
            pingColor = '#555555';
        } else {
            pingStr  = p.ping + ' ms';
            pingColor = p.ping < 80  ? '#44cc44' :
                        p.ping < 160 ? '#ccaa22' : '#cc3333';
        }
        ctx.fillStyle = pingColor;
        ctx.fillText(pingStr, pingX, ry);
    }

    // Footer
    ctx.fillStyle = 'rgba(138,176,200,0.3)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('hold TAB to view', px + panelW / 2, py + panelH - 6);

    ctx.restore();
}
