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

  // Settings modal elements
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const settingLogoUrl = document.getElementById('setting-logo-url');
  const logoImg = document.getElementById('logo-img');
  const navLogoImg = document.getElementById('nav-logo-img');

  let activeSessionToken = null;
  let connectionCheckInterval = null;

  // --- Branding Logo Management ---
  function applyBrandingLogo() {
    const savedLogo = localStorage.getItem('sacrifice_logo_url');
    if (savedLogo) {
      if (logoImg) {
        logoImg.src = savedLogo;
        logoImg.style.display = 'inline-block';
        const fallbackText = logoImg.nextElementSibling;
        if (fallbackText && fallbackText.classList.contains('logo-fallback-text')) {
          fallbackText.style.display = 'none';
        }
      }
      if (navLogoImg) {
        navLogoImg.src = savedLogo;
        navLogoImg.style.display = 'inline-block';
        const fallbackText = navLogoImg.nextElementSibling;
        if (fallbackText && fallbackText.classList.contains('logo-fallback-text')) {
          fallbackText.style.display = 'none';
        }
      }
      if (settingLogoUrl) {
        settingLogoUrl.value = savedLogo;
      }
    } else {
      if (logoImg) {
        logoImg.src = 'logo.png';
        logoImg.style.display = 'inline-block';
      }
      if (navLogoImg) {
        navLogoImg.src = 'logo.png';
        navLogoImg.style.display = 'inline-block';
      }
    }
  }

  // Initial load of logo
  applyBrandingLogo();

  // Settings modal interaction listeners
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
        showToast('Logo updated!', 'success');
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
    // Load a random phrase once (no manual refresh button)
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
  const btnResetConfig = document.getElementById('btn-reset-config');

  // Config input elements
  const cfgSilentEnabled = document.getElementById('cfg-silent-enabled');
  const cfgSilentHitchance = document.getElementById('cfg-silent-hitchance');
  const cfgSilentFov = document.getElementById('cfg-silent-fov');
  const cfgCamlockEnabled = document.getElementById('cfg-camlock-enabled');
  const cfgCamlockSmooth = document.getElementById('cfg-camlock-smooth');
  const cfgCamlockPredx = document.getElementById('cfg-camlock-predx');
  const cfgEspEnabled = document.getElementById('cfg-esp-enabled');
  const cfgEspSize = document.getElementById('cfg-esp-size');
  const cfgWatermarkEnabled = document.getElementById('cfg-watermark-enabled');

  // Parse current config from editor and populate visual editor
  function loadVisualConfig() {
    try {
      const configText = configEditor.value;
      
      // Simple parsing - look for specific patterns
      // Silent Aim Enabled
      if (configText.includes("['Silent Aim'] = {") && configText.includes("['Enabled'] = true")) {
        cfgSilentEnabled.checked = true;
      }
      
      // Hit Chance
      const hitchanceMatch = configText.match(/HitChance\s*=\s*(\d+)/);
      if (hitchanceMatch) {
        cfgSilentHitchance.value = hitchanceMatch[1];
      }
      
      // FOV Radius
      const fovMatch = configText.match(/['"]Radius['"]\s*=\s*(\d+)/);
      if (fovMatch) {
        cfgSilentFov.value = fovMatch[1];
      }
      
      // Camlock Enabled
      if (configText.includes("['Camlock'] = {") && configText.includes("['Enabled'] = true")) {
        cfgCamlockEnabled.checked = true;
      }
      
      // Camlock Smoothness (Blend)
      const blendMatch = configText.match(/['"]Blend['"]\s*=\s*([\d.]+)/);
      if (blendMatch) {
        cfgCamlockSmooth.value = blendMatch[1];
      }
      
      // Camlock Prediction X
      const predxMatch = configText.match(/['"]x['"]\s*=\s*([\d.]+)/);
      if (predxMatch) {
        cfgCamlockPredx.value = predxMatch[1];
      }
      
      // ESP Enabled
      if (configText.includes("ESP = {") && configText.includes("Enabled = true")) {
        cfgEspEnabled.checked = true;
      }
      
      // ESP Size
      const espSizeMatch = configText.match(/Size\s*=\s*(\d+)/);
      if (espSizeMatch) {
        cfgEspSize.value = espSizeMatch[1];
      }
      
      // Watermark Enabled
      if (configText.includes("Watermark = {") && configText.includes("Enabled = true")) {
        cfgWatermarkEnabled.checked = true;
      }
      
      showToast('Visual config loaded from editor', 'info');
    } catch (err) {
      showToast('Failed to parse config for visual editor', 'error');
    }
  }

  // Apply visual config changes back to the text editor
  if (btnApplyConfig) {
    btnApplyConfig.addEventListener('click', () => {
      try {
        let configText = configEditor.value;
        
        // Update Silent Aim Enabled
        configText = configText.replace(
          /(Silent Aim.*?\[['"]Enabled['"]\]\s*=\s*)(true|false)/s,
          `$1${cfgSilentEnabled.checked}`
        );
        
        // Update Hit Chance
        configText = configText.replace(
          /HitChance\s*=\s*\d+/g,
          `HitChance = ${cfgSilentHitchance.value}`
        );
        
        // Update FOV Radius
        configText = configText.replace(
          /(['"]Radius['"]\s*=\s*)\d+/g,
          `$1${cfgSilentFov.value}`
        );
        
        // Update Camlock Enabled
        configText = configText.replace(
          /(Camlock.*?\[['"]Enabled['"]\]\s*=\s*)(true|false)/s,
          `$1${cfgCamlockEnabled.checked}`
        );
        
        // Update Camlock Blend
        configText = configText.replace(
          /(['"]Blend['"]\s*=\s*)[\d.]+/g,
          `$1${cfgCamlockSmooth.value}`
        );
        
        // Update ESP Enabled
        configText = configText.replace(
          /(ESP\s*=\s*\{[^}]*Enabled\s*=\s*)(true|false)/s,
          `$1${cfgEspEnabled.checked}`
        );
        
        // Update ESP Size
        configText = configText.replace(
          /(ESP[^}]*Size\s*=\s*)\d+/s,
          `$1${cfgEspSize.value}`
        );
        
        // Update Watermark Enabled
        configText = configText.replace(
          /(Watermark\s*=\s*\{[^}]*Enabled\s*=\s*)(true|false)/s,
          `$1${cfgWatermarkEnabled.checked}`
        );
        
        configEditor.value = configText;
        saveStatus.textContent = 'Modified (unsaved)';
        showToast('Visual changes applied to editor! Click SAVE to persist.', 'success');
      } catch (err) {
        showToast('Failed to apply visual config changes', 'error');
      }
    });
  }

  if (btnResetConfig) {
    btnResetConfig.addEventListener('click', () => {
      if (confirm('Reset all visual config values to defaults?')) {
        cfgSilentEnabled.checked = true;
        cfgSilentHitchance.value = 100;
        cfgSilentFov.value = 150;
        cfgCamlockEnabled.checked = true;
        cfgCamlockSmooth.value = 0.15;
        cfgCamlockPredx.value = 0.125;
        cfgEspEnabled.checked = true;
        cfgEspSize.value = 11;
        cfgWatermarkEnabled.checked = true;
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

}); // <-- THIS is the proper end of the document listener now!
