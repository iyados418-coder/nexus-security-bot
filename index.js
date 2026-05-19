require('dotenv').config();

const Logger = require('./bot/utils/logger');

// Anti-crash
process.on('unhandledRejection', (e) => Logger.error('ROOT: Unhandled Rejection', { msg: e.message }));
process.on('uncaughtException', (e) => Logger.error('ROOT: Uncaught Exception', { msg: e.message }));

async function startAll() {
  Logger.bot('========================================');
  Logger.bot('  🚀 Starting Security Bot + Dashboard');
  Logger.bot('========================================');

  // 1. Start bot (non-blocking - API/WS start even if bot is slow/fails)
  Logger.bot('Starting Discord bot...');
  let botReady = false;
  try {
    const botClient = require('./bot/index.js');
    global.botClient = botClient;

    // Wait up to 30 seconds for bot to be ready
    await Promise.race([
      new Promise((resolve) => {
        botClient.once('clientReady', () => {
          botReady = true;
          Logger.success('✅ Bot connected to Discord');
          resolve();
        });
      }),
      new Promise((resolve) => setTimeout(() => {
        if (!botReady) {
          Logger.warn('⚠️ Bot not ready yet (API/WS will start without it)');
          resolve();
        }
      }, 30000)),
    ]);
  } catch (e) {
    Logger.warn('⚠️ Bot failed to start, API/WebSocket will still run', { error: e.message });
  }

  // 2. Start API server + WebSocket (always starts, even without bot)
  Logger.bot('Starting API + WebSocket server...');
  try {
    const http = require('http');
    const app = require('./api/server');
    const httpServer = http.createServer(app);
    const ws = require('./websocket/index');
    ws.initialize(httpServer);

    // Make WebSocket emit functions globally accessible to bot events
    global.emitWS = ws.emitLog;
    global.emitStats = ws.emitStats;
    global.emitBotStatus = ws.emitBotStatus;
    global.emitGuildJoin = ws.emitGuildJoin;
    global.emitGuildLeave = ws.emitGuildLeave;
    global.emitGuildsUpdate = ws.emitGuildsUpdate;

    const API_PORT = process.env.API_PORT || 3001;
    const HOST = '0.0.0.0';
    httpServer.listen(API_PORT, HOST, () => {
      Logger.success(`✅ API + WebSocket running on http://localhost:${API_PORT}`);
    });
    httpServer.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        Logger.error(`❌ Port ${API_PORT} already in use. Close the other process or change API_PORT in .env`);
      } else {
        Logger.error('❌ API server error', { error: e.message });
      }
    });
  } catch (e) {
    Logger.error('❌ Failed to start API server', { error: e.message });
  }

  Logger.bot('========================================');
  Logger.bot('  🛡️ SYSTEM STARTED');
  Logger.bot(`  Bot: ${botReady ? 'Online' : 'Starting/Offline'}`);
  Logger.bot(`  API: http://localhost:${process.env.API_PORT || 3001}`);
  Logger.bot(`  Dashboard: ${process.env.DASHBOARD_URL || 'http://localhost:3000'}`);
  Logger.bot('========================================');
  Logger.bot('  📝 To stop: Ctrl+C');
  Logger.bot('========================================');
}

startAll().catch(e => {
  Logger.error('Fatal startup error', { error: e.message });
  process.exit(1);
});
