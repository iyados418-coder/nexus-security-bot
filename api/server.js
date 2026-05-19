const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.API_PORT || 3001;

const HOST = '0.0.0.0';

// CORS — allow dashboard origin with credentials
const allowedOrigins = [
  process.env.DASHBOARD_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (req.path.startsWith('/api/health')) return; // skip health check noise
    console.log(`  \x1b[90m[API]\x1b[0m ${req.method} ${req.path} \x1b[36m${res.statusCode}\x1b[0m \x1b[90m${ms}ms\x1b[0m`);
  });
  next();
});

// Attach bot client to request
app.use((req, res, next) => {
  req.botClient = global.botClient || null;
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/guilds', require('./routes/guilds'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/moderation', require('./routes/moderation'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/voice', require('./routes/voice'));
app.use('/api/control', require('./routes/control'));
app.use('/api/guild-sync', require('./routes/guild-sync'));
app.use('/api/logs', require('./routes/logs'));

// Health check
app.get('/api/health', (req, res) => {
  const client = global.botClient;
  res.json({
    status: 'ok',
    bot: client?.user?.tag || 'Not connected',
    servers: client?.guilds?.cache?.size || 0,
    uptime: process.uptime(),
    ping: client?.ws?.ping || 0,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`\x1b[31m[API ERROR]\x1b[0m`, err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start listening if run directly (not required by root index.js)
if (require.main === module) {
  const http = require('http');
  const httpServer = http.createServer(app);

  // Initialize WebSocket with the HTTP server
  try {
    const ws = require('../websocket/index');
    ws.initialize(httpServer);
    global.emitWS = ws.emitLog;
    global.emitStats = ws.emitStats;
    global.emitBotStatus = ws.emitBotStatus;
    global.emitGuildJoin = ws.emitGuildJoin;
    global.emitGuildLeave = ws.emitGuildLeave;
    global.emitGuildsUpdate = ws.emitGuildsUpdate;
  } catch (e) {
    console.log(`  \x1b[33m[WARN]\x1b[0m WebSocket init failed (non-fatal): ${e.message}`);
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`\x1b[36m========================================\x1b[0m`);
    console.log(`\x1b[36m  🚀 API + WebSocket running\x1b[0m`);
    console.log(`\x1b[36m  Host:      ${HOST}\x1b[0m`);
    console.log(`\x1b[36m  Port:      ${PORT}\x1b[0m`);
    console.log(`\x1b[36m  Dashboard: ${process.env.DASHBOARD_URL || 'http://localhost:3000'}\x1b[0m`);
    console.log(`\x1b[36m========================================\x1b[0m`);
  });
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\x1b[31m[ERROR] Port ${PORT} is already in use.\x1b[0m`);
      console.error(`\x1b[31m        Close the other process or change API_PORT in .env\x1b[0m`);
    } else {
      console.error(`\x1b[31m[ERROR] ${err.message}\x1b[0m`);
    }
    process.exit(1);
  });
}

module.exports = app;
