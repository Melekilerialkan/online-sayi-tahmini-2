const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Aktif odalar
const rooms = {};

// Ana sayfada tek dosyalık modern ve mobil uyumlu oyun arayüzünü sunuyoruz
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Çevrimiçi Sayı Tahmin Oyunu</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --accent: #f43f5e;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --success: #10b981;
            --plus-color: #059669;
            --minus-color: #dc2626;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Poppins', sans-serif; }

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
            max-width: 480px;
            background: var(--card-bg);
            border-radius: 24px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
            padding: 24px;
        }

        h1 { font-size: 1.5rem; text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; }

        .screen { display: none; }
        .screen.active { display: block; }

        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 0.85rem; font-weight: 500; margin-bottom: 6px; }

        input {
            width: 100%;
            padding: 12px 16px;
            font-size: 1rem;
            border: 2px solid var(--border);
            border-radius: 12px;
            outline: none;
            transition: border-color 0.2s;
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
            transition: background 0.2s, transform 0.1s;
            margin-top: 6px;
        }
        button:hover { background-color: var(--primary-hover); }
        button:active { transform: scale(0.98); }

        .rules-box {
            background: #f1f5f9;
            border-radius: 12px;
            padding: 14px;
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .rules-box ul { padding-left: 16px; margin-top: 4px; }

        .error-msg { color: var(--accent); font-size: 0.75rem; margin-top: 4px; text-align: center; min-height: 16px; }

        /* Oyun İçi */
        .game-header {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 0.85rem;
            margin-bottom: 16px;
        }

        .history-container {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 8px;
            margin-top: 12px;
        }

        .history-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            border-bottom: 1px solid var(--border);
            font-size: 0.9rem;
        }
        .history-item:last-child { border-bottom: none; }

        .badge-plus { background: #d1fae5; color: var(--plus-color); padding: 3px 6px; border-radius: 6px; font-weight: 600; font-size: 0.75rem; }
        .badge-minus { background: #fee2e2; color: var(--minus-color); padding: 3px 6px; border-radius: 6px; font-weight: 600; font-size: 0.75rem; }

        .waiting-box { text-align: center; padding: 30px 0; color: var(--text-muted); }
        .room-link-box { background: #f1f5f9; padding: 10px; border-radius: 8px; font-size: 0.75rem; word-break: break-all; margin-top: 10px; user-select: all; }
    </style>
</head>
<body>

    <div class="container">
        <!-- 1. GİRİŞ EKRANI -->
        <div id="screen-welcome" class="screen active">
            <h1>Sayı Tahmin Oyunu</h1>
            <p class="subtitle">Çevrimiçi İki Kişilik Düello</p>

            <div class="rules-box">
                <strong>Oyun Kuralları:</strong>
                <ul>
                    <li>Her oyuncu gizli 4 basamaklı, rakamları birbirinden farklı bir sayı belirler.</li>
                    <li>Sırayla birbirinizin sayısını tahmin etmeye çalışırsınız.</li>
                    <li>Doğru basamak ve doğru yer: <strong>+1</strong></li>
                    <li>Doğru rakam ama yanlış yer: <strong>-1</strong></li>
                    <li>İlk olarak rakibin sayısını tam bulan oyunu kazanır!</li>
                </ul>
            </div>

            <div class="form-group">
                <label for="username">Oyuncu Adınız</label>
                <input type="text" id="username" placeholder="Adınızı girin..." maxlength="15">
                <div id="welcome-error" class="error-msg"></div>
            </div>

            <button id="btn-create-room">Yeni Oda Kur</button>
            <div style="text-align: center; margin: 10px 0; font-size: 0.8rem; color: var(--text-muted);">veya</div>
            <button id="btn-join-toggle" style="background: var(--text-muted);">Odaya Katıl</button>

            <div id="join-section" style="display: none; margin-top: 14px;">
                <input type="text" id="room-code-input" placeholder="Oda Kodunu Girin..." style="margin-bottom: 6px;">
                <button id="btn-join-room" style="background: var(--success);">Oyuna Bağlan</button>
            </div>
        </div>

        <!-- 2. RAKAM BELİRLEME EKRANI -->
        <div id="screen-setup" class="screen">
            <h1>Gizli Sayını Belirle</h1>
            <p class="subtitle" id="setup-subtitle">Rakibini bekliyorsun...</p>

            <div class="form-group" style="margin-top: 20px;">
                <label for="secret-input">4 Basamaklı Gizli Sayın (Rakamları Farklı)</label>
                <input type="password" id="secret-input" maxlength="4" placeholder="••••" inputmode="numeric">
                <div id="setup-error" class="error-msg"></div>
            </div>
            <button id="btn-lock-secret" disabled>Sayımı Kilitle</button>
        </div>

        <!-- 3. BEKLEME EKRANI (Rakip bekleniyor) -->
        <div id="screen-waiting" class="screen">
            <div class="waiting-box">
                <h2>Rakip Bekleniyor...</h2>
                <p style="margin: 10px 0; font-size: 0.85rem;">Bu bağlantı linkini arkadaşına gönder:</p>
                <div class="room-link-box" id="share-link-text"></div>
            </div>
        </div>

        <!-- 4. OYUN EKRANI -->
        <div id="screen-game" class="screen">
            <h1>Düello Başladı!</h1>
            <div class="game-header">
                <span id="turn-indicator">Sıra: ...</span>
                <span id="opponent-name">Rakip: ...</span>
            </div>

            <div class="form-group">
                <input type="text" id="guess-input" maxlength="4" placeholder="4 basamaklı tahminin..." inputmode="numeric">
                <div id="game-error" class="error-msg"></div>
            </div>
            <button id="btn-make-guess">Tahmin Et</button>

            <div style="margin-top: 14px;">
                <label style="font-size: 0.8rem; color: var(--text-muted);">Tahmin Geçmişi:</label>
                <div class="history-container" id="history-list">
                    <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 10px;">Henüz hamle yapılmadı.</div>
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

        const screens = {
            welcome: document.getElementById('screen-welcome'),
            setup: document.getElementById('screen-setup'),
            waiting: document.getElementById('screen-waiting'),
            game: document.getElementById('screen-game'),
            win: document.getElementById('screen-win')
        };

        function showScreen(name) {
            Object.values(screens.s || screens).forEach(s => s.classList.remove('active'));
            screens[name].classList.add('active');
        }

        // URL'de oda kodu varsa otomatik yakala
        window.onload = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const roomParam = urlParams.get('room');
            if (roomParam) {
                document.getElementById('room-code-input').value = roomParam;
                document.getElementById('join-section').style.display = 'block';
            }
        };

        document.getElementById('btn-join-toggle').addEventListener('click', () => {
            const sec = document.getElementById('join-section');
            sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
        });

        function validateNumber(str) {
            if (!/^\\d{4}$/.test(str)) return "Sayı tam 4 basamaklı olmalıdır.";
            if (new Set(str.split('')).size !== 4) return "Rakamlar birbirinden farklı olmalıdır.";
            return null;
        }

        // Oda Kur
        document.getElementById('btn-create-room').addEventListener('click', () => {
            myName = document.getElementById('username').value.trim();
            if (!myName) {
                document.getElementById('welcome-error').textContent = "Lütfen adınızı girin.";
                return;
            }
            socket.emit('create-room', { name: myName });
        });

        // Odaya Katıl
        document.getElementById('btn-join-room').addEventListener('click', () => {
            myName = document.getElementById('username').value.trim();
            const roomId = document.getElementById('room-code-input').value.trim();
            if (!myName) {
                document.getElementById('welcome-error').textContent = "Lütfen adınızı girin.";
                return;
            }
            if (!roomId) {
                alert("Lütfen oda kodu girin.");
                return;
            }
            socket.emit('join-room', { roomId, name: myName });
        });

        socket.on('room-created', (roomId) => {
            currentRoomId = roomId;
            const link = window.location.origin + "/?room=" + roomId;
            document.getElementById('share-link-text').textContent = link;
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
            socket.emit('set-secret', { roomId: currentRoomId, secret: val });
            document.getElementById('setup-subtitle').textContent = "Rakibin gizli sayısını seçmesi bekleniyor...";
            secretInput.disabled = true;
            document.getElementById('btn-lock-secret').style.display = 'none';
        });

        socket.on('start-game', (data) => {
            document.getElementById('opponent-name').textContent = "Rakip: " + data.opponentName;
            showScreen('game');
        });

        socket.on('update-turn', (data) => {
            isMyTurn = data.isMyTurn;
            document.getElementById('turn-indicator').textContent = isMyTurn ? "Sıra Sende! 🎯" : "Rakibin Sırası ⏳";
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
            const list = document.getElementById('history-list');
            if(list.innerHTML.includes('Henüz hamle')) list.innerHTML = '';
            
            list.innerHTML = \`
                <div class="history-item">
                    <span><strong>\${data.playerName}</strong>: \${data.guess}</span>
                    <div>
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
    `);
});

// Socket.io Oyun Akış Mantığı
io.on('connection', (socket) => {
    socket.on('create-room', ({ name }) => {
        const roomId = uuidv4().substring(0, 6);
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

        // Her iki oyuncuya da kurulum ekranını başlat
        io.to(roomId).emit('start-setup', { roomId });
    });

    socket.on('set-secret', ({ roomId, secret }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player) player.secret = secret;

        // İki oyuncu da gizli sayısını seçti mi kontrol et
        if (room.players.length === 2 && room.players.every(p => p.secret)) {
            room.status = 'playing';
            
            // Oyunu başlat ve ilk sırayı belirle
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
        if (playerIndex !== room.turnIndex) return; // Sıra onda değilse işlem yapma

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

        // Tahmin sonucunu odadaki herkese bildir
        io.to(roomId).emit('guess-result', {
            playerName: room.players[playerIndex].name,
            guess,
            plus,
            minus
        });

        // Kazanma durumu kontrolü
        if (plus === 4) {
            io.to(roomId).emit('game-over', {
                winner: room.players[playerIndex].name,
                secret: secretCode
            });
            room.status = 'ended';
            return;
        }

        // Sırayı diğer oyuncuya devret
        room.turnIndex = 1 - room.turnIndex;
        room.players.forEach((p, idx) => {
            io.to(p.id).emit('update-turn', { isMyTurn: room.turnIndex === idx });
        });
    });

    socket.on('disconnect', () => {
        // Oyuncu çıkarsa odaları temizleyebiliriz
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