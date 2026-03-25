(function() {
  'use strict';

  var scriptEl = document.currentScript;
  var DW_API = (scriptEl && scriptEl.getAttribute('data-api')) || 'https://dwsc.io';
  var WIDGET_VERSION = '1.0.0';

  var CATEGORY_ICONS = {
    General: '\u26A1',
    Automotive: '\uD83D\uDE97',
    Enterprise: '\uD83C\uDFE2',
    Hospitality: '\u2615',
    Analytics: '\uD83D\uDCC8',
    Services: '\uD83D\uDEE0',
    Security: '\uD83D\uDEE1',
    Gaming: '\uD83C\uDFAE',
    Finance: '\uD83D\uDCB0',
    Social: '\uD83D\uDCAC',
    Identity: '\uD83C\uDD94',
    Education: '\uD83C\uDF93'
  };

  function getIcon(cat) { return CATEGORY_ICONS[cat] || '\u26A1'; }
  function fmtNum(n) { return n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toLocaleString(); }
  function fmtUSD(n) { return n >= 1e6 ? '$'+(n/1e6).toFixed(2)+'M' : n >= 1e3 ? '$'+(n/1e3).toFixed(1)+'K' : '$'+n.toFixed(0); }

  function createWidget() {
    var host = document.createElement('div');
    host.id = 'dw-ecosystem-widget';
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = '\
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\
      :host{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#fff}\
      .dw-fab{position:fixed;bottom:80px;right:20px;z-index:99998;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#06b6d4,#8b5cf6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(6,182,212,0.4);transition:transform .2s,box-shadow .2s}\
      .dw-fab:hover{transform:scale(1.1);box-shadow:0 6px 32px rgba(6,182,212,0.6)}\
      .dw-fab svg{width:24px;height:24px;fill:#fff}\
      .dw-fab .dw-pulse{position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(6,182,212,0.5);animation:dw-ping 2s infinite}\
      @keyframes dw-ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(1.4);opacity:0}}\
      .dw-panel{position:fixed;bottom:140px;right:20px;z-index:99999;width:380px;max-width:calc(100vw - 40px);max-height:calc(100vh - 180px);background:rgba(2,6,23,0.97);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;display:none;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.8),0 0 40px rgba(6,182,212,0.15);animation:dw-slideup .3s ease}\
      .dw-panel.open{display:flex}\
      @keyframes dw-slideup{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}\
      .dw-header{padding:16px 16px 12px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(135deg,rgba(6,182,212,0.1),rgba(139,92,246,0.1))}\
      .dw-header-top{display:flex;align-items:center;justify-content:space-between}\
      .dw-logo{display:flex;align-items:center;gap:8px}\
      .dw-logo-icon{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:14px}\
      .dw-logo-text{font-size:13px;font-weight:700;background:linear-gradient(90deg,#06b6d4,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}\
      .dw-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);font-size:18px;padding:4px 8px;border-radius:6px;transition:all .2s}\
      .dw-close:hover{background:rgba(255,255,255,0.1);color:#fff}\
      .dw-user-bar{margin-top:10px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:8px;display:flex;align-items:center;gap:8px;font-size:11px}\
      .dw-user-avatar{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#06b6d4,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}\
      .dw-user-info{flex:1;min-width:0}\
      .dw-user-name{font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
      .dw-user-meta{color:rgba(255,255,255,0.4);font-size:10px;margin-top:1px}\
      .dw-sig-badge{padding:3px 8px;border-radius:6px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.25);color:#22c55e;font-weight:700;font-size:11px;white-space:nowrap}\
      .dw-presale-bar{margin-top:10px;padding:8px 10px;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.15);border-radius:8px}\
      .dw-presale-row{display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.5)}\
      .dw-presale-val{color:#fff;font-weight:600}\
      .dw-presale-progress{margin-top:6px;height:3px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden}\
      .dw-presale-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#06b6d4,#8b5cf6,#ec4899);transition:width 1s ease}\
      .dw-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.06);padding:0 12px}\
      .dw-tab{flex:1;padding:8px 4px;font-size:11px;font-weight:600;text-align:center;color:rgba(255,255,255,0.4);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s}\
      .dw-tab.active{color:#06b6d4;border-bottom-color:#06b6d4}\
      .dw-tab:hover{color:rgba(255,255,255,0.7)}\
      .dw-search{padding:8px 12px}\
      .dw-search input{width:100%;padding:7px 10px 7px 32px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#fff;font-size:12px;outline:none;transition:border-color .2s}\
      .dw-search input:focus{border-color:rgba(6,182,212,0.4)}\
      .dw-search input::placeholder{color:rgba(255,255,255,0.3)}\
      .dw-search-wrap{position:relative}\
      .dw-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.3);font-size:13px}\
      .dw-apps{flex:1;overflow-y:auto;padding:4px 12px 12px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.1) transparent}\
      .dw-apps::-webkit-scrollbar{width:4px}\
      .dw-apps::-webkit-scrollbar-track{background:transparent}\
      .dw-apps::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}\
      .dw-app{display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:4px;border-radius:10px;cursor:pointer;transition:all .2s;border:1px solid transparent}\
      .dw-app:hover{background:rgba(255,255,255,0.04);border-color:rgba(6,182,212,0.2)}\
      .dw-app-icon{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}\
      .dw-app-info{flex:1;min-width:0}\
      .dw-app-name{font-size:13px;font-weight:600;color:#fff;display:flex;align-items:center;gap:6px}\
      .dw-app-desc{font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
      .dw-verified{width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;background:#06b6d4;border-radius:50%;font-size:8px;flex-shrink:0}\
      .dw-app-action{padding:5px 12px;border-radius:6px;font-size:10px;font-weight:700;border:none;cursor:pointer;transition:all .2s;white-space:nowrap}\
      .dw-app-action.visit{background:rgba(6,182,212,0.15);color:#06b6d4;border:1px solid rgba(6,182,212,0.25)}\
      .dw-app-action.visit:hover{background:rgba(6,182,212,0.25)}\
      .dw-app-action.join{background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff}\
      .dw-app-action.join:hover{opacity:.9}\
      .dw-category{font-size:10px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:1px;padding:8px 0 4px}\
      .dw-empty{text-align:center;padding:24px;color:rgba(255,255,255,0.3);font-size:12px}\
      .dw-footer{padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);text-align:center}\
      .dw-footer a{font-size:10px;color:rgba(6,182,212,0.7);text-decoration:none;font-weight:600;transition:color .2s}\
      .dw-footer a:hover{color:#06b6d4}\
      .dw-presale-cta{display:block;text-align:center;padding:8px;margin:0 12px 8px;border-radius:8px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff;font-size:11px;font-weight:700;text-decoration:none;transition:opacity .2s}\
      .dw-presale-cta:hover{opacity:.85}\
      .dw-loading{display:flex;align-items:center;justify-content:center;padding:40px;color:rgba(255,255,255,0.3)}\
      .dw-spin{width:24px;height:24px;border:2px solid rgba(255,255,255,0.1);border-top-color:#06b6d4;border-radius:50%;animation:dw-rotate 1s linear infinite}\
      @keyframes dw-rotate{to{transform:rotate(360deg)}}\
      @media(max-width:480px){.dw-panel{bottom:80px;right:10px;left:10px;width:auto;max-height:calc(100vh - 120px)}}\
    ';
    shadow.appendChild(style);

    var fab = document.createElement('button');
    fab.className = 'dw-fab';
    fab.setAttribute('aria-label', 'DarkWave Ecosystem');
    fab.innerHTML = '<span class="dw-pulse"></span><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
    shadow.appendChild(fab);

    var panel = document.createElement('div');
    panel.className = 'dw-panel';
    shadow.appendChild(panel);

    var isOpen = false;
    fab.addEventListener('click', function() {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      if (isOpen && !panel.dataset.loaded) {
        loadWidgetData();
      }
    });

    function loadWidgetData() {
      panel.innerHTML = '<div class="dw-loading"><div class="dw-spin"></div></div>';

      var token = null;
      try {
        var keys = Object.keys(localStorage);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf('session_token') !== -1 || keys[i] === 'dw_session_token') {
            token = localStorage.getItem(keys[i]);
            break;
          }
        }
      } catch(e) {}

      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      fetch(DW_API + '/api/ecosystem/widget-data', { headers: headers })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          panel.dataset.loaded = '1';
          renderPanel(data);
        })
        .catch(function(err) {
          panel.innerHTML = '<div class="dw-empty">Unable to connect to ecosystem</div>';
          console.error('[DW Widget]', err);
        });
    }

    function renderPanel(data) {
      var apps = data.apps || [];
      var user = data.user;
      var presale = data.presale || {};
      var presaleBalance = data.presaleBalance;
      var subscription = data.subscription;
      var totalSold = presale.totalSold || 0;
      var allocation = 150000000;
      var pctSold = ((totalSold / allocation) * 100).toFixed(2);

      var html = '';

      html += '<div class="dw-header">';
      html += '<div class="dw-header-top">';
      html += '<div class="dw-logo"><div class="dw-logo-icon">\u26A1</div><div class="dw-logo-text">DarkWave Ecosystem</div></div>';
      html += '<button class="dw-close" aria-label="Close">\u2715</button>';
      html += '</div>';

      if (user) {
        var initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();
        html += '<div class="dw-user-bar">';
        html += '<div class="dw-user-avatar">' + initial + '</div>';
        html += '<div class="dw-user-info"><div class="dw-user-name">' + esc(user.displayName || user.email || 'Member') + '</div>';
        var metaParts = [];
        if (subscription && subscription.plan) metaParts.push(subscription.plan.toUpperCase());
        metaParts.push('SSO Active');
        html += '<div class="dw-user-meta">' + metaParts.join(' \u2022 ') + '</div></div>';
        if (presaleBalance && presaleBalance.totalSig > 0) {
          html += '<div class="dw-sig-badge">' + fmtNum(presaleBalance.totalSig) + ' SIG</div>';
        }
        html += '</div>';
      }

      html += '<div class="dw-presale-bar">';
      html += '<div class="dw-presale-row"><span>Presale Raised</span><span class="dw-presale-val">' + fmtUSD(presale.totalRaisedUsd || 0) + '</span></div>';
      html += '<div class="dw-presale-row" style="margin-top:2px"><span>Holders</span><span class="dw-presale-val">' + (presale.uniqueHolders || 0) + '</span></div>';
      html += '<div class="dw-presale-row" style="margin-top:2px"><span>SIG Price</span><span class="dw-presale-val">$' + (presale.currentPrice || 0.001) + '</span></div>';
      html += '<div class="dw-presale-progress"><div class="dw-presale-fill" style="width:' + Math.min(parseFloat(pctSold), 100) + '%"></div></div>';
      html += '</div>';

      html += '</div>';

      html += '<div class="dw-tabs">';
      html += '<div class="dw-tab active" data-tab="all">All Apps</div>';
      html += '<div class="dw-tab" data-tab="core">Core</div>';
      html += '<div class="dw-tab" data-tab="partner">Partner</div>';
      html += '</div>';

      html += '<div class="dw-search"><div class="dw-search-wrap"><span class="dw-search-icon">\uD83D\uDD0D</span><input type="text" placeholder="Search ecosystem apps..." /></div></div>';

      html += '<a class="dw-presale-cta" href="' + DW_API + '/presale" target="_blank" rel="noopener">\uD83D\uDE80 Join Signal Presale \u2014 $' + (presale.currentPrice || 0.001) + '/SIG</a>';

      html += '<div class="dw-apps">';
      html += renderApps(apps, 'all', '');
      html += '</div>';

      html += '<div class="dw-footer"><a href="' + DW_API + '/ecosystem" target="_blank" rel="noopener">Explore Full Ecosystem \u2192</a></div>';

      panel.innerHTML = html;

      panel.querySelector('.dw-close').addEventListener('click', function() {
        isOpen = false;
        panel.classList.remove('open');
      });

      var tabs = panel.querySelectorAll('.dw-tab');
      var searchInput = panel.querySelector('.dw-search input');
      var appsContainer = panel.querySelector('.dw-apps');
      var currentTab = 'all';

      for (var t = 0; t < tabs.length; t++) {
        tabs[t].addEventListener('click', function() {
          currentTab = this.dataset.tab;
          for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
          this.classList.add('active');
          appsContainer.innerHTML = renderApps(apps, currentTab, searchInput.value);
          bindAppClicks(appsContainer);
        });
      }

      searchInput.addEventListener('input', function() {
        appsContainer.innerHTML = renderApps(apps, currentTab, this.value);
        bindAppClicks(appsContainer);
      });

      bindAppClicks(appsContainer);
    }

    function renderApps(apps, tab, search) {
      var filtered = apps.filter(function(a) {
        if (tab === 'core') return !a.category || a.category === 'General' || a.category === 'Security' || a.category === 'Gaming' || a.category === 'Social' || a.category === 'Identity' || a.category === 'Finance';
        if (tab === 'partner') return a.category && a.category !== 'General' && a.category !== 'Security' && a.category !== 'Gaming' && a.category !== 'Social' && a.category !== 'Identity' && a.category !== 'Finance';
        return true;
      });

      if (search) {
        var q = search.toLowerCase();
        filtered = filtered.filter(function(a) {
          return (a.name || '').toLowerCase().indexOf(q) !== -1 || (a.description || '').toLowerCase().indexOf(q) !== -1 || (a.category || '').toLowerCase().indexOf(q) !== -1;
        });
      }

      if (filtered.length === 0) return '<div class="dw-empty">No apps found</div>';

      var categories = {};
      for (var i = 0; i < filtered.length; i++) {
        var cat = filtered[i].category || 'General';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(filtered[i]);
      }

      var html = '';
      var catKeys = Object.keys(categories).sort();
      for (var c = 0; c < catKeys.length; c++) {
        var catName = catKeys[c];
        var catApps = categories[catName];
        html += '<div class="dw-category">' + getIcon(catName) + ' ' + esc(catName) + ' (' + catApps.length + ')</div>';
        for (var j = 0; j < catApps.length; j++) {
          var a = catApps[j];
          var hasUrl = a.url && a.url.length > 5;
          html += '<div class="dw-app" data-url="' + esc(a.url || '') + '">';
          html += '<div class="dw-app-icon">' + getIcon(a.category) + '</div>';
          html += '<div class="dw-app-info">';
          html += '<div class="dw-app-name">' + esc(a.name);
          if (a.verified) html += ' <span class="dw-verified">\u2713</span>';
          html += '</div>';
          html += '<div class="dw-app-desc">' + esc(a.description || '') + '</div>';
          html += '</div>';
          if (hasUrl) {
            html += '<button class="dw-app-action visit">Visit</button>';
          } else {
            html += '<button class="dw-app-action join">Join</button>';
          }
          html += '</div>';
        }
      }
      return html;
    }

    function bindAppClicks(container) {
      var appEls = container.querySelectorAll('.dw-app');
      for (var i = 0; i < appEls.length; i++) {
        appEls[i].addEventListener('click', function() {
          var url = this.dataset.url;
          if (url && url.length > 5) {
            window.open(url, '_blank', 'noopener,noreferrer');
          } else {
            window.open(DW_API + '/ecosystem', '_blank', 'noopener,noreferrer');
          }
        });
      }
    }

    function esc(s) {
      var d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
