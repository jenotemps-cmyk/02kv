const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({
  noServer: true,
  clientTracking: true,
  perMessageDeflate: false
});

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_jwt_tokens';
const DB_FILE = path.join(__dirname, 'database.json');

// Default configuration (Sacrifice Lua table)
const DEFAULT_LUA_CONFIG = fs.readFileSync(path.join(__dirname, 'default-config.lua'), 'utf8');

// Initialize Supabase Client with proper WebSocket transport for Node.js 20
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    // For Node.js 20, we need to provide the WebSocket transport
    supabase = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      // This fixes the WebSocket error by not using realtime features that require native WebSocket
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
    console.log("Supabase client initialized successfully");
  } catch (err) {
    console.warn("WARNING: Supabase initialization failed:", err.message);
    supabase = null;
  }
} else {
  console.warn("WARNING: Missing SUPABASE_URL or SUPABASE_KEY in .env");
}

// Middleware
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:", ...(supabaseUrl ? [supabaseUrl] : [])],
      imgSrc: ["'self'", "data:"]
    }
  }
}));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl.startsWith('/api/connections'),
  message: { error: 'Too many requests from this IP, please try again later.' }
});

const connectionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many connection status requests. Please wait a moment.' }
});

app.use('/api/connections', connectionsLimiter);
app.use('/api/', limiter);

// Database helper functions
function readLocalDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error("Error reading database:", err);
    return [];
  }
}

function writeLocalDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

/** Old saved configs lack v2 fields or use deprecated keys — replace with default-config.lua */
function isLegacySacrificeConfig(config) {
  if (!config || typeof config !== 'string') return true;
  return (
    !config.includes('DistanceScalingHitChance') ||
    !config.includes('HorizontalPrediction') ||
    config.includes('enabled = true') ||
    config.includes('getgenv().sacrifice')
  );
}

function migrateAllUserConfigsToDefault() {
  const db = readLocalDB();
  let migrated = 0;

  for (const user of db) {
    if (!isLegacySacrificeConfig(user.config)) continue;

    user.config = DEFAULT_LUA_CONFIG;
    if (user.lastActivatedConfig) {
      user.lastActivatedConfig = DEFAULT_LUA_CONFIG;
    }
    migrated += 1;
    console.log(`[Migration] Updated config for user: ${user.username}`);
  }

  if (migrated > 0) {
    writeLocalDB(db);
    console.log(`[Migration] ${migrated} account(s) now use default-config.lua`);
  }
}

// Auth middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired. Please log in again.' });
    }

    const db = readLocalDB();
    const localUser = db.find(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (!localUser) {
      return res.status(403).json({ error: 'User account not found.' });
    }
    if (localUser.banned) {
      return res.status(403).json({ error: 'Your account is banned!' });
    }

    req.user = localUser;
    next();
  });
}

// WebSocket Connections
const clientConnections = new Map();
const getConnectionKey = (username) => String(username || '').trim().toLowerCase();

wss.on('connection', (ws, request, username) => {
  console.log(`[WS] Client connected for user: ${username}`);

  ws.isAlive = true;
  ws.username = username;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const connectionKey = getConnectionKey(username);
  if (!clientConnections.has(connectionKey)) {
    clientConnections.set(connectionKey, new Set());
  }
  clientConnections.get(connectionKey).add(ws);

  // Don't send config automatically on connection
  // Config will be sent when user clicks "Activate Config"
  console.log(`[WS] Client connected for user: ${username}`);

  ws.on('close', (code, reason) => {
    console.log(`[WS] Client disconnected for user: ${username}, code: ${code}`);
    const userConns = clientConnections.get(connectionKey);
    if (userConns) {
      userConns.delete(ws);
      if (userConns.size === 0) {
        clientConnections.delete(connectionKey);
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error for ${username}:`, err.message);
  });
});

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`[WS] Terminating inactive connection for ${ws.username || 'unknown'}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

server.on('upgrade', (request, socket, head) => {
  console.log(`[WS Upgrade] ${request.url}`);

  let token = null;

  const cookieHeader = request.headers.cookie || '';
  const cookies = cookieHeader.split(';').reduce((acc, c) => {
    const parts = c.split('=');
    if (parts[0]) {
      acc[parts[0].trim()] = (parts[1] || '').trim();
    }
    return acc;
  }, {});
  token = cookies.token;

  if (!token && request.url) {
    const match = request.url.match(/[?&]token=([^&]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
      console.log(`[WS] Token from URL parameter`);
    }
  }

  if (!token) {
    console.warn(`[WS] No token provided`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn(`[WS] Invalid token: ${err.message}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    const db = readLocalDB();
    const localUser = db.find(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (!localUser || localUser.banned) {
      console.warn(`[WS] User banned or not found: ${user.username}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    console.log(`[WS] Authenticated user: ${localUser.username}`);
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, localUser.username);
    });
  });
});

function broadcastConfigUpdate(username, config) {
  const connectionKey = getConnectionKey(username);
  const userConns = clientConnections.get(connectionKey);
  let count = 0;

  if (userConns && userConns.size > 0) {
    const payload = JSON.stringify({ type: 'update', config });
    userConns.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
          count++;
        } catch (err) {
          console.error(`[WS] Failed to send update: ${err.message}`);
        }
      }
    });
  }

  console.log(`[Activation] ${username}: sent to ${count} connection(s)`);
  return count;
}

// API Endpoints

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    app: 'sacrifice-config-hub',
    timestamp: new Date().toISOString()
  });
});

