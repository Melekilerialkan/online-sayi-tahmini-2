const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

const htmlContent = `
<!DOCTYPE html>
<html lang="tr" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Çevrimiçi Sayı Tahmin Oyunu</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root[data-theme="dark"] {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --primary: #818cf8;
            --primary-hover: #6366f1;
            --accent: #f43f5e;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
            --success: #10b981;
            --plus-color: #34d399;
            --minus-color: #f87171;
            --box-bg: #0f172a;
            --history-bg: #1e293b;
        }

        :root[data-theme="light"] {
            --bg-color: #f1f5f9;
            --card-bg: #ffffff;
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --accent: #e11d48;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --success: #10b981;
            --plus-color: #059669;
            --minus-color: #dc2626;
            --box-bg: #f8fafc;
            --history-bg: #f8fafc;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Poppins', sans-serif; transition: background 0.3s, color 0.3s, border-color 0.3s; }

        body {
            background-color: var(--bg-color);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 16px;
        }

        .container {
            width: 100%;
            max-width: 620px;
            background: var(--card-bg);
            border-radius: 24px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
            padding: 24px;
            position: relative;
        }

        .theme-toggle {
            position: absolute;
            top: 24px;
            right: 24px;
            background: var(--box-bg);
            border: 1px solid var(--border);
            color: var(--text-main);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            width: auto;
            margin: 0;
        }
        .theme-toggle:hover { background: var(--border); }

        h1 { font-size: 1.5rem; text-align: center; margin-bottom: 4px; color: var(--text-main); }
        .subtitle { text-align: center; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; }

        .screen { display: none; }
        .screen.active { display: block; }

        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 0.85rem; font-weight: 500; margin-bottom: 6px; color: var(--text-muted); }

        input {
            width: 100%;
            padding: 12px 16px;
            font-size: 1rem;
            border: 2px solid var(--border);
            border-radius: 12px;
            outline: none;
            background: var(--box-bg);
            color: var(--text-main);
            text-align: center;
        }
        input:focus { border-color: var(--primary); }

        button {
            width: 100%;
            padding: 12px;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 6px;
        }
        button:hover { background-color: var(--primary-hover); }
        button:active { transform: scale(0.98); }

        .rules-box {
            background: var(--box-bg);
            border-radius: 12px;
            padding: 14px;
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-bottom: 20px;
            line-height: 1.5;
            border: 1px solid var(--border);
        }
        .rules-box ul { padding-left: 16px; margin-top: 4px; }

        .error-msg { color: var(--accent); font-size: 0.75rem; margin-top: 4px; text-align: center; min-height: 16px; }

        .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--box-bg);
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 0.85rem;
            margin-bottom: 12px;
            border: 1px solid var(--border);
        }

        /* Gizli Sayım Paneli */
        .my-secret-box {
            background: var(--box-bg);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 8px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
            margin-bottom: 12px;
        }
        .my-secret-code {
            font-weight: 700;
            letter-spacing: 2px;
            color: var(--primary);
            filter: blur(5px);
            cursor: pointer;
            user-select: none;
            transition: filter 0.2s;
        }
        .my-secret-code.revealed {
            filter: blur(0);
        }
        .reveal-hint {
            font-size: 0.7rem;
            color: var(--text-muted);
        }

        /* Rakam Not Alma Paneli (0-9) */
        .tracker-section {
            background: var(--box-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 10px;
            margin-bottom: 12px;
            text-align: center;
        }
        .tracker-title {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        .tracker-grid {
            display: flex;
            justify-content: center;
            gap: 6px;
            flex-wrap: wrap;
        }
        .tracker-btn {
            width: 32px;
            height: 36px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--card-bg);
            color: var(--text-main);
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 0;
        }
        .tracker-btn.state-yes { background: rgba(52, 211, 153, 0.25); border-color: var(--plus-color); color: var(--plus-color); }
        .tracker-btn.state-no { background: rgba(248, 113, 113, 0.2); border-color: var(--minus-color); color: var(--minus-color); text-decoration: line-through; opacity: 0.6; }

        .boards-container {
            display: flex;
            gap: 10px;
        }

        .board-column {
            flex: 1;
            background: var(--box-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 10px;
            max-height: 180px;
            display: flex;
            flex-direction: column;
        }

        .board-title {
            font-size: 0.75rem;
            font-weight: 600;
            text-align: center;
            color: var(--text-muted);
            margin-bottom: 6px;
            text-transform: uppercase;
        }

        .history-list {
            overflow-y: auto;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .history-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 8px;
            background: var(--history-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 0.85rem;
        }

        .badges { display: flex; gap: 4px; }
        .badge-plus { background: rgba(52, 211, 153, 0.2); color: var(--plus-color); padding: 2px 5px; border-radius: 4px; font-weight: 600; font-size: 0.7rem; }
        .badge-minus { background: rgba(248, 113, 113, 0.2); color: var(--minus-color); padding: 2px 5px; border-radius: 4px; font-weight: 600; font-size: 0.7rem; }

        .waiting-box { text-align: center; padding: 20px 0; color: var(--text-muted); }
        .code-share-box {
            display: flex;
            gap: 8px;
            margin-top: 10px;
        }
        .code-display {
            flex-grow: 1;
            background: var(--box-bg);
            border: 1px solid var(--border);
            padding: 10px;
            border-radius: 8px;
            font-size: 1.1rem;
            font-weight: 700;
            letter-spacing: 2px;
            text-align: center;
            color: var(--primary);
        }
        .btn-copy {
            width: auto;
            padding: 0 16px;
            margin-top: 0;
            background: var(--border);
            color: var(--text-main);
        }
        .btn-copy:hover { background: var(--text-muted); color: white; }
    </style>
</head>
<body>

    <div class="container">
        <button class="theme-toggle" id="btn-theme-toggle">☀️ Açık Mod</button>

        <!-- 1. GİRİŞ EKRANI -->
        <div id="screen-welcome" class="screen active">
            <h1>Sayı Tahmin Oyunu</h1>
            <p class="subtitle">Çevrimiçi İki Kişilik Düello</p>

            <div class="rules-box">
                <strong>Oyun Kuralları:</strong>
                <ul>
                    <li>Gizli 4 basamaklı, rakamları birbirinden farklı bir sayı belirle.</li>
                    <li>Sırayla birbirinizin sayısını bulmaya çalışın.</li>
                    <li>Doğru basamak ve sayı: <strong>+1</strong> | Yanlış yer: <strong>-1</strong></li>
                    <li>İlk bilen oyunu kazanır!</li>
                </ul>
            </div>

            <div class="form-group">
                <label for="username">Oyuncu Adın</label>
                <input type="text" id="username" placeholder="Adını gir..." maxlength="15">
                <div id="welcome-error" class="error-msg"></div>
            </div>

            <button id="btn-create-room">Oda Kur</button>
            <div style="text-align: center; margin: 10px 0; font-size: 0.8rem; color: var(--text-muted);">veya</div>
            <button id="btn-join-toggle" style="background: var(--border); color: var(--text-main);">Oda Kodu ile Katıl</button>

            <div id="join-section" style="display: none; margin-top: 14px;">
                <input type="text" id="room-code-input" placeholder="Oda Kodunu Gir..." style="margin-bottom: 6px; text-transform: uppercase;">
                <button id="btn-join-room" style="background: var(--success);">Oyuna Bağlan</button>
            </div>
        </div>

        <!-- 2. RAKAM BELİRLEME EKRANI -->
        <div id="screen-setup" class="screen">
            <h1>Gizli Sayını Seç</h1>
            <p class="subtitle" id="setup-subtitle">Rakibin bekleniyor...</p>

            <div class="form-group" style="margin-top: 20px;">
                <label for="secret-input">4 Basamaklı Gizli Sayın</label>
                <input type="password" id="secret-input" maxlength="4" placeholder="••••" inputmode="numeric">
                <div id="setup-error" class="error-msg"></div>
            </div>
            <button id="btn-lock-secret" disabled>Sayımı Kilitle</button>
        </div>

        <!-- 3. BEKLEME EKRANI -->
        <div id="screen-waiting" class="screen">
            <div class="waiting-box">
                <h2>Oda Kuruldu! 🎮</h2>
                <p style="margin: 10px 0 4px 0; font-size: 0.85rem;">Bu oda kodunu arkadaşına gönder:</p>
                <div class="code-share-box">
                    <div class="code-display" id="room-code-text">------</div>
                    <button class="btn-copy" id="btn-copy-code">Kopyala</button>
                </div>
                <p style="margin-top: 20px; font-size: 0.8rem; color: var(--text-muted);">Arkadaşın kodu girip bağlanınca oyun otomatik başlayacak...</p>
            </div>
        </div>

        <!-- 4. OYUN EKRANI -->
        <div id="screen-game" class="screen">
            <h1>Düello Devam Ediyor</h1>
            <div class="game-header">
                <span id="turn-indicator">Sıra: ...</span>
                <span id="opponent-name">Rakip: ...</span>
            </div>

            <!-- Kendi Gizli Sayını Görme Kutusu -->
            <div class="my-secret-box">
                <span>Gizli Sayım: <strong id="my-secret-display" class="my-secret-code" title="Görmek için tıkla">----</strong></span>
                <span class="reveal-hint">(Görmek için üstüne tıkla)</span>
            </div>

            <!-- Rakam Not Alma Paneli (0-9) -->
            <div class="tracker-section">
                <div class="tracker-title">Rakam Notları (İşaretlemek için tıkla)</div>
                <div class="tracker-grid" id="tracker-grid"></div>
            </div>

            <div class="form-group">
                <input type="text" id="guess-input" maxlength="4" placeholder="4 basamaklı tahminin..." inputmode="numeric">
                <div id="game-error" class="error-msg"></div>
            </div>
            <button id="btn-make-guess">Tahmin Et</button>

            <div class="boards-container">
                <div class="board-column">
                    <div class="board-title">Senin Tahminlerin</div>
                    <div class="history-list" id="my-history">
                        <div style="text-align: center; color: var(--text-muted); font-size: 0.7rem; padding: 10px;">Henüz hamle yok</div>
                    </div>
                </div>
                <div class="board-column">
                    <div class="board-title" id="opp-board-title">Rakip Tahminleri</div>
                    <div class="history-list" id="opp-history">
                        <div style="text-align: center; color: var(--text-muted); font-size: 0.7rem; padding: 10px;">Henüz hamle yok</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 5. BİTİŞ EKRANI -->
        <div id="screen-win" class="screen" style="text-align: center; padding: 20px 0;">
            <h2 id="win-title" style="font-size: 1.75rem; color: var(--success); margin-bottom: 8px;">Oyun Bitti!</h2>
            <p id="win-desc" style="color: var(--text-muted); margin-bottom: 20px;"></p>
            <button onclick="location.reload()">Yeniden Oyna</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let myName = "";
        let currentRoomId = "";
        let isMyTurn = false;
        let mySecretCode = ""; // Kendi gizli sayımızı saklamak için

        // Tema Değiştirme Mantığı
        const themeToggleBtn = document.getElementById('btn-theme-toggle');
        const htmlElement = document.documentElement;

        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                htmlElement.setAttribute('data-theme', 'light');
                themeToggleBtn.textContent = "🌙 Koyu Mod";
            } else {
                htmlElement.setAttribute('data-theme', 'dark');
                themeToggleBtn.textContent = "☀️ Açık Mod";
            }
        });

        // Kendi gizli sayısını açıp kapama (blur efektini kaldırma)
        const mySecretDisplay = document.getElementById('my-secret-display');
        mySecretDisplay.addEventListener('click', () => {
            mySecretDisplay.classList.toggle('revealed');
        });

        // 0-9 Rakam Not Paneli Oluşturma
        const trackerGrid = document.getElementById('tracker-grid');
        for (let i = 0; i <= 9; i++) {
            const btn = document.createElement('button');
            btn.className = 'tracker-btn';
            btn.textContent = i;
            btn.dataset.state = '0'; // 0: Normal, 1: Kesin Var, 2: Kesin Yok
            
            btn.addEventListener('click', () => {
                let state = parseInt(btn.dataset.state);
                state = (state + 1) % 3;
                btn.dataset.state = state;
                
                btn.className = 'tracker-btn';
                if (state === 1) btn.classList.add('state-yes');
                if (state === 2) btn.classList.add('state-no');
            });
            trackerGrid.appendChild(btn);
        }

        const screens = {
            welcome: document.getElementById('screen-welcome'),
            setup: document.getElementById('screen-setup'),
            waiting: document.getElementById('screen-waiting'),
            game: document.getElementById('screen-game'),
            win: document.getElementById('screen-win')
        };

        function showScreen(name) {
            Object.values(screens).forEach(s => s.classList.remove('active'));
            screens[name].classList.add('active');
        }

        document.getElementById('btn-join-toggle').addEventListener('click', () => {
            const sec = document.getElementById('join-section');
            sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('btn-copy-code').addEventListener('click', () => {
            const code = document.getElementById('room-code-text').textContent;
            navigator.clipboard.writeText(code);
            const btn = document.getElementById('btn-copy-code');
            btn.textContent = "Kopyalandı!";
            setTimeout(() => btn.textContent = "Kopyala", 2000);
        });

        function validateNumber(str) {
            if (!/^\\d{4}$/.test(str)) return "Sayı tam 4 basamaklı olmalıdır.";
            if (new Set(str.split('')).size !== 4) return "Rakamlar birbirinden farklı olmalıdır.";
            return null;
        }

        document.getElementById('btn-create-room').addEventListener('click', () => {
            myName = document.getElementById('username').value.trim();
            if (!myName) {
                document.getElementById('welcome-error').textContent = "Lütfen adını gir.";
                return;
            }
            socket.emit('create-room', { name: myName });
        });

        document.getElementById('btn-join-room').addEventListener('click', () => {
            myName = document.getElementById('username').value.trim();
            const roomId = document.getElementById('room-code-input').value.trim().toUpperCase();
            if (!myName) {
                document.getElementById('welcome-error').textContent = "Lütfen adını gir.";
                return;
            }
            if (!roomId) {
                alert("Lütfen oda kodu gir.");
                return;
            }
            socket.emit('join-room', { roomId, name: myName });
        });

        socket.on('room-created', (roomId) => {
            currentRoomId = roomId;
            document.getElementById('room-code-text').textContent = roomId;
            showScreen('waiting');
        });

        socket.on('start-setup', (data) => {
            currentRoomId = data.roomId;
            showScreen('setup');
        });

        const secretInput = document.getElementById('secret-input');
        secretInput.addEventListener('input', () => {
            const err = validateNumber(secretInput.value.trim());
            document.getElementById('setup-error').textContent = err || "";
            document.getElementById('btn-lock-secret').disabled = !!err;
        });

        document.getElementById('btn-lock-secret').addEventListener('click', () => {
            const val = secretInput.value.trim();
            mySecretCode = val; // Kendi sayımızı hafızada tutuyoruz
            document.getElementById('my-secret-display').textContent = val;
            
            socket.emit('set-secret', { roomId: currentRoomId, secret: val });
            document.getElementById('setup-subtitle').textContent = "Rakibin gizli sayısını seçmesi bekleniyor...";
            secretInput.disabled = true;
            document.getElementById('btn-lock-secret').style.display = 'none';
        });

        socket.on('start-game', (data) => {
            document.getElementById('opponent-name').textContent = "Rakip: " + data.opponentName;
            document.getElementById('opp-board-title').textContent = data.opponentName + " Tahminleri";
            showScreen('game');
        });

        socket.on('update-turn', (data) => {
            isMyTurn = data.isMyTurn;
            document.getElementById('turn-indicator').textContent = isMyTurn ? "Sıra Sende! 🎯" : "Rakipte ⏳";
            document.getElementById('guess-input').disabled = !isMyTurn;
            document.getElementById('btn-make-guess').disabled = !isMyTurn;
        });

        document.getElementById('btn-make-guess').addEventListener('click', makeGuess);
        document.getElementById('guess-input').addEventListener('keypress', (e) => { if(e.key === 'Enter') makeGuess(); });

        function makeGuess() {
            if (!isMyTurn) return;
            const val = document.getElementById('guess-input').value.trim();
            const err = validateNumber(val);
            if (err) {
                document.getElementById('game-error').textContent = err;
                return;
            }
            document.getElementById('game-error').textContent = "";
            socket.emit('make-guess', { roomId: currentRoomId, guess: val });
            document.getElementById('guess-input').value = "";
        }

        socket.on('guess-result', (data) => {
            const isMe = data.playerName === myName;
            const listId = isMe ? 'my-history' : 'opp-history';
            const list = document.getElementById(listId);

            if(list.innerHTML.includes('Henüz hamle')) list.innerHTML = '';
            
            list.innerHTML = \`
                <div class="history-item">
                    <span><strong>\${data.guess}</strong></span>
                    <div class="badges">
                        <span class="badge-plus">+\${data.plus}</span>
                        <span class="badge-minus">-\${data.minus}</span>
                    </div>
                </div>
            \` + list.innerHTML;
        });

        socket.on('game-over', (data) => {
            document.getElementById('win-title').textContent = data.winner === myName ? "Kazandın! 🎉" : "Kaybettin! 😢";
            document.getElementById('win-desc').textContent = \`\${data.winner} rakibin gizli sayısını (\${data.secret}) doğru tahmin etti!\`;
            showScreen('win');
        });

        socket.on('error-msg', (msg) => {
            alert(msg);
        });
    </script>
</body>
</html>
`;

