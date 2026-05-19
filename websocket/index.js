const { Server } = require('socket.io');
const logSaver = require('../api/utils/logSaver');

let io = null;

function initialize(httpServer) {
  io = new Server(httpServer, {
    path: '/api/socket',
    cors: {
      origin: [process.env.DASHBOARD_URL || 'http://localhost:3000', 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`  \x1b[36m[WS]\x1b[0m Client connected: ${socket.id}`);

    socket.on('join-guild', (guildId) => {
      socket.join(`guild:${guildId}`);
      console.log(`  \x1b[36m[WS]\x1b[0m ${socket.id} joined guild:${guildId}`);
    });

    socket.on('leave-guild', (guildId) => {
      socket.leave(`guild:${guildId}`);
    });

    socket.on('disconnect', () => {
      console.log(`  \x1b[36m[WS]\x1b[0m Client disconnected: ${socket.id}`);
    });
  });

  console.log(`  \x1b[36m[WS]\x1b[0m WebSocket initialized at /api/socket`);
  return io;
}

function getIO() {
  return io;
}

function emitLog(guildId, type, data) {
  // Always save to disk regardless of WebSocket state
  logSaver.saveLog(guildId, type, data);
  if (!io) return;
  const entry = { type, data, timestamp: new Date().toISOString() };
  io.to(`guild:${guildId}`).emit('log', entry);
}

function emitStats(guildId, data) {
  if (!io) return;
  io.to(`guild:${guildId}`).emit('stats', { ...data, timestamp: Date.now() });
}

function emitBotStatus(data) {
  if (!io) return;
  io.emit('botStatus', data);
}

function emitGuildJoin(guildData) {
  if (!io) return;
  io.emit('guildJoin', guildData);
}

function emitGuildLeave(guildData) {
  if (!io) return;
  io.emit('guildLeave', guildData);
}

function emitGuildsUpdate(guildsData) {
  if (!io) return;
  io.emit('guildsUpdate', guildsData);
}

module.exports = { initialize, getIO, emitLog, emitStats, emitBotStatus, emitGuildJoin, emitGuildLeave, emitGuildsUpdate };