function activateConfigHandler(req, res) {
  console.log(`[Activation] ${req.user.username}`);

  const db = readLocalDB();
  const userIndex = db.findIndex(u => u.username.toLowerCase() === req.user.username.toLowerCase());
  const user = userIndex !== -1 ? db[userIndex] : null;

  if (!user) {
    return res.status(500).json({ error: 'User profile not found.' });
  }

  const configToActivate = typeof req.body.config === 'string' ? req.body.config : user.config;
  const match = configToActivate.match(/^\s*(?:--[^\n]*\n\s*)*getgenv\(\)\.[Ss]acrifice\s*=\s*\{[\s\S]*\}\s*$/);
  if (!match) {
    return res.status(400).json({ error: 'Must be a Sacrifice configuration (e.g., getgenv().Sacrifice = { ... })' });
  }

  const activeConnectionsCount = broadcastConfigUpdate(user.username, configToActivate);

  res.json({
    success: true,
    message: 'Configuration activated and transmitted!',
    connectedClients: activeConnectionsCount,
    websocketUser: user.username
  });

  setImmediate(() => {
    try {
      user.config = configToActivate;
      user.lastActivatedConfig = configToActivate;
      writeLocalDB(db);
    } catch (err) {
      console.error(`Failed to persist config:`, err);
    }
  });
}

app.all('/api/config/activate', authenticateToken, (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST /api/config/activate' });
  }
  return activateConfigHandler(req, res);
});

app.post('/api/config/push', authenticateToken, activateConfigHandler);

// Get user info from Supabase
app.get('/api/user/:username', authenticateToken, async (req, res) => {
  const { username } = req.params;

  if (req.user.username.toLowerCase() !== username.toLowerCase()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!supabase) {
    return res.json({
      discordId: 'Not linked',
      duration: 'Lifetime'
    });
  }

  try {
    const db = readLocalDB();
    const user = db.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || !user.license) {
      return res.json({
        discordId: 'Not linked',
        duration: 'Lifetime'
      });
    }

    const { data: licenseData, error } = await supabase
      .from('licenses')
      .select('discordid, duration')
      .eq('license', user.license)
      .single();

    if (error || !licenseData) {
      return res.json({
        discordId: 'Not linked',
        duration: 'Lifetime'
      });
    }

    res.json({
      discordId: licenseData.discordid || 'Not linked',
      duration: licenseData.duration || 'Lifetime'
    });
  } catch (err) {
    console.error('Error fetching user data:', err);
    res.json({
      discordId: 'Not linked',
      duration: 'Lifetime'
    });
  }
});

// Get user's license key
app.get('/api/user/:username/license', authenticateToken, async (req, res) => {
  const { username } = req.params;

  if (req.user.username.toLowerCase() !== username.toLowerCase()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const db = readLocalDB();
  const user = db.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || !user.license) {
    return res.json({ licenseKey: null });
  }

  res.json({ licenseKey: user.license });
});

