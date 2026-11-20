/* Rocavo tools: page and use counting. Written by Rocavo; this is not GoatCounter's count.js.
   Sends one small request per page view, and one the first time a tool is used on a page,
   to our GoatCounter site (https://rocavo.goatcounter.com/count). What is sent, in full:
     p    the page's path (no query string), or the fixed name of an event
     t    the page's title, or the fixed label of an event
     e    "true" for an event
     r    the host name only of the site that linked here, if there was one
     b    a marker when the browser says it is automated, so the visit is not counted
     rnd  a few random characters so the request is not cached
   Nothing typed into a tool is ever read here. No cookie, no browser storage.
   Nothing is sent if the browser asks not to be tracked (Do Not Track or Global Privacy Control). */
(function (root) {
  'use strict';
  var ENDPOINT = 'https://rocavo.goatcounter.com/count';

  function optedOut(nav, win) {
    return !!(nav && (nav.doNotTrack === '1' || nav.doNotTrack === 'yes' || nav.globalPrivacyControl === true)) ||
      !!(win && win.doNotTrack === '1');
  }
  function localHost(loc) {
    return loc.protocol === 'file:' || /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0$)/.test(loc.hostname || '');
  }
  function referrerHost(ref, ownHost) {
    var m = /^https?:\/\/([^\/?#:]+)/i.exec(ref || '');
    if (!m) return '';
    var h = m[1].toLowerCase();
    return h === String(ownHost || '').toLowerCase() ? '' : h;
  }
  /* Returns the URL to request, or '' when nothing is to be sent. Pure: everything comes from env. */
  function buildUrl(env, what) {
    if (optedOut(env.navigator, env.window) || localHost(env.location)) return '';
    if (env.framed || env.visibilityState === 'prerender') return '';
    var q = ['p=' + encodeURIComponent(what.path), 't=' + encodeURIComponent(what.title || '')];
    if (what.event) q.push('e=true');
    else { var r = referrerHost(env.referrer, env.location.hostname); if (r) q.push('r=' + encodeURIComponent(r)); }
    if (env.navigator && env.navigator.webdriver) q.push('b=153');
    q.push('rnd=' + env.random());
    return ENDPOINT + '?' + q.join('&');
  }
  var api = { ENDPOINT: ENDPOINT, buildUrl: buildUrl, referrerHost: referrerHost, optedOut: optedOut, localHost: localHost };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  var doc = root.document, sent = {};
  function env() {
    var framed = false; try { framed = root.self !== root.top; } catch (e) { framed = true; }
    return { navigator: root.navigator, window: root, location: root.location, referrer: doc.referrer, framed: framed,
      visibilityState: doc.visibilityState, random: function () { return Math.random().toString(36).slice(2, 7); } };
  }
  function send(what) {
    try {
      var url = buildUrl(env(), what);
      if (!url) return;
      if (root.navigator.sendBeacon && root.navigator.sendBeacon(url)) return;
      var img = new root.Image(); img.src = url;
    } catch (e) { /* counting must never break a tool */ }
  }
  /* An event is sent at most once per page load, so the count is of visits that used the tool, not of presses. */
  api.event = function (name, label) {
    if (typeof name !== 'string' || !/^[a-z0-9-]+$/.test(name) || sent[name]) return;
    sent[name] = true;
    send({ path: name, title: label || name, event: true });
  };
  root.RocavoCount = api;
  function view() { send({ path: root.location.pathname, title: doc.title }); }
  if (doc.visibilityState === 'hidden') {
    var once = function () { if (doc.visibilityState === 'visible') { doc.removeEventListener('visibilitychange', once); view(); } };
    doc.addEventListener('visibilitychange', once);
  } else view();
})(typeof window !== 'undefined' ? window : this);
