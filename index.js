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
  perMessageDeflate: false // Disable compression for better performance with small messages
});

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_jwt_tokens';
const DB_FILE = path.join(__dirname, 'database.json');

// Default configuration (Sacrifice Lua table)
const DEFAULT_LUA_CONFIG = `getgenv().sacrifice = {
    ["Global WallCheck"] = true, 
    ["Knock Check"] = true,

    Watermark = {
        Enabled = true,
        Username = "eso", 
        Color = Color3.fromRGB(12, 12, 255) 
    },

    ['Silent Aim'] = {
        ['Enabled'] = true,
        ['Ignore Fov'] = false,
        ['One Tap'] = {
            ['Enabled'] = false,
        },
        Tracer = { 
            Enabled = false,
            Color = Color3.fromRGB(255, 0, 0),
            Thickness = 1.5,
            Transparency = 1.0
        },
        ['Legit'] = {
            ['Enabled'] = false,
            ['Hit Chance'] = 100,
            ['FovScalingHitChance'] = true, 
            ['Anti Curve'] = {['Enabled'] = false, ['Max Angle'] = 15},
            ['Scaling'] = {['Enabled'] = true, ['Factor'] = 1},
            ['Anti Aimview'] = {['Enabled'] = true, ['Max Angle'] = 15},
            ['Checks'] = {
                ['Max Distance'] = 1222,
                ['Auto Distance'] = false,
            },
        },
        ['Settings'] = {
            ['Hit Part'] = 'Head',
            ['Closest Point'] = {
                ['Samples'] = 3,
                ['Diagonal'] = false,
                ['ShowPoints'] = false,
                ['PointColor'] = Color3.fromRGB(255, 0, 0)
            },
            ['Auto Predictions'] = {
                ['Enabled'] = false,
                ['Intensity'] = 1,
                ['Max Offset'] = 15,
            },
            ['Predictions'] = {
                ['Enabled'] = false,
                ['Values'] = {
                    ['x'] = 0,
                    ['y'] = 0,
                    ['z'] = 0,
                },
            },
            ['Fov'] = {
                ['Enabled'] = true,
                ['Visible'] = false,
                ['Radius'] = 350,
                ['Thickness'] = 1.5,
                ['Transparency'] = 1,
                ['Filled'] = false,
                ['Color'] = Color3.fromRGB(0, 17, 255),
                ['Override'] = {
                    ['Enabled'] = false,
                    ['GetExternalRadius'] = nil,
                }
            },
        },
        TargetPriority = "Fov", 
        Mode = "Hybrid", 
        TargetKeybind = "C", 
        LockedTarget = nil, 
        TargetModeForceHit = false,
        Smoothing = 0.1, 
        HitChance = 100,
    },

    ['Trigger Bot'] = {
        ['Enabled'] = true,
        ['Keybind'] = "T",
        ['Interval'] = 0.01,
        ['Activation'] = 'Toggle',
        ['Mode'] = 'Fov',
        ['Knock Check'] = true, 
        ['Checks'] = {
            ['Max Distance'] = 3411,
            ['Auto Distance'] = false,
        },
        ['Input'] = {
            ['Enabled'] = true,
            ['Start'] = 0,
            ['End'] = 0,
        },
        ['Settings'] = {
            ['Hits'] = 'Everything',
            ['HumanizedReaction'] = true, 
            ['Auto Predictions'] = {
                ['Enabled'] = false,
                ['Intensity'] = 1,
                ['Max Offset'] = 15,
            },
            ['Predictions'] = {
                ['Enabled'] = false,
                ['Values'] = {
                    ['x'] = 0,
                    ['y'] = 0,
                    ['z'] = 0,
                },
            },
            ['Fov'] = {['Visible'] = false, ['X'] = 534423, ['Y'] = 6234234, ['Z'] = 23432432235},
        },
        Weapons = {
            '[Double-Barrel SG]',
            '[Revolver]',
            '[TacticalShotgun]',
            '[Tactical Shot shotgun]',
            '[Glock]'
        },
        HitParts = {
            Type = false, 
            Parts = {'Head', 'UpperTorso', 'HumanoidRootPart', 'LowerTorso', 'LeftHand', 'RightHand', 'LeftLowerArm', 'RightLowerArm', 'LeftUpperArm', 'RightUpperArm', 'LeftFoot', 'LeftLowerLeg',  'LeftUpperLeg', 'RightLowerLeg', 'RightFoot',  'RightUpperLeg'}
        },
        CustomSize = {
            Enabled = true, 
            Value = 40 
        },
        Active = false 
    },

    ['Camlock'] = {
        ['Enabled'] = true,
        ['Keybind'] = "Q",
        ['UnlockOnDeath'] = true,
        ['WallCheck'] = false,
        ['Snappiness'] = 0.015,
        ['Ignore Fov'] = true,
        ['Activation'] = 'Toggle',
        ['Mode'] = 'Fov',
        ['Smooth Mode'] = 'Legit', 
        ['Method'] = 'Camera', 
        ['Checks'] = {
            ['Max Distance'] = 1000,
            ['First Person'] = true,
            ['Third Person'] = true,
        },
        ['Settings'] = {
            ['Part'] = 'UpperTorso',
            ['Blend'] = 0.17,
            ['DynamicHeightCompensation'] = true, 
            ['VerticalAdjustmentOffset'] = 0,  
            ['HumanShake'] = {
                ['Enabled'] = true, 
                ['Amount'] = 0.55
            },
            ['Fov'] = {['Visible'] = false, ['X'] = 432423418, ['Y'] = 12342342348, ['Z'] = 12342343248},
            ['Auto Predictions'] = {
                ['Enabled'] = false,
                ['Intensity'] = 1,
                ['Max Offset'] = 15,
            },
            ['Predictions'] = {
                ['Enabled'] = true,
                ['Values'] = {
                    ['x'] = 0.125,
                    ['y'] = 0.225,
                    ['z'] = 0.125,
                },
            },
        },
        Shake = {
            Enabled = true,
            ShakeMode = "WholeBody", 
            X = 0.5, 
            Y = 0.5,  
        },
        Robotic = {
            Enabled = false,              
            ModeSwitchKeybind = "G",     
            FlickKeybind = "F",          
            Overshoot = {
                Enabled = true,
                Multiplier = 1.35,       
                DecaySpeed = 12,         
            },
            Jitter = {
                Enabled = true,
                Frequency = 45,          
                AmplitudeX = 2.2,        
                AmplitudeY = 2.2,        
            },
            Spasm = {
                Enabled = true,
                Chance = 0.08,           
                MaxSpikeDistance = 5.5,  
            }
        }
    },

    Orbit = {
        Enabled = false,
        Keybind = "Z",
        TargetPlayer = nil, 
        Distance = 10,
        Height = 0, 
        Speed = 6150, 
        AutoKill = true,
        AutoReload = false,
        ReloadAmmoCount = 0 
    },

    SpreadMod = {
        Enabled = false,
        Amount = 70
    },

    ["Hitbox Expander"] = {
        Enabled = false,
        Size = 110,
        Visualize = false,
        ["Ignore Dead"] = false 
    },

    ["Weapon Mods"] = {
        Traced = { 
           RapidFire = true, RapidFireDelay = 0.15
        },
        ["Delay Changer"] = {
            Enabled = true,
            GlobalDelay = 0.08, 
            Weapons = { 
                ["[Revolver]"] = { Enabled = false, Delay = 0.05 },
                ["[Glock]"] = { Enabled = false, Delay = 0.05 },
                ["[Double-Barrel SG]"] = { Enabled = false, Delay = 0.05 },
                ["[Tactical Shotgun]"] = { Enabled = false, Delay = 0.05 },
            }
        },
        RageMode = {
            Enabled = false, 
            FireInterval = 0.00001
        }
    },

    Visuals = {
        ["Color Modifications"] = { Enabled = false, Vibrancy = 0.45, Contrast = 0, Brightness = 0 },
        Sky = { Enabled = true, Color = "Black" },
        ESP = { 
            Enabled = true, 
            Keybind = "B", 
            Size = 11, 
            DefaultColor = Color3.fromRGB(255, 255, 255), 
            TargetColor = Color3.fromRGB(255, 0, 0),
            SilentAimTargetColor = Color3.fromRGB(255, 0, 255)
        },
    },
    
    ["Speed Modifications"] = { 
        Options = { Enabled = true, DefaultSpeed = 835, Method = "WalkSpeed", Keybind = "V" } 
    },

    ["Jump Modifications"] = {
        Enabled = false,
        JumpPower = 60,
        Keybind = "H"
    },

    ["Damage Modifications"] = {
        Overrider = { Enabled = false, Damage = 200 }, 
        Amplifier = { Enabled = false, Multiplier = 35 } 
    },

    Spiderman = { 
        Enabled = true, 
        ["Jump Boost"] = 80,["Jump Delay"] = 0, 
        Keybind = "J" 
    },
    
    ["Infinite Range"] = { 
        enabled = true, 
        range = 2000, 
        bypasspos = 65 
    },

    ["Wallbang"] = {
        Enabled = true
    },

    AntiStomp = {
        Enabled = false
    },
    
    ["Panic Ground"] = {
        Enabled = true,
        Keybind = "P"
    },

    Noclip = {
        Enabled = false,
        Keybind = "N",
        Active = false
    },
    
    ["Skin Changer"] = { 
        Enabled = false, 
        Skins = {
            ["[Revolver]"] = "Inferno",
            ["[Glock]"] = "Blue Dagger",
            ["[Knife]"] = "Golden Age Tanto",
            ["[Double Barrel SG]"] = "Galaxy"
        } 
    },
    
    ["Avatar Modifications"] = {
        Enabled = false,
        Headless = false,
        Korblox = false,
        Morph = {
            Enabled = true,
            TargetId = 3577180836
        }
    },

    Hitsounds = {
        Enabled = false,
        Sound = "", 
        Volume = 3 
    }
}`;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: Missing SUPABASE_URL or SUPABASE_KEY in .env. Existing local accounts can log in, but registration/license checks are disabled.");
}
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: WebSocket
  }
}) : null;

