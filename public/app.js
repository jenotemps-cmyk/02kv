document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements
  const authContainer = document.getElementById('auth-container');
  const dashboardContainer = document.getElementById('dashboard-container');

  // Form toggles
  const toSignup = document.getElementById('to-signup');
  const toLogin = document.getElementById('to-login');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  // Display variables
  const userDisplay = document.getElementById('user-display');
  const configEditor = document.getElementById('config-editor');
  const saveStatus = document.getElementById('save-status');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  // Interactive buttons
  const btnLogout = document.getElementById('btn-logout');
  const btnLoad = document.getElementById('btn-load');
  const btnSave = document.getElementById('btn-save');
  const btnActivate = document.getElementById('btn-activate');
  const btnGetScript = document.getElementById('btn-get-script');
  const authToast = document.getElementById('auth-toast');
  const phraseDisplay = document.getElementById('phrase-display');

  // Settings modal elements
  const btnSettings = document.getElementById('btn-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const settingLogoUrl = document.getElementById('setting-logo-url');
  const logoImg = document.getElementById('logo-img');
  const navLogoImg = document.getElementById('nav-logo-img');
  const configPanels = document.getElementById('config-panels');
  const configNav = document.getElementById('config-nav');
  const configSectionTitle = document.getElementById('config-section-title');
  const configSectionSubtitle = document.getElementById('config-section-subtitle');

  // Configs management elements
  const configsManagement = document.getElementById('configs-management');
  const configsList = document.getElementById('configs-list');
  const configSaveName = document.getElementById('config-save-name');
  const btnSaveConfigNamed = document.getElementById('btn-save-config-named');
  const configImportText = document.getElementById('config-import-text');
  const btnImportConfig = document.getElementById('btn-import-config');
  const configExportText = document.getElementById('config-export-text');
  const btnCopyExport = document.getElementById('btn-copy-export');

  // Get Script modal
  const getScriptModal = document.getElementById('get-script-modal');
  const btnCloseScript = document.getElementById('btn-close-script');
  const scriptOutput = document.getElementById('script-output');
  const btnCopyScript = document.getElementById('btn-copy-script');

  // User Panel modal
  const userPanelModal = document.getElementById('user-panel-modal');
  const btnUserPanel = document.getElementById('btn-user-panel');
  const btnCloseUserPanel = document.getElementById('btn-close-user-panel');
  const btnCopyKey = document.getElementById('btn-copy-key');
  const userDiscordId = document.getElementById('user-discord-id');
  const userKeyDisplay = document.getElementById('user-key-display');
  const userKeyDuration = document.getElementById('user-key-duration');
  const userExecutions = document.getElementById('user-executions');

  if (window.location.protocol === 'file:') {
    window.location.replace('http://localhost:3000');
    return;
  }

  const API_BASE = '';
  const apiUrl = (path) => `${API_BASE}${path}`;
  window.SACRIFICE_APP_BUILD = 'app-v23-sacrifice-config-hub';

  let activeSessionToken = null;
  let activeUsername = null;
  let activeLicenseKey = null;
  let connectionCheckInterval = null;
  let activeConfigSection = 'silent';
  let sectionTransitionTimer = null;
  let userData = {
    discordId: null,
    keyDuration: null
  };

  // --- Saved Configs Storage ---
  const CONFIGS_STORAGE_KEY = 'sacrifice_saved_configs';
  const EXECUTIONS_KEY = 'sacrifice_executions';

  function getSavedConfigs() {
    try {
      return JSON.parse(localStorage.getItem(CONFIGS_STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  function setSavedConfigs(configs) {
    localStorage.setItem(CONFIGS_STORAGE_KEY, JSON.stringify(configs));
  }

  function getExecutionCount(username) {
    try {
      const counts = JSON.parse(localStorage.getItem(EXECUTIONS_KEY) || '{}');
      return counts[username] || 0;
    } catch { return 0; }
  }

  function incrementExecutionCount(username) {
    try {
      const counts = JSON.parse(localStorage.getItem(EXECUTIONS_KEY) || '{}');
      counts[username] = (counts[username] || 0) + 1;
      localStorage.setItem(EXECUTIONS_KEY, JSON.stringify(counts));
      return counts[username];
    } catch { return 1; }
  }

  // --- API Calls ---
  async function fetchUserDataFromSupabase(username) {
    try {
      const response = await fetch(apiUrl(`/api/user/${username}`), {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        userData.discordId = data.discordId || 'Not linked';
        userData.keyDuration = data.duration || 'Lifetime';
        if (userData.keyDuration && userData.keyDuration !== 'Lifetime') {
          const days = parseInt(userData.keyDuration);
          if (!isNaN(days)) userData.keyDuration = `${days} days`;
        }
        return data;
      }
    } catch (err) { console.warn('Failed to fetch user data:', err); }
    return null;
  }

  async function fetchLicenseKey(username) {
    try {
      const response = await fetch(apiUrl(`/api/user/${username}/license`), {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        activeLicenseKey = data.licenseKey;
        return activeLicenseKey;
      }
    } catch (err) { console.warn('Failed to fetch license key:', err); }
    return null;
  }

  function updateUserPanelDisplay() {
    if (userDiscordId) userDiscordId.textContent = userData.discordId || '-';
    if (userKeyDisplay && activeLicenseKey) {
      const masked = activeLicenseKey.substring(0, 8) + '********' + activeLicenseKey.substring(activeLicenseKey.length - 4);
      userKeyDisplay.textContent = masked;
    } else if (userKeyDisplay) userKeyDisplay.textContent = '-';
    if (userKeyDuration) userKeyDuration.textContent = userData.keyDuration || 'Lifetime';
    if (userExecutions && activeUsername) userExecutions.textContent = getExecutionCount(activeUsername) || '0';
  }

  // --- Logo Management ---
  function setLogoSource(img, source) {
    if (!img) return;
    const fallbackText = img.nextElementSibling;
    img.style.display = 'none';
    if (fallbackText && fallbackText.classList && fallbackText.classList.contains('logo-fallback-text')) {
      fallbackText.style.display = 'inline-block';
    }
    const probe = new Image();
    probe.onload = () => {
      img.src = source;
      img.style.display = 'inline-block';
      if (fallbackText && fallbackText.classList && fallbackText.classList.contains('logo-fallback-text')) {
        fallbackText.style.display = 'none';
      }
    };
    probe.onerror = () => {
      img.style.display = 'none';
      if (fallbackText && fallbackText.classList && fallbackText.classList.contains('logo-fallback-text')) {
        fallbackText.style.display = 'inline-block';
      }
    };
    probe.src = source;
  }

  function applyBrandingLogo() {
    const savedLogo = localStorage.getItem('sacrifice_logo_url');
    const logoSource = savedLogo || 'logo.png';
    setLogoSource(logoImg, logoSource);
    setLogoSource(navLogoImg, logoSource);
    if (savedLogo && settingLogoUrl) settingLogoUrl.value = savedLogo;
  }

  // --- Notifications ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.22s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  async function parseApiResponse(response) {
    const text = await response.text();
    try { return text ? JSON.parse(text) : {}; }
    catch (err) { return { error: text ? text.slice(0, 180) : `HTTP ${response.status}` }; }
  }

  async function loadRandomPhrase(username) {
    if (!phraseDisplay) return;
    try {
      const res = await fetch('/phrases.txt');
      if (!res.ok) throw new Error('Failed to load phrases');
      const text = await res.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) { phraseDisplay.textContent = 'No phrases available.'; return; }
      const choice = lines[Math.floor(Math.random() * lines.length)];
      const replaced = choice.replace(/\{user\}/g, username || 'Guest');
      phraseDisplay.textContent = replaced;
    } catch (err) { phraseDisplay.textContent = 'Unable to load phrases.'; }
  }

  function showAuthToast(message) {
    if (!authToast) return;
    authToast.textContent = message;
    authToast.classList.remove('hidden');
    setTimeout(() => { if (authToast) authToast.classList.add('hidden'); }, 5000);
  }

  function hideAuthToast() { if (authToast) authToast.classList.add('hidden'); }

  // --- Section Titles ---
  const sectionCopy = {
    silent: { title: 'Silent Aimbot', subtitle: 'Stealth aim assistance with customizable hit detection and FOV' },
    trigger: { title: 'Trigger Bot', subtitle: 'Auto-fire when crosshair is on target' },
    camera: { title: 'Camera Aimbot', subtitle: 'Smooth camera tracking with advanced prediction' },
    visuals: { title: 'ESP & Visuals', subtitle: 'Enhanced visual feedback and world modifications' },
    movement: { title: 'Movement', subtitle: 'Enhanced mobility and movement abilities' },
    weapons: { title: 'Weapons', subtitle: 'Weapon modifications and skin changer' },
    misc: { title: 'Miscellaneous', subtitle: 'Extra features and utilities' },
    configs: { title: 'Configs', subtitle: 'Save, load, import and export your configurations' }
  };

  // ============================================================
  // SILENT AIM CONTROLS (Organized by category)
  // ============================================================
  const silentCoreControls = [
    { type: 'toggle', label: 'Enable Silent Aim', pattern: '(\\[\\x27Silent Aim\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'toggle', label: 'Ignore FOV', pattern: '(\\[\\x27Silent Aim\\x27\\][\\s\\S]*?\\[\\x27Ignore Fov\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'toggle', label: 'One Tap Mode', pattern: '(\\[\\x27One Tap\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'select', label: 'Hit Part', pattern: '(\\[\\x27Hit Part\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', fallback: 'Closest Point', options: ['Closest Point', 'Head', 'UpperTorso', 'HumanoidRootPart', 'LowerTorso'] },
    { type: 'range', label: 'Hit Chance', pattern: '(\\bHitChance\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 100, min: 0, max: 100, step: 1, suffix: '%' },
    { type: 'range', label: 'Smoothing', pattern: '(\\bSmoothing\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0.1, min: 0, max: 1, step: 0.01 },
    { type: 'select', label: 'Mode', pattern: '(\\bMode\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'Target', options: ['Target', 'Automatic'] },
    { type: 'select', label: 'Target Priority', pattern: '(\\bTargetPriority\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'Fov', options: ['Fov', 'Distance', 'Health'] },
    { type: 'text', label: 'Target Keybind', pattern: '(\\bTargetKeybind\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'C' },
    { type: 'toggle', label: 'Target Mode Force Hit', pattern: '(\\bTargetModeForceHit\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'toggle', label: 'Global Wall Check', pattern: '(\\["Global WallCheck"\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'toggle', label: 'Knock Check', pattern: '(\\["Knock Check"\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true }
  ];

  const silentFovControls = [
    { type: 'toggle', label: 'FOV Enabled', pattern: '(\\[\\x27Fov\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'toggle', label: 'FOV Visible', pattern: '(\\[\\x27Fov\\x27\\][\\s\\S]*?\\[\\x27Visible\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'FOV Radius', pattern: '(\\[\\x27Radius\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 350, min: 0, max: 1000, step: 5, suffix: 'px' },
    { type: 'range', label: 'FOV Thickness', pattern: '(\\[\\x27Thickness\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 1.5, min: 0, max: 10, step: 0.1 },
    { type: 'range', label: 'FOV Transparency', pattern: '(\\[\\x27Transparency\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 1, min: 0, max: 1, step: 0.05 },
    { type: 'toggle', label: 'FOV Filled', pattern: '(\\[\\x27Filled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'text', label: 'FOV Color (R,G,B)', pattern: '(\\[\\x27Color\\x27\\]\\s*=\\s*Color3\\.fromRGB\\()([^)]+)(\\)\\s*,)', fallback: '0, 17, 255', valueMode: 'raw' }
  ];

  const silentLegitControls = [
    { type: 'toggle', label: 'Legit Mode', pattern: '(\\[\\x27Legit\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Legit Hit Chance', pattern: '(\\[\\x27Legit\\x27\\][\\s\\S]*?\\[\\x27Hit Chance\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 100, min: 0, max: 100, step: 1, suffix: '%' },
    { type: 'toggle', label: 'FOV Scaling Hit Chance', pattern: '(\\[\\x27FovScalingHitChance\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'toggle', label: 'Anti Curve', pattern: '(\\[\\x27Anti Curve\\x27\\]\\s*=\\s*\\{\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Anti Curve Max Angle', pattern: '(\\[\\x27Anti Curve\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Max Angle\\x27\\]\\s*=\\s*)([0-9.]+)(\\})', fallback: 15, min: 0, max: 90, step: 1, suffix: '°' },
    { type: 'toggle', label: 'Anti Aimview', pattern: '(\\[\\x27Anti Aimview\\x27\\]\\s*=\\s*\\{\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Anti Aimview Max Angle', pattern: '(\\[\\x27Anti Aimview\\x27\\][\\s\\S]*?\\[\\x27Max Angle\\x27\\]\\s*=\\s*)([0-9.]+)(\\})', fallback: 15, min: 0, max: 90, step: 1, suffix: '°' },
    { type: 'toggle', label: 'Scaling', pattern: '(\\[\\x27Scaling\\x27\\]\\s*=\\s*\\{\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Scaling Factor', pattern: '(\\[\\x27Scaling\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Factor\\x27\\]\\s*=\\s*)([0-9.]+)(\\})', fallback: 1, min: 0, max: 5, step: 0.1 },
    { type: 'range', label: 'Max Distance', pattern: '(\\[\\x27Checks\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Max Distance\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 1222, min: 0, max: 5000, step: 25, suffix: 'studs' },
    { type: 'toggle', label: 'Auto Distance', pattern: '(\\[\\x27Auto Distance\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false }
  ];

  const silentPredictionControls = [
    { type: 'toggle', label: 'Auto Predictions', pattern: '(\\[\\x27Auto Predictions\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Prediction Intensity', pattern: '(\\[\\x27Auto Predictions\\x27\\][\\s\\S]*?\\[\\x27Intensity\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 1, min: 0, max: 10, step: 0.5 },
    { type: 'range', label: 'Prediction Max Offset', pattern: '(\\[\\x27Auto Predictions\\x27\\][\\s\\S]*?\\[\\x27Max Offset\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 15, min: 0, max: 50, step: 1 },
    { type: 'toggle', label: 'Manual Predictions', pattern: '(\\[\\x27Predictions\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Prediction X', pattern: '(\\[\\x27Predictions\\x27\\][\\s\\S]*?\\[\\x27x\\x27\\]\\s*=\\s*)([0-9.-]+)(\\s*,)', fallback: 0, min: 0, max: 10, step: 0.5 },
    { type: 'range', label: 'Prediction Y', pattern: '(\\[\\x27Predictions\\x27\\][\\s\\S]*?\\[\\x27y\\x27\\]\\s*=\\s*)([0-9.-]+)(\\s*,)', fallback: 0, min: 0, max: 10, step: 0.5 },
    { type: 'range', label: 'Prediction Z', pattern: '(\\[\\x27Predictions\\x27\\][\\s\\S]*?\\[\\x27z\\x27\\]\\s*=\\s*)([0-9.-]+)(\\s*\\})', fallback: 0, min: -50, max: 50, step: 1 }
  ];

  const silentTracerControls = [
    { type: 'toggle', label: 'Tracer Enabled', pattern: '(Tracer\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Tracer Thickness', pattern: '(Tracer\\s*=\\s*\\{[\\s\\S]*?Thickness\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 1.5, min: 0, max: 10, step: 0.1 },
    { type: 'range', label: 'Tracer Transparency', pattern: '(Tracer\\s*=\\s*\\{[\\s\\S]*?Transparency\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 1, min: 0, max: 1, step: 0.05 },
    { type: 'text', label: 'Tracer Color (R,G,B)', pattern: '(Tracer\\s*=\\s*\\{[\\s\\S]*?Color\\s*=\\s*Color3\\.fromRGB\\()([^)]+)(\\)\\s*,)', fallback: '255, 0, 0', valueMode: 'raw' }
  ];

  const silentClosestControls = [
    { type: 'range', label: 'Closest Point Samples', pattern: '(\\[\\x27Closest Point\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Samples\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 3, min: 1, max: 20, step: 1 },
    { type: 'toggle', label: 'Diagonal Sampling', pattern: '(\\[\\x27Closest Point\\x27\\][\\s\\S]*?\\[\\x27Diagonal\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'toggle', label: 'Show Points', pattern: '(\\[\\x27Closest Point\\x27\\][\\s\\S]*?\\[\\x27ShowPoints\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'text', label: 'Point Color (R,G,B)', pattern: '(\\[\\x27PointColor\\x27\\]\\s*=\\s*Color3\\.fromRGB\\()([^)]+)(\\)\\s*\\})', fallback: '255, 0, 0', valueMode: 'raw' }
  ];

  // ============================================================
  // TRIGGER BOT CONTROLS
  // ============================================================
  const triggerCoreControls = [
    { type: 'toggle', label: 'Enable Trigger Bot', pattern: '(\\[\\x27Trigger Bot\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'text', label: 'Trigger Keybind', pattern: '(\\[\\x27Trigger Bot\\x27\\][\\s\\S]*?\\[\\x27Keybind\\x27\\]\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'T' },
    { type: 'text', label: 'Target Keybind', pattern: '(\\[\\x27TargetKeybind\\x27\\]\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'H' },
    { type: 'range', label: 'Trigger Interval', pattern: '(\\[\\x27Interval\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0.01, min: 0, max: 1, step: 0.01, suffix: 's' },
    { type: 'select', label: 'Activation Mode', pattern: '(\\[\\x27Activation\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', fallback: 'Toggle', options: ['Toggle', 'Hold'] },
    { type: 'select', label: 'Trigger Mode', pattern: '(\\[\\x27Trigger Bot\\x27\\][\\s\\S]*?\\[\\x27Mode\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', fallback: 'Fov', options: ['Fov', 'Target'] },
    { type: 'toggle', label: 'Knock Check', pattern: '(\\[\\x27Knock Check\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Max Distance', pattern: '(\\[\\x27Checks\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Max Distance\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 3411, min: 0, max: 10000, step: 50, suffix: 'studs' },
    { type: 'toggle', label: 'Auto Distance', pattern: '(\\[\\x27Auto Distance\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: false }
  ];

  const triggerHitControls = [
    { type: 'select', label: 'Hit Type', pattern: '(\\[\\x27Hits\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', fallback: 'Everything', options: ['Everything', 'Players', 'HitParts'] },
    { type: 'toggle', label: 'Humanized Reaction', pattern: '(\\[\\x27HumanizedReaction\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'toggle', label: 'Input Delay Enabled', pattern: '(\\[\\x27Input\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Input Start Delay', pattern: '(\\[\\x27Start\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0, min: 0, max: 1, step: 0.01, suffix: 's' },
    { type: 'range', label: 'Input End Delay', pattern: '(\\[\\x27End\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0, min: 0, max: 1, step: 0.01, suffix: 's' },
    { type: 'toggle', label: 'Custom Hitbox Size', pattern: '(CustomSize\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Custom Hitbox Value', pattern: '(CustomSize\\s*=\\s*\\{[\\s\\S]*?Value\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 40, min: 0, max: 200, step: 1 }
  ];

  const triggerWeaponControls = [
    { type: 'toggle', label: 'Enable Double Barrel SG', pattern: '', fallback: true, weaponName: '[Double-Barrel SG]' },
    { type: 'toggle', label: 'Enable Revolver', pattern: '', fallback: true, weaponName: '[Revolver]' },
    { type: 'toggle', label: 'Enable Tactical Shotgun', pattern: '', fallback: true, weaponName: '[TacticalShotgun]' },
    { type: 'toggle', label: 'Enable Glock', pattern: '', fallback: true, weaponName: '[Glock]' }
  ];

  // ============================================================
  // CAMERA AIMBOT CONTROLS
  // ============================================================
  const cameraCoreControls = [
    { type: 'toggle', label: 'Enable Camlock', pattern: '(\\[\\x27Camlock\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'text', label: 'Camlock Keybind', pattern: '(\\[\\x27Camlock\\x27\\][\\s\\S]*?\\[\\x27Keybind\\x27\\]\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'Q' },
    { type: 'toggle', label: 'Unlock On Death', pattern: '(\\[\\x27UnlockOnDeath\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'toggle', label: 'Wall Check', pattern: '(\\[\\x27Camlock\\x27\\][\\s\\S]*?\\[\\x27WallCheck\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'toggle', label: 'Ignore FOV', pattern: '(\\[\\x27Camlock\\x27\\][\\s\\S]*?\\[\\x27Ignore Fov\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'select', label: 'Activation Mode', pattern: '(\\[\\x27Activation\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', fallback: 'Toggle', options: ['Toggle', 'Hold'] },
    { type: 'select', label: 'Camlock Mode', pattern: '(\\[\\x27Mode\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', fallback: 'Fov', options: ['Fov', 'Target'] },
    { type: 'select', label: 'Smooth Mode', pattern: '(\\[\\x27Smooth Mode\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', fallback: 'Legit', options: ['Legit', 'Rage'] },
    { type: 'select', label: 'Method', pattern: '(\\[\\x27Method\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', fallback: 'Camera', options: ['Camera', 'Mouse'] }
  ];

  const cameraTargetControls = [
    { type: 'select', label: 'Target Part', pattern: '(\\[\\x27Part\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', fallback: 'UpperTorso', options: ['Head', 'UpperTorso', 'HumanoidRootPart', 'LowerTorso'] },
    { type: 'range', label: 'Blend', pattern: '(\\[\\x27Blend\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0.17, min: 0, max: 1, step: 0.01 },
    { type: 'range', label: 'Snappiness', pattern: '(\\[\\x27Snappiness\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0.045, min: 0, max: 1, step: 0.005 },
    { type: 'toggle', label: 'Dynamic Height Compensation', pattern: '(\\[\\x27DynamicHeightCompensation\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Vertical Adjustment Offset', pattern: '(\\[\\x27VerticalAdjustmentOffset\\x27\\]\\s*=\\s*)([0-9.-]+)(\\s*,)', fallback: 0, min: -50, max: 50, step: 1 },
    { type: 'range', label: 'Max Distance', pattern: '(\\[\\x27Checks\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Max Distance\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 1000, min: 0, max: 5000, step: 50, suffix: 'studs' },
    { type: 'toggle', label: 'First Person', pattern: '(\\[\\x27Checks\\x27\\][\\s\\S]*?\\[\\x27First Person\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'toggle', label: 'Third Person', pattern: '(\\[\\x27Checks\\x27\\][\\s\\S]*?\\[\\x27Third Person\\x27\\]\\s*=\\s*)(true|false)(\\s*\\})', fallback: true }
  ];

  const cameraPredictionControls = [
    { type: 'toggle', label: 'Enable Camera Predictions', pattern: '(\\[\\x27Predictions\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Prediction X', pattern: '(\\[\\x27Predictions\\x27\\][\\s\\S]*?\\[\\x27x\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0.125, min: 0, max: 10, step: 0.025 },
    { type: 'range', label: 'Prediction Y', pattern: '(\\[\\x27Predictions\\x27\\][\\s\\S]*?\\[\\x27y\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0.225, min: 0, max: 10, step: 0.025 },
    { type: 'range', label: 'Prediction Z', pattern: '(\\[\\x27Predictions\\x27\\][\\s\\S]*?\\[\\x27z\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 0.125, min: -5, max: 5, step: 0.025 }
  ];

  const cameraShakeControls = [
    { type: 'toggle', label: 'Human Shake', pattern: '(\\[\\x27HumanShake\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Shake Amount', pattern: '(\\[\\x27HumanShake\\x27\\][\\s\\S]*?\\[\\x27Amount\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 0.55, min: 0, max: 3, step: 0.05 },
    { type: 'toggle', label: 'Global Shake', pattern: '(Shake\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'select', label: 'Shake Mode', pattern: '(ShakeMode\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'WholeBody', options: ['WholeBody', 'Camera', 'Gun'] },
    { type: 'range', label: 'Shake X Intensity', pattern: '(Shake\\s*=\\s*\\{[\\s\\S]*?\\bX\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0.5, min: 0, max: 10, step: 0.05 },
    { type: 'range', label: 'Shake Y Intensity', pattern: '(Shake\\s*=\\s*\\{[\\s\\S]*?\\bY\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 0.5, min: 0, max: 10, step: 0.05 }
  ];

  const cameraRoboticControls = [
    { type: 'toggle', label: 'Robotic Mode', pattern: '(Robotic\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'text', label: 'Mode Switch Keybind', pattern: '(ModeSwitchKeybind\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'G' },
    { type: 'text', label: 'Flick Keybind', pattern: '(FlickKeybind\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'F' },
    { type: 'toggle', label: 'Overshoot', pattern: '(Overshoot\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Overshoot Multiplier', pattern: '(Overshoot\\s*=\\s*\\{[\\s\\S]*?Multiplier\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 1.35, min: 0, max: 5, step: 0.05 },
    { type: 'range', label: 'Overshoot Decay', pattern: '(Overshoot\\s*=\\s*\\{[\\s\\S]*?DecaySpeed\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 12, min: 0, max: 50, step: 0.5 },
    { type: 'toggle', label: 'Jitter', pattern: '(Jitter\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Jitter Frequency', pattern: '(Jitter\\s*=\\s*\\{[\\s\\S]*?Frequency\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 45, min: 0, max: 100, step: 1 },
    { type: 'range', label: 'Jitter Amplitude X', pattern: '(Jitter\\s*=\\s*\\{[\\s\\S]*?AmplitudeX\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 2.2, min: 0, max: 10, step: 0.1 },
    { type: 'range', label: 'Jitter Amplitude Y', pattern: '(Jitter\\s*=\\s*\\{[\\s\\S]*?AmplitudeY\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 2.2, min: 0, max: 10, step: 0.1 },
    { type: 'toggle', label: 'Spasm', pattern: '(Spasm\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Spasm Chance', pattern: '(Spasm\\s*=\\s*\\{[\\s\\S]*?Chance\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0.08, min: 0, max: 1, step: 0.01, suffix: '%' },
    { type: 'range', label: 'Spasm Max Distance', pattern: '(Spasm\\s*=\\s*\\{[\\s\\S]*?MaxSpikeDistance\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 5.5, min: 0, max: 20, step: 0.5 }
  ];

  // ============================================================
  // VISUALS CONTROLS
  // ============================================================
  const visualsEspControls = [
    { type: 'toggle', label: 'ESP Enabled', pattern: '(ESP\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'text', label: 'ESP Keybind', pattern: '(ESP\\s*=\\s*\\{[\\s\\S]*?Keybind\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'B' },
    { type: 'range', label: 'ESP Text Size', pattern: '(ESP\\s*=\\s*\\{[\\s\\S]*?Size\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 11, min: 5, max: 30, step: 1 },
    { type: 'text', label: 'Default ESP Color (R,G,B)', pattern: '(DefaultColor\\s*=\\s*Color3\\.fromRGB\\()([^)]+)(\\)\\s*,)', fallback: '255, 255, 255', valueMode: 'raw' },
    { type: 'text', label: 'Target ESP Color (R,G,B)', pattern: '(TargetColor\\s*=\\s*Color3\\.fromRGB\\()([^)]+)(\\)\\s*,)', fallback: '255, 0, 0', valueMode: 'raw' },
    { type: 'text', label: 'Silent Aim Target Color (R,G,B)', pattern: '(SilentAimTargetColor\\s*=\\s*Color3\\.fromRGB\\()([^)]+)(\\)\\s*\\})', fallback: '255, 0, 255', valueMode: 'raw' }
  ];

  const visualsWatermarkControls = [
    { type: 'toggle', label: 'Watermark Enabled', pattern: '(Watermark\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'text', label: 'Watermark Text', pattern: '(Watermark\\s*=\\s*\\{[\\s\\S]*?Username\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'Sacrifice.cc' },
    { type: 'text', label: 'Watermark Color (R,G,B)', pattern: '(Watermark\\s*=\\s*\\{[\\s\\S]*?Color\\s*=\\s*Color3\\.fromRGB\\()([^)]+)(\\)\\s*\\})', fallback: '12, 12, 255', valueMode: 'raw' }
  ];

  const visualsWorldControls = [
    { type: 'toggle', label: 'Color Modifications', pattern: '(\\["Color Modifications"\\]\\s*=\\s*\\{\\s*Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Vibrancy', pattern: '(Vibrancy\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0.45, min: 0, max: 2, step: 0.05 },
    { type: 'range', label: 'Contrast', pattern: '(Contrast\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0, min: -1, max: 1, step: 0.05 },
    { type: 'range', label: 'Brightness', pattern: '(Brightness\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 0, min: -1, max: 1, step: 0.05 },
    { type: 'toggle', label: 'Sky Enabled', pattern: '(Sky\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'select', label: 'Sky Color', pattern: '(Sky\\s*=\\s*\\{[\\s\\S]*?Color\\s*=\\s*)"([^"]*)"(\\s*\\})', fallback: 'Black', options: ['Black', 'Red', 'Blue', 'Purple', 'Green', 'Yellow', 'White'] }
  ];

  // ============================================================
  // MOVEMENT CONTROLS
  // ============================================================
  const movementSpeedControls = [
    { type: 'toggle', label: 'Speed Mod Enabled', pattern: '(\\["Speed Modifications"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Default Walk Speed', pattern: '(DefaultSpeed\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 35, min: 0, max: 500, step: 1, suffix: 'walkspeed' },
    { type: 'select', label: 'Speed Method', pattern: '(Method\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'WalkSpeed', options: ['WalkSpeed', 'Velocity'] },
    { type: 'text', label: 'Speed Keybind', pattern: '(Keybind\\s*=\\s*)"([^"]*)"(\\s*\\})', fallback: 'V' }
  ];

  const movementJumpControls = [
    { type: 'toggle', label: 'Jump Mod Enabled', pattern: '(\\["Jump Modifications"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Jump Power', pattern: '(JumpPower\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 60, min: 0, max: 500, step: 1 },
    { type: 'text', label: 'Jump Keybind', pattern: '(Keybind\\s*=\\s*)"([^"]*)"(\\s*\\})', fallback: 'H' }
  ];

  const movementSpidermanControls = [
    { type: 'toggle', label: 'Spiderman Enabled', pattern: '(Spiderman\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Jump Boost', pattern: '(\\["Jump Boost"\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 80, min: 0, max: 300, step: 5 },
    { type: 'range', label: 'Jump Height', pattern: '(\\["Jump Height"\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 80, min: 0, max: 300, step: 5 },
    { type: 'range', label: 'Jump Delay', pattern: '(\\["Jump Delay"\\]\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0, min: 0, max: 1, step: 0.05, suffix: 's' },
    { type: 'text', label: 'Spiderman Keybind', pattern: '(Keybind\\s*=\\s*)"([^"]*)"(\\s*\\})', fallback: 'J' }
  ];

  const movementOrbitControls = [
    { type: 'toggle', label: 'Orbit Enabled', pattern: '(Orbit\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'text', label: 'Orbit Keybind', pattern: '(Keybind\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'Z' },
    { type: 'range', label: 'Orbit Distance', pattern: '(Distance\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 10, min: 0, max: 50, step: 1, suffix: 'studs' },
    { type: 'range', label: 'Orbit Height', pattern: '(Height\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0, min: -20, max: 20, step: 1 },
    { type: 'range', label: 'Orbit Speed', pattern: '(Speed\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 6150, min: 0, max: 20000, step: 100 },
    { type: 'toggle', label: 'Auto Kill', pattern: '(AutoKill\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'toggle', label: 'Auto Reload', pattern: '(AutoReload\\s*=\\s*)(true|false)(\\s*,)', fallback: true }
  ];

  const movementMiscControls = [
    { type: 'toggle', label: 'Noclip Enabled', pattern: '(Noclip\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'text', label: 'Noclip Keybind', pattern: '(Keybind\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'N' },
    { type: 'toggle', label: 'Panic Ground', pattern: '(\\["Panic Ground"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'text', label: 'Panic Keybind', pattern: '(Keybind\\s*=\\s*)"([^"]*)"(\\s*\\})', fallback: 'P' },
    { type: 'toggle', label: 'Anti Stomp', pattern: '(AntiStomp\\s*=\\s*\\{Enabled\\s*=\\s*)(true|false)(\\s*\\})', fallback: false }
  ];

  // ============================================================
  // WEAPONS CONTROLS
  // ============================================================
  const weaponsSpreadControls = [
    { type: 'toggle', label: 'Spread Mod Enabled', pattern: '(SpreadMod\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Spread Amount', pattern: '(Amount\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 70, min: 0, max: 100, step: 1, suffix: '%' },
    { type: 'toggle', label: 'Wallbang Enabled', pattern: '(\\["Wallbang"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*\\})', fallback: true }
  ];

  const weaponsFireRateControls = [
    { type: 'toggle', label: 'Rapid Fire', pattern: '(Traced\\s*=\\s*\\{[\\s\\S]*?RapidFire\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Rapid Fire Delay', pattern: '(RapidFireDelay\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 0.01, min: 0, max: 0.5, step: 0.01, suffix: 's' },
    { type: 'toggle', label: 'Delay Changer', pattern: '(\\["Delay Changer"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Global Delay', pattern: '(GlobalDelay\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 0.08, min: 0, max: 1, step: 0.01, suffix: 's' }
  ];

  const weaponsRageControls = [
    { type: 'toggle', label: 'Rage Mode', pattern: '(RageMode\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Fire Interval', pattern: '(FireInterval\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 0.00001, min: 0, max: 0.1, step: 0.00001, suffix: 's' }
  ];

  const weaponsSkinControls = [
    { type: 'toggle', label: 'Skin Changer Enabled', pattern: '(\\["Skin Changer"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'text', label: 'Revolver Skin', pattern: '(\\["\\[Revolver\\]"\\]\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'Inferno' },
    { type: 'text', label: 'Glock Skin', pattern: '(\\["\\[Glock\\]"\\]\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'Blue Dagger' },
    { type: 'text', label: 'Knife Skin', pattern: '(\\["\\[Knife\\]"\\]\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: 'Golden Age Tanto' },
    { type: 'text', label: 'Double Barrel SG Skin', pattern: '(\\["\\[Double Barrel SG\\]"\\]\\s*=\\s*)"([^"]*)"(\\s*\\})', fallback: 'Galaxy' }
  ];

  // ============================================================
  // MISC CONTROLS
  // ============================================================
  const miscHitboxControls = [
    { type: 'toggle', label: 'Hitbox Expander', pattern: '(\\["Hitbox Expander"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Hitbox Size', pattern: '(Size\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 110, min: 0, max: 200, step: 1, suffix: '%' },
    { type: 'toggle', label: 'Visualize Hitbox', pattern: '(Visualize\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'toggle', label: 'Ignore Dead', pattern: '(\\["Ignore Dead"\\]\\s*=\\s*)(true|false)(\\s*\\})', fallback: false }
  ];

  const miscDamageControls = [
    { type: 'toggle', label: 'Damage Override', pattern: '(Overrider\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Override Damage Amount', pattern: '(Damage\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 200, min: 1, max: 9999, step: 1 },
    { type: 'toggle', label: 'Damage Amplifier', pattern: '(Amplifier\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'range', label: 'Damage Multiplier', pattern: '(Multiplier\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 35, min: 1, max: 100, step: 1, suffix: 'x' }
  ];

  const miscRangeControls = [
    { type: 'toggle', label: 'Infinite Range', pattern: '(\\["Infinite Range"\\]\\s*=\\s*\\{[\\s\\S]*?enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'range', label: 'Range Distance', pattern: '(range\\s*=\\s*)([0-9.]+)(\\s*,)', fallback: 1000, min: 100, max: 5000, step: 50, suffix: 'studs' },
    { type: 'range', label: 'Bypass Position', pattern: '(bypasspos\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 10, min: 0, max: 50, step: 1 }
  ];

  const miscAvatarControls = [
    { type: 'toggle', label: 'Avatar Mods Enabled', pattern: '(\\["Avatar Modifications"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'toggle', label: 'Headless', pattern: '(Headless\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'toggle', label: 'Korblox', pattern: '(Korblox\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'toggle', label: 'Morph Enabled', pattern: '(Morph\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: true },
    { type: 'text', label: 'Morph Target ID', pattern: '(TargetId\\s*=\\s*)([0-9]+)(\\s*\\})', fallback: '3577180836' }
  ];

  const miscSoundControls = [
    { type: 'toggle', label: 'Hitsounds Enabled', pattern: '(Hitsounds\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', fallback: false },
    { type: 'text', label: 'Sound ID', pattern: '(Sound\\s*=\\s*)"([^"]*)"(\\s*,)', fallback: '' },
    { type: 'range', label: 'Volume', pattern: '(Volume\\s*=\\s*)([0-9.]+)(\\s*\\})', fallback: 3, min: 0, max: 10, step: 0.5 }
  ];

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  function getControlValue(control) {
    if (!configEditor || !configEditor.value) return control.fallback;
    const match = configEditor.value.match(new RegExp(control.pattern, 'm'));
    if (!match) return control.fallback;
    if (control.type === 'toggle') return match[2] === 'true';
    if (control.type === 'range') return Number(match[2]);
    return match[2];
  }

  function formatControlValue(control, value) {
    if (control.type === 'toggle') return value ? 'true' : 'false';
    if (control.type === 'range') return String(Number(value));
    if (control.valueMode === 'raw') return String(value);
    if (control.type === 'text' || control.type === 'select') return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    return String(value);
  }

  function updateConfigValue(control, value) {
    if (!configEditor || !configEditor.value) return;
    const pattern = new RegExp(control.pattern, 'm');
    const formatted = formatControlValue(control, value);
    if (!pattern.test(configEditor.value)) {
      showToast(`Could not find ${control.label}`, 'warning');
      return;
    }
    configEditor.value = configEditor.value.replace(pattern, `$1${formatted}$3`);
    if (saveStatus) saveStatus.textContent = 'Unsaved changes';
  }

  function updateRangeFill(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || 0);
    const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty('--range-fill', `${Math.max(0, Math.min(100, percent))}%`);
  }

  // ============================================================
  // RENDER FUNCTIONS
  // ============================================================
  function renderConfigControls(sectionKey = activeConfigSection) {
    if (!configPanels || !configEditor) return;

    activeConfigSection = sectionKey;
    const section = sectionCopy[sectionKey] || sectionCopy.silent;
    if (configSectionTitle) configSectionTitle.textContent = section.title;
    if (configSectionSubtitle) configSectionSubtitle.textContent = section.subtitle;

    if (sectionKey === 'configs') {
      if (configPanels) {
        configPanels.innerHTML = '';
        configPanels.classList.add('hidden');
      }
      if (configsManagement) configsManagement.classList.remove('hidden');
      renderSavedConfigs();
      if (configExportText && configEditor) configExportText.value = configEditor.value || '';
      return;
    }

    if (configsManagement) configsManagement.classList.add('hidden');
    if (configPanels) {
      configPanels.classList.remove('hidden');
      configPanels.innerHTML = '';
    }

    let cards = [];

    if (sectionKey === 'silent') {
      cards = [
        { title: 'Core Settings', controls: silentCoreControls },
        { title: 'Field of View (FOV)', controls: silentFovControls },
        { title: 'Legit & Anti-Cheat', controls: silentLegitControls },
        { title: 'Predictions', controls: silentPredictionControls },
        { title: 'Tracers', controls: silentTracerControls },
        { title: 'Closest Point', controls: silentClosestControls }
      ];
    } else if (sectionKey === 'trigger') {
      cards = [
        { title: 'Core Settings', controls: triggerCoreControls },
        { title: 'Hit Settings', controls: triggerHitControls },
        { title: 'Weapons', controls: triggerWeaponControls }
      ];
    } else if (sectionKey === 'camera') {
      cards = [
        { title: 'Core Settings', controls: cameraCoreControls },
        { title: 'Target Settings', controls: cameraTargetControls },
        { title: 'Predictions', controls: cameraPredictionControls },
        { title: 'Shake Settings', controls: cameraShakeControls },
        { title: 'Robotic Settings', controls: cameraRoboticControls }
      ];
    } else if (sectionKey === 'visuals') {
      cards = [
        { title: 'ESP (Wallhack)', controls: visualsEspControls },
        { title: 'Watermark', controls: visualsWatermarkControls },
        { title: 'World Visuals', controls: visualsWorldControls }
      ];
    } else if (sectionKey === 'movement') {
      cards = [
        { title: 'Speed Modifications', controls: movementSpeedControls },
        { title: 'Jump Modifications', controls: movementJumpControls },
        { title: 'Spiderman', controls: movementSpidermanControls },
        { title: 'Orbit', controls: movementOrbitControls },
        { title: 'Mobility Helpers', controls: movementMiscControls }
      ];
    } else if (sectionKey === 'weapons') {
      cards = [
        { title: 'Spread & Wallbang', controls: weaponsSpreadControls },
        { title: 'Fire Rate', controls: weaponsFireRateControls },
        { title: 'Rage Mode', controls: weaponsRageControls },
        { title: 'Skin Changer', controls: weaponsSkinControls }
      ];
    } else if (sectionKey === 'misc') {
      cards = [
        { title: 'Hitbox Expander', controls: miscHitboxControls },
        { title: 'Damage Modifications', controls: miscDamageControls },
        { title: 'Infinite Range', controls: miscRangeControls },
        { title: 'Avatar Modifications', controls: miscAvatarControls },
        { title: 'Hitsounds', controls: miscSoundControls }
      ];
    }

    for (const card of cards) {
      const cardEl = document.createElement('section');
      cardEl.className = 'glass-card setting-card';

      const header = document.createElement('div');
      header.className = 'setting-card-header';
      header.innerHTML = `<span class="card-dot"></span><h2>${card.title}</h2>`;
      cardEl.appendChild(header);

      const rows = document.createElement('div');
      rows.className = 'setting-rows';

      for (const control of card.controls) {
        if (control.weaponName) {
          // Weapon toggles - simplified display
          const row = document.createElement('label');
          row.className = 'setting-row setting-toggle';
          const label = document.createElement('span');
          label.className = 'setting-label';
          label.textContent = control.label;
          row.appendChild(label);
          const switchEl = document.createElement('span');
          switchEl.className = 'switch';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = control.fallback;
          input.disabled = true;
          switchEl.appendChild(input);
          switchEl.appendChild(document.createElement('span'));
          row.appendChild(switchEl);
          rows.appendChild(row);
          continue;
        }

        const row = document.createElement('label');
        row.className = `setting-row setting-${control.type}`;
        const value = getControlValue(control);

        const label = document.createElement('span');
        label.className = 'setting-label';
        label.textContent = control.label;
        row.appendChild(label);

        if (control.type === 'toggle') {
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = Boolean(value);
          input.addEventListener('change', () => updateConfigValue(control, input.checked));
          const switchEl = document.createElement('span');
          switchEl.className = 'switch';
          switchEl.appendChild(input);
          switchEl.appendChild(document.createElement('span'));
          row.appendChild(switchEl);
        } else if (control.type === 'range') {
          const rangeWrap = document.createElement('span');
          rangeWrap.className = 'range-wrap';
          const input = document.createElement('input');
          input.type = 'range';
          input.min = control.min;
          input.max = control.max;
          input.step = control.step;
          input.value = Number.isFinite(value) ? value : control.fallback;
          updateRangeFill(input);
          const output = document.createElement('input');
          output.type = 'number';
          output.className = 'range-value-input';
          output.min = control.min;
          output.max = control.max;
          output.step = control.step;
          output.value = input.value;

          const commitRangeValue = (nextValue) => {
            const raw = Number(nextValue);
            const clamped = Number.isFinite(raw) ? Math.min(control.max, Math.max(control.min, raw)) : control.fallback;
            input.value = clamped;
            output.value = clamped;
            updateRangeFill(input);
            updateConfigValue(control, clamped);
          };

          input.addEventListener('input', () => commitRangeValue(input.value));
          output.addEventListener('change', () => commitRangeValue(output.value));
          rangeWrap.appendChild(input);
          rangeWrap.appendChild(output);
          row.appendChild(rangeWrap);
          if (control.suffix) {
            const suffix = document.createElement('span');
            suffix.textContent = control.suffix;
            suffix.style.marginLeft = '8px';
            suffix.style.color = '#8c8995';
            suffix.style.fontSize = '0.8rem';
            rangeWrap.appendChild(suffix);
          }
        } else if (control.type === 'select') {
          const select = document.createElement('select');
          for (const option of control.options) {
            const item = document.createElement('option');
            item.value = option;
            item.textContent = option;
            select.appendChild(item);
          }
          select.value = value || control.fallback;
          select.addEventListener('change', () => updateConfigValue(control, select.value));
          row.appendChild(select);
        } else {
          const input = document.createElement('input');
          input.type = 'text';
          input.value = value ?? control.fallback;
          input.addEventListener('change', () => updateConfigValue(control, input.value));
          row.appendChild(input);
        }

        rows.appendChild(row);
      }

      cardEl.appendChild(rows);
      if (configPanels) configPanels.appendChild(cardEl);
    }
  }

  function renderSavedConfigs() {
    if (!configsList) return;
    const configs = getSavedConfigs();

    if (configs.length === 0) {
      configsList.innerHTML = '<p class="configs-empty">No saved configs yet. Save your current config to get started.</p>';
      return;
    }

    configsList.innerHTML = '';
    for (let index = 0; index < configs.length; index++) {
      const cfg = configs[index];
      const item = document.createElement('div');
      item.className = 'config-item';

      const info = document.createElement('div');
      info.className = 'config-item-info';
      info.innerHTML = `
        <div class="config-item-name">${escapeHtml(cfg.name)}</div>
        <div class="config-item-date">${cfg.date || 'Unknown date'}</div>
      `;

      const actions = document.createElement('div');
      actions.className = 'config-item-actions';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn btn-accent';
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', () => {
        if (configEditor) configEditor.value = cfg.data;
        showToast(`Config "${cfg.name}" loaded!`, 'success');
        renderConfigControls(activeConfigSection);
      });

      const exportBtn = document.createElement('button');
      exportBtn.className = 'btn btn-secondary';
      exportBtn.textContent = 'Copy';
      exportBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(cfg.data)
          .then(() => showToast(`Config "${cfg.name}" copied!`, 'success'))
          .catch(() => showToast('Failed to copy', 'error'));
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-secondary';
      deleteBtn.textContent = '✕';
      deleteBtn.style.color = '#ff4058';
      deleteBtn.addEventListener('click', () => {
        const configsArray = getSavedConfigs();
        configsArray.splice(index, 1);
        setSavedConfigs(configsArray);
        renderSavedConfigs();
        showToast(`Config "${cfg.name}" deleted`, 'warning');
      });

      actions.appendChild(loadBtn);
      actions.appendChild(exportBtn);
      actions.appendChild(deleteBtn);
      item.appendChild(info);
      item.appendChild(actions);
      configsList.appendChild(item);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // SCRIPT GENERATION
  // ============================================================
  function generateScript(token) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const serverUrl = `${wsProtocol}//${wsHost}?token=${token}`;
    const sourceUrl = 'https://vss.pandauth.com/virtual/file/68d8a1b8a2a7448c';

    return `-- Sacrifice Loader | Generated ${new Date().toLocaleString()}
print("Sacrifice loader starting...")

local SERVER_URL = "${serverUrl}"
local SOURCE_URL = "${sourceUrl}"

local MAX_RETRIES = 3
local RETRY_DELAY = 2

local HttpService = game:GetService("HttpService")

local function deepMerge(target, source)
    if type(target) ~= "table" or type(source) ~= "table" then return source end
    for k, v in pairs(source) do
        if type(v) == "table" and type(target[k]) == "table" then
            deepMerge(target[k], v)
        else
            target[k] = v
        end
    end
    return target
end

local function applyConfig(configText)
    local before = getgenv().sacrifice or getgenv().Sacrifice
    local fn, err = loadstring(configText)
    if not fn then warn("Compile error: "..err) return false end
    local ok, err = pcall(fn)
    if not ok then warn("Execute error: "..err) return false end
    local newConfig = getgenv().sacrifice or getgenv().Sacrifice
    if type(newConfig) ~= "table" then warn("No config table found") return false end
    local live = before
    if type(live) == "table" then deepMerge(live, newConfig) else live = newConfig end
    getgenv().sacrifice = live
    getgenv().Sacrifice = live
    return true
end

local function connectWebSocket(url, retryCount)
    retryCount = retryCount or 0
    local success, socket = pcall(function() return WebSocket.connect(url) end)
    if success and socket then
        print("WebSocket connected")
        return socket
    elseif retryCount < MAX_RETRIES then
        print("WebSocket failed, retrying in "..RETRY_DELAY.."s... ("..(retryCount+1).."/"..MAX_RETRIES..")")
        wait(RETRY_DELAY)
        return connectWebSocket(url, retryCount + 1)
    else
        warn("WebSocket failed after "..MAX_RETRIES.." attempts")
        return nil
    end
end

local socket = connectWebSocket(SERVER_URL)
if not socket then warn("Could not establish WebSocket connection") return end

local loaded = false

task.spawn(function()
    while socket and socket.OnMessage do
        wait(25)
        pcall(function() socket:Send("ping") end)
    end
end)

socket.OnMessage:Connect(function(msg)
    if msg == "ping" then return end
    local ok, data = pcall(function() return HttpService:JSONDecode(msg) end)
    if not ok or (data.type ~= "init" and data.type ~= "update") then return end
    if not applyConfig(data.config) then return end
    if loaded then print("Config updated") return end
    loaded = true
    local srcSuccess, src = pcall(function() return game:HttpGet(SOURCE_URL) end)
    if srcSuccess and src then
        local fn, err = loadstring(src)
        if fn then pcall(fn) print("Source loaded") else warn("Source error: "..err) end
    else
        warn("Failed to download source")
    end
end)

socket.OnClose:Connect(function() warn("WebSocket closed") end)

print("Sacrifice ready - waiting for config...")`;
  }

  // ============================================================
  // API HANDLERS
  // ============================================================
  async function loadConfig() {
    try {
      const response = await fetch(apiUrl('/api/config'), { credentials: 'include' });
      const result = await parseApiResponse(response);
      if (response.ok && configEditor) {
        configEditor.value = result.config;
        renderConfigControls(activeConfigSection);
        if (saveStatus) saveStatus.textContent = 'Loaded from cloud';
        showToast('Configuration loaded', 'success');
      } else {
        showToast(result.error || 'Failed to load', 'error');
      }
    } catch (err) {
      showToast('Could not reach server', 'error');
    }
  }

  async function saveConfig() {
    if (!configEditor) return;
    const configData = configEditor.value;

    try {
      const response = await fetch(apiUrl('/api/config/save'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configData })
      });
      const result = await parseApiResponse(response);
      if (response.ok) {
        if (saveStatus) saveStatus.textContent = 'Saved to cloud';
        showToast('Configuration saved!', 'success');
      } else {
        showToast(result.error || 'Failed to save', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  }

  async function activateConfig() {
    if (!configEditor) return;
    const configData = configEditor.value;
    if (!btnActivate) return;

    const originalText = btnActivate.textContent;
    btnActivate.disabled = true;
    btnActivate.textContent = 'ACTIVATING...';

    try {
      const response = await fetch(apiUrl('/api/config/push'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configData })
      });
      const result = await parseApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Activation failed');
      const count = Number(result.connectedClients || 0);
      if (count > 0) {
        showToast(`Activated for ${count} connection${count === 1 ? '' : 's'}!`, 'success');
      } else {
        showToast('No executor connected', 'warning');
      }
      updateConnectionStatus();
    } catch (err) {
      showToast(err.message || 'Activation failed', 'error');
    } finally {
      btnActivate.disabled = false;
      btnActivate.textContent = originalText;
    }
  }

  async function updateConnectionStatus() {
    try {
      const response = await fetch(apiUrl('/api/connections'), { credentials: 'include' });
      const result = await response.json();
      if (response.ok && statusDot && statusText) {
        const count = result.count;
        if (count > 0) {
          statusDot.className = 'status-pulse green';
          statusText.textContent = `${count} Executor Connection${count > 1 ? 's' : ''} Active`;
        } else {
          statusDot.className = 'status-pulse yellow';
          statusText.textContent = 'No Executors Connected';
        }
      }
    } catch (err) { console.warn("Connection check failed"); }
  }

  async function initializeDashboard(username) {
    if (!authContainer || !dashboardContainer) return;
    authContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    activeUsername = username;
    if (userDisplay) userDisplay.textContent = `User: ${username}`;
    await fetchUserDataFromSupabase(username);
    await fetchLicenseKey(username);
    updateUserPanelDisplay();
    await loadConfig();
    updateConnectionStatus();
    if (connectionCheckInterval) clearInterval(connectionCheckInterval);
    connectionCheckInterval = setInterval(updateConnectionStatus, 15000);
    loadRandomPhrase(username);
  }

  async function checkSession() {
    try {
      const response = await fetch(apiUrl('/api/auth/session'), { credentials: 'include' });
      const result = await response.json();
      if (response.ok && result.authenticated) {
        activeSessionToken = result.token;
        initializeDashboard(result.username);
      }
    } catch (err) { console.log('No active session'); }
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  if (toSignup) {
    toSignup.addEventListener('click', (e) => {
      e.preventDefault();
      if (loginForm && signupForm) {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        hideAuthToast();
      }
    });
  }

  if (toLogin) {
    toLogin.addEventListener('click', (e) => {
      e.preventDefault();
      if (signupForm && loginForm) {
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        hideAuthToast();
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthToast();
      const username = document.getElementById('login-username')?.value;
      const password = document.getElementById('login-password')?.value;
      if (!username || !password) {
        showAuthToast('Please enter username and password');
        return;
      }
      try {
        const response = await fetch(apiUrl('/api/auth/login'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (!response.ok) {
          showAuthToast(result.error || 'Authentication failed');
          return;
        }
        showToast('Logged in successfully', 'success');
        activeSessionToken = result.user.token;
        initializeDashboard(result.user.username);
      } catch (err) {
        showAuthToast('Failed to connect to server');
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthToast();
      const username = document.getElementById('reg-username')?.value;
      const password = document.getElementById('reg-password')?.value;
      const licenseKey = document.getElementById('reg-license')?.value;
      if (!username || !password || !licenseKey) {
        showAuthToast('All fields are required');
        return;
      }
      try {
        const response = await fetch(apiUrl('/api/auth/register'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, licenseKey })
        });
        const result = await response.json();
        if (!response.ok) {
          showAuthToast(result.error || 'Sign up failed');
          return;
        }
        showToast(result.message || 'Account registered!', 'success');
        if (signupForm && loginForm) {
          signupForm.classList.add('hidden');
          loginForm.classList.remove('hidden');
        }
        const loginUsername = document.getElementById('login-username');
        if (loginUsername) loginUsername.value = username;
      } catch (err) {
        showAuthToast('Server connection failure');
      }
    });
  }

  if (btnLoad) btnLoad.addEventListener('click', loadConfig);
  if (btnSave) btnSave.addEventListener('click', saveConfig);
  if (btnActivate) btnActivate.addEventListener('click', activateConfig);

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
        showToast('Logged out', 'success');
        activeSessionToken = null;
        activeLicenseKey = null;
        if (connectionCheckInterval) clearInterval(connectionCheckInterval);
        dashboardContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
      } catch (err) {
        showToast('Logout error', 'error');
      }
    });
  }

  if (btnGetScript) {
    btnGetScript.addEventListener('click', () => {
      if (!activeSessionToken) {
        showToast('Please login first', 'error');
        return;
      }
      const script = generateScript(activeSessionToken);
      if (scriptOutput) scriptOutput.value = script;
      if (activeUsername) {
        incrementExecutionCount(activeUsername);
        updateUserPanelDisplay();
      }
      if (getScriptModal) getScriptModal.classList.remove('hidden');
    });
  }

  if (btnCloseScript) {
    btnCloseScript.addEventListener('click', () => {
      if (getScriptModal) getScriptModal.classList.add('hidden');
    });
  }

  if (getScriptModal) {
    getScriptModal.addEventListener('click', (e) => {
      if (e.target === getScriptModal) getScriptModal.classList.add('hidden');
    });
  }

  if (btnCopyScript) {
    btnCopyScript.addEventListener('click', () => {
      const text = scriptOutput?.value;
      if (text) {
        navigator.clipboard.writeText(text)
          .then(() => showToast('Script copied!', 'success'))
          .catch(() => showToast('Failed to copy', 'error'));
      }
    });
  }

  if (btnUserPanel) {
    btnUserPanel.addEventListener('click', async () => {
      await fetchUserDataFromSupabase(activeUsername);
      await fetchLicenseKey(activeUsername);
      updateUserPanelDisplay();
      if (userPanelModal) userPanelModal.classList.remove('hidden');
    });
  }

  if (btnCloseUserPanel) {
    btnCloseUserPanel.addEventListener('click', () => {
      if (userPanelModal) userPanelModal.classList.add('hidden');
    });
  }

  if (userPanelModal) {
    userPanelModal.addEventListener('click', (e) => {
      if (e.target === userPanelModal) userPanelModal.classList.add('hidden');
    });
  }

  if (btnCopyKey) {
    btnCopyKey.addEventListener('click', () => {
      if (activeLicenseKey) {
        navigator.clipboard.writeText(activeLicenseKey)
          .then(() => showToast('License key copied!', 'success'))
          .catch(() => showToast('Failed to copy', 'error'));
      }
    });
  }

  if (btnSaveConfigNamed) {
    btnSaveConfigNamed.addEventListener('click', () => {
      const name = configSaveName?.value.trim();
      if (!name) {
        showToast('Enter a config name', 'warning');
        return;
      }
      if (!configEditor?.value) {
        showToast('No config to save', 'error');
        return;
      }
      const configs = getSavedConfigs();
      configs.push({
        name: name,
        data: configEditor.value,
        date: new Date().toLocaleString()
      });
      setSavedConfigs(configs);
      if (configSaveName) configSaveName.value = '';
      renderSavedConfigs();
      showToast(`Config "${name}" saved!`, 'success');
    });
  }

  if (btnImportConfig) {
    btnImportConfig.addEventListener('click', () => {
      const text = configImportText?.value.trim();
      if (!text) {
        showToast('Paste a config to import', 'warning');
        return;
      }
      const match = text.match(/^\s*(?:--[^\n]*\n\s*)*getgenv\(\)\.[Ss]acrifice\s*=\s*\{[\s\S]*\}\s*$/);
      if (!match) {
        showToast('Invalid Sacrifice config format', 'error');
        return;
      }
      if (configEditor) configEditor.value = text;
      showToast('Config imported!', 'success');
      if (configImportText) configImportText.value = '';
      renderConfigControls(activeConfigSection);
    });
  }

  if (btnCopyExport) {
    btnCopyExport.addEventListener('click', () => {
      const text = configExportText?.value;
      if (!text) {
        showToast('No config to export', 'warning');
        return;
      }
      navigator.clipboard.writeText(text)
        .then(() => showToast('Config copied!', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
    });
  }

  if (btnSettings && settingsModal) {
    btnSettings.addEventListener('click', () => {
      if (settingLogoUrl) {
        const savedLogo = localStorage.getItem('sacrifice_logo_url') || '';
        settingLogoUrl.value = savedLogo;
      }
      settingsModal.classList.remove('hidden');
    });
  }

  if (btnCloseSettings && settingsModal) {
    btnCloseSettings.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const url = settingLogoUrl?.value.trim() || '';
      if (url) {
        localStorage.setItem('sacrifice_logo_url', url);
        showToast('Logo updated!', 'success');
      } else {
        localStorage.removeItem('sacrifice_logo_url');
        showToast('Logo reset', 'info');
      }
      applyBrandingLogo();
      if (settingsModal) settingsModal.classList.add('hidden');
    });
  }

  if (configNav) {
    configNav.addEventListener('click', (event) => {
      const link = event.target.closest('[data-section]');
      if (!link) return;
      if (link.dataset.section === activeConfigSection) return;
      document.querySelectorAll('.side-link').forEach(item => item.classList.remove('active'));
      link.classList.add('active');
      if (sectionTransitionTimer) clearTimeout(sectionTransitionTimer);
      if (configPanels && !configPanels.classList.contains('hidden')) {
        configPanels.style.opacity = '0';
        configPanels.style.transform = 'translateY(10px)';
      }
      if (configsManagement && !configsManagement.classList.contains('hidden')) {
        configsManagement.style.opacity = '0';
        configsManagement.style.transform = 'translateY(10px)';
      }
      sectionTransitionTimer = setTimeout(() => {
        renderConfigControls(link.dataset.section);
        if (configPanels) {
          configPanels.style.opacity = '1';
          configPanels.style.transform = 'translateY(0)';
          configPanels.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        }
        if (configsManagement) {
          configsManagement.style.opacity = '1';
          configsManagement.style.transform = 'translateY(0)';
          configsManagement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        }
      }, 200);
    });
  }

  if (configEditor) {
    configEditor.style.display = 'none';
  }

  // Initialize
  applyBrandingLogo();
  checkSession();
});