// Registration
app.post('/api/auth/register', async (req, res) => {
  const { username, password, licenseKey } = req.body;

  if (!username || !password || !licenseKey) {
    return res.status(400).json({ error: 'Username, password, and license key are required.' });
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Username (min 3 chars) and password (min 6 chars) requirements not met.' });
  }

  const db = readLocalDB();

  const userExists = db.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
  if (userExists) {
    return res.status(400).json({ error: 'Username is already taken.' });
  }

  const licenseUsedLocally = db.some(u => u.license && u.license.toLowerCase() === licenseKey.toLowerCase().trim());
  if (licenseUsedLocally) {
    return res.status(400).json({ error: 'License key has already been used!' });
  }

  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Registration is unavailable because Supabase is not configured on this server.' });
    }

    const { data: licenseData, error: fetchErr } = await supabase
      .from('licenses')
      .select('*')
      .eq('license', licenseKey.trim())
      .single();

    if (fetchErr || !licenseData) {
      return res.status(400).json({ error: 'License Invalid!' });
    }

    if (licenseData.blacklisted) {
      return res.status(400).json({ error: 'License Invalid! Key is blacklisted.' });
    }

    if (!licenseData.discordid) {
      return res.status(400).json({ error: "Your key hasn't been claimed yet!" });
    }

    if (licenseData.cloudclaimed === true) {
      return res.status(400).json({ error: 'This key has already been used!' });
    }

    const { error: updateErr } = await supabase
      .from('licenses')
      .update({ cloudclaimed: true })
      .eq('license', licenseKey.trim());

    if (updateErr) {
      console.error("Supabase update error:", updateErr);
      return res.status(500).json({ error: 'Failed to update license claim status. Try again later.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      username: trimmedUsername,
      password: hashedPassword,
      license: licenseKey.trim(),
      config: DEFAULT_LUA_CONFIG,
      banned: false,
      createdAt: new Date().toISOString()
    };

    db.push(newUser);
    writeLocalDB(db);

    return res.json({ success: true, message: 'Account registered successfully!' });

  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ error: 'Internal Server Error. Please try again.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = readLocalDB();
  const userIndex = db.findIndex(u => u.username.toLowerCase() === username.trim().toLowerCase());

  if (userIndex === -1) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const user = db[userIndex];

  if (user.banned) {
    return res.status(403).json({ error: 'Your account is banned!' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  try {
    if (supabase && user.license) {
      const { data: licenseData, error: fetchErr } = await supabase
        .from('licenses')
        .select('*')
        .eq('license', user.license)
        .single();

      if (!fetchErr && licenseData && licenseData.blacklisted) {
        user.banned = true;
        writeLocalDB(db);
        return res.status(403).json({ error: 'Your account has been instantly banned due to license blacklisting!' });
      }
    }
  } catch (err) {
    console.warn("Failed to check blacklist:", err);
  }

  const token = jwt.sign(
    { username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  global.lastActiveUsername = user.username;

  return res.json({
    success: true,
    user: { username: user.username, token: token }
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully!' });
});

// Check Session
app.get('/api/auth/session', authenticateToken, (req, res) => {
  const token = req.cookies.token;
  global.lastActiveUsername = req.user.username;
  return res.json({
    authenticated: true,
    username: req.user.username,
    token: token
  });
});

// Get Configuration
app.get('/api/config', authenticateToken, (req, res) => {
  return res.json({ config: req.user.config });
});

// Save Configuration
app.post('/api/config/save', authenticateToken, (req, res) => {
  const { config } = req.body;
  if (config === undefined) {
    return res.status(400).json({ error: 'Configuration string is required.' });
  }

  const match = config.match(/^\s*(?:--[^\n]*\n\s*)*getgenv\(\)\.[Ss]acrifice\s*=\s*\{[\s\S]*\}\s*$/);
  if (!match) {
    return res.status(400).json({ error: 'Must be a Sacrifice configuration (e.g., getgenv().Sacrifice = { ... })' });
  }

  const db = readLocalDB();
  const userIndex = db.findIndex(u => u.username.toLowerCase() === req.user.username.toLowerCase());
  if (userIndex !== -1) {
    db[userIndex].config = config;
    writeLocalDB(db);
    return res.json({ success: true, message: 'Configuration saved successfully!' });
  }

  return res.status(500).json({ error: 'Failed to find user profile.' });
});

// Connection count
app.get('/api/connections', authenticateToken, (req, res) => {
  const userConns = clientConnections.get(getConnectionKey(req.user.username));
  return res.json({ count: userConns ? userConns.size : 0 });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

migrateAllUserConfigsToDefault();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sacrifice config hub running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready`);
});