// Middleware
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

// Helmet security headers (configured to allow inline scripts for simplicity in dev, but can be hardened)
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

// Rate Limiter to prevent brute force / DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl.startsWith('/api/connections'),
  message: { error: 'Too many requests from this IP, please try again later.' }
});

const connectionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow frequent connection polling without hitting the auth/config limiter
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many connection status requests. Please wait a moment.' }
});

app.use('/api/connections', connectionsLimiter);
app.use('/api/', limiter);

// Database helper functions (Safe read/writes to database.json)
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

// Auth middleware to secure APIs
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired. Please log in again.' });
    }

    // Check if user is banned in local DB
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

// --- WebSocket Connections for Roblox Executors ---
// Stores mapping of user -> set of WS connections
const clientConnections = new Map();
const getConnectionKey = (username) => String(username || '').trim().toLowerCase();

// HTTP upgrade handler for WebSocket
server.on('upgrade', (request, socket, head) => {
  console.log(`\n[WS Upgrade Attempt] URL: ${request.url}`);
  console.log(`[WS Upgrade Attempt] IP: ${socket.remoteAddress}`);
  console.log(`[WS Upgrade Attempt] Headers:`, JSON.stringify(request.headers));

  let token = null;

  // Try parsing cookies first
  const cookieHeader = request.headers.cookie || '';
  const cookies = cookieHeader.split(';').reduce((acc, c) => {
    const parts = c.split('=');
    if (parts[0]) {
      acc[parts[0].trim()] = (parts[1] || '').trim();
    }
    return acc;
  }, {});
  token = cookies.token;

  // Fallback to checking the token in the URL query string manually
  if (!token && request.url) {
    const match = request.url.match(/[?&]token=([^&]+)/);
    if (match) {
      token = match[1];
    }
  }

  // If token is missing, check if this is a local request and we can bypass validation for debugging
  if (!token) {
    const isLocal = socket.remoteAddress === '127.0.0.1' || socket.remoteAddress === '::1' || socket.remoteAddress === '::ffff:127.0.0.1';

    if (isLocal) {
      const db = readLocalDB();
      let fallbackUsername = null;
      if (db.length === 1) {
        fallbackUsername = db[0].username;
      } else if (db.length > 1 && global.lastActiveUsername) {
        fallbackUsername = global.lastActiveUsername;
      }

      if (fallbackUsername) {
        const localUser = db.find(u => u.username.toLowerCase() === fallbackUsername.toLowerCase());
        if (localUser && !localUser.banned) {
          console.log(`[WS Upgrade Bypass] Localhost connection accepted without token for user: ${localUser.username}`);
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request, localUser.username);
          });
          return;
        }
      }
    }

    console.warn(`[WS Upgrade Rejected] Reason: Missing token / no local fallback user.`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn(`[WS Upgrade Rejected] Reason: JWT verification failed.`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify user is not banned
    const db = readLocalDB();
    const localUser = db.find(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (!localUser || localUser.banned) {
      console.warn(`[WS Upgrade Rejected] Reason: User banned or not found.`);
      socket.write('HTTP/1.1 403 Forbidden - Banned\r\n\r\n');
      socket.destroy();
      return;
    }

    console.log(`[WS Upgrade Approved] Upgrading socket for user: ${localUser.username}`);
    // Upgrade connection
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, localUser.username);
    });
  });
});