app.get('/', (req, res) => {
    res.send(htmlContent);
});

io.on('connection', (socket) => {
    socket.on('create-room', ({ name }) => {
        const roomId = uuidv4().substring(0, 5).toUpperCase();
        rooms[roomId] = {
            id: roomId,
            players: [{ id: socket.id, name, secret: null }],
            turnIndex: 0,
            status: 'setup'
        };
        socket.join(roomId);
        socket.emit('room-created', roomId);
    });

    socket.on('join-room', ({ roomId, name }) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('error-msg', "Oda bulunamadı!");
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('error-msg', "Oda dolu!");
            return;
        }

        room.players.push({ id: socket.id, name, secret: null });
        socket.join(roomId);

        io.to(roomId).emit('start-setup', { roomId });
    });

    socket.on('set-secret', ({ roomId, secret }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player) player.secret = secret;

        if (room.players.length === 2 && room.players.every(p => p.secret)) {
            room.status = 'playing';
            
            room.players.forEach((p, idx) => {
                const opponent = room.players[1 - idx];
                io.to(p.id).emit('start-game', { opponentName: opponent.name });
                io.to(p.id).emit('update-turn', { isMyTurn: room.turnIndex === idx });
            });
        }
    });

    socket.on('make-guess', ({ roomId, guess }) => {
        const room = rooms[roomId];
        if (!room || room.status !== 'playing') return;

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== room.turnIndex) return;

        const opponent = room.players[1 - playerIndex];
        const secretCode = opponent.secret;

        let plus = 0;
        let minus = 0;

        for (let i = 0; i < 4; i++) {
            if (guess[i] === secretCode[i]) {
                plus++;
            } else if (secretCode.includes(guess[i])) {
                minus++;
            }
        }

        io.to(roomId).emit('guess-result', {
            playerName: room.players[playerIndex].name,
            guess,
            plus,
            minus
        });

        if (plus === 4) {
            io.to(roomId).emit('game-over', {
                winner: room.players[playerIndex].name,
                secret: secretCode
            });
            room.status = 'ended';
            return;
        }

        room.turnIndex = 1 - room.turnIndex;
        room.players.forEach((p, idx) => {
            io.to(p.id).emit('update-turn', { isMyTurn: room.turnIndex === idx });
        });
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
