(function(global) {
  'use strict';

  var DW_SSO_VERSION = '1.0.0';
  var DEFAULT_BASE_URL = 'https://dwsc.io';
  var STORAGE_KEY = 'dw_sso_user';
  var TOKEN_KEY = 'dw_sso_token';

  function DarkWaveSSO(config) {
    if (!config || !config.appName) {
      throw new Error('DarkWaveSSO: appName is required');
    }
    if (!config.apiKey) {
      throw new Error('DarkWaveSSO: apiKey is required');
    }

    this.appName = config.appName;
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.callbackPath = config.callbackPath || '/auth/callback';
    this.onLogin = config.onLogin || null;
    this.onLogout = config.onLogout || null;
    this.autoInit = config.autoInit !== false;

    if (this.autoInit && typeof window !== 'undefined') {
      this._handleCallback();
    }
  }

  DarkWaveSSO.prototype.login = function(options) {
    options = options || {};
    var state = this._generateState();
    var callbackUrl = this._getCallbackUrl();

    sessionStorage.setItem('dw_sso_state', state);

    var loginUrl = this.baseUrl + '/api/auth/sso/login'
      + '?app=' + encodeURIComponent(this.appName)
      + '&redirect=' + encodeURIComponent(callbackUrl)
      + '&state=' + encodeURIComponent(state);

    if (options.popup) {
      this._openPopup(loginUrl);
    } else {
      window.location.href = loginUrl;
    }
  };

  DarkWaveSSO.prototype.logout = function() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    if (this.onLogout) {
      this.onLogout();
    }
  };

  DarkWaveSSO.prototype.getUser = function() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  };

  DarkWaveSSO.prototype.isLoggedIn = function() {
    return this.getUser() !== null;
  };

  DarkWaveSSO.prototype.getToken = function() {
    return localStorage.getItem(TOKEN_KEY);
  };

  DarkWaveSSO.prototype.verifyToken = function() {
    throw new Error('DarkWaveSSO: Token verification must be done server-side using the Node.js SDK (dw-sso-node.js). Never verify tokens in the browser.');
  };

  DarkWaveSSO.prototype.renderLoginButton = function(container, options) {
    options = options || {};
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    var btn = document.createElement('button');
    btn.className = 'dw-sso-btn ' + (options.className || '');
    btn.setAttribute('data-testid', 'btn-dw-sso-login');

    var size = options.size || 'medium';
    var theme = options.theme || 'dark';
    var variant = options.variant || 'full';

    var styles = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      textDecoration: 'none'
    };

    if (size === 'small') {
      styles.padding = '8px 16px';
      styles.fontSize = '13px';
    } else if (size === 'large') {
      styles.padding = '14px 28px';
      styles.fontSize = '16px';
    } else {
      styles.padding = '10px 20px';
      styles.fontSize = '14px';
    }

    if (theme === 'light') {
      styles.background = '#ffffff';
      styles.color = '#0f172a';
      styles.boxShadow = '0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)';
    } else {
      styles.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
      styles.color = '#ffffff';
      styles.boxShadow = '0 0 20px rgba(6, 182, 212, 0.15), 0 1px 3px rgba(0,0,0,0.3)';
    }

    Object.keys(styles).forEach(function(key) {
      btn.style[key] = styles[key];
    });

    var icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M12 2L2 7l10 5 10-5-10-5z" fill="' + (theme === 'light' ? '#06b6d4' : '#22d3ee') + '"/>'
      + '<path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="' + (theme === 'light' ? '#06b6d4' : '#22d3ee') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';

    if (variant === 'icon') {
      btn.innerHTML = icon;
      btn.style.padding = size === 'small' ? '8px' : size === 'large' ? '14px' : '10px';
    } else {
      btn.innerHTML = icon + '<span>' + (options.text || 'Sign in with DarkWave') + '</span>';
    }

    btn.addEventListener('mouseenter', function() {
      btn.style.transform = 'translateY(-1px)';
      btn.style.boxShadow = theme === 'light'
        ? '0 4px 6px rgba(0,0,0,0.1), 0 0 0 1px rgba(6,182,212,0.3)'
        : '0 0 30px rgba(6, 182, 212, 0.25), 0 4px 6px rgba(0,0,0,0.3)';
    });

    btn.addEventListener('mouseleave', function() {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = styles.boxShadow;
    });

    var self = this;
    btn.addEventListener('click', function() {
      self.login(options);
    });

    el.appendChild(btn);
    return btn;
  };

  DarkWaveSSO.prototype._handleCallback = function() {
    if (typeof window === 'undefined') return;

    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');
    var state = params.get('state');

    if (!token) return;

    var savedState = sessionStorage.getItem('dw_sso_state');
    if (state && savedState && state !== savedState) {
      console.error('DarkWaveSSO: State mismatch - possible CSRF attack');
      return;
    }

    sessionStorage.removeItem('dw_sso_state');
    localStorage.setItem(TOKEN_KEY, token);

    var url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('state');
    window.history.replaceState({}, document.title, url.pathname + url.search);

    if (this.onLogin) {
      this.onLogin({ token: token });
    }
  };

  DarkWaveSSO.prototype._getCallbackUrl = function() {
    var base = window.location.origin + this.callbackPath;
    return base;
  };

  DarkWaveSSO.prototype._generateState = function() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  DarkWaveSSO.prototype._openPopup = function(url) {
    var w = 500, h = 600;
    var left = (screen.width / 2) - (w / 2);
    var top = (screen.height / 2) - (h / 2);
    window.open(url, 'DarkWave SSO', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top);
  };

  DarkWaveSSO.VERSION = DW_SSO_VERSION;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DarkWaveSSO;
  } else {
    global.DarkWaveSSO = DarkWaveSSO;
  }

})(typeof window !== 'undefined' ? window : this);