wss.on('connection', (ws, request, username) => {
  console.log(`WebSocket client connected for user: ${username}`);

  const connectionKey = getConnectionKey(username);
  if (!clientConnections.has(connectionKey)) {
    clientConnections.set(connectionKey, new Set());
  }
  clientConnections.get(connectionKey).add(ws);

  const db = readLocalDB();
  const localUser = db.find(u => u.username.toLowerCase() === username.toLowerCase());

  // Send initial config immediately
  if (localUser && localUser.config && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'init',
      config: localUser.config
    }));
    console.log(`Sent initial config to ${username}`);
  }

  // Set up ping/pong keepalive to prevent timeout (every 30 seconds)
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);

  // Handle pong responses
  ws.on('pong', () => {
    console.log(`Received pong from ${username}`);
  });

  // Handle incoming messages from Roblox client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`Message from ${username}:`, message);
      
      // If client requests config refresh
      if (message.type === 'request_config') {
        const db = readLocalDB();
        const user = db.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user && user.config && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'update',
            config: user.config
          }));
          console.log(`Sent config refresh to ${username}`);
        }
      }
    } catch (err) {
      console.error(`Error parsing message from ${username}:`, err);
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket client disconnected for user: ${username}`);
    clearInterval(pingInterval);
    const userConns = clientConnections.get(connectionKey);
    if (userConns) {
      userConns.delete(ws);
      if (userConns.size === 0) {
        clientConnections.delete(connectionKey);
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${username}:`, err);
    clearInterval(pingInterval);
  });
});
// Broadcast config updates to a specific user's connected executors
function broadcastConfigUpdate(username, config) {
  const connectionKey = getConnectionKey(username);
  const userConns = clientConnections.get(connectionKey);
  let count = 0;
  let failedCount = 0;
  
  if (userConns && userConns.size > 0) {
    const payload = JSON.stringify({ type: 'update', config });
    const deadConnections = [];
    
    userConns.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload, (err) => {
            if (err) {
              console.error(`Failed to send config update to ${username}:`, err);
              failedCount++;
            } else {
              console.log(`Successfully sent config update to ${username}`);
            }
          });
          count++;
        } catch (err) {
          console.error(`Exception sending config update to ${username}:`, err);
          failedCount++;
          deadConnections.push(ws);
        }
      } else {
        console.log(`Removing dead connection for ${username} (readyState: ${ws.readyState})`);
        deadConnections.push(ws);
      }
    });
    
    // Clean up dead connections
    deadConnections.forEach(ws => userConns.delete(ws));
    
    if (userConns.size === 0) {
      clientConnections.delete(connectionKey);
    }
  }
  
  console.log(`[Activation] ${username}: sent config update to ${count} connection(s), ${failedCount} failed.`);
  return count;
}

