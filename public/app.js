document.addEventListener('DOMContentLoaded', () => {
  // --- Mouse-following glow effect ---
  const mouseGlow = document.getElementById('mouse-glow');
  if (mouseGlow) {
    document.addEventListener('mousemove', (e) => {
      mouseGlow.style.left = e.clientX + 'px';
      mouseGlow.style.top = e.clientY + 'px';
    });
  }

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
  const API_ORIGIN = API_BASE || window.location.origin;
  const apiUrl = (path) => `${API_BASE}${path}`;
  window.SACRIFICE_APP_BUILD = 'app-v20-sacrifice-config-hub';

  let activeSessionToken = null;
  let activeUsername = null;
  let connectionCheckInterval = null;
  let activeConfigSection = 'silent';
  let sectionTransitionTimer = null;
  let userData = {
    discordId: null,
    keyDuration: null
  };

  // --- Saved Configs Storage (localStorage) ---
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

  // --- Execution Tracking ---
  function getExecutionCount(username) {
    try {
      const counts = JSON.parse(localStorage.getItem(EXECUTIONS_KEY) || '{}');
      return counts[username] || 0;
    } catch {
      return 0;
    }
  }

  function incrementExecutionCount(username) {
    try {
      const counts = JSON.parse(localStorage.getItem(EXECUTIONS_KEY) || '{}');
      counts[username] = (counts[username] || 0) + 1;
      localStorage.setItem(EXECUTIONS_KEY, JSON.stringify(counts));
      return counts[username];
    } catch {
      return 1;
    }
  }

  // --- Fetch User Data from Supabase ---
  async function fetchUserDataFromSupabase(userId) {
    try {
      // This assumes your backend has an endpoint that fetches from Supabase
      const response = await fetch(apiUrl(`/api/user/${userId}`), {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        userData.discordId = data.discordId || 'Not linked';
        userData.keyDuration = data.keyDuration || 'Unlimited';
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch user data:', err);
    }
    return null;
  }

  // --- Update User Panel Display ---
  function updateUserPanelDisplay() {
    if (userDiscordId) userDiscordId.textContent = userData.discordId || '-';
    if (userKeyDisplay) userKeyDisplay.textContent = activeSessionToken ? activeSessionToken.substring(0, 16) + '...' : '-';
    if (userKeyDuration) userKeyDuration.textContent = userData.keyDuration || '-';
    if (userExecutions) userExecutions.textContent = getExecutionCount(activeUsername) || '0';
  }

  // --- Branding Logo Management ---
  function setLogoSource(img, source, forceText = false) {
      if (!img) return;

      const fallbackText = img.nextElementSibling;

      // If forceText is true, always show fallback text and hide image
      if (forceText) {
        img.style.display = 'none';
        if (fallbackText && fallbackText.classList.contains('logo-fallback-text')) {
          fallbackText.style.display = 'inline-block';
        }
        return;
      }

      img.style.display = 'none';
      if (fallbackText && fallbackText.classList.contains('logo-fallback-text')) {
        fallbackText.style.display = 'inline-block';
      }

      const probe = new Image();
      probe.onload = () => {
        img.src = source;
        img.style.display = 'inline-block';
        if (fallbackText && fallbackText.classList.contains('logo-fallback-text')) {
          fallbackText.style.display = 'none';
        }
      };
      probe.onerror = () => {
        img.style.display = 'none';
        if (fallbackText && fallbackText.classList.contains('logo-fallback-text')) {
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
      // Force nav-brand-logo to always show the "S" text fallback
      setLogoSource(navLogoImg, logoSource, true);
      if (savedLogo && settingLogoUrl) {
        settingLogoUrl.value = savedLogo;
      }
    }

    applyBrandingLogo();

    // Settings modal interaction listeners
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        const savedLogo = localStorage.getItem('sacrifice_logo_url') || '';
        settingLogoUrl.value = savedLogo;
        settingsModal.classList.remove('hidden');
      });
    }

    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
      });
    }

    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          settingsModal.classList.add('hidden');
        }
      });
    }

    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        const url = settingLogoUrl.value.trim();
        if (url) {
          localStorage.setItem('sacrifice_logo_url', url);
          showToast('Branding logo custom image applied!', 'success');
        } else {
          localStorage.removeItem('sacrifice_logo_url');
          showToast('Logo reset to default.', 'info');
        }
        applyBrandingLogo();
        settingsModal.classList.add('hidden');
      });
    }

    // --- Auth screen toggles ---
    toSignup.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
      hideAuthToast();
    });

    toLogin.addEventListener('click', (e) => {
      e.preventDefault();
      signupForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
      hideAuthToast();
    });

    // --- Notification System ---
    function showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'toastIn 0.22s reverse forwards';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    async function parseApiResponse(response) {
      const text = await response.text();
      try {
        return text ? JSON.parse(text) : {};
      } catch (err) {
        return { error: text ? text.slice(0, 180) : `HTTP ${response.status}` };
      }
    }

    // --- Phrase loader (reads /phrases.txt and picks a random line) ---
    async function loadRandomPhrase(username) {
      if (!phraseDisplay) return;
      try {
        const res = await fetch('/phrases.txt');
        if (!res.ok) throw new Error('Failed to load phrases');
        const text = await res.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
          phraseDisplay.textContent = 'No phrases available.';
          return;
        }
        const choice = lines[Math.floor(Math.random() * lines.length)];
        const replaced = choice.replace(/\{user\}/g, username || 'Guest');
        phraseDisplay.textContent = replaced;
      } catch (err) {
        phraseDisplay.textContent = 'Unable to load phrases.';
      }
    }

    function showAuthToast(message) {
      authToast.textContent = message;
      authToast.classList.remove('hidden');
    }

    function hideAuthToast() {
      authToast.classList.add('hidden');
    }

    const sectionCopy = {
      silent: {
        title: 'Silent Aimbot',
        subtitle: 'Configure silent aim behaviour, field of view, target priority, and anti-curve settings.'
      },
      trigger: {
        title: 'Trigger Bot',
        subtitle: 'Tune trigger activation, hit filters, timing, and custom hitbox behaviour.'
      },
      camera: {
        title: 'Camera Aimbot',
        subtitle: 'Adjust camlock movement, prediction, smoothness, shake, and target settings.'
      },
      visuals: {
        title: 'ESP & Visuals',
        subtitle: 'Control watermark, ESP, sky, color effects, and visible target indicators.'
      },
      movement: {
        title: 'Movement',
        subtitle: 'Manage speed, jump, orbit, noclip, panic ground, and movement helpers.'
      },
      weapons: {
        title: 'Weapons',
        subtitle: 'Update spread, delay, rage mode, skins, wallbang, and weapon-related modifiers.'
      },
      misc: {
        title: 'Misc',
        subtitle: 'Configure hitboxes, avatar changes, damage, sounds, and extra utility features.'
      },
      configs: {
        title: 'Configs',
        subtitle: 'Save, load, import and export your Sacrifice configuration tables.'
      }
    };

    const configSchema = {
      silent: [
        {
          title: 'Silent Aim',
          controls: [
            boolControl('Enable Silent Aim', '(\\[\\x27Silent Aim\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            boolControl('Ignore FOV', '(\\[\\x27Silent Aim\\x27\\][\\s\\S]*?\\[\\x27Ignore Fov\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', false),
            boolControl('One Tap', '(\\[\\x27One Tap\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', false),
            selectControl('Hit Part', '(\\[\\x27Hit Part\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', 'Closest Point', ['Closest Point', 'Head', 'UpperTorso', 'HumanoidRootPart', 'LowerTorso']),
            numberControl('Hit Chance', '(\\bHitChance\\s*=\\s*)([0-9.]+)(\\s*,)', 100, 0, 100, 1, '%'),
            selectControl('Mode', '(\\bMode\\s*=\\s*)"([^"]*)"(\\s*,)', 'Target', ['Target', 'Automatic'])
          ]
        },
        {
          title: 'Field Of View',
          controls: [
            boolControl('FOV Enabled', '(\\[\\x27Fov\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            boolControl('FOV Visible', '(\\[\\x27Fov\\x27\\][\\s\\S]*?\\[\\x27Visible\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', false),
            numberControl('Radius', '(\\[\\x27Radius\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', 350, 0, 1000, 5),
            numberControl('Thickness', '(\\[\\x27Thickness\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', 1.5, 0, 10, 0.1),
            numberControl('Transparency', '(\\[\\x27Transparency\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', 1, 0, 1, 0.05)
          ]
        },
        {
          title: 'Legit & Anti Curve',
          controls: [
            boolControl('Legit Mode', '(\\[\\x27Legit\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', false),
            boolControl('Anti Curve', '(\\[\\x27Anti Curve\\x27\\]\\s*=\\s*\\{\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', false),
            numberControl('Max Angle', '(\\[\\x27Anti Curve\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Max Angle\\x27\\]\\s*=\\s*)([0-9.]+)(\\})', 15, 0, 90, 1),
            boolControl('Scaling', '(\\[\\x27Scaling\\x27\\]\\s*=\\s*\\{\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            numberControl('Scaling Factor', '(\\[\\x27Scaling\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Factor\\x27\\]\\s*=\\s*)([0-9.]+)(\\})', 1, 0, 5, 0.1),
            numberControl('Max Distance', '(\\[\\x27Checks\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Max Distance\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', 1222, 0, 5000, 25)
          ]
        }
      ],
      trigger: [
        {
          title: 'Trigger Bot',
          controls: [
            boolControl('Enabled', '(\\[\\x27Trigger Bot\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            textControl('Keybind', '(\\[\\x27Trigger Bot\\x27\\][\\s\\S]*?\\[\\x27Keybind\\x27\\]\\s*=\\s*)"([^"]*)"(\\s*,)', 'T'),
            textControl('Target Keybind', '(\\[\\x27TargetKeybind\\x27\\]\\s*=\\s*)"([^"]*)"(\\s*,)', 'H'),
            numberControl('Interval', '(\\[\\x27Interval\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', 0.01, 0, 1, 0.01),
            selectControl('Activation', '(\\[\\x27Activation\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', 'Toggle', ['Toggle', 'Hold']),
            selectControl('Mode', '(\\[\\x27Trigger Bot\\x27\\][\\s\\S]*?\\[\\x27Mode\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', 'Fov', ['Fov', 'Target'])
          ]
        },
        {
          title: 'Trigger Settings',
          controls: [
            selectControl('Hits', '(\\[\\x27Hits\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', 'Everything', ['Everything', 'Players', 'HitParts']),
            boolControl('Humanized Reaction', '(\\[\\x27HumanizedReaction\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            boolControl('Input Delay', '(\\[\\x27Input\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            numberControl('Input Start', '(\\[\\x27Start\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', 0, 0, 1, 0.01),
            numberControl('Input End', '(\\[\\x27End\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', 0, 0, 1, 0.01),
            boolControl('Custom Size', '(CustomSize\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', true),
            numberControl('Custom Size Value', '(CustomSize\\s*=\\s*\\{[\\s\\S]*?Value\\s*=\\s*)([0-9.]+)(\\s*)', 40, 0, 1000, 1)
          ]
        }
      ],
      camera: [
        {
          title: 'Camera Aimbot',
          controls: [
            boolControl('Camlock Enabled', '(\\[\\x27Camlock\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            textControl('Keybind', '(\\[\\x27Camlock\\x27\\][\\s\\S]*?\\[\\x27Keybind\\x27\\]\\s*=\\s*)"([^"]*)"(\\s*,)', 'Q'),
            boolControl('Wall Check', '(\\[\\x27Camlock\\x27\\][\\s\\S]*?\\[\\x27WallCheck\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            numberControl('Snappiness', '(\\[\\x27Snappiness\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', 0.045, 0, 1, 0.005),
            selectControl('Smooth Mode', '(\\[\\x27Smooth Mode\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', 'Legit', ['Legit', 'Rage']),
            selectControl('Method', '(\\[\\x27Method\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', 'Camera', ['Camera', 'Mouse'])
          ]
        },
        {
          title: 'Prediction & Shake',
          controls: [
            selectControl('Target Part', '(\\[\\x27Part\\x27\\]\\s*=\\s*)\\x27([^\\x27]*)\\x27(\\s*,)', 'UpperTorso', ['Head', 'UpperTorso', 'HumanoidRootPart', 'LowerTorso']),
            numberControl('Blend', '(\\[\\x27Blend\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*,)', 0.17, 0, 1, 0.01),
            boolControl('Dynamic Height', '(\\[\\x27DynamicHeightCompensation\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            boolControl('Predictions', '(\\[\\x27Predictions\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            boolControl('Human Shake', '(\\[\\x27HumanShake\\x27\\]\\s*=\\s*\\{[\\s\\S]*?\\[\\x27Enabled\\x27\\]\\s*=\\s*)(true|false)(\\s*,)', true),
            numberControl('Shake Amount', '(\\[\\x27Amount\\x27\\]\\s*=\\s*)([0-9.]+)(\\s*)', 0.55, 0, 3, 0.05),
            numberControl('Shake X', '(Shake\\s*=\\s*\\{[\\s\\S]*?\\bX\\s*=\\s*)([0-9.]+)(\\s*,)', 0.5, 0, 10, 0.05),
            numberControl('Shake Y', '(Shake\\s*=\\s*\\{[\\s\\S]*?\\bY\\s*=\\s*)([0-9.]+)(\\s*,)', 0.5, 0, 10, 0.05)
          ]
        }
      ],
      visuals: [
        {
          title: 'Watermark',
          controls: [
            boolControl('Watermark Enabled', '(Watermark\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', true),
            textControl('Watermark Name', '(Watermark\\s*=\\s*\\{[\\s\\S]*?Username\\s*=\\s*)"([^"]*)"(\\s*,)', 'Sacrifice.cc'),
            textControl('Watermark Color RGB', '(Watermark\\s*=\\s*\\{[\\s\\S]*?Color\\s*=\\s*Color3\\.fromRGB\\()([^)]+)(\\)\\s*)', '12, 12, 255', 'raw')
          ]
        },
        {
          title: 'ESP',
          controls: [
            boolControl('ESP Enabled', '(ESP\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', true),
            textControl('ESP Keybind', '(ESP\\s*=\\s*\\{[\\s\\S]*?Keybind\\s*=\\s*)"([^"]*)"(\\s*,)', 'B'),
            numberControl('ESP Size', '(ESP\\s*=\\s*\\{[\\s\\S]*?Size\\s*=\\s*)([0-9.]+)(\\s*,)', 11, 1, 40, 1),
            textControl('Default Color RGB', '(DefaultColor\\s*=\\s*Color3\\.fromRGB\\()([^)]+)(\\)\\s*,)', '255, 255, 255', 'raw'),
            textControl('Target Color RGB', '(TargetColor\\s*=\\s*Color3\\.fromRGB\\()([^)]+)(\\)\\s*,)', '255, 0, 0', 'raw')
          ]
        },
        {
          title: 'World',
          controls: [
            boolControl('Color Modifications', '(\\["Color Modifications"\\]\\s*=\\s*\\{\\s*Enabled\\s*=\\s*)(true|false)(\\s*,)', false),
            numberControl('Vibrancy', '(Vibrancy\\s*=\\s*)([0-9.]+)(\\s*,)', 0.45, 0, 2, 0.05),
            selectControl('Sky Color', '(Sky\\s*=\\s*\\{[\\s\\S]*?Color\\s*=\\s*)"([^"]*)"(\\s*\\})', 'Black', ['Black', 'Red', 'Blue', 'Purple'])
          ]
        }
      ],
      movement: [
        {
          title: 'Movement Modifications',
          controls: [
            boolControl('Speed Enabled', '(\\["Speed Modifications"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', true),
            numberControl('Default Speed', '(DefaultSpeed\\s*=\\s*)([0-9.]+)(\\s*,)', 35, 0, 1000, 1),
            selectControl('Speed Method', '(Method\\s*=\\s*)"([^"]*)"(\\s*,)', 'WalkSpeed', ['WalkSpeed', 'Velocity']),
            textControl('Speed Keybind', '(\\["Speed Modifications"\\][\\s\\S]*?Keybind\\s*=\\s*)"([^"]*)"(\\s*\\})', 'V'),
            boolControl('Jump Enabled', '(\\["Jump Modifications"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', false),
            numberControl('Jump Power', '(JumpPower\\s*=\\s*)([0-9.]+)(\\s*,)', 60, 0, 500, 1)
          ]
        },
        {
          title: 'Mobility Helpers',
          controls: [
            boolControl('Spiderman', '(Spiderman\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', true),
            numberControl('Jump Boost', '(\\["Jump Boost"\\]\\s*=\\s*)([0-9.]+)(\\s*,)', 80, 0, 300, 1),
            boolControl('Noclip', '(Noclip\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', false),
            textControl('Noclip Keybind', '(Noclip\\s*=\\s*\\{[\\s\\S]*?Keybind\\s*=\\s*)"([^"]*)"(\\s*,)', 'N'),
            boolControl('Panic Ground', '(\\["Panic Ground"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', true)
          ]
        }
      ],
      weapons: [
        {
          title: 'Weapon Modifications',
          controls: [
            boolControl('Spread Mod', '(SpreadMod\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', false),
            numberControl('Spread Amount', '(SpreadMod\\s*=\\s*\\{[\\s\\S]*?Amount\\s*=\\s*)([0-9.]+)(\\s*)', 70, 0, 100, 1),
            boolControl('Delay Changer', '(\\["Delay Changer"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', true),
            numberControl('Global Delay', '(GlobalDelay\\s*=\\s*)([0-9.]+)(\\s*,)', 0.08, 0, 1, 0.01),
            boolControl('Rage Mode', '(RageMode\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', false),
            numberControl('Fire Interval', '(FireInterval\\s*=\\s*)([0-9.]+)(\\s*)', 0.00001, 0, 1, 0.00001)
          ]
        },
        {
          title: 'Skins & Wallbang',
          controls: [
            boolControl('Skin Changer', '(\\["Skin Changer"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', false),
            textControl('Revolver Skin', '(\\["\\[Revolver\\]"\\]\\s*=\\s*)"([^"]*)"(\\s*,)', 'Inferno'),
            textControl('Double Barrel SG Skin', '(\\["\\[Double Barrel SG\\]"\\]\\s*=\\s*)"([^"]*)"(\\s*,)', 'Galaxy'),
            textControl('Tactical Shotgun Skin', '(\\["\\[Tactical Shotgun\\]"\\]\\s*=\\s*)"([^"]*)"(\\s*,?)', 'Default'),
            textControl('Knife Skin', '(\\["\\[Knife\\]"\\]\\s*=\\s*)"([^"]*)"(\\s*,)', 'Golden Age Tanto'),
            boolControl('Wallbang', '(\\["Wallbang"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*)', true)
          ]
        }
      ],
      misc: [
        {
          title: 'Hitbox & Damage',
          controls: [
            boolControl('Hitbox Expander', '(\\["Hitbox Expander"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', false),
            numberControl('Hitbox Size', '(\\["Hitbox Expander"\\][\\s\\S]*?Size\\s*=\\s*)([0-9.]+)(\\s*,)', 100, 0, 100, 1),
            boolControl('Visualize Hitbox', '(Visualize\\s*=\\s*)(true|false)(\\s*,)', false),
            boolControl('Damage Override', '(Overrider\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', false),
            numberControl('Override Damage', '(Damage\\s*=\\s*)([0-9.]+)(\\s*)', 100, 0, 100, 1),
            boolControl('Damage Amplifier', '(Amplifier\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', false)
          ]
        },
        {
          title: 'Avatar & Sound',
          controls: [
            boolControl('Avatar Mods', '(\\["Avatar Modifications"\\]\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', false),
            boolControl('Headless', '(Headless\\s*=\\s*)(true|false)(\\s*,)', false),
            boolControl('Korblox', '(Korblox\\s*=\\s*)(true|false)(\\s*,)', false),
            boolControl('Hitsounds', '(Hitsounds\\s*=\\s*\\{[\\s\\S]*?Enabled\\s*=\\s*)(true|false)(\\s*,)', false),
            textControl('Sound', '(Sound\\s*=\\s*)"([^"]*)"(\\s*,)', ''),
            numberControl('Volume', '(Volume\\s*=\\s*)([0-9.]+)(\\s*)', 3, 0, 100, 0.1),
            boolControl('Infinite Range', '(\\["Infinite Range"\\]\\s*=\\s*\\{[\\s\\S]*?enabled\\s*=\\s*)(true|false)(\\s*,)', true)
          ]
        }
      ]
    };

    function boolControl(label, pattern, fallback) {
      return { type: 'toggle', label, pattern, fallback };
    }

    function numberControl(label, pattern, fallback, min, max, step, suffix = '') {
      return { type: 'range', label, pattern, fallback, min, max, step, suffix };
    }

    function textControl(label, pattern, fallback, valueMode = 'string') {
      return { type: 'text', label, pattern, fallback, valueMode };
    }

    function selectControl(label, pattern, fallback, options) {
      return { type: 'select', label, pattern, fallback, options };
    }

    function getControlValue(control) {
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
      return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }

    function updateConfigValue(control, value) {
      const pattern = new RegExp(control.pattern, 'm');
      const formatted = formatControlValue(control, value);
      if (!pattern.test(configEditor.value)) {
        showToast(`Could not find ${control.label} in the generated config`, 'warning');
        return;
      }
      configEditor.value = configEditor.value.replace(pattern, `$1${formatted}$3`);
      saveStatus.textContent = 'Unsaved changes';
    }

    function normalizeConfigForGui() {
      if (!configEditor || !configEditor.value) return;
      const skinBlock = configEditor.value.match(/(\["Skin Changer"\]\s*=\s*\{[\s\S]*?Skins\s*=\s*\{)([\s\S]*?)(\n\s*\}\s*\n\s*\})/);
      if (skinBlock && /\["\[Tactical Shotgun\]"\]\s*=\s*"/.test(skinBlock[2])) return;

      configEditor.value = configEditor.value.replace(
        /(\["\[Double Barrel SG\]"\]\s*=\s*"[^"]*"\s*)(\n\s*})/,
        '$1,\n            ["[Tactical Shotgun]"] = "Default"$2'
      );
    }

    function updateRangeFill(input) {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const value = Number(input.value || 0);
      const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
      input.style.setProperty('--range-fill', `${Math.max(0, Math.min(100, percent))}%`);
    }

    function renderConfigControls(sectionKey = activeConfigSection) {
      if (!configPanels || !configEditor) return;

      activeConfigSection = sectionKey;
      const section = sectionCopy[sectionKey] || sectionCopy.silent;
      configSectionTitle.textContent = section.title;
      configSectionSubtitle.textContent = section.subtitle;

      // Handle configs management tab
      if (sectionKey === 'configs') {
        configPanels.innerHTML = '';
        configPanels.classList.add('hidden');
        configsManagement.classList.remove('hidden');
        renderSavedConfigs();
        // Populate export textarea
        if (configExportText) {
          configExportText.value = configEditor.value || '';
        }
        return;
      }

      // Normal config section
      configsManagement.classList.add('hidden');
      configPanels.classList.remove('hidden');
      configPanels.innerHTML = '';

      (configSchema[sectionKey] || []).forEach((card) => {
        const cardEl = document.createElement('section');
        cardEl.className = 'glass-card setting-card';

        const header = document.createElement('div');
        header.className = 'setting-card-header';
        header.innerHTML = `<span class="card-dot"></span><h2>${card.title}</h2>`;
        cardEl.appendChild(header);

        const rows = document.createElement('div');
        rows.className = 'setting-rows';

        card.controls.forEach((control) => {
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
            output.setAttribute('aria-label', `${control.label} value`);

            const commitRangeValue = (nextValue) => {
              const raw = Number(nextValue);
              const clamped = Number.isFinite(raw)
                ? Math.min(control.max, Math.max(control.min, raw))
                : control.fallback;
              input.value = clamped;
              output.value = clamped;
              updateRangeFill(input);
              updateConfigValue(control, clamped);
            };

            input.addEventListener('input', () => {
              commitRangeValue(input.value);
            });
            output.addEventListener('change', () => {
              commitRangeValue(output.value);
            });
            output.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                output.blur();
              }
            });
            rangeWrap.appendChild(input);
            rangeWrap.appendChild(output);
            row.appendChild(rangeWrap);
          } else if (control.type === 'select') {
            const select = document.createElement('select');
            control.options.forEach((option) => {
              const item = document.createElement('option');
              item.value = option;
              item.textContent = option;
              select.appendChild(item);
            });
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
        });

        cardEl.appendChild(rows);
        configPanels.appendChild(cardEl);
      });
    }

    // --- Smooth tab switching with crossfade ---
    if (configNav) {
      configNav.addEventListener('click', (event) => {
        const link = event.target.closest('[data-section]');
        if (!link) return;
        if (link.dataset.section === activeConfigSection) return;
        configNav.querySelectorAll('.side-link').forEach(item => item.classList.remove('active'));
        link.classList.add('active');

        window.clearTimeout(sectionTransitionTimer);

        // Fade out current content
        if (configPanels && !configPanels.classList.contains('hidden')) {
          configPanels.classList.add('is-switching');
        }
        if (configsManagement && !configsManagement.classList.contains('hidden')) {
          configsManagement.style.opacity = '0';
          configsManagement.style.transform = 'translateY(6px)';
          configsManagement.style.transition = 'opacity 220ms ease, transform 220ms ease';
        }

        sectionTransitionTimer = window.setTimeout(() => {
          renderConfigControls(link.dataset.section);
          // Fade in new content
          if (link.dataset.section !== 'configs') {
            configPanels.classList.remove('is-switching');
          } else {
            configsManagement.style.opacity = '1';
            configsManagement.style.transform = 'translateY(0)';
          }
        }, 220);
      });
    }

    // --- Saved Configs Management ---
    function renderSavedConfigs() {
      if (!configsList) return;
      const configs = getSavedConfigs();

      if (configs.length === 0) {
        configsList.innerHTML = '<p class="configs-empty">No saved configs yet. Save your current config to get started.</p>';
        return;
      }

      configsList.innerHTML = '';
      configs.forEach((cfg, index) => {
        const item = document.createElement('div');
        item.className = 'config-item';
        item.style.animationDelay = `${index * 40}ms`;

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
          configEditor.value = cfg.data;
          normalizeConfigForGui();
          // Switch to first config tab
          activeConfigSection = 'silent';
          configNav.querySelectorAll('.side-link').forEach(item => item.classList.remove('active'));
          const silentLink = configNav.querySelector('[data-section="silent"]');
          if (silentLink) silentLink.classList.add('active');
          renderConfigControls('silent');
          showToast(`Config "${cfg.name}" loaded!`, 'success');
        });

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-secondary';
        exportBtn.textContent = 'Copy';
        exportBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(cfg.data)
            .then(() => showToast(`Config "${cfg.name}" copied to clipboard!`, 'success'))
            .catch(() => showToast('Failed to copy', 'error'));
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-secondary';
        deleteBtn.textContent = '✕';
        deleteBtn.style.color = '#ff4058';
        deleteBtn.addEventListener('click', () => {
          const configs = getSavedConfigs();
          configs.splice(index, 1);
          setSavedConfigs(configs);
          renderSavedConfigs();
          showToast(`Config "${cfg.name}" deleted`, 'warning');
        });

        actions.appendChild(loadBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(info);
        item.appendChild(actions);
        configsList.appendChild(item);
      });
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // Save named config
    if (btnSaveConfigNamed) {
      btnSaveConfigNamed.addEventListener('click', () => {
        const name = configSaveName.value.trim();
        if (!name) {
          showToast('Please enter a config name', 'warning');
          return;
        }
        if (!configEditor.value) {
          showToast('No config data to save', 'error');
          return;
        }
        const configs = getSavedConfigs();
        configs.push({
          name: name,
          data: configEditor.value,
          date: new Date().toLocaleString()
        });
        setSavedConfigs(configs);
        configSaveName.value = '';
        renderSavedConfigs();
        showToast(`Config "${name}" saved locally!`, 'success');
      });
    }

    // Import config
    if (btnImportConfig) {
      btnImportConfig.addEventListener('click', () => {
        const text = configImportText.value.trim();
        if (!text) {
          showToast('Paste a config table to import', 'warning');
          return;
        }
        // Validate it looks like a Sacrifice config
        const match = text.match(/^\s*(?:--[^\n]*\n\s*)*getgenv\(\)\.[Ss]acrifice\s*=\s*\{[\s\S]*\}\s*$/);
        if (!match) {
          showToast('Invalid format. Must be a Sacrifice config (getgenv().Sacrifice = { ... })', 'error');
          return;
        }
        configEditor.value = text;
        normalizeConfigForGui();
        showToast('Config imported! Switch to a section to see changes.', 'success');
        configImportText.value = '';
      });
    }

    // Copy export
    if (btnCopyExport) {
      btnCopyExport.addEventListener('click', () => {
        const text = configExportText.value;
        if (!text) {
          showToast('No config to copy', 'warning');
          return;
        }
        navigator.clipboard.writeText(text)
          .then(() => showToast('Config copied to clipboard!', 'success'))
          .catch(() => showToast('Failed to copy', 'error'));
      });
    }

    // --- Get Script Button & Modal ---
    function generateLoaderScript(token) {
      // Build WebSocket URL based on current host so it works locally and in production
      const currentHost = window.location.host;
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const serverUrl = `${wsProtocol}://${currentHost}/?token=${token}`;
      const sourceUrl = 'https://vss.pandauth.com/virtual/file/68d8a1b8a2a7448c';
      return `-- Sacrifice Loader | Generated ${new Date().toLocaleString()}
-- Do not share this script, it contains your personal session token.

print("Sacrifice loader started")

local SERVER_URL = "${serverUrl}"
local SOURCE_URL = "${sourceUrl}"
local HttpService = game:GetService("HttpService")

-- Deep merge utility to merge cloud config into existing config
local function deepMerge(dst, src)
    for k, v in pairs(src) do
        if type(v) == "table" and type(dst[k]) == "table" then
            deepMerge(dst[k], v)
        else
            dst[k] = v
        end
    end
end

-- Apply cloud config by merging it into the existing Sacrifice table
local function applyConfig(configText)
    if getgenv().Sacrifice_ApplyCloudConfig and getgenv().Sacrifice_ApplyCloudConfig ~= applyConfig then
        return getgenv().Sacrifice_ApplyCloudConfig(configText)
    end
    if not configText then
        warn("Config text is nil")
        return false
    end

    local configFunc, compileErr = loadstring(configText)
    if not configFunc then
        warn("Failed to compile config:", compileErr)
        return false
    end

    local runOk, runErr = pcall(configFunc)
    if not runOk then
        warn("Failed to execute config:", runErr)
        return false
    end

    -- Merge cloud config into existing Sacrifice table
    if getgenv().Sacrifice then
        local cloudConfig = getgenv().sacrifice or getgenv().Sacrifice
        if type(cloudConfig) == "table" then
            deepMerge(getgenv().Sacrifice, cloudConfig)
            getgenv().sacrifice = getgenv().Sacrifice
        end

        -- Trigger refresh if the source script has this function
        if getgenv().Sacrifice_RefreshLocals then
            getgenv().Sacrifice_RefreshLocals()
        end

        print("Cloud config applied successfully")
        return true
    else
        warn("Sacrifice table not initialized yet")
        return false
    end
end

-- Load the source script first, then connect WebSocket
print("Loading source script...")
local sourceOk, sourceErr = pcall(function()
    local source = game:HttpGet(SOURCE_URL)
    print("Source downloaded (" .. #source .. " bytes)")
    loadstring(source)()
end)

if not sourceOk then
    warn("Source script error:", sourceErr)
    return
end

print("Source script loaded with defaults")

getgenv().Sacrifice_ApplyCloudConfig = applyConfig

-- Connect to WebSocket for config updates
local socket
local ok, err = pcall(function()
    socket = WebSocket.connect(SERVER_URL)
end)

if not ok or not socket then
    warn("WebSocket failed:", err)
    return
end

print("Connected to Sacrifice WebSocket")
print("Click 'Activate Config' on the website to apply your settings")

socket.OnMessage:Connect(function(msg)
    local decodedOk, data = pcall(function()
        return HttpService:JSONDecode(msg)
    end)

    if not decodedOk then
        warn("Could not decode packet")
        return
    end

    if data.type == "update" or data.type == "init" then
        print("Received config update from website")
        applyConfig(data.config)
    end
end)

socket.OnClose:Connect(function()
    warn("Sacrifice WebSocket closed")
end)`;
    }

if (btnGetScript) {
  btnGetScript.addEventListener('click', () => {
    if (!activeSessionToken) {
      showToast('You need to be logged in to get your script', 'error');
      return;
    }
    const loaderScript = generateLoaderScript(activeSessionToken);
    scriptOutput.value = loaderScript;
    // Increment execution count
    if (activeUsername) {
      incrementExecutionCount(activeUsername);
      updateUserPanelDisplay();
    }
    getScriptModal.classList.remove('hidden');
  });
}

if (btnCloseScript) {
  btnCloseScript.addEventListener('click', () => {
    getScriptModal.classList.add('hidden');
  });
}

if (getScriptModal) {
  getScriptModal.addEventListener('click', (e) => {
    if (e.target === getScriptModal) {
      getScriptModal.classList.add('hidden');
    }
  });
}

if (btnCopyScript) {
  btnCopyScript.addEventListener('click', () => {
    const text = scriptOutput.value;
    navigator.clipboard.writeText(text)
      .then(() => showToast('Script copied to clipboard!', 'success'))
      .catch(() => showToast('Failed to copy', 'error'));
  });
}

// --- User Panel Modal ---
if (btnUserPanel) {
  btnUserPanel.addEventListener('click', () => {
    updateUserPanelDisplay();
    userPanelModal.classList.remove('hidden');
  });
}

if (btnCloseUserPanel) {
  btnCloseUserPanel.addEventListener('click', () => {
    userPanelModal.classList.add('hidden');
  });
}

if (userPanelModal) {
  userPanelModal.addEventListener('click', (e) => {
    if (e.target === userPanelModal) {
      userPanelModal.classList.add('hidden');
    }
  });
}

if (btnCopyKey) {
  btnCopyKey.addEventListener('click', () => {
    if (activeSessionToken) {
      navigator.clipboard.writeText(activeSessionToken)
        .then(() => showToast('Key copied to clipboard!', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
    }
  });
}

// --- API Handlers ---

// Submit Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAuthToast();

  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

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
    showAuthToast('Failed to connect to the authentication server');
  }
});

// Submit Sign Up
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAuthToast();

  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const licenseKey = document.getElementById('reg-license').value;

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
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    document.getElementById('login-username').value = username;
  } catch (err) {
    showAuthToast('Server connection failure during sign up');
  }
});

// Load configuration
async function loadConfig() {
  try {
    const response = await fetch(apiUrl('/api/config'), {
      credentials: 'include'
    });
    const result = await parseApiResponse(response);
    if (response.ok) {
      configEditor.value = result.config;
      normalizeConfigForGui();
      renderConfigControls(activeConfigSection);
      saveStatus.textContent = 'Last saved version loaded';
      showToast('Configuration loaded successfully', 'success');
    } else {
      showToast(result.error || 'Failed to load configuration', 'error');
    }
  } catch (err) {
    showToast(`Could not reach ${apiUrl('/api/config') || '/api/config'} from ${window.location.host}`, 'error');
  }
}

// Save configuration
async function saveConfig() {
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
      saveStatus.textContent = 'All changes saved to cloud';
      showToast('Configuration saved successfully!', 'success');
    } else {
      showToast(result.error || 'Failed to save configuration', 'error');
    }
  } catch (err) {
    showToast('Connection error during configuration save', 'error');
  }
}

// Activate / Broadcast config signal
async function activateConfig() {
  const configData = configEditor.value;

  const parseJsonResponse = async (response, actionName) => {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (err) {
      throw new Error(`${actionName} failed at ${response.url} (${response.status}): ${text.slice(0, 180)}`);
    }
  };

  const originalButtonText = btnActivate.textContent;
  btnActivate.disabled = true;
  btnActivate.textContent = 'ACTIVATING...';

  try {
    const response = await fetch(apiUrl('/api/config/push'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: configData })
    });

    const result = await parseJsonResponse(response, 'Activate');
    if (!response.ok) {
      throw new Error(result.error || 'Failed to activate config.');
    }

    const count = Number(result.connectedClients || 0);
    if (count > 0) {
      showToast(`Configuration activated for ${count} connection${count === 1 ? '' : 's'}!`, 'success');
    } else {
      showToast('Config saved, but no matching executor WebSocket is connected.', 'error');
    }
    updateConnectionStatus();
  } catch (err) {
    console.error('Activation error:', err);
    showToast(err.message || `Activation request failed from ${window.SACRIFICE_APP_BUILD}`, 'error');
  } finally {
    btnActivate.disabled = false;
    btnActivate.textContent = originalButtonText;
  }
}

// Poll active connection count from server
async function updateConnectionStatus() {
  try {
    const response = await fetch(apiUrl('/api/connections'), {
      credentials: 'include'
    });
    const result = await response.json();

    if (response.ok) {
      const count = result.count;
      if (count > 0) {
        statusDot.className = 'status-pulse green';
        statusText.textContent = `${count} Executor Connection${count > 1 ? 's' : ''} Active`;
      } else {
        statusDot.className = 'status-pulse yellow';
        statusText.textContent = 'No Executors Connected (Idle)';
      }
    }
  } catch (err) {
    console.warn("Connection counter request failed");
  }
}

// --- Dashboard Setup ---
function initializeDashboard(username) {
  authContainer.classList.add('hidden');
  dashboardContainer.classList.remove('hidden');

  activeUsername = username;
  userDisplay.textContent = `User: ${username}`;

  // Fetch user data from Supabase via backend
  fetchUserDataFromSupabase(username);

  // Load user's configuration
  loadConfig();

  // Start background status updates
  updateConnectionStatus();
  connectionCheckInterval = setInterval(updateConnectionStatus, 15000);
  // Load a random phrase once
  loadRandomPhrase(username);
}

// --- Session Restoration ---
async function checkSession() {
  try {
    const response = await fetch(apiUrl('/api/auth/session'), {
      credentials: 'include'
    });
    const result = await response.json();

    if (response.ok && result.authenticated) {
      activeSessionToken = result.token;
      initializeDashboard(result.username);
    }
  } catch (err) {
    // No valid session, stay on login page
  }
}

checkSession();

// Action listeners
btnLoad.addEventListener('click', loadConfig);
btnSave.addEventListener('click', saveConfig);
btnActivate.addEventListener('click', activateConfig);

// --- Luau autocompletion for the config textarea ---
if (configEditor) {
  const luauCompletions = [
    'false', 'true', 'nil', 'function', 'end', 'local', 'return', 'if', 'then', 'elseif', 'else',
    'for', 'in', 'while', 'do', 'break', 'repeat', 'until', 'and', 'or', 'not', 'table', 'math', 'string',
    'pairs', 'ipairs', 'next', 'continue', 'typeof', 'typeof', 'warn', 'print', 'spawn', 'delay'
  ];

  configEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = configEditor;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = el.value.slice(0, start);
      const after = el.value.slice(end);

      const m = before.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
      if (m) {
        const prefix = m[1];
        const candidate = luauCompletions.find(c => c !== prefix && c.startsWith(prefix));
        if (candidate) {
          const newBefore = before.slice(0, -prefix.length) + candidate;
          el.value = newBefore + after;
          const caret = newBefore.length;
          el.setSelectionRange(caret, caret);
          return;
        }
      }

      const newBefore = before + '  ';
      el.value = newBefore + after;
      const caret = newBefore.length;
      el.setSelectionRange(caret, caret);
    }
  });
}

// Logout action
btnLogout.addEventListener('click', async () => {
  try {
    await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    showToast('Logged out successfully', 'success');

    activeSessionToken = null;
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }

    dashboardContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');

    loginForm.reset();
    signupForm.reset();
  } catch (err) {
    showToast('Logout connection error', 'error');
  }
});
});
