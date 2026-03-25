(function() {
  'use strict';

  var scriptEl = document.currentScript;
  var DW_API = (scriptEl && scriptEl.getAttribute('data-api')) || 'https://dwsc.io';
  var DW_THEME = (scriptEl && scriptEl.getAttribute('data-theme')) || 'dark';
  var DW_COLLAPSED = (scriptEl && scriptEl.getAttribute('data-collapsed')) === 'true';
  var DW_PLACEMENT = (scriptEl && scriptEl.getAttribute('data-placement')) || 'auto';
  var DIRECTORY_VERSION = '1.0.0';

  var CATEGORY_ICONS = {
    Core: '\u26A1', Security: '\uD83D\uDEE1\uFE0F', DeFi: '\uD83D\uDC8E',
    Finance: '\uD83D\uDCB0', Gaming: '\uD83C\uDFAE', Entertainment: '\uD83C\uDF00',
    Community: '\uD83D\uDCAC', 'AI Trading': '\uD83E\uDD16', Analytics: '\uD83D\uDCC8',
    Enterprise: '\uD83C\uDFE2', Automotive: '\uD83D\uDE97', Transportation: '\uD83D\uDE9A',
    Services: '\uD83D\uDEE0\uFE0F', Hospitality: '\u2615', Identity: '\uD83C\uDD94',
    Education: '\uD83C\uDF93', Publishing: '\uD83D\uDCD6', Development: '\u2699\uFE0F',
    'Outdoor & Recreation': '\uD83C\uDF3F', 'Sports & Fitness': '\u26F3',
    'Health & Wellness': '\uD83E\uDDD8', 'Food & Delivery': '\uD83C\uDF54'
  };

  var CATEGORY_ORDER = [
    'Core','Security','DeFi','Finance','AI Trading','Analytics',
    'Gaming','Entertainment','Community','Identity','Education','Publishing',
    'Development','Enterprise','Automotive','Transportation','Services',
    'Hospitality','Outdoor & Recreation','Sports & Fitness','Health & Wellness','Food & Delivery'
  ];

  function getIcon(cat) { return CATEGORY_ICONS[cat] || '\u26A1'; }
  function slugify(s) { return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); }

  function buildStyles(isDark) {
    var bg = isDark ? 'rgba(2,6,23,0.95)' : 'rgba(255,255,255,0.97)';
    var border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    var text = isDark ? '#fff' : '#111';
    var textMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
    var textLink = isDark ? '#22d3ee' : '#0891b2';
    var hoverBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    var headerBg = isDark
      ? 'linear-gradient(135deg,rgba(6,182,212,0.06),rgba(139,92,246,0.06))'
      : 'linear-gradient(135deg,rgba(6,182,212,0.08),rgba(139,92,246,0.08))';
    var gradText = 'background:linear-gradient(90deg,#06b6d4,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;';

    return '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}'
      + ':host{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:' + text + '}'
      + '.dw-dir{background:' + bg + ';backdrop-filter:blur(20px);border:1px solid ' + border + ';border-radius:12px;overflow:hidden;max-width:100%}'
      + '.dw-dir-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ' + border + ';background:' + headerBg + '}'
      + '.dw-dir-title{display:flex;align-items:center;gap:6px}'
      + '.dw-dir-title-text{font-size:12px;font-weight:700;' + gradText + '}'
      + '.dw-dir-badge{font-size:9px;color:' + textMuted + ';background:' + hoverBg + ';padding:2px 6px;border-radius:8px}'
      + '.dw-dir-toggle{font-size:9px;color:' + textMuted + ';background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:4px;transition:all .2s}'
      + '.dw-dir-toggle:hover{color:' + textLink + ';background:' + hoverBg + '}'
      + '.dw-cat-btn{width:100%;display:flex;align-items:center;gap:6px;padding:8px 16px;border:none;background:none;cursor:pointer;text-align:left;transition:background .15s;color:' + text + '}'
      + '.dw-cat-btn:hover{background:' + hoverBg + '}'
      + '.dw-cat-icon{font-size:13px;flex-shrink:0}'
      + '.dw-cat-name{font-size:11px;font-weight:600;opacity:0.7;flex:1}'
      + '.dw-cat-count{font-size:9px;color:' + textMuted + ';margin-right:2px}'
      + '.dw-cat-arrow{font-size:10px;color:' + textMuted + ';transition:transform .15s}'
      + '.dw-cat-arrow.open{transform:rotate(90deg)}'
      + '.dw-cat-list{padding:0 16px 6px;overflow:hidden;transition:max-height .2s ease,opacity .2s;max-height:0;opacity:0}'
      + '.dw-cat-list.open{max-height:999px;opacity:1}'
      + '.dw-app-link{display:flex;align-items:center;gap:6px;padding:5px 10px;margin:0 -4px;border-radius:6px;text-decoration:none;transition:background .15s;color:' + text + '}'
      + '.dw-app-link:hover{background:' + hoverBg + '}'
      + '.dw-app-name{font-size:11px;font-weight:500;color:' + textLink + ';min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.dw-app-dot{width:5px;height:5px;border-radius:50%;background:#06b6d4;flex-shrink:0;box-shadow:0 0 4px rgba(6,182,212,0.6)}'
      + '.dw-app-hook{font-size:9px;color:' + textMuted + ';flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.dw-cat-sep{border:none;border-top:1px solid ' + border + ';margin:0}'
      + '.dw-powered{display:flex;align-items:center;justify-content:center;gap:4px;padding:8px;border-top:1px solid ' + border + ';font-size:9px;color:' + textMuted + '}'
      + '.dw-powered a{color:' + textLink + ';text-decoration:none}'
      + '.dw-powered a:hover{text-decoration:underline}'
      + '@media(max-width:480px){.dw-app-hook{display:none}}';
  }

  function createDirectory(data) {
    var isDark = DW_THEME === 'dark';
    var apps = data.apps || [];

    var target = document.getElementById('dw-ecosystem-directory');
    if (!target) {
      if (DW_PLACEMENT === 'none') return;
      target = document.createElement('div');
      target.id = 'dw-ecosystem-directory';
      document.body.appendChild(target);
    }

    var shadow = target.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = buildStyles(isDark);
    shadow.appendChild(style);

    var catMap = {};
    apps.forEach(function(app) {
      if (!catMap[app.category]) catMap[app.category] = [];
      catMap[app.category].push(app);
    });

    var ordered = [];
    CATEGORY_ORDER.forEach(function(cat) {
      if (catMap[cat]) ordered.push({ category: cat, apps: catMap[cat] });
    });
    Object.keys(catMap).forEach(function(cat) {
      if (CATEGORY_ORDER.indexOf(cat) === -1) ordered.push({ category: cat, apps: catMap[cat] });
    });

    var container = document.createElement('div');
    container.className = 'dw-dir';

    var header = document.createElement('div');
    header.className = 'dw-dir-header';
    header.innerHTML = '<div class="dw-dir-title">'
      + '<span style="font-size:13px">\u2728</span>'
      + '<span class="dw-dir-title-text">Ecosystem Directory</span>'
      + '<span class="dw-dir-badge">' + apps.length + ' apps</span>'
      + '</div>';

    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'dw-dir-toggle';
    toggleBtn.textContent = DW_COLLAPSED ? 'Expand All' : 'Collapse All';
    header.appendChild(toggleBtn);
    container.appendChild(header);

    var openState = {};
    var catListEls = {};

    ordered.forEach(function(group, idx) {
      var catSlug = slugify(group.category);
      openState[catSlug] = !DW_COLLAPSED;

      if (idx > 0) {
        var sep = document.createElement('hr');
        sep.className = 'dw-cat-sep';
        container.appendChild(sep);
      }

      var btn = document.createElement('button');
      btn.className = 'dw-cat-btn';
      btn.innerHTML = '<span class="dw-cat-icon">' + getIcon(group.category) + '</span>'
        + '<span class="dw-cat-name">' + group.category + '</span>'
        + '<span class="dw-cat-count">' + group.apps.length + '</span>'
        + '<span class="dw-cat-arrow ' + (DW_COLLAPSED ? '' : 'open') + '">\u25B6</span>';
      container.appendChild(btn);

      var list = document.createElement('div');
      list.className = 'dw-cat-list' + (DW_COLLAPSED ? '' : ' open');
      catListEls[catSlug] = { list: list, arrow: btn.querySelector('.dw-cat-arrow') };

      group.apps.forEach(function(app) {
        var a = document.createElement('a');
        a.className = 'dw-app-link';
        a.href = app.url || (DW_API + '/' + app.id);
        if (app.url && app.url.indexOf(window.location.hostname) === -1) {
          a.target = '_blank';
          a.rel = 'noopener';
        }
        var inner = '<span class="dw-app-name">' + app.name + '</span>';
        if (app.featured) inner += '<span class="dw-app-dot"></span>';
        if (app.hook) inner += '<span class="dw-app-hook">' + app.hook + '</span>';
        a.innerHTML = inner;
        list.appendChild(a);
      });

      container.appendChild(list);

      btn.addEventListener('click', function() {
        var state = catListEls[catSlug];
        var nowOpen = state.list.classList.contains('open');
        if (nowOpen) {
          state.list.classList.remove('open');
          state.arrow.classList.remove('open');
        } else {
          state.list.classList.add('open');
          state.arrow.classList.add('open');
        }
        openState[catSlug] = !nowOpen;
      });
    });

    var powered = document.createElement('div');
    powered.className = 'dw-powered';
    powered.innerHTML = 'Powered by <a href="https://dwsc.io/ecosystem" target="_blank" rel="noopener">DarkWave Trust Layer</a>';
    container.appendChild(powered);

    shadow.appendChild(container);

    toggleBtn.addEventListener('click', function() {
      var allOpen = Object.keys(openState).every(function(k) { return openState[k]; });
      Object.keys(catListEls).forEach(function(slug) {
        var el = catListEls[slug];
        if (allOpen) {
          el.list.classList.remove('open');
          el.arrow.classList.remove('open');
          openState[slug] = false;
        } else {
          el.list.classList.add('open');
          el.arrow.classList.add('open');
          openState[slug] = true;
        }
      });
      toggleBtn.textContent = allOpen ? 'Expand All' : 'Collapse All';
    });
  }

  function init() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', DW_API + '/api/ecosystem/directory');
    xhr.onload = function() {
      if (xhr.status === 200) {
        try { createDirectory(JSON.parse(xhr.responseText)); } catch(e) { console.warn('[DW Directory] Parse error:', e); }
      } else {
        console.warn('[DW Directory] API returned status', xhr.status);
      }
    };
    xhr.onerror = function() { console.warn('[DW Directory] Network error'); };
    xhr.send();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
