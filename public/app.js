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
  const authToast = document.getElementById('auth-toast');
  const phraseDisplay = document.getElementById('phrase-display');

  let activeSessionToken = null;
  let connectionCheckInterval = null;

  // --- Branding Logo Management ---
  function applyBrandingLogo() {
    const savedLogo = localStorage.getItem('sacrifice_logo_url');
    const logoImg = document.getElementById('logo-img');
    const navLogoImg = document.getElementById('nav-logo-img');
    
    if (savedLogo) {
      if (logoImg) logoImg.src = savedLogo;
      if (navLogoImg) navLogoImg.src = savedLogo;
    }
  }

  // Initial load of logo
  applyBrandingLogo();

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
      toast.style.animation = 'toastSlideIn 0.3s reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
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

  // --- API Handlers ---
  
  // Submit Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthToast();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, licenseKey })
      });

      const result = await response.json();

      if (!response.ok) {
        showAuthToast(result.error || 'Sign up failed');
        return;
      }

      showToast(result.message || 'Account registered!', 'success');
      // Automatically switch to login screen
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
      const response = await fetch('/api/config');
      const result = await response.json();
      if (response.ok) {
        configEditor.value = result.config;
        saveStatus.textContent = 'Last saved version loaded';
        showToast('Configuration loaded successfully', 'success');
      } else {
        showToast(result.error || 'Failed to load configuration', 'error');
      }
    } catch (err) {
      showToast('Failed to connect to server configuration endpoint', 'error');
    }
  }

  // Save configuration
  async function saveConfig() {
    const configData = configEditor.value;

    try {
      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configData })
      });

      const result = await response.json();
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
    // Attempt saving config first to keep states consistent
    const configData = configEditor.value;

    try {
      // Direct Save action
      await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configData })
      });

      // Send Activation Signal
      const response = await fetch('/api/config/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (response.ok) {
        showToast(`Attempting to activate config...`, 'success');
        updateConnectionStatus();
      } else {
        showToast(result.error || 'Failed to activate config.', 'error');
      }
    } catch (err) {
      showToast('Error communicating activation command', 'error');
    }
  }

  // Poll active connection count from server
  async function updateConnectionStatus() {
    try {
      const response = await fetch('/api/connections');
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

    userDisplay.textContent = `User: ${username}`;
    
    // Tab switching (initialize after dashboard is visible)
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Remove active from all tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active to clicked tab
        btn.classList.add('active');
        document.getElementById(`tab-${targetTab}`).classList.add('active');
      });
    });
    
    // Load user's configuration
    loadConfig();

    // Load user info (license key for Get Script)
    loadUserInfo();

    // Start background status updates
    updateConnectionStatus();
    connectionCheckInterval = setInterval(updateConnectionStatus, 15000);
    
    // Load a random phrase once
    loadRandomPhrase(username);
  }

  // --- Session Restoration ---
  async function checkSession() {
    try {
      const response = await fetch('/api/auth/session');
      const result = await response.json();

      if (response.ok && result.authenticated) {
        // Retrieve token from response
        activeSessionToken = result.token;
        initializeDashboard(result.username);
      }
    } catch (err) {
      // No valid session, stay on login page
    }
  }

  // Check session status on load
  checkSession();

  // Action listeners
  btnLoad.addEventListener('click', loadConfig);
  btnSave.addEventListener('click', saveConfig);
  btnActivate.addEventListener('click', activateConfig);

  // --- Get Script Feature ---
  const btnGetScript = document.getElementById('btn-get-script');
  const btnCopyScript = document.getElementById('btn-copy-script');
  const btnCopyKey = document.getElementById('btn-copy-key');
  const licenseKeyDisplay = document.getElementById('license-key-display');
  const scriptPreview = document.getElementById('script-preview');
  const scriptPreviewArea = document.getElementById('script-preview-area');
  const scriptStatus = document.getElementById('script-status');
  let cachedScript = null;
  let cachedLicenseKey = null;

  // Load user info (license key) when dashboard initializes
  async function loadUserInfo() {
    try {
      const response = await fetch('/api/user-info');
      if (response.ok) {
        const result = await response.json();
        cachedLicenseKey = result.license;
        if (licenseKeyDisplay) {
          licenseKeyDisplay.textContent = result.license;
        }
      }
    } catch (err) {
      if (licenseKeyDisplay) {
        licenseKeyDisplay.textContent = 'Failed to load';
      }
    }
  }

  // Get the loader script
  async function getScript() {
    if (scriptStatus) scriptStatus.textContent = 'Generating...';
    try {
      const response = await fetch('/api/script');
      if (response.ok) {
        const scriptText = await response.text();
        cachedScript = scriptText;

        // Show the script preview
        if (scriptPreview) scriptPreview.value = scriptText;
        scriptPreviewArea.classList.remove('hidden');
        btnCopyScript.classList.remove('hidden');

        // Auto-copy to clipboard
        try {
          await navigator.clipboard.writeText(scriptText);
          showToast('Loader script copied to clipboard!', 'success');
        } catch (e) {
          showToast('Script generated! Click COPY SCRIPT to copy manually.', 'info');
        }

        if (scriptStatus) scriptStatus.textContent = 'Script ready & copied!';
      } else {
        showToast('Failed to generate loader script', 'error');
        if (scriptStatus) scriptStatus.textContent = 'Generation failed';
      }
    } catch (err) {
      showToast('Error connecting to server for script', 'error');
      if (scriptStatus) scriptStatus.textContent = 'Connection error';
    }
  }

  if (btnGetScript) {
    btnGetScript.addEventListener('click', getScript);
  }

  if (btnCopyScript) {
    btnCopyScript.addEventListener('click', async () => {
      if (!cachedScript) {
        showToast('No script to copy. Click GET SCRIPT first.', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(cachedScript);
        showToast('Loader script copied to clipboard!', 'success');
      } catch (e) {
        showToast('Failed to copy to clipboard', 'error');
      }
    });
  }

  if (btnCopyKey) {
    btnCopyKey.addEventListener('click', async () => {
      if (!cachedLicenseKey) {
        showToast('License key not loaded yet', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(cachedLicenseKey);
        showToast('License key copied to clipboard!', 'success');
      } catch (e) {
        showToast('Failed to copy to clipboard', 'error');
      }
    });
  }

  // --- Luau autocompletion for the config textarea ---
  if (configEditor) {
    const luauCompletions = [
      'false','true','nil','function','end','local','return','if','then','elseif','else',
      'for','in','while','do','break','repeat','until','and','or','not','table','math','string',
      'pairs','ipairs','next','continue','typeof','typeof','warn','print','spawn','delay'
    ];

    configEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const el = configEditor;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);

        // find the word fragment immediately before the caret
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

        // fallback: insert two spaces
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
      await fetch('/api/auth/logout', { method: 'POST' });
      showToast('Logged out successfully', 'success');
      
      // Reset variables & view states
      activeSessionToken = null;
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
      }
      
      dashboardContainer.classList.add('hidden');
      authContainer.classList.remove('hidden');
      
      // Clear forms
      loginForm.reset();
      signupForm.reset();
    } catch (err) {
      showToast('Logout connection error', 'error');
    }
  });

  // --- Visual Config Editor (Config Tab) ---
  const btnApplyConfig = document.getElementById('btn-apply-config');
  const btnSaveVisualConfig = document.getElementById('btn-save-visual-config');
  const btnResetConfig = document.getElementById('btn-reset-config');
  const configStatus = document.getElementById('config-status');

  // Get all config input elements
  function getAllConfigInputs() {
    return {
      // Silent Aim
      silentEnabled: document.getElementById('cfg-silent-enabled'),
      silentHitchance: document.getElementById('cfg-silent-hitchance'),
      silentFov: document.getElementById('cfg-silent-fov'),
      silentFovVisible: document.getElementById('cfg-silent-fov-visible'),
      silentHitpart: document.getElementById('cfg-silent-hitpart'),
      silentSmoothing: document.getElementById('cfg-silent-smoothing'),
      
      // Camlock
      camlockEnabled: document.getElementById('cfg-camlock-enabled'),
      camlockKeybind: document.getElementById('cfg-camlock-keybind'),
      camlockBlend: document.getElementById('cfg-camlock-blend'),
      camlockPredx: document.getElementById('cfg-camlock-predx'),
      camlockPredy: document.getElementById('cfg-camlock-predy'),
      camlockPredz: document.getElementById('cfg-camlock-predz'),
      camlockHitpart: document.getElementById('cfg-camlock-hitpart'),
      camlockShake: document.getElementById('cfg-camlock-shake'),
      camlockShakex: document.getElementById('cfg-camlock-shakex'),
      camlockShakey: document.getElementById('cfg-camlock-shakey'),
      
      // Trigger Bot
      triggerEnabled: document.getElementById('cfg-trigger-enabled'),
      triggerKeybind: document.getElementById('cfg-trigger-keybind'),
      triggerDelay: document.getElementById('cfg-trigger-delay'),
      
      // Visuals
      espEnabled: document.getElementById('cfg-esp-enabled'),
      espKeybind: document.getElementById('cfg-esp-keybind'),
      espSize: document.getElementById('cfg-esp-size'),
      watermarkEnabled: document.getElementById('cfg-watermark-enabled'),
      skyEnabled: document.getElementById('cfg-sky-enabled'),
      
      // Speed & Movement
      speedEnabled: document.getElementById('cfg-speed-enabled'),
      speedKeybind: document.getElementById('cfg-speed-keybind'),
      speedValue: document.getElementById('cfg-speed-value'),
      jumpEnabled: document.getElementById('cfg-jump-enabled'),
      jumpPower: document.getElementById('cfg-jump-power'),
      jumpKeybind: document.getElementById('cfg-jump-keybind'),
      spidermanEnabled: document.getElementById('cfg-spiderman-enabled'),
      spidermanKeybind: document.getElementById('cfg-spiderman-keybind'),
      spidermanBoost: document.getElementById('cfg-spiderman-boost'),
      
      // Weapon Mods
      rapidfireEnabled: document.getElementById('cfg-rapidfire-enabled'),
      rapidfireDelay: document.getElementById('cfg-rapidfire-delay'),
      delayChangerEnabled: document.getElementById('cfg-delay-changer-enabled'),
      globalDelay: document.getElementById('cfg-global-delay'),
      hitboxEnabled: document.getElementById('cfg-hitbox-enabled'),
      hitboxSize: document.getElementById('cfg-hitbox-size'),
      
      // Misc
      wallbangEnabled: document.getElementById('cfg-wallbang-enabled'),
      infiniterangeEnabled: document.getElementById('cfg-infiniterange-enabled'),
      rangeValue: document.getElementById('cfg-range-value'),
      antistompEnabled: document.getElementById('cfg-antistomp-enabled'),
      panicgroundEnabled: document.getElementById('cfg-panicground-enabled'),
      panicKeybind: document.getElementById('cfg-panic-keybind'),
      globalwallcheckEnabled: document.getElementById('cfg-globalwallcheck-enabled'),
      knockcheckEnabled: document.getElementById('cfg-knockcheck-enabled'),
    };
  }


  // Parse current config from editor and populate visual editor
  function loadVisualConfig() {
    if (!configEditor || !configEditor.value) return;
    
    try {
      const cfg = getAllConfigInputs();
      const configText = configEditor.value;
      
      // Parse Silent Aim
      cfg.silentEnabled.checked = configText.includes("['Silent Aim'] = {") && configText.includes("['Enabled'] = true");
      const hitchanceMatch = configText.match(/HitChance\s*=\s*(\d+)/);
      if (hitchanceMatch) cfg.silentHitchance.value = hitchanceMatch[1];
      
      const fovRadiusMatch = configText.match(/\['Fov'\][\s\S]*?\['Radius'\]\s*=\s*(\d+)/);
      if (fovRadiusMatch) cfg.silentFov.value = fovRadiusMatch[1];
      
      const fovVisibleMatch = configText.match(/\['Fov'\][\s\S]*?\['Visible'\]\s*=\s*(true|false)/);
      if (fovVisibleMatch) cfg.silentFovVisible.checked = fovVisibleMatch[1] === 'true';
      
      const silentHitpartMatch = configText.match(/HitPart\s*=\s*['"](\w+)['"]/);
      if (silentHitpartMatch) cfg.silentHitpart.value = silentHitpartMatch[1];
      
      const smoothingMatch = configText.match(/Smoothing\s*=\s*([\d.]+)/);
      if (smoothingMatch) cfg.silentSmoothing.value = smoothingMatch[1];
      
      // Parse Camlock
      cfg.camlockEnabled.checked = configText.includes("['Camlock'] = {") && configText.includes("['Enabled'] = true");
      
      const camlockKeybindMatch = configText.match(/\['Camlock'\][\s\S]*?\['Keybind'\]\s*=\s*['"](\w)['"]/);
      if (camlockKeybindMatch) cfg.camlockKeybind.value = camlockKeybindMatch[1];
      
      const blendMatch = configText.match(/\['Blend'\]\s*=\s*([\d.]+)/);
      if (blendMatch) cfg.camlockBlend.value = blendMatch[1];
      
      const predMatch = configText.match(/\['Values'\]\s*=\s*\{\s*\['x'\]\s*=\s*([\d.]+),\s*\['y'\]\s*=\s*([\d.]+),\s*\['z'\]\s*=\s*([\d.]+)/);
      if (predMatch) {
        cfg.camlockPredx.value = predMatch[1];
        cfg.camlockPredy.value = predMatch[2];
        cfg.camlockPredz.value = predMatch[3];
      }
      
      const camlockHitpartMatch = configText.match(/\['Camlock'\][\s\S]*?\['Part'\]\s*=\s*['"](\w+)['"]/);
      if (camlockHitpartMatch) cfg.camlockHitpart.value = camlockHitpartMatch[1];
      
      const shakeMatch = configText.match(/Shake\s*=\s*\{[\s\S]*?Enabled\s*=\s*(true|false)/);
      if (shakeMatch) cfg.camlockShake.checked = shakeMatch[1] === 'true';
      
      const shakexMatch = configText.match(/Shake\s*=\s*\{[\s\S]*?X\s*=\s*([\d.]+)/);
      if (shakexMatch) cfg.camlockShakex.value = shakexMatch[1];
      
      const shakeyMatch = configText.match(/Shake\s*=\s*\{[\s\S]*?Y\s*=\s*([\d.]+)/);
      if (shakeyMatch) cfg.camlockShakey.value = shakeyMatch[1];
      
      // Parse Trigger Bot
      cfg.triggerEnabled.checked = configText.includes("['Trigger Bot'] = {") && configText.includes("['Enabled'] = true");
      
      const triggerKeybindMatch = configText.match(/\['Trigger Bot'\][\s\S]*?\['Keybind'\]\s*=\s*['"](\w)['"]/);
      if (triggerKeybindMatch) cfg.triggerKeybind.value = triggerKeybindMatch[1];
      
      const triggerDelayMatch = configText.match(/\['Trigger Bot'\][\s\S]*?Delay\s*=\s*([\d.]+)/);
      if (triggerDelayMatch) cfg.triggerDelay.value = triggerDelayMatch[1];
      
      // Parse Visuals
      cfg.espEnabled.checked = configText.includes("ESP = {") && configText.includes("Enabled = true");
      
      const espKeybindMatch = configText.match(/ESP\s*=\s*\{[\s\S]*?Keybind\s*=\s*['"](\w)['"]/);
      if (espKeybindMatch) cfg.espKeybind.value = espKeybindMatch[1];
      
      const espSizeMatch = configText.match(/ESP\s*=\s*\{[\s\S]*?Size\s*=\s*(\d+)/);
      if (espSizeMatch) cfg.espSize.value = espSizeMatch[1];
      
      cfg.watermarkEnabled.checked = configText.includes("Watermark = {") && configText.includes("Enabled = true");
      cfg.skyEnabled.checked = configText.includes("Sky = {") && configText.includes("Enabled = true");
      
      // Parse Speed & Movement
      cfg.speedEnabled.checked = configText.includes("['Speed Modifications']") && configText.includes("Enabled = true");
      
      const speedKeybindMatch = configText.match(/\['Speed Modifications'\][\s\S]*?Keybind\s*=\s*['"](\w)['"]/);
      if (speedKeybindMatch) cfg.speedKeybind.value = speedKeybindMatch[1];
      
      const speedValueMatch = configText.match(/DefaultSpeed\s*=\s*(\d+)/);
      if (speedValueMatch) cfg.speedValue.value = speedValueMatch[1];
      
      cfg.jumpEnabled.checked = configText.includes("['Jump Modifications']") && configText.includes("Enabled = true");
      
      const jumpPowerMatch = configText.match(/JumpPower\s*=\s*(\d+)/);
      if (jumpPowerMatch) cfg.jumpPower.value = jumpPowerMatch[1];
      
      const jumpKeybindMatch = configText.match(/\['Jump Modifications'\][\s\S]*?Keybind\s*=\s*['"](\w)['"]/);
      if (jumpKeybindMatch) cfg.jumpKeybind.value = jumpKeybindMatch[1];
      
      cfg.spidermanEnabled.checked = configText.includes("Spiderman = {") && configText.includes("Enabled = true");
      
      const spidermanKeybindMatch = configText.match(/Spiderman\s*=\s*\{[\s\S]*?Keybind\s*=\s*['"](\w)['"]/);
      if (spidermanKeybindMatch) cfg.spidermanKeybind.value = spidermanKeybindMatch[1];
      
      const spidermanBoostMatch = configText.match(/\["Jump Boost"\]\s*=\s*(\d+)/);
      if (spidermanBoostMatch) cfg.spidermanBoost.value = spidermanBoostMatch[1];
      
      // Parse Weapon Mods
      cfg.rapidfireEnabled.checked = configText.includes("RapidFire = true");
      
      const rapidfireDelayMatch = configText.match(/RapidFireDelay\s*=\s*([\d.]+)/);
      if (rapidfireDelayMatch) cfg.rapidfireDelay.value = rapidfireDelayMatch[1];
      
      cfg.delayChangerEnabled.checked = configText.includes('["Delay Changer"]') && configText.includes("Enabled = true");
      
      const globalDelayMatch = configText.match(/GlobalDelay\s*=\s*([\d.]+)/);
      if (globalDelayMatch) cfg.globalDelay.value = globalDelayMatch[1];
      
      cfg.hitboxEnabled.checked = configText.includes('["Hitbox Expander"]') && configText.includes("Enabled = true");
      
      const hitboxSizeMatch = configText.match(/\["Hitbox Expander"\][\s\S]*?Size\s*=\s*(\d+)/);
      if (hitboxSizeMatch) cfg.hitboxSize.value = hitboxSizeMatch[1];
      
      // Parse Misc
      cfg.wallbangEnabled.checked = configText.includes('["Wallbang"]') && configText.includes("Enabled = true");
      cfg.infiniterangeEnabled.checked = configText.includes('["Infinite Range"]') && configText.includes("Enabled = true");
      
      const rangeValueMatch = configText.match(/\["Infinite Range"\][\s\S]*?Range\s*=\s*(\d+)/);
      if (rangeValueMatch) cfg.rangeValue.value = rangeValueMatch[1];
      
      cfg.antistompEnabled.checked = configText.includes("AntiStomp = {") && configText.includes("Enabled = true");
      cfg.panicgroundEnabled.checked = configText.includes('["Panic Ground"]') && configText.includes("Enabled = true");
      
      const panicKeybindMatch = configText.match(/\["Panic Ground"\][\s\S]*?Keybind\s*=\s*['"](\w)['"]/);
      if (panicKeybindMatch) cfg.panicKeybind.value = panicKeybindMatch[1];
      
      cfg.globalwallcheckEnabled.checked = configText.includes('["Global WallCheck"] = true');
      cfg.knockcheckEnabled.checked = configText.includes('["Knock Check"] = true');
      
      if (configStatus) configStatus.textContent = 'loaded from editor';
      showToast('Visual config loaded from editor', 'info');
    } catch (err) {
      console.error('Failed to parse config:', err);
      showToast('Failed to parse config for visual editor', 'error');
    }
  }


  // Apply visual config changes back to the text editor
  function applyVisualConfigToEditor() {
    try {
      const cfg = getAllConfigInputs();
      let configText = configEditor.value;
      
      // Update Silent Aim
      configText = configText.replace(
        /(Silent Aim.*?\['Enabled'\]\s*=\s*)(true|false)/s,
        `$1${cfg.silentEnabled.checked}`
      );
      configText = configText.replace(
        /HitChance\s*=\s*\d+/g,
        `HitChance = ${cfg.silentHitchance.value}`
      );
      configText = configText.replace(
        /(\['Fov'\][\s\S]*?\['Radius'\]\s*=\s*)\d+/,
        `$1${cfg.silentFov.value}`
      );
      configText = configText.replace(
        /(\['Fov'\][\s\S]*?\['Visible'\]\s*=\s*)(true|false)/,
        `$1${cfg.silentFovVisible.checked}`
      );
      configText = configText.replace(
        /(HitPart\s*=\s*)['"](\w+)['"]/,
        `$1"${cfg.silentHitpart.value}"`
      );
      configText = configText.replace(
        /(Smoothing\s*=\s*)[\d.]+/,
        `$1${cfg.silentSmoothing.value}`
      );
      
      // Update Camlock
      configText = configText.replace(
        /(\['Camlock'\][\s\S]*?\['Enabled'\]\s*=\s*)(true|false)/,
        `$1${cfg.camlockEnabled.checked}`
      );
      configText = configText.replace(
        /(\['Camlock'\][\s\S]*?\['Keybind'\]\s*=\s*)['"](\w)['"]/,
        `$1"${cfg.camlockKeybind.value}"`
      );
      configText = configText.replace(
        /(\['Blend'\]\s*=\s*)[\d.]+/,
        `$1${cfg.camlockBlend.value}`
      );
      configText = configText.replace(
        /(\['Values'\]\s*=\s*\{\s*\['x'\]\s*=\s*)[\d.]+/,
        `$1${cfg.camlockPredx.value}`
      );
      configText = configText.replace(
        /(\['Values'\]\s*=\s*\{[^}]*\['y'\]\s*=\s*)[\d.]+/,
        `$1${cfg.camlockPredy.value}`
      );
      configText = configText.replace(
        /(\['Values'\]\s*=\s*\{[^}]*\['z'\]\s*=\s*)[\d.]+/,
        `$1${cfg.camlockPredz.value}`
      );
      configText = configText.replace(
        /(\['Camlock'\][\s\S]*?\['Part'\]\s*=\s*)['"](\w+)['"]/,
        `$1"${cfg.camlockHitpart.value}"`
      );
      configText = configText.replace(
        /(Shake\s*=\s*\{[\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.camlockShake.checked}`
      );
      configText = configText.replace(
        /(Shake\s*=\s*\{[\s\S]*?X\s*=\s*)[\d.]+/,
        `$1${cfg.camlockShakex.value}`
      );
      configText = configText.replace(
        /(Shake\s*=\s*\{[\s\S]*?Y\s*=\s*)[\d.]+/,
        `$1${cfg.camlockShakey.value}`
      );
      
      // Update Trigger Bot
      configText = configText.replace(
        /(\['Trigger Bot'\][\s\S]*?\['Enabled'\]\s*=\s*)(true|false)/,
        `$1${cfg.triggerEnabled.checked}`
      );
      configText = configText.replace(
        /(\['Trigger Bot'\][\s\S]*?\['Keybind'\]\s*=\s*)['"](\w)['"]/,
        `$1"${cfg.triggerKeybind.value}"`
      );
      configText = configText.replace(
        /(\['Trigger Bot'\][\s\S]*?Delay\s*=\s*)[\d.]+/,
        `$1${cfg.triggerDelay.value}`
      );
      
      // Update Visuals
      configText = configText.replace(
        /(ESP\s*=\s*\{[\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.espEnabled.checked}`
      );
      configText = configText.replace(
        /(ESP\s*=\s*\{[\s\S]*?Keybind\s*=\s*)['"](\w)['"]/,
        `$1"${cfg.espKeybind.value}"`
      );
      configText = configText.replace(
        /(ESP\s*=\s*\{[\s\S]*?Size\s*=\s*)\d+/,
        `$1${cfg.espSize.value}`
      );
      configText = configText.replace(
        /(Watermark\s*=\s*\{[\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.watermarkEnabled.checked}`
      );
      configText = configText.replace(
        /(Sky\s*=\s*\{[\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.skyEnabled.checked}`
      );
      
      // Update Speed & Movement
      configText = configText.replace(
        /(\["Speed Modifications"\][\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.speedEnabled.checked}`
      );
      configText = configText.replace(
        /(\["Speed Modifications"\][\s\S]*?Keybind\s*=\s*)['"](\w)['"]/,
        `$1"${cfg.speedKeybind.value}"`
      );
      configText = configText.replace(
        /(DefaultSpeed\s*=\s*)\d+/,
        `$1${cfg.speedValue.value}`
      );
      configText = configText.replace(
        /(\["Jump Modifications"\][\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.jumpEnabled.checked}`
      );
      configText = configText.replace(
        /(JumpPower\s*=\s*)\d+/,
        `$1${cfg.jumpPower.value}`
      );
      configText = configText.replace(
        /(\["Jump Modifications"\][\s\S]*?Keybind\s*=\s*)['"](\w)['"]/,
        `$1"${cfg.jumpKeybind.value}"`
      );
      configText = configText.replace(
        /(Spiderman\s*=\s*\{[\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.spidermanEnabled.checked}`
      );
      configText = configText.replace(
        /(Spiderman\s*=\s*\{[\s\S]*?Keybind\s*=\s*)['"](\w)['"]/,
        `$1"${cfg.spidermanKeybind.value}"`
      );
      configText = configText.replace(
        /(\["Jump Boost"\]\s*=\s*)\d+/,
        `$1${cfg.spidermanBoost.value}`
      );
      
      // Update Weapon Mods
      configText = configText.replace(
        /(RapidFire\s*=\s*)(true|false)/,
        `$1${cfg.rapidfireEnabled.checked}`
      );
      configText = configText.replace(
        /(RapidFireDelay\s*=\s*)[\d.]+/,
        `$1${cfg.rapidfireDelay.value}`
      );
      configText = configText.replace(
        /(\["Delay Changer"\][\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.delayChangerEnabled.checked}`
      );
      configText = configText.replace(
        /(GlobalDelay\s*=\s*)[\d.]+/,
        `$1${cfg.globalDelay.value}`
      );
      configText = configText.replace(
        /(\["Hitbox Expander"\][\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.hitboxEnabled.checked}`
      );
      configText = configText.replace(
        /(\["Hitbox Expander"\][\s\S]*?Size\s*=\s*)\d+/,
        `$1${cfg.hitboxSize.value}`
      );
      
      // Update Misc
      configText = configText.replace(
        /(\["Wallbang"\][\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.wallbangEnabled.checked}`
      );
      configText = configText.replace(
        /(\["Infinite Range"\][\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.infiniterangeEnabled.checked}`
      );
      configText = configText.replace(
        /(\["Infinite Range"\][\s\S]*?Range\s*=\s*)\d+/,
        `$1${cfg.rangeValue.value}`
      );
      configText = configText.replace(
        /(AntiStomp\s*=\s*\{[\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.antistompEnabled.checked}`
      );
      configText = configText.replace(
        /(\["Panic Ground"\][\s\S]*?Enabled\s*=\s*)(true|false)/,
        `$1${cfg.panicgroundEnabled.checked}`
      );
      configText = configText.replace(
        /(\["Panic Ground"\][\s\S]*?Keybind\s*=\s*)['"](\w)['"]/,
        `$1"${cfg.panicKeybind.value}"`
      );
      configText = configText.replace(
        /(\["Global WallCheck"\]\s*=\s*)(true|false)/,
        `$1${cfg.globalwallcheckEnabled.checked}`
      );
      configText = configText.replace(
        /(\["Knock Check"\]\s*=\s*)(true|false)/,
        `$1${cfg.knockcheckEnabled.checked}`
      );
      
      configEditor.value = configText;
      saveStatus.textContent = 'Modified (unsaved)';
      if (configStatus) configStatus.textContent = 'applied to editor';
      showToast('Visual changes applied to editor!', 'success');
      return true;
    } catch (err) {
      console.error('Failed to apply visual config:', err);
      showToast('Failed to apply visual config changes', 'error');
      return false;
    }
  }

  // Apply visual config and save to cloud
  async function applyAndSaveVisualConfig() {
    if (configStatus) configStatus.textContent = 'applying...';
    
    // First apply to editor
    const applied = applyVisualConfigToEditor();
    if (!applied) return;
    
    // Then save to cloud
    const configData = configEditor.value;
    
    try {
      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configData })
      });

      const result = await response.json();
      if (response.ok) {
        saveStatus.textContent = 'All changes saved to cloud';
        if (configStatus) configStatus.textContent = 'saved to cloud';
        showToast('Config applied and saved to cloud!', 'success');
      } else {
        showToast(result.error || 'Failed to save configuration', 'error');
        if (configStatus) configStatus.textContent = 'save failed';
      }
    } catch (err) {
      showToast('Connection error during configuration save', 'error');
      if (configStatus) configStatus.textContent = 'connection error';
    }
  }

  // Apply button - just updates the editor
  if (btnApplyConfig) {
    btnApplyConfig.addEventListener('click', applyVisualConfigToEditor);
  }

  // Save button - applies AND saves to cloud
  if (btnSaveVisualConfig) {
    btnSaveVisualConfig.addEventListener('click', applyAndSaveVisualConfig);
  }


  if (btnResetConfig) {
    btnResetConfig.addEventListener('click', () => {
      if (confirm('Reset all visual config values to defaults?')) {
        const cfg = getAllConfigInputs();
        
        // Reset Silent Aim
        cfg.silentEnabled.checked = true;
        cfg.silentHitchance.value = 100;
        cfg.silentFov.value = 350;
        cfg.silentFovVisible.checked = false;
        cfg.silentHitpart.value = 'Closest';
        cfg.silentSmoothing.value = 0.1;
        
        // Reset Camlock
        cfg.camlockEnabled.checked = true;
        cfg.camlockKeybind.value = 'Q';
        cfg.camlockBlend.value = 0.17;
        cfg.camlockPredx.value = 0.125;
        cfg.camlockPredy.value = 0.225;
        cfg.camlockPredz.value = 0.125;
        cfg.camlockHitpart.value = 'UpperTorso';
        cfg.camlockShake.checked = true;
        cfg.camlockShakex.value = 0.5;
        cfg.camlockShakey.value = 0.5;
        
        // Reset Trigger Bot
        cfg.triggerEnabled.checked = true;
        cfg.triggerKeybind.value = 'T';
        cfg.triggerDelay.value = 0.01;
        
        // Reset Visuals
        cfg.espEnabled.checked = true;
        cfg.espKeybind.value = 'B';
        cfg.espSize.value = 11;
        cfg.watermarkEnabled.checked = false;
        cfg.skyEnabled.checked = true;
        
        // Reset Speed & Movement
        cfg.speedEnabled.checked = true;
        cfg.speedKeybind.value = 'V';
        cfg.speedValue.value = 835;
        cfg.jumpEnabled.checked = false;
        cfg.jumpPower.value = 60;
        cfg.jumpKeybind.value = 'H';
        cfg.spidermanEnabled.checked = true;
        cfg.spidermanKeybind.value = 'J';
        cfg.spidermanBoost.value = 80;
        
        // Reset Weapon Mods
        cfg.rapidfireEnabled.checked = true;
        cfg.rapidfireDelay.value = 0.15;
        cfg.delayChangerEnabled.checked = true;
        cfg.globalDelay.value = 0.08;
        cfg.hitboxEnabled.checked = false;
        cfg.hitboxSize.value = 110;
        
        // Reset Misc
        cfg.wallbangEnabled.checked = true;
        cfg.infiniterangeEnabled.checked = true;
        cfg.rangeValue.value = 2000;
        cfg.antistompEnabled.checked = false;
        cfg.panicgroundEnabled.checked = true;
        cfg.panicKeybind.value = 'P';
        cfg.globalwallcheckEnabled.checked = true;
        cfg.knockcheckEnabled.checked = true;
        
        if (configStatus) configStatus.textContent = 'reset to defaults';
        showToast('Visual config reset to defaults', 'info');
      }
    });
  }

  // Load visual config when switching to config tab
  const configTabBtn = document.querySelector('[data-tab="config"]');
  if (configTabBtn) {
    configTabBtn.addEventListener('click', () => {
      setTimeout(loadVisualConfig, 100);
    });
  }
});
