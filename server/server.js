const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const path = require('path');

app.use(express.static(path.join(__dirname, '../client')));

const rooms = new Map();
const MAX_PLAYERS_PER_ROOM = 10;
const INACTIVE_ROOM_TIMEOUT = 1000 * 60 * 60;

function cleanInactiveRooms() {
    const now = Date.now();
    for (const [roomId, roomData] of rooms.entries()) {
        if (roomData.players.size === 0 && (now - roomData.lastActivity) > INACTIVE_ROOM_TIMEOUT) {
            rooms.delete(roomId);
            console.log(`Удалена неактивная комната: ${roomId}`);
        }
    }
}
setInterval(cleanInactiveRooms, INACTIVE_ROOM_TIMEOUT);

io.on('connection', (socket) => {
    console.log(`Новое подключение: ${socket.id}`);

    socket.on('create_room', (data) => {
        try {
            const { roomId, nickname } = data;
            if (!roomId || !nickname) {
                socket.emit('error', { message: 'Отсутствует ID комнаты или никнейм' });
                return;
            }
            if (rooms.has(roomId)) {
                socket.emit('error', { message: 'Комната уже существует' });
                return;
            }
            const roomData = {
                id: roomId,
                createdAt: new Date().toISOString(),
                lastActivity: Date.now(),
                players: new Map(),
                host: socket.id,
                settings: {
                    maxPlayers: MAX_PLAYERS_PER_ROOM,
                    gameMode: 'standard'
                }
            };
            rooms.set(roomId, roomData);
            socket.emit('room_created', { roomId });
            handleJoinRoom({ roomId, nickname }, socket);
            console.log(`Создана комната ${roomId} игроком ${nickname} (${socket.id})`);
        } catch (error) {
            console.error('Ошибка при создании комнаты:', error);
            socket.emit('error', { message: 'Ошибка при создании комнаты' });
        }
    });

    socket.on('join_room', (data) => handleJoinRoom(data, socket));

    socket.on('player_move', (data) => {
        try {
            const { x, y, animation } = data;
            const roomId = socket.currentRoom;
            if (roomId && rooms.has(roomId)) {
                const roomData = rooms.get(roomId);
                if (roomData.players.has(socket.id)) {
                    const playerData = roomData.players.get(socket.id);
                    playerData.x = x;
                    playerData.y = y;
                    playerData.animation = animation;
                    io.to(roomId).emit('player_moved', {
                        id: socket.id,
                        x,
                        y,
                        animation
                    });
                }
                roomData.lastActivity = Date.now();
            }
        } catch (error) {
            console.error('Ошибка при обновлении позиции:', error);
        }
    });

    socket.on('disconnect', () => {
        try {
            const roomId = socket.currentRoom;
            if (roomId && rooms.has(roomId)) {
                const roomData = rooms.get(roomId);
                if (roomData.players.has(socket.id)) {
                    roomData.players.delete(socket.id);
                    socket.to(roomId).emit('player_left', { id: socket.id });
                    io.to(roomId).emit('player_count_update', roomData.players.size);
                    if (socket.id === roomData.host && roomData.players.size > 0) {
                        const newHost = roomData.players.values().next().value.id;
                        roomData.host = newHost;
                        io.to(roomId).emit('new_host', { id: newHost });
                    }
                    if (roomData.players.size === 0) {
                        roomData.lastActivity = Date.now();
                    }
                }
            }
            console.log(`Клиент отключился: ${socket.id}`);
        } catch (error) {
            console.error('Ошибка при отключении:', error);
        }
    });
});

function handleJoinRoom(data, socket) {
    try {
        const { roomId, nickname } = data;
        if (!roomId || !nickname) {
            socket.emit('error', { message: 'Отсутствует ID комнаты или никнейм' });
            return;
        }
        if (!rooms.has(roomId)) {
            socket.emit('error', { message: 'Комната не существует' });
            return;
        }
        const roomData = rooms.get(roomId);
        if (roomData.players.size >= roomData.settings.maxPlayers) {
            socket.emit('error', { message: 'Комната заполнена' });
            return;
        }
        const playerData = {
            id: socket.id,
            nickname: nickname,
            x: Math.random() * 700 + 50,
            y: Math.random() * 500 + 50,
            joinedAt: new Date().toISOString()
        };

        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.playerData = playerData;

        // 1. Добавляем нового игрока в Map
        roomData.players.set(socket.id, playerData);
        roomData.lastActivity = Date.now();

        // 2. Отправляем новому игроку всех других игроков
        const existingPlayers = Array.from(roomData.players.values())
            .filter(player => player.id !== socket.id)
            .map(player => ({
                id: player.id,
                nickname: player.nickname,
                x: player.x,
                y: player.y
            }));

        console.log('Отправляю existing_players:', existingPlayers, 'для', socket.id);

        socket.emit('existing_players', existingPlayers);

        // 3. Отправляем параметры игрока
        socket.emit('room_joined', {
            roomId,
            playerId: socket.id,
            isHost: roomData.host === socket.id,
            playerCount: roomData.players.size,
            settings: roomData.settings,
            x: playerData.x,
            y: playerData.y,
            nickname: playerData.nickname
        });

        // 4. Оповещаем остальных о новом игроке
        socket.to(roomId).emit('player_joined', playerData);

        io.to(roomId).emit('player_count_update', roomData.players.size);

        console.log(`Игрок ${nickname} (${socket.id}) присоединился к комнате ${roomId}`);
    } catch (error) {
        console.error('Ошибка при присоединении к комнате:', error);
        socket.emit('error', { message: 'Ошибка при присоединении к комнате' });
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

process.on('uncaughtException', (error) => {
    console.error('Необработанная ошибка:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Необработанное отклонение промиса:', reason);
});