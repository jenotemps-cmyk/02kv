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
  const wsUriDisplay = document.getElementById('ws-uri-display');
  const httpUriDisplay = document.getElementById('http-uri-display');
  const configEditor = document.getElementById('config-editor');
  const saveStatus = document.getElementById('save-status');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  // Interactive buttons
  const btnLogout = document.getElementById('btn-logout');
  const btnCopyWs = document.getElementById('btn-copy-ws');
  const btnCopyHttp = document.getElementById('btn-copy-http');
  const btnLoad = document.getElementById('btn-load');
  const btnSave = document.getElementById('btn-save');
  const btnActivate = document.getElementById('btn-activate');
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

  let activeSessionToken = null;
  let connectionCheckInterval = null;

  // --- Branding Logo Management ---
  function applyBrandingLogo() {
    const savedLogo = localStorage.getItem('perc_logo_url');
    if (savedLogo) {
      // Apply to Auth Logo
      if (logoImg) {
        logoImg.src = savedLogo;
        logoImg.style.display = 'inline-block';
        const fallbackText = logoImg.nextElementSibling;
        if (fallbackText && fallbackText.classList.contains('logo-fallback-text')) {
          fallbackText.style.display = 'none';
        }
      }
      // Apply to Navbar Logo
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
      // Default logo file
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
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      const savedLogo = localStorage.getItem('perc_logo_url') || '';
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
        localStorage.setItem('perc_logo_url', url);
        showToast('Branding logo custom image applied!', 'success');
      } else {
        localStorage.removeItem('perc_logo_url');
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
    
    // Construct the websocket connection URI representation
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUri = `${protocol}//${window.location.host}?token=${activeSessionToken}`;
    if (wsUriDisplay) wsUriDisplay.textContent = wsUri;

    const httpProtocol = window.location.protocol;
    const httpUri = `${httpProtocol}//${window.location.host}?token=${activeSessionToken}`;
    if (httpUriDisplay) httpUriDisplay.textContent = httpUri;

    // Load user's configuration
    loadConfig();

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

  // Copy websocket URI to clipboard
  if (btnCopyWs) {
    btnCopyWs.addEventListener('click', () => {
      const text = wsUriDisplay ? wsUriDisplay.textContent : '';
      navigator.clipboard.writeText(text)
        .then(() => showToast('Websocket URI copied to clipboard!', 'success'))
        .catch(() => showToast('Failed to copy to clipboard', 'error'));
    });
  }

  // Copy http URI to clipboard
  if (btnCopyHttp) {
    btnCopyHttp.addEventListener('click', () => {
      const text = httpUriDisplay ? httpUriDisplay.textContent : '';
      navigator.clipboard.writeText(text)
        .then(() => showToast('HTTP URI copied to clipboard!', 'success'))
        .catch(() => showToast('Failed to copy to clipboard', 'error'));
    });
  }

  // Action listeners
  btnLoad.addEventListener('click', loadConfig);
  btnSave.addEventListener('click', saveConfig);
  btnActivate.addEventListener('click', activateConfig);

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
});
