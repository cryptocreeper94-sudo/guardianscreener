(function() {
  'use strict';

  var scriptEl = document.currentScript;
  if (!scriptEl) return;

  var API_BASE = scriptEl.getAttribute('data-api') || 'https://dwsc.io';
  var componentsAttr = scriptEl.getAttribute('data-components') || 'all';
  var theme = scriptEl.getAttribute('data-theme') || 'dark';

  var AVAILABLE = ['footer', 'announcement-bar', 'trust-badge'];
  var requested = componentsAttr === 'all' ? AVAILABLE.slice() : componentsAttr.split(',').map(function(c) { return c.trim(); });

  var PLACEMENTS = {
    'footer': { position: 'end', container: 'body' },
    'announcement-bar': { position: 'start', container: 'body' },
    'trust-badge': { position: 'end', container: 'body' }
  };

  function loadComponents() {
    var url = API_BASE + '/api/ecosystem/shared/bundle?components=' + encodeURIComponent(requested.join(',')) + '&theme=' + encodeURIComponent(theme);

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var components = data.components || {};
        for (var name in components) {
          if (!components.hasOwnProperty(name) || !components[name]) continue;
          placeComponent(name, components[name]);
        }
      })
      .catch(function(err) {
        console.warn('[DW Shared Components] Failed to load:', err.message || err);
      });
  }

  function placeComponent(name, html) {
    var targetId = 'dw-shared-' + name;
    var existing = document.getElementById(targetId);

    if (existing) {
      existing.innerHTML = '';
      insertHTML(existing, html);
      return;
    }

    var placement = PLACEMENTS[name];
    if (!placement) return;

    var wrapper = document.createElement('div');
    wrapper.id = targetId + '-wrapper';
    insertHTML(wrapper, html);

    if (placement.position === 'start') {
      document.body.insertBefore(wrapper, document.body.firstChild);
    } else {
      document.body.appendChild(wrapper);
    }
  }

  function insertHTML(container, html) {
    var range = document.createRange();
    range.selectNodeContents(container);
    var fragment = range.createContextualFragment(html);
    container.appendChild(fragment);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadComponents);
  } else {
    loadComponents();
  }
})();
