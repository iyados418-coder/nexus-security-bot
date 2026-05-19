const router = require('express').Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const JWT_SECRET = process.env.SESSION_SECRET || 'security-bot-secret';
const REDIRECT_URI = process.env.OAUTH_URL || 'http://localhost:3001/api/auth/discord/callback';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';

if (!CLIENT_ID) console.error('\x1b[31m[ERROR] CLIENT_ID not set in .env\x1b[0m');
if (!CLIENT_SECRET) console.error('\x1b[31m[ERROR] CLIENT_SECRET not set in .env\x1b[0m');

// Start Discord OAuth
router.get('/discord', (req, res) => {
  const url = `https://discord.com/api/oauth2/authorize` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('identify guilds')}` +
    `&prompt=consent`;
  console.log(`  \x1b[90m[OAUTH]\x1b[0m Redirecting to Discord authorization`);
  res.redirect(url);
});

// Discord OAuth callback — exchanges code for JWT token
router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${DASHBOARD_URL}/login?error=no_code`);
  }

  try {
    console.log(`  \x1b[90m[OAUTH]\x1b[0m Exchanging authorization code for token`);

    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenRes.data;
    console.log(`  \x1b[90m[OAUTH]\x1b[0m Token obtained, fetching user data`);

    const [userRes, guildsRes] = await Promise.all([
      axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
      axios.get('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
    ]);

    const user = userRes.data;
    const guilds = guildsRes.data;
    const botClient = global.botClient;

    // Filter guilds where user is admin AND bot is in
    const managedGuilds = guilds.filter(g => {
      try {
        const perms = BigInt(g.permissions);
        const admin = (perms & 0x8n) === 0x8n;
        const botIn = botClient?.guilds?.cache?.has(g.id);
        return admin && botIn;
      } catch {
        return false;
      }
    }).map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon ? g.icon : null,
      iconURL: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
      memberCount: g.approximate_member_count || g.member_count || 0,
      owner: g.owner || false,
    }));

    // Generate JWT token with user data
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator || '0',
        avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : null,
        guilds: managedGuilds,
        access_token,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`  \x1b[90m[OAUTH]\x1b[0m Login successful for ${user.username} (${managedGuilds.length} guilds)`);

    // Redirect to dashboard with JWT token
    res.redirect(`${DASHBOARD_URL}/dashboard?token=${token}`);
  } catch (error) {
    console.error(`  \x1b[31m[OAUTH ERROR]\x1b[0m`, error.response?.data || error.message);
    const errorMsg = error.response?.status === 401 ? 'invalid_credentials' : 'auth_failed';
    res.redirect(`${DASHBOARD_URL}/login?error=${errorMsg}`);
  }
});

// Get current user from JWT token (enriched with bot's cached guild data)
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const client = global.botClient;
    if (decoded.guilds && client) {
      decoded.guilds = decoded.guilds.map(g => {
        const botGuild = client.guilds?.cache?.get(g.id);
        if (botGuild) {
          return { ...g, memberCount: botGuild.memberCount };
        }
        return g;
      });
    }
    res.json({ authenticated: true, user: decoded });
  } catch {
    res.json({ authenticated: false });
  }
});

// Logout — clears token on client side
router.get('/logout', (req, res) => {
  res.redirect(DASHBOARD_URL);
});

module.exports = router;
