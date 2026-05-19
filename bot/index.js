const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Logger = require('./utils/logger');
const config = require('./config/config');
const SettingsManager = require('./utils/settings');
global.getGuildSettings = (id) => SettingsManager.get(id);

// Anti-crash
process.on('unhandledRejection', (e) => Logger.error('UNHANDLED REJECTION', { msg: e.message }));
process.on('uncaughtException', (e) => Logger.error('UNCAUGHT EXCEPTION', { msg: e.message }));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites, GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.spamTracker = new Map();
client.linkTracker = new Map();
client.channelDeleteTracker = new Map();
client.roleDeleteTracker = new Map();
client.webhookTracker = new Map();
client.joinTracker = new Map();

// Make client accessible to API/WebSocket
global.botClient = client;

function loadCommands() {
  const cmdPath = path.join(__dirname, 'commands');
  const entries = fs.readdirSync(cmdPath, { withFileTypes: true });
  for (const e of entries) {
    const ep = path.join(cmdPath, e.name);
    if (e.isDirectory()) {
      for (const f of fs.readdirSync(ep).filter(f => f.endsWith('.js'))) {
        const cmd = require(path.join(ep, f));
        if (cmd.data && cmd.execute) { client.commands.set(cmd.data.name, cmd); Logger.info(`Cmd: ${cmd.data.name}`); }
      }
    } else if (e.isFile() && e.name.endsWith('.js')) {
      const cmd = require(ep);
      if (cmd.data && cmd.execute) { client.commands.set(cmd.data.name, cmd); Logger.info(`Cmd: ${cmd.data.name}`); }
    }
  }
}

function loadEvents() {
  const evPath = path.join(__dirname, 'events');
  for (const f of fs.readdirSync(evPath).filter(f => f.endsWith('.js'))) {
    const ev = require(path.join(evPath, f));
    const fn = ev.once ? 'once' : 'on';
    client[fn](ev.name, (...args) => ev.execute(...args, client));
    Logger.info(`Event: ${ev.name}`);
  }
}

async function registerCommands() {
  try {
    const { REST, Routes } = require('discord.js');
    const cmds = [];
    for (const c of client.commands.values()) cmds.push(c.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: cmds });
      Logger.success(`Registered ${cmds.length} commands for guild`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: cmds });
      Logger.success(`Registered ${cmds.length} commands globally`);
    }
  } catch (e) { Logger.error('Command registration failed', { error: e.message }); }
}

client.once('clientReady', async () => {
  Logger.bot('========================================');
  Logger.bot(`  🛡️ SECURITY BOT ACTIVATED`);
  Logger.bot(`  ${client.user.tag}`);
  Logger.bot(`  ${client.guilds.cache.size} servers`);
  Logger.bot('========================================');
  client.user.setPresence({ activities: [{ name: config.bot.activity, type: 3 }], status: 'dnd' });
  await registerCommands();
  Logger.success('🛡️ Security Bot fully operational');
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return interaction.reply({ content: '❌ Command not found. Re-invite bot.', ephemeral: true });
    
    const { cooldowns } = client;
    if (!cooldowns.has(cmd.data.name)) cooldowns.set(cmd.data.name, new Collection());
    const now = Date.now();
    const ts = cooldowns.get(cmd.data.name);
    const cd = (cmd.cooldown || 3) * 1000;
    if (ts.has(interaction.user.id)) {
      const exp = ts.get(interaction.user.id) + cd;
      if (now < exp) return interaction.reply({ content: `⏰ Wait <t:${Math.round(exp/1000)}:R>`, ephemeral: true });
    }
    ts.set(interaction.user.id, now);
    setTimeout(() => ts.delete(interaction.user.id), cd);

    Logger.info(`/${cmd.data.name} by ${interaction.user.tag}`);
    await cmd.execute(interaction, client);
  } catch (e) {
    Logger.error(`/${interaction.commandName} error`, { error: e.message });
    try {
      const eb = require('./utils/embedBuilder').error('An error occurred.\n```\n' + e.message + '\n```');
      if (interaction.replied || interaction.deferred) await interaction.followUp({ embeds: [eb], ephemeral: true });
      else await interaction.reply({ embeds: [eb], ephemeral: true });
    } catch {}
  }
});

async function start() {
  if (!process.env.TOKEN || process.env.TOKEN === 'YOUR_BOT_TOKEN') {
    Logger.error('Bot token not configured. Bot will not connect. Set TOKEN in .env');
    Logger.info('API and Dashboard will still work without the bot');
    return;
  }
  loadCommands();
  loadEvents();
  Logger.bot('Connecting to Discord...');
  try {
    await client.login(process.env.TOKEN);
  } catch (e) {
    Logger.error('Failed to connect to Discord', { error: e.message });
  }
}

start();

module.exports = client;