// --- API Endpoints ---

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    app: 'sacrifice-config-hub',
    build: 'activate-route-v3-push-endpoint',
    activateRoute: 'POST /api/config/activate',
    pushRoute: 'POST /api/config/push',
    activateHandler: 'shared activation handler registered for activate and push',
    timestamp: new Date().toISOString()
  });
});

function activateConfigHandler(req, res) {
  console.log(`[Activation Route Hit] ${req.user.username}`);

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
      console.error(`Failed to persist activated config for ${user.username}:`, err);
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

// Registration (Sign Up)
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

  // Check if username is already registered
  const userExists = db.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
  if (userExists) {
    return res.status(400).json({ error: 'Username is already taken.' });
  }

  // Check if license is already used by a local account
  const licenseUsedLocally = db.some(u => u.license.toLowerCase() === licenseKey.toLowerCase().trim());
  if (licenseUsedLocally) {
    return res.status(400).json({ error: 'License key has already been used!' });
  }

  try {
    if (!supabase) {
      console.warn("Supabase is not configured. Registering user locally for development/offline mode.");
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
      return res.json({ success: true, message: 'Account registered locally (offline mode)!' });
    }

    // 1. Check if license exists in Supabase (Using array selection to prevent .single() crash)
    const { data: licenseDataArray, error: fetchErr } = await supabase
      .from('licenses')
      .select('*')
      .ilike('license', licenseKey.trim())
      .limit(1);

    if (fetchErr) {
      console.error("Supabase fetch error:", fetchErr);
      return res.status(500).json({ error: 'Database error. Please check server logs.' });
    }

    if (!licenseDataArray || licenseDataArray.length === 0) {
      return res.status(400).json({ error: 'License Invalid! Key not found in database.' });
    }

    const licenseData = licenseDataArray[0];

    // 2. Check if key is blacklisted
    if (licenseData.blacklisted) {
      return res.status(400).json({ error: 'License Invalid! Key is blacklisted.' });
    }

    // 3. REMOVED: Discord ID requirement. 
    // This was previously rejecting new keys by claiming they "haven't been claimed yet".

    // 4. Check if cloudclaimed is true
    if (licenseData.cloudclaimed === true) {
      return res.status(400).json({ error: 'This key has already been used!' });
    }

    // 5. Update cloudclaimed to true in Supabase
    const { error: updateErr } = await supabase
      .from('licenses')
      .update({ cloudclaimed: true })
      .eq('license', licenseData.license);

    if (updateErr) {
      console.error("Supabase update error:", updateErr);
      return res.status(500).json({ error: 'Failed to update license claim status. Try again later.' });
    }

    // 6. Securely hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 7. Save user in local DB
    const newUser = {
      username: trimmedUsername,
      password: hashedPassword,
      license: licenseKey.trim(),
      config: DEFAULT_LUA_CONFIG, // Default Sacrifice Lua table configuration
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

// Sign In (Login)
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

  // If user is already marked banned locally
  if (user.banned) {
    return res.status(403).json({ error: 'Your account is banned!' });
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  try {
    // Fetch license status from Supabase to verify blacklist status upon logging in
    if (supabase) {
      const { data: licenseDataArray, error: fetchErr } = await supabase
        .from('licenses')
        .select('*')
        .ilike('license', user.license)
        .limit(1);

      if (!fetchErr && licenseDataArray && licenseDataArray.length > 0) {
        if (licenseDataArray[0].blacklisted) {
          // BAN account instantly
          user.banned = true;
          writeLocalDB(db);
          return res.status(403).json({ error: 'Your account has been instantly banned due to license blacklisting!' });
        }
      }
    }
  } catch (err) {
    console.warn("Failed to check blacklist in Supabase during login. Continuing with caution.", err);
  }

  // Generate JWT token
  const token = jwt.sign(
    { username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' } // Secure 7 day session duration
  );

  // Set HTTP-Only Cookie for session persistence
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && req.hostname !== 'localhost' && req.hostname !== '127.0.0.1', // secure in production (HTTPS)
    sameSite: 'lax', // 'lax' allows WS upgrades from same-site navigations; executors use token in URL instead
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  global.lastActiveUsername = user.username;

  return res.json({
    success: true,
    user: { username: user.username, token: token }
  });
});

// Sign Out (Logout)
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully!' });
});

// Check Session Status
app.get('/api/auth/session', authenticateToken, (req, res) => {
  // Extract token from cookie to return back to frontend
  const token = req.cookies.token;
  global.lastActiveUsername = req.user.username;
  return res.json({
    authenticated: true,
    username: req.user.username,
    token: token
  });
});

// Fetch User Data (Discord details, license keys) from Supabase or Local DB fallback
app.get('/api/user/:username', authenticateToken, async (req, res) => {
  const username = req.params.username;
  const db = readLocalDB();
  const user = db.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  let discordId = 'Not linked';
  let keyDuration = 'Lifetime (Local)';

  if (supabase) {
    try {
      const { data: licenseDataArray, error: fetchErr } = await supabase
        .from('licenses')
        .select('*')
        .ilike('license', user.license)
        .limit(1);

      if (!fetchErr && licenseDataArray && licenseDataArray.length > 0) {
        const licenseData = licenseDataArray[0];
        discordId = licenseData.discordid || 'Not linked';
        keyDuration = licenseData.duration || 'Unlimited';
      }
    } catch (err) {
      console.warn("Failed to query user license details from Supabase during profile fetch:", err);
    }
  }

  return res.json({
    username: user.username,
    license: user.license,
    discordId: discordId,
    keyDuration: keyDuration
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

  // Validate that config contains the Sacrifice wrapper (allows comments/whitespace and case-insensitive 'sacrifice')
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

// Return connection count for frontend
app.get('/api/connections', authenticateToken, (req, res) => {
  const userConns = clientConnections.get(getConnectionKey(req.user.username));
  return res.json({ count: userConns ? userConns.size : 0 });
});

// Get user info for the Get Script feature (license key, username)
app.get('/api/user-info', authenticateToken, (req, res) => {
  return res.json({
    username: req.user.username,
    license: req.user.license || ''
  });
});

// Get Script Loader - returns a Lua loader script with the user's token & server URL embedded
app.get('/api/script', authenticateToken, (req, res) => {
  const token = req.cookies.token;
  const username = req.user.username;

  // Build the WebSocket URL the loader will connect to
  const host = req.get('host');
  const wsProtocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${host}?token=${token}`;

  // The main script source URL (configurable via env or default)
  const scriptUrl = process.env.SCRIPT_URL || '';

  const loaderScript = `-- Sacrifice Cloud Config Loader | ${username}
-- Paste into your executor

local WS_URL = "${wsUrl}"
local MAIN_SCRIPT_URL = "${scriptUrl}" -- Leave empty to only load config

-- Configuration
local CONNECT_TIMEOUT = 10
local RECONNECT_DELAY = 5
local MAX_RECONNECT_ATTEMPTS = 3
local PING_INTERVAL = 25

local HttpService = game:GetService("HttpService")
local ws = nil
local isConnected = false
local reconnectAttempts = 0
local lastPingTime = 0
local configLoaded = false

local function notify(title, text, dur)
    pcall(function()
        game:GetService("StarterGui"):SetCore("SendNotification", {
            Title = title, Text = text, Duration = dur or 3
        })
    end)
end

local function log(message)
    print("[Sacrifice Config] " .. message)
end

local function loadConfig(configString)
    if not configString or configString == "" then
        log("Received empty config")
        return false
    end
    
    log("Loading configuration...")
    
    local success, err = pcall(function()
        loadstring(configString)()
    end)
    
    if success then
        notify("Sacrifice", "Config loaded!")
        log("Configuration loaded successfully!")
        configLoaded = true
        return true
    else
        notify("Sacrifice", "Config error", 5)
        log("Failed to load configuration: " .. tostring(err))
        return false
    end
end

local function onMessage(message)
    log("Received message from server")
    
    local success, data = pcall(function()
        return HttpService:JSONDecode(message)
    end)
    
    if not success then
        log("Failed to parse message: " .. tostring(data))
        return
    end
    
    if data.type == "init" then
        log("Received initial configuration")
        loadConfig(data.config)
    elseif data.type == "update" then
        log("Received configuration update")
        notify("Sacrifice", "Config updated!")
        loadConfig(data.config)
    elseif data.type == "pong" then
        log("Received pong from server")
    end
end

local function sendPing()
    if ws and isConnected then
        local success, err = pcall(function()
            ws:Send(HttpService:JSONEncode({type = "ping"}))
        end)
        
        if success then
            log("Sent ping to server")
            lastPingTime = tick()
        else
            log("Failed to send ping: " .. tostring(err))
        end
    end
end

local function requestConfigRefresh()
    if ws and isConnected then
        local success, err = pcall(function()
            ws:Send(HttpService:JSONEncode({type = "request_config"}))
        end)
        
        if success then
            log("Requested config refresh")
        else
            log("Failed to request config: " .. tostring(err))
        end
    end
end

local function connect()
    if isConnected then
        log("Already connected")
        return
    end
    
    log("Connecting to server...")
    notify("Sacrifice", "Connecting...")
    
    local wsFunc = syn and syn.websocket and syn.websocket.connect
        or (WebSocket and WebSocket.connect)
        or (http and http.websocket and function(url)
            return http.websocket(url)
        end)
    
    if not wsFunc then
        notify("Sacrifice", "No WebSocket support", 5)
        log("WebSocket not supported by this executor")
        return
    end
    
    local success, result = pcall(wsFunc, WS_URL)
    
    if not success then
        log("Failed to create WebSocket: " .. tostring(result))
        notify("Sacrifice", "Connection failed", 5)
        reconnectAttempts = reconnectAttempts + 1
        
        if reconnectAttempts < MAX_RECONNECT_ATTEMPTS then
            log("Retrying in " .. RECONNECT_DELAY .. " seconds... (Attempt " .. reconnectAttempts .. "/" .. MAX_RECONNECT_ATTEMPTS .. ")")
            task.wait(RECONNECT_DELAY)
            connect()
        else
            notify("Sacrifice", "Max retries reached", 7)
            log("Max reconnection attempts reached. Please check your server and token.")
        end
        return
    end
    
    ws = result
    isConnected = true
    reconnectAttempts = 0
    log("Connected to server successfully!")
    notify("Sacrifice", "Connected!")
    
    ws.OnMessage:Connect(function(msg)
        onMessage(msg)
    end)
    
    ws.OnClose:Connect(function()
        log("Connection closed")
        notify("Sacrifice", "Connection closed", 5)
        isConnected = false
        
        if reconnectAttempts < MAX_RECONNECT_ATTEMPTS then
            log("Attempting to reconnect...")
            task.wait(RECONNECT_DELAY)
            connect()
        end
    end)
    
    -- Start ping loop
    spawn(function()
        while isConnected do
            task.wait(PING_INTERVAL)
            if isConnected then
                sendPing()
            end
        end
    end)
    
    -- Wait a moment for initial config
    task.wait(2)
    
    -- If no config received, request it
    if not configLoaded then
        log("No initial config received, requesting...")
        requestConfigRefresh()
    end
end

local function main()
    log("=== Sacrifice Cloud Config Loader ===")
    log("Server: " .. WS_URL)
    log("Starting connection...")
    
    -- Start connection
    connect()
    
    -- Wait for config to load (MUST complete before loading main script)
    local timeout = tick() + CONNECT_TIMEOUT
    while not configLoaded and tick() < timeout do
        task.wait(0.5)
    end
    
    if not configLoaded then
        notify("Sacrifice", "Config timeout", 7)
        log("ERROR: Timeout waiting for configuration. Cannot load main script without config!")
        return -- Don't load main script if config failed
    else
        log("=== Configuration loaded successfully! ===")
        notify("Sacrifice", "Config loaded!", 2)
    end
    
    -- Small delay to ensure config is fully applied
    task.wait(0.5)
    
    -- Verify the config table exists before loading main script
    if not getgenv().sacrifice then
        log("ERROR: Config table not found in getgenv().sacrifice!")
        notify("Sacrifice", "Config table missing!", 7)
        return
    end
    
    log("Config table verified: getgenv().sacrifice exists")
    
    -- Load main script if URL is provided (config is now guaranteed to exist)
    if MAIN_SCRIPT_URL and MAIN_SCRIPT_URL ~= "" then
        log("Loading main script from: " .. MAIN_SCRIPT_URL)
        notify("Sacrifice", "Loading script...", 2)
        
        local srcOk, srcErr = pcall(function()
            loadstring(game:HttpGet(MAIN_SCRIPT_URL))()
        end)
        
        if not srcOk then
            local errMsg = tostring(srcErr)
            if #errMsg > 80 then
                errMsg = errMsg:sub(1, 80) .. "..."
            end
            warn("[Sacrifice] Script error: " .. tostring(srcErr))
            notify("Sacrifice", "Script error: " .. errMsg, 7)
        else
            log("Main script loaded successfully!")
            notify("Sacrifice", "Script loaded!", 3)
        end
    else
        log("No main script URL provided - config only mode")
        notify("Sacrifice", "Config ready!", 3)
    end
    
    -- Keep WS alive for live config updates
    spawn(function()
        while true do
            task.wait(1)
        end
    end)
end

main()`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(loaderScript);
});

// Serve static frontend files from 'public' directory after API routes.
// Disable caching for this local GUI so browser refreshes always pick up edits.
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Error-handling fallback
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sacrifice config hub is running on http://localhost:${PORT}`);
});
