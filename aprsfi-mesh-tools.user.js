// ==UserScript==
// @name         aprs.fi Mesh Tools (beta)
// @namespace    https://greasyfork.org/users/aprsfi-mesh-overlay
// @version      1.6.0-beta
// @description  One easy panel for aprs.fi: see MeshCore & Meshtastic radios on the map, check roughly where a repeater can reach, and hide map clutter. Bundles Mesh Overlay, Mesh Coverage and Map Layer Toggles.
// @author       aprsfi-mesh-overlay contributors
// @license      MIT
// @homepageURL  https://github.com/thescrawler/aprsfi-mesh-tools
// @supportURL   https://github.com/thescrawler/aprsfi-mesh-tools/issues
// @downloadURL  https://raw.githubusercontent.com/thescrawler/aprsfi-mesh-tools/main/aprsfi-mesh-tools.user.js
// @updateURL    https://raw.githubusercontent.com/thescrawler/aprsfi-mesh-tools/main/aprsfi-mesh-tools.user.js
// @match        https://aprs.fi/*
// @match        https://*.aprs.fi/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// @connect      map.meshcore.io
// @connect      meshmap.net
// @connect      s3.amazonaws.com
// @connect      retrieve.pskreporter.info
// @run-at       document-start
// ==/UserScript==
/*
 * MIT License — Copyright (c) 2026 aprsfi-mesh-overlay contributors.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions: The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
 *
 * Data sources (not affiliated; please respect their services):
 *  - MeshCore nodes: https://map.meshcore.io/api/v1/nodes (downloaded once, shared by nodes + coverage)
 *  - Meshtastic nodes: https://meshmap.net/nodes.json (MQTT-reporting nodes only)
 *  - Terrain: AWS Terrain Tiles (terrarium), https://registry.opendata.aws/terrain-tiles/
 *  - FT8 spots (only if that switch is on): https://retrieve.pskreporter.info/query  (at most every 5 minutes)
 * Coverage is a bare-earth line-of-sight ESTIMATE (ignores trees/buildings; antenna heights assumed).
 *
 * This file bundles aprsfi-mesh-overlay 1.2.0, aprsfi-mesh-coverage 0.4.0 and aprsfi-layer-toggles 0.2.0
 * into one panel. If the old separate scripts are also running, the matching part here stays off
 * (so nothing is drawn twice) and a one-time notice asks the user to turn the old ones off.
 */
(function () {
  'use strict';
  // 1.1.2: Tampermonkey runs the script inside a with(sandbox-proxy) scope, so every free global (Math, isFinite,
  // Float32Array...) in the ray loops was a Proxy lookup: ~15x slower (36 s instead of 2.3 s for a 50 mi pin in Chrome).
  // Binding them locally here makes those lookups plain variable reads; the heavy loop also runs in a Web Worker.
  const { Math, isFinite, Float32Array, Float64Array, Uint8Array, Uint16Array, Int16Array, Array, Map, Set, Promise, Object, Date, Number, JSON, Error } = globalThis;
  const performance = globalThis.performance || { now: () => Date.now() };
  const BOOTED = performance.now();
  const W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : (typeof window !== 'undefined' ? window : globalThis);
  const VERSION = '1.6.0-beta';
  const TAG = '[mesh-tools]';
  const WIKI_URL = 'https://github.com/thescrawler/aprsfi-mesh-tools/blob/main/docs/Home.md'; // 📖 Help / Wiki link in Panel settings

  // ===== LOSCORE (pure; also loaded by the Node test harness) =====
  const R_EARTH = 6371000, K_FACTOR = 4 / 3, TILE_Z = 11;
  // near-field: terrain this close to the antenna is its own mounting spot (DEM pixel noise / pin a few px off a
  // sloped summit). A 3 m mast compared against the next 30-75 m DEM pixel uphill shadowed whole sectors (1.0.7).
  const NEAR_M = 100;
  // terrain detail levels: terrarium zoom + matching ray sample step (m)
  const DETAIL = { fast: { z: 11, step: 75, label: 'Fast', res: '~75 m' }, balanced: { z: 12, step: 38, label: 'Balanced', res: '~38 m' }, sharp: { z: 13, step: 19, label: 'Sharp', res: '~19 m' } };
  const TILE_CAP = 480; // max tiles for one coverage (Int16 tiles = 128 KB each -> ~60 MB)
  const tileUrl = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
  function tileRange(lat, lon, rangeM, z) {
    const dLat = rangeM / 111320, dLon = rangeM / (111320 * Math.cos(lat * Math.PI / 180));
    const a = lonLatToTilePx(lon - dLon, lat + dLat, z), b = lonLatToTilePx(lon + dLon, lat - dLat, z);
    const x0 = Math.floor(a[0] / 256), x1 = Math.floor(b[0] / 256), y0 = Math.floor(a[1] / 256), y1 = Math.floor(b[1] / 256);
    return { x0, x1, y0, y1, count: (x1 - x0 + 1) * (y1 - y0 + 1) };
  }
  // chosen zoom, dropped a level at a time if the area would need more than TILE_CAP tiles
  function effZoom(detail, lat, lon, rangeM) {
    let z = (DETAIL[detail] || DETAIL.balanced).z;
    while (z > 11 && tileRange(lat, lon, rangeM, z).count > TILE_CAP) z--;
    return z;
  }
  const stepForZ = z => (z >= 13 ? 19 : z === 12 ? 38 : z === 11 ? 75 : 150);
  // same tiles on S3's second hostname: browsers allow ~6 downloads per host, two hosts = twice as many at once
  const tileUrl2 = (z, x, y) => `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/${z}/${x}/${y}.png`;
  // only the tiles that touch the coverage circle (the square's corners are never sampled: ~20% fewer downloads)
  // innerM: skip tiles lying wholly inside that radius (the ring's coarse tiles)
  function tilesInCircle(lat, lon, rangeM, z, innerM) {
    const r = tileRange(lat, lon, rangeM, z), c = lonLatToTilePx(lon, lat, z), out = [];
    const mpp = 40075016.7 * Math.cos(lat * Math.PI / 180) / (256 * Math.pow(2, z)), rp = rangeM / mpp + 2, ip = innerM ? innerM / mpp - 2 : -1;
    for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) {
      const dx = Math.max(x * 256 - c[0], 0, c[0] - (x + 1) * 256), dy = Math.max(y * 256 - c[1], 0, c[1] - (y + 1) * 256);
      const fx = Math.max(Math.abs(x * 256 - c[0]), Math.abs((x + 1) * 256 - c[0])), fy = Math.max(Math.abs(y * 256 - c[1]), Math.abs((y + 1) * 256 - c[1]));
      if (dx * dx + dy * dy <= rp * rp && !(ip > 0 && fx * fx + fy * fy < ip * ip)) out.push([x, y, Math.hypot((x + 0.5) * 256 - c[0], (y + 0.5) * 256 - c[1])]);
    }
    return out.sort((a, b) => a[2] - b[2]).map(t => [t[0], t[1]]); // nearest first
  }
  // quick first picture: 2 zoom levels coarser (16x fewer tiles), only worth it when lots of tiles must be downloaded
  const PREVIEW = { dz: 2, minZ: 9, minMissing: 24, rays: 180 };
  const previewZ = z => Math.max(PREVIEW.minZ, z - PREVIEW.dz);
  // far out, neighbouring rays are further apart than a coarser tile's pixels, so the outer ring uses one zoom
  // level less (half the downloads at 50 mi; Pine Observatory 35.8% either way, other tests within 0.6 points).
  // fine terrain is kept where ray spacing < 8 pixels, and always within 15 km.
  const fineRadius = (z, rays) => Math.max(15000, rays * 8 * stepForZ(z) / (2 * Math.PI));
  function tilePlan(lat, lon, rangeM, z, rays) {
    const rin = fineRadius(z, rays);
    if (z <= PREVIEW.minZ || rin >= rangeM) return { rin: Infinity, fine: tilesInCircle(lat, lon, rangeM, z), coarse: [] };
    return { rin, fine: tilesInCircle(lat, lon, rin, z), coarse: tilesInCircle(lat, lon, rangeM, z - 1, rin) };
  }
  function lonLatToTilePx(lon, lat, z) {
    const n = 256 * Math.pow(2, z), s = Math.sin(lat * Math.PI / 180);
    return [(lon + 180) / 360 * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
  }
  function destPoint(lat, lon, brgRad, d) { // local flat approx, fine for <=60 km
    const dLat = d * Math.cos(brgRad) / 111320;
    const dLon = d * Math.sin(brgRad) / (111320 * Math.cos(lat * Math.PI / 180));
    return [lat + dLat, lon + dLon];
  }
  // getElev(lat,lon) -> metres or NaN. Returns { rays, step, n, segs: Array<Uint16Array> } segs = [s0,e0,s1,e1..] sample idx (inclusive).
  function computeRay(getElev, lat, lon, brg, o, h0) {
    const n = Math.floor(o.range / o.step), elev = new Float32Array(n + 1), dist = new Float32Array(n + 1);
    for (let i = 1; i <= n; i++) {
      const d = i * o.step, p = destPoint(lat, lon, brg, d);
      let e = getElev(p[0], p[1]); if (!isFinite(e)) e = 0;
      dist[i] = d; elev[i] = e - d * d / (2 * K_FACTOR * R_EARTH); // curvature drop folded in
    }
    const segs = []; let start = -1;
    const lambda = 299792458 / (o.freqMHz * 1e6);
    let maxAng = -Infinity; const near = o.near != null ? o.near : NEAR_M;
    for (let i = 1; i <= n; i++) {
      const D = dist[i], tgt = elev[i] + o.rx;
      let vis;
      if (!o.fresnel) {
        vis = (tgt - h0) / D >= maxAng;
      } else { // exact: every intermediate point must clear 60% F1 below the LOS line
        vis = true;
        const slope = (tgt - h0) / D;
        for (let j = 1; j < i; j++) {
          const d1 = dist[j]; if (d1 <= near) continue; const r = 0.6 * Math.sqrt(lambda * d1 * (D - d1) / D);
          if (elev[j] + r > h0 + slope * d1) { vis = false; break; }
        }
      }
      if (D > near) { const a = (elev[i] - h0) / D; if (a > maxAng) maxAng = a; }
      if (vis && start < 0) start = i;
      if (!vis && start >= 0) { segs.push(start, i - 1); start = -1; }
    }
    if (start >= 0) segs.push(start, n);
    return Uint16Array.from(segs);
  }

  // ----- signal-strength mode (1.1.0): free-space + Deygout knife-edge diffraction (<=3 edges) vs a LoRa link budget -----
  const LORA_SNR = { 5: -2.5, 6: -5, 7: -7.5, 8: -10, 9: -12.5, 10: -15, 11: -17.5, 12: -20 }; // demod floor per SF (Semtech)
  const RADIO_DEF = { freq: 910.525, sf: 7, bw: 62.5 }; // MeshCore US default
  const LINK_DEF = { txDbm: 22, gainDbi: 3, nfDb: 6 };
  const MARGIN_STRONG = 10, MARGIN_FAIR = 5, MARGIN_MARGINAL = 0, FADE_DEF = 10; // dB left after the fade margin: strong / fair / weak
  // receiver sensitivity (dBm) = thermal noise -174 dBm/Hz + 10log10(BW) + noise figure + required SNR for the SF
  function loraSens(sf, bwKHz, nf) {
    sf = Math.round(+sf); if (!(sf in LORA_SNR)) sf = RADIO_DEF.sf; bwKHz = +bwKHz > 0 ? +bwKHz : RADIO_DEF.bw;
    return -174 + 10 * Math.log10(bwKHz * 1000) + (nf != null ? nf : LINK_DEF.nfDb) + LORA_SNR[sf];
  }
  const fsplDb = (dM, fMHz) => 20 * Math.log10(dM / 1000) + 20 * Math.log10(fMHz) + 32.44;
  const planeEarthDb = (dM, ht, hr) => 40 * Math.log10(dM) - 20 * Math.log10(ht * hr);
  // 1.2.0 ground reflection: extra loss over free space from the 2-ray (plane-earth) model. Effective heights are above
  // the path's own ground: the higher of a least-squares line through the profile and the profile mean, never below the
  // real masts (so a mountain top over a basin keeps its height). Smooth knee: ~0 dB up to the breakpoint 4*ht*hr/lambda,
  // 3 dB at the crossover pi*breakpoint, then exactly plane-earth minus free space (40log d - 20log(ht*hr) beyond).
  function groundExcessDb(d, cnt, sx, sy, sxx, sxy, h0, hr, txAgl, rxAgl, lambda) {
    const mean = sy / cnt, den = cnt * sxx - sx * sx, b = den > 0 ? (cnt * sxy - sx * sy) / den : 0, a = mean - b * sx / cnt;
    const ht = Math.max(txAgl, h0 - a), he = Math.max(rxAgl, hr - (a + b * d));
    const dc = 4 * Math.PI * ht * he / lambda, r = d / dc;
    return 10 * Math.log10(1 + r * r);
  }
  const knifeJ = v => (v <= -0.78 ? 0 : 6.9 + 20 * Math.log10(Math.sqrt((v - 0.1) * (v - 0.1) + 1) + v - 0.1)); // ITU-R P.526
  // highest-v edge strictly between sample a and b (heights already include earth bulge); ha/hb = end heights ASL
  function bestEdge(dist, elev, a, b, ha, hb, lambda, near) {
    const da = dist[a], D = dist[b] - da; let best = -Infinity, bi = -1;
    if (D <= 0) return [bi, best];
    for (let j = a + 1; j < b; j++) {
      const d1 = dist[j] - da; if (dist[j] <= near) continue;
      const d2 = D - d1, h = elev[j] - (ha + (hb - ha) * d1 / D), v = h * Math.sqrt(2 * D / (lambda * d1 * d2));
      if (v > best) { best = v; bi = j; }
    }
    return [bi, best];
  }
  // Deygout: main edge, then one sub-edge each side (max 3 edges)
  function deygoutDb(dist, elev, i, h0, hr, lambda, near) {
    const [m, vm] = bestEdge(dist, elev, 0, i, h0, hr, lambda, near);
    if (m < 0 || vm <= -0.78) return 0;
    const hm = elev[m];
    const [, vl] = bestEdge(dist, elev, 0, m, h0, hm, lambda, near), [, vr] = bestEdge(dist, elev, m, i, hm, hr, lambda, near);
    return knifeJ(vm) + (vl > -0.78 ? knifeJ(vl) : 0) + (vr > -0.78 ? knifeJ(vr) : 0);
  }
  // o: { range, step, rx, freqMHz, txDbm, gainDbi, sensDbm, fadeDb?, near? } -> Uint16Array [start, end, level, ...] level 3 strong / 2 fair / 1 weak
  function computeRaySignal(getElev, lat, lon, brg, o, h0) {
    const n = Math.floor(o.range / o.step), elev = new Float32Array(n + 1), dist = new Float32Array(n + 1);
    const near = o.near != null ? o.near : NEAR_M, lambda = 299792458 / (o.freqMHz * 1e6);
    elev[0] = h0 - (o.txAgl || 0); // ground under antenna (not used as an obstacle)
    for (let i = 1; i <= n; i++) {
      const d = i * o.step, p = destPoint(lat, lon, brg, d);
      let e = getElev(p[0], p[1]); if (!isFinite(e)) e = 0;
      dist[i] = d; elev[i] = e - d * d / (2 * K_FACTOR * R_EARTH);
    }
    // running sums of path ground (x = distance, y = ground) for the fitted line used by the 2-ray heights
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    const acc = j => { const x = dist[j], y = elev[j]; sx += x; sy += y; sxx += x * x; sxy += x * y; };
    acc(0); let done = 0;
    // evaluate the receiver every `stride` samples (<= ~300 points/ray keeps Deygout O(n) scans cheap), fill between
    const stride = Math.max(1, Math.ceil(n / 300)), budget = o.txDbm + 2 * o.gainDbi - o.sensDbm - (o.fadeDb || 0);
    const lvl = new Uint8Array(n + 1);
    for (let i = stride; i <= n + stride - 1; i += stride) {
      const k = Math.min(i, n), hr = elev[k] + o.rx;
      while (done < k) acc(++done);
      const m = groundExcessDb(dist[k], k + 1, sx, sy, sxx, sxy, h0, hr, o.txAgl || 1, o.rx, lambda);
      const dif = deygoutDb(dist, elev, k, h0, hr, lambda, near);
      // diffraction (terrain blocking) is added on top; the grazing part both models share (up to 6 dB) is counted once
      const margin = budget - fsplDb(dist[k], o.freqMHz) - m - dif + Math.min(m, dif, 6);
      const L = margin >= MARGIN_STRONG ? 3 : margin >= MARGIN_FAIR ? 2 : margin >= MARGIN_MARGINAL ? 1 : 0;
      for (let j = Math.max(1, k - stride + 1); j <= k; j++) lvl[j] = L;
      if (k === n) break;
    }
    const segs = []; let start = 1;
    for (let i = 2; i <= n + 1; i++) {
      if (i > n || lvl[i] !== lvl[start]) { if (lvl[start]) segs.push(start, i - 1, lvl[start]); start = i; }
    }
    return Uint16Array.from(segs);
  }
  // ===== /LOSCORE =====

  if (typeof module !== 'undefined' && typeof GM_xmlhttpRequest === 'undefined') {
    module.exports = { computeRay, lonLatToTilePx, destPoint, TILE_Z, DETAIL, TILE_CAP, NEAR_M, tileUrl, computeRaySignal, loraSens, fsplDb, planeEarthDb, groundExcessDb, knifeJ, deygoutDb, LORA_SNR, RADIO_DEF, LINK_DEF, MARGIN_STRONG, MARGIN_FAIR, MARGIN_MARGINAL, FADE_DEF, tileRange, effZoom, stepForZ, tileUrl2, tilesInCircle, PREVIEW, previewZ, fineRadius, tilePlan }; return;
  }
  if (W.__meshToolsActive) return; // installed twice
  W.__meshToolsActive = VERSION;

  // ================= shared helpers =================
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (v, opts, d) => (opts.indexOf(+v) >= 0 ? +v : d);
  const $id = id => document.getElementById(id);
  function gmGet(url, type, timeout) {
    return new Promise((res, rej) => GM_xmlhttpRequest({ method: 'GET', url, responseType: type, timeout: timeout || 30000,
      headers: type === 'text' ? { Accept: 'application/json' } : undefined,
      onload: r => r.status === 200 ? res(r) : rej(new Error('HTTP ' + r.status)),
      onerror: () => rej(new Error('network error')), ontimeout: () => rej(new Error('timeout')) }));
  }
  // turn a technical error into a short plain-English reason
  function friendly(e) {
    const m = String((e && e.message) || e || '');
    if (/timeout/i.test(m)) return 'it took too long';
    if (/network/i.test(m)) return 'no internet connection, or the site is blocked';
    if (/HTTP 4|HTTP 5/.test(m)) return 'the map server had a problem';
    if (/JSON|Unexpected/i.test(m)) return 'the data came back garbled';
    if (/elevation/i.test(m)) return 'no hill/terrain data for that spot';
    return 'something went wrong';
  }
  const MC_URL = 'https://map.meshcore.io/api/v1/nodes', MT_URL = 'https://meshmap.net/nodes.json';
  // The MeshCore list is ~55 MB / ~70,000 radios. Remember the last result so Coverage and
  // Mesh nodes share one download, including one started at document-start before the map exists.
  let mcMemo = null;
  function loadMeshcoreRaw(force) {
    if (!force && mcMemo && Date.now() - mcMemo.t < 10 * 60 * 1000) return mcMemo.p;
    const p = gmGet(MC_URL, 'text', 180000).then(r => { let a = JSON.parse(r.responseText); if (!Array.isArray(a)) a = a.nodes || a.data || []; return a; });
    let wrapped;
    wrapped = p.then(a => a, e => { if (mcMemo && mcMemo.p === wrapped) mcMemo = null; throw e; });
    mcMemo = { t: Date.now(), p: wrapped };
    return wrapped;
  }
  let mtMemo = null;
  function loadMeshtasticRaw(force) {
    if (!force && mtMemo && Date.now() - mtMemo.t < 10 * 60 * 1000) return mtMemo.p;
    const p = gmGet(MT_URL, 'text', 60000).then(r => JSON.parse(r.responseText));
    let wrapped;
    wrapped = p.then(a => a, e => { if (mtMemo && mtMemo.p === wrapped) mtMemo = null; throw e; });
    mtMemo = { t: Date.now(), p: wrapped };
    return wrapped;
  }
  // Slim lists (lat/lon/name/type/heard/id) survive in IndexedDB. A full JSON copy is too big for localStorage.
  const NodeCache = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise(res => {
      try {
        const r = indexedDB.open('mesh-tools-nodes', 1);
        r.onupgradeneeded = () => { try { r.result.createObjectStore('n'); } catch (e) { /* */ } };
        r.onsuccess = () => res(r.result);
        r.onerror = r.onblocked = () => res(null);
      } catch (e) { res(null); }
    }));
    const req = (key, val) => open().then(db => new Promise(res => {
      if (!db) return res(null);
      try {
        const q = val === undefined ? db.transaction('n').objectStore('n').get(key) : db.transaction('n', 'readwrite').objectStore('n').put(val, key);
        q.onsuccess = () => res(q.result || true); q.onerror = () => res(null);
      } catch (e) { res(null); }
    }));
    return { get: key => req(key), put: (key, val) => { req(key, val); } };
  })();
  const mcCacheP = NodeCache.get('mc');
  const mtCacheP = NodeCache.get('mt');
  // Start the big download immediately, in parallel with aprs.fi's own map setup. Skip it when the user has hidden that network.
  try { if (GM_getValue('show_meshcore', true) !== false) loadMeshcoreRaw(); } catch (e) { /* */ }
  try { if (GM_getValue('show_meshtastic', true) !== false) loadMeshtasticRaw(); } catch (e) { /* */ }

  // ================= conflict detection (old separate scripts) =================
  const OLD = {
    nodes: { name: 'aprs.fi MeshCore + Meshtastic Overlay', test: () => { try { return !!W.__meshOverlayActive || !!$id('mo-panel'); } catch (e) { return false; } } },
    coverage: { name: 'aprs.fi MeshCore Coverage Overlay', test: () => !!$id('cv-panel') },
    layers: { name: 'aprs.fi Map Layer Toggles', test: () => !!$id('lt-panel') }
  };
  const detectOld = () => Object.keys(OLD).filter(k => OLD[k].test());


  // =====================================================================
  // MODULE 1: Mesh nodes (from aprsfi-mesh-overlay 1.2.0)
  // =====================================================================
  const NODES = (function () {
    const CFG = { cacheMs: 10 * 60 * 1000, maxMarkersPerLayer: 400, minZoom: 6, debounceMs: 600, maxAgeDays: 30 };
    const AGE_OPTS = [1, 7, 30, 90], MAX_OPTS = [100, 400, 1000];
    CFG.maxAgeDays = pick(GM_getValue('max_age_days', CFG.maxAgeDays), AGE_OPTS, CFG.maxAgeDays);
    CFG.maxMarkersPerLayer = pick(GM_getValue('max_markers', CFG.maxMarkersPerLayer), MAX_OPTS, CFG.maxMarkersPerLayer);
    const MC_TYPES = { 1: 'Companion', 2: 'Repeater', 3: 'Room Server', 4: 'Sensor' };
    const MC_COLORS = { 1: '#1e88e5', 2: '#e53935', 3: '#8e24aa', 4: '#00897b' };
    // type field from map.meshcore.io. 0 is the catch-all for anything that is not 1–4.
    const MC_TYPE_ROWS = [
      [2, 'Repeaters', 'R'],
      [1, 'Companions', 'C'],
      [3, 'Room servers', 'S'],
      [4, 'Sensors', 's'],
      [0, 'Other / unknown', '?']
    ];
    const showType = {};
    for (const [id] of MC_TYPE_ROWS) showType[id] = GM_getValue('show_mc_type_' + id, true) !== false;
    const mcTypeBucket = t => (t === 1 || t === 2 || t === 3 || t === 4) ? t : 0;
    const mcTypeOn = t => !!showType[mcTypeBucket(t)];
    // Gone quiet uses the last-advert time already on each node. No extra download.
    const QUIET_H = [12, 24, 72, 168];
    const QUIET_LABEL = { 12: '12 hours', 24: '24 hours', 72: '3 days', 168: '7 days' };
    let quietOn = GM_getValue('mc_quiet_on', true) !== false;
    let quietHours = pick(GM_getValue('mc_quiet_h', 24), QUIET_H, 24);
    const isRepeaterOrRoom = n => n && n.src === 'meshcore' && (n.typeId === 2 || n.typeId === 3);
    function silentFor(heard) {
      const ms = Math.max(0, Date.now() - heard);
      return Math.floor(ms / 86400000) + 'd ' + Math.floor((ms % 86400000) / 3600000) + 'h';
    }
    function isQuiet(n) {
      if (!quietOn || !isRepeaterOrRoom(n) || !n.heard) return false;
      return Date.now() - n.heard >= quietHours * 3600000;
    }
    const MT_COLOR = '#43a047';
    const NAMES = { meshcore: 'MeshCore nodes', meshtastic: 'Meshtastic nodes' };
    const state = {
      show: { meshcore: GM_getValue('show_meshcore', true), meshtastic: GM_getValue('show_meshtastic', true) },
      data: { meshcore: null, meshtastic: null }, fetchedAt: { meshcore: 0, meshtastic: 0 },
      loading: { meshcore: false, meshtastic: false }, error: { meshcore: '', meshtastic: '' },
      layers: {}, map: null, L: null, timer: null, active: false,
      stale: { meshcore: false, meshtastic: false },
      index: { meshcore: null, meshtastic: null }, indexed: { meshcore: null, meshtastic: null },
      byKey: { meshcore: new Map(), meshtastic: new Map() },
      drawGen: { meshcore: 0, meshtastic: 0 }, painted: { meshcore: false, meshtastic: false },
      inflight: { meshcore: null, meshtastic: null }
    };
    const iconCache = {};
    const KEEP_MS = 90 * 86400000; // saved list covers the longest "heard in the last" choice

    function mcFields(n) {
      const f = [], p = n.params || {};
      if (p.freq != null) f.push(['Frequency', p.freq + ' MHz']);
      const radio = [p.bw != null ? 'BW ' + p.bw + ' kHz' : '', p.sf != null ? 'SF' + p.sf : '', p.cr != null ? 'CR 4/' + p.cr : ''].filter(Boolean).join(' · ');
      if (radio) f.push(['Radio settings', radio]);
      if (n.source) f.push(['Reported via', n.source]);
      if (n.inserted_date) f.push(['First seen', new Date(Date.parse(n.inserted_date)).toLocaleDateString()]);
      return f;
    }
    function normMeshcore(arr) {
      if (arr && !Array.isArray(arr)) arr = arr.nodes || arr.data || [];
      const out = [];
      for (const n of arr || []) {
        const lat = +n.adv_lat, lon = +n.adv_lon;
        if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) continue;
        const key = n.public_key ? String(n.public_key) : '';
        out.push({ src: 'meshcore', lat, lon, name: (n.adv_name || '').trim() || '(unnamed)',
          typeId: n.type, type: MC_TYPES[n.type] || ('type ' + n.type),
          heard: n.last_advert ? Date.parse(n.last_advert) : (n.updated_date ? Date.parse(n.updated_date) : 0),
          id: key.slice(0, 12), key, params: n.params || null, source: n.source || '', inserted_date: n.inserted_date || '' });
      }
      return out;
    }
    function mtFields(n) {
      const f = [];
      let region = n.region || '';
      if (!region && n.seenBy) { const t = Object.keys(n.seenBy)[0] || ''; const m = t.match(/^msh\/([^/]+)/); if (m) region = m[1]; }
      if (n.shortName) f.push(['Short name', n.shortName]);
      if (region) f.push(['Region', region]);
      if (n.modemPreset) f.push(['Preset', n.modemPreset]);
      if (n.fwVersion) f.push(['Firmware', n.fwVersion]);
      if (n.altitude != null) f.push(['Altitude', n.altitude + ' m']);
      if (n.batteryLevel != null) f.push(['Battery', n.batteryLevel > 100 ? 'plugged in' : n.batteryLevel + '%']);
      if (n.onlineLocalNodes != null) f.push(['Nodes nearby', n.onlineLocalNodes]);
      if (n.seenBy) f.push(['Heard by', Object.keys(n.seenBy).length + ' internet gateway(s)']);
      return f;
    }
    function normMeshtastic(obj) {
      const out = [];
      for (const [id, n] of Object.entries(obj || {})) {
        if (n.latitude == null || n.longitude == null) continue;
        const lat = n.latitude / 1e7, lon = n.longitude / 1e7;
        if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) continue;
        let heard = 0; if (n.seenBy) for (const t of Object.values(n.seenBy)) heard = Math.max(heard, t * 1000);
        out.push({ src: 'meshtastic', lat, lon, name: (n.longName || n.shortName || '').trim() || ('!' + (+id).toString(16)),
          type: n.role || 'unknown role', heard, id: '!' + (+id).toString(16).padStart(8, '0'), hw: n.hwModel || '', role: n.role || '', fields: mtFields(n) });
      }
      return out;
    }
    function slimList(src, nodes) {
      const cut = Date.now() - KEEP_MS, out = [];
      for (const n of nodes) {
        if (n.heard && n.heard < cut) continue;
        if (src === 'meshcore') out.push([Math.round(n.lat * 1e5), Math.round(n.lon * 1e5), n.name, n.typeId | 0, n.heard | 0, n.key || '']);
        else out.push([Math.round(n.lat * 1e5), Math.round(n.lon * 1e5), n.name, n.role || '', n.heard | 0, n.id || '', n.hw || '']);
      }
      return out;
    }
    function expandList(src, rows) {
      const out = [];
      for (const a of rows || []) {
        if (src === 'meshcore') {
          const key = a[5] || '';
          out.push({ src, lat: a[0] / 1e5, lon: a[1] / 1e5, name: a[2] || '(unnamed)', typeId: a[3], type: MC_TYPES[a[3]] || ('type ' + a[3]), heard: a[4] || 0, id: key.slice(0, 12), key, params: null });
        } else {
          out.push({ src, lat: a[0] / 1e5, lon: a[1] / 1e5, name: a[2] || '(unnamed)', type: a[3] || 'unknown role', role: a[3] || '', heard: a[4] || 0, id: a[5] || '', hw: a[6] || '', fields: null });
        }
      }
      return out;
    }
    function applyCache(src, rec) {
      if (!state.active || !state.show[src] || !rec || !rec.nodes || !rec.nodes.length) return;
      if (state.data[src] && !state.stale[src]) return; // a fresh download already won
      state.data[src] = expandList(src, rec.nodes);
      state.stale[src] = true; state.fetchedAt[src] = 0;
      draw(src);
    }
    function ensureFresh(src, force) {
      if (!force && state.inflight[src]) return state.inflight[src];
      if (!force && state.data[src] && !state.stale[src] && Date.now() - state.fetchedAt[src] < CFG.cacheMs) return Promise.resolve();
      state.loading[src] = true;
      if (!state.data[src]) setStatus(src, 'Loading… (first time can take a few seconds)');
      const p = (async () => {
        try {
          const nodes = src === 'meshcore' ? normMeshcore(await loadMeshcoreRaw(force)) : normMeshtastic(await loadMeshtasticRaw(force));
          if (src === 'meshcore') mcMemo = null; else mtMemo = null; // drop the raw list; the slim copy is what we keep
          state.data[src] = nodes; state.fetchedAt[src] = Date.now(); state.stale[src] = false; state.error[src] = '';
          NodeCache.put(src === 'meshcore' ? 'mc' : 'mt', { t: state.fetchedAt[src], nodes: slimList(src, nodes) });
          if (state.active) draw(src);
        } catch (e) {
          console.warn(TAG, src, e);
          state.error[src] = friendly(e);
          if (!state.data[src]) setStatus(src, 'Not loaded');
        } finally { state.loading[src] = false; state.inflight[src] = null; showError(); }
      })();
      state.inflight[src] = p;
      return p;
    }
    function ago(t) {
      if (!t) return 'unknown';
      const s = (Date.now() - t) / 1000;
      if (s < 3600) return Math.round(s / 60) + ' min ago';
      if (s < 86400) return Math.round(s / 3600) + ' hours ago';
      return Math.round(s / 86400) + ' days ago';
    }
    const label = n => n.src === 'meshcore' ? `MeshCore ${n.type}: ${n.name}` : `Meshtastic: ${n.name}`;
    function icon(n) {
      const L = state.L;
      const quiet = isQuiet(n);
      const k = n.src === 'meshcore' ? 'm' + (n.typeId || 0) + (quiet ? 'q' : '') : 't';
      if (iconCache[k]) return iconCache[k];
      if (n.src === 'meshcore') {
        const c = MC_COLORS[n.typeId] || '#555', letter = { 1: 'C', 2: 'R', 3: 'S', 4: 's' }[n.typeId] || '?';
        const ring = quiet ? '<i style="position:absolute;left:-4px;top:-4px;width:28px;height:28px;box-sizing:border-box;border:3px solid #f9a825;border-radius:4px;transform:rotate(45deg);pointer-events:none"></i>' : '';
        return iconCache[k] = L.divIcon({ className: 'mo-ico', iconSize: quiet ? [28, 28] : [22, 22], iconAnchor: quiet ? [14, 14] : [11, 11],
          html: `<div style="position:relative;width:22px;height:22px;margin:${quiet ? '3px' : '0'}">${ring}<div style="width:20px;height:20px;background:${c};border:2px solid #fff;transform:rotate(45deg);box-shadow:0 0 2px #000;display:flex;align-items:center;justify-content:center"><b style="transform:rotate(-45deg);color:#fff;font:bold 11px sans-serif">${letter}</b></div></div>` });
      }
      return iconCache[k] = L.divIcon({ className: 'mo-ico', iconSize: [20, 20], iconAnchor: [10, 10],
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${MT_COLOR};border:2px solid #fff;box-shadow:0 0 2px #000;color:#fff;font:bold 10px sans-serif;display:flex;align-items:center;justify-content:center">M</div>` });
    }
    function popup(n) {
      const rows = [];
      const row = (k, v) => rows.push(`<tr><td style="color:#666;padding-right:6px;vertical-align:top">${esc(k)}</td><td>${esc(v)}</td></tr>`);
      if (n.src === 'meshcore') row('Type', n.type);
      else { row('Role', n.role || 'unknown'); if (n.hw) row('Hardware', n.hw); }
      row('Last heard', ago(n.heard) + (n.heard ? ' (' + new Date(n.heard).toLocaleString() + ')' : ''));
      if (isQuiet(n)) row('Status', 'Silent for ' + silentFor(n.heard));
      row('Position', n.lat.toFixed(5) + ', ' + n.lon.toFixed(5));
      const fields = n.fields || (n.src === 'meshcore' && n.params ? mcFields(n) : []);
      for (const [k, v] of fields) row(k, v);
      if (n.id) row('ID', n.id);
      const da = n.src === 'meshcore' && n.key ? ` class="mo-pp" data-mesh-key="${esc(n.key)}" data-mesh-type="${esc(n.typeId)}"` : ' class="mo-pp"';
      return `<div${da} style="font:14px sans-serif;min-width:180px">
        <b>${esc(n.name)}</b><br>
        <small style="color:#666">${n.src === 'meshcore' ? 'MeshCore · map.meshcore.io' : 'Meshtastic · meshmap.net'}</small>
        <table style="border-collapse:collapse;margin-top:4px;font-size:12px">${rows.join('')}</table></div>`;
    }
    function useIndex(src) {
      const nodes = state.data[src];
      if (!nodes) return null;
      if (state.indexed[src] !== nodes) {
        const idx = new Map();
        for (const n of nodes) { const k = n.key || n.id; if (k) idx.set(k, n); }
        state.index[src] = idx; state.indexed[src] = nodes;
      }
      return state.index[src];
    }
    const nodeKey = n => n.key || n.id || (Math.round(n.lat * 1e5) + ',' + Math.round(n.lon * 1e5));
    function makeMarker(n) {
      const L = state.L, key = nodeKey(n);
      const q = isQuiet(n);
      const tip = label(n) + (q ? ' · Silent for ' + silentFor(n.heard) : '');
      const m = L.marker([n.lat, n.lon], { icon: icon(n), title: tip, zIndexOffset: 1000, meshKey: key, quiet: q,
        meshNode: { src: n.src, public_key: key, type: n.typeId, lat: n.lat, lon: n.lon, name: n.name, heard: n.heard } });
      // Popup HTML is built on open, not for every marker. The lookup sees the latest node after a background refresh.
      m.bindPopup(() => {
        const idx = useIndex(n.src);
        const cur = (idx && idx.get(key)) || n;
        m.options.meshNode = { src: cur.src, public_key: cur.key || cur.id, type: cur.typeId, lat: cur.lat, lon: cur.lon, name: cur.name, heard: cur.heard };
        return popup(cur);
      }, { maxWidth: 280 });
      m.bindTooltip(esc(tip), { direction: 'top', offset: [0, -10] });
      return m;
    }
    function draw(src) {
      const map = state.map, layer = state.layers[src];
      if (!layer || !map) return;
      const bag = state.byKey[src];
      const pp = map._popup, keep = pp && pp.isOpen && pp.isOpen() && pp._source && layer.hasLayer(pp._source) ? pp._source : null;
      // 1.2.1: Show MeshCore / Meshtastic off means nothing from that network, at every zoom. No placeholder dots.
      if (!state.active || !state.show[src] || map.getZoom() < CFG.minZoom) {
        state.drawGen[src]++;
        if (keep && !state.show[src]) { try { map.closePopup(); } catch (e) { /* */ } }
        bag.forEach(m => { if (m !== keep || !state.show[src]) layer.removeLayer(m); });
        if (!state.show[src]) bag.clear();
        else bag.forEach((m, k) => { if (!layer.hasLayer(m)) bag.delete(k); });
        if (!state.show[src]) { if (src === 'meshcore') updateQuietList(null); return setStatus(src, 'Hidden'); }
        if (map.getZoom() < CFG.minZoom) { if (src === 'meshcore') updateQuietList(null); return setStatus(src, 'Zoom in closer to see them'); }
        return;
      }
      const nodes = state.data[src];
      if (!nodes) { if (state.error[src]) setStatus(src, 'Not loaded'); return; }
      const b = map.getBounds(), c = map.getCenter();
      const latPad = Math.abs(b.getNorth() - b.getSouth()) * 0.1;
      const west0 = b.getWest(), east0 = b.getEast(), wrap = west0 > east0;
      const lonSpan = wrap ? (180 - west0) + (east0 + 180) : (east0 - west0);
      const lonPad = Math.abs(lonSpan) * 0.1;
      const south = b.getSouth() - latPad, north = b.getNorth() + latPad, west = west0 - lonPad, east = east0 + lonPad;
      const cutoff = Date.now() - CFG.maxAgeDays * 86400000;
      const seen = new Set();
      let vis = [];
      for (const n of nodes) {
        if (src === 'meshcore' && !mcTypeOn(n.typeId)) continue;
        if (n.heard && n.heard < cutoff) continue;
        if (n.lat < south || n.lat > north) continue;
        if (!wrap) { if (n.lon < west || n.lon > east) continue; }
        else if (n.lon < west && n.lon > east) continue;
        const key = nodeKey(n); if (seen.has(key)) continue; seen.add(key);
        vis.push(n);
      }
      const inView = vis, total = vis.length;
      if (vis.length > CFG.maxMarkersPerLayer) {
        const clat = c.lat, clng = c.lng;
        vis.sort((a, z) => ((a.lat - clat) ** 2 + (a.lon - clng) ** 2) - ((z.lat - clat) ** 2 + (z.lon - clng) ** 2));
        vis = vis.slice(0, CFG.maxMarkersPerLayer);
      }
      const want = new Set();
      for (const n of vis) want.add(nodeKey(n));
      bag.forEach((m, k) => { if (!want.has(k) && m !== keep) { layer.removeLayer(m); bag.delete(k); } });
      const fresh = [];
      for (const n of vis) {
        const k = nodeKey(n); if (bag.has(k)) {
          const m = bag.get(k);
          if (m) {
            const ll = m.getLatLng();
            if (Math.abs(ll.lat - n.lat) > 1e-5 || Math.abs(ll.lng - n.lon) > 1e-5) m.setLatLng([n.lat, n.lon]);
            const q = isQuiet(n);
            if (!!m.options.quiet !== q) {
              m.options.quiet = q;
              m.setIcon(icon(n));
              const tip = label(n) + (q ? ' · Silent for ' + silentFor(n.heard) : '');
              m.options.title = tip;
              try { m.setTooltipContent(esc(tip)); } catch (e) { /* */ }
            }
          }
          continue;
        }
        fresh.push(n);
      }
      state.drawGen[src]++;
      const gen = state.drawGen[src];
      // Add in short slices so the first markers appear immediately and a phone stays responsive.
      let i = 0;
      const step = () => {
        if (gen !== state.drawGen[src] || !state.show[src]) return;
        const t0 = performance.now();
        for (; i < fresh.length && performance.now() - t0 < 12; i++) {
          const n = fresh[i], k = nodeKey(n);
          if (bag.has(k)) continue;
          bag.set(k, makeMarker(n).addTo(layer));
        }
        if (i < fresh.length) setTimeout(step, 0);
        else if (!state.painted[src]) {
          state.painted[src] = true;
          console.log(TAG, src, 'first markers', bag.size, 'in', Math.round(performance.now() - BOOTED) + 'ms', state.stale[src] ? '(saved list)' : '(fresh)');
        }
      };
      step();
      setStatus(src, total === 0 ? 'None here' : (total > vis.length ? `${vis.length} nearest of ${total} here` : `${total} here`));
      if (src === 'meshcore') updateQuietList(inView);
    }
    function updateQuietList(inView) {
      const box = $id('mo-quiet-list'), ul = $id('mo-quiet-ul'), nEl = $id('mo-quiet-n');
      if (!box || !ul) return;
      const show = quietOn && state.show.meshcore && state.map && state.map.getZoom() >= CFG.minZoom && inView;
      box.style.display = show ? '' : 'none';
      if (!show) return;
      const quiet = [];
      for (const n of inView) if (isQuiet(n)) quiet.push(n);
      quiet.sort((a, b) => (a.heard || 0) - (b.heard || 0));
      if (nEl) nEl.textContent = String(quiet.length);
      const top = quiet.slice(0, 30);
      ul.innerHTML = top.length ? top.map(n => `<li><b>${esc(n.name)}</b> · ${n.typeId === 2 ? 'Repeater' : 'Room'} · Silent for ${silentFor(n.heard)}</li>`).join('') + (quiet.length > top.length ? `<li>…and ${quiet.length - top.length} more</li>` : '') : '<li>None in view.</li>';
    }
    function refresh(force) {
      if (!state.active) return;
      for (const src of ['meshcore', 'meshtastic']) {
        draw(src); // saved or in-memory list, right away. Hidden networks draw nothing.
        if (!state.show[src]) continue;
        if (state.map.getZoom() >= CFG.minZoom || force) ensureFresh(src, force);
      }
      showError();
    }
    const scheduleRefresh = () => { clearTimeout(state.timer); state.timer = setTimeout(refresh, CFG.debounceMs); };
    function showError() {
      const el = $id('mo-err'); if (!el) return;
      const msgs = ['meshcore', 'meshtastic'].filter(s => state.error[s]).map(s => `Couldn't load ${NAMES[s]} (${state.error[s]}).`);
      el.style.display = msgs.length ? '' : 'none';
      const t = el.querySelector('.msg'); if (t) t.textContent = '⚠ ' + msgs.join(' ') + ' Tap Retry.';
    }
    function setStatus(src, txt) { const el = $id('mo-st-' + src); if (el) el.textContent = txt; }

    function sectionHtml() {
      return `
        <label title="MeshCore radios reported to map.meshcore.io"><input type="checkbox" id="mo-cb-meshcore"><span><b>Show MeshCore nodes</b>
          <small class="stl" id="mo-st-meshcore"></small></span></label>
        <div id="mt-mc-types" class="obj-groups${state.show.meshcore ? '' : ' dim'}">${MC_TYPE_ROWS.map(([id, name, letter]) => {
          const c = MC_COLORS[id] || '#555';
          return `<label><input type="checkbox" id="mo-type-${id}"${showType[id] ? ' checked' : ''}><span><i class="mcico" style="background:${c}"><span>${letter}</span></i><b>${name}</b></span></label>`;
        }).join('')}<div class="hint">These only apply while <b>Show MeshCore nodes</b> is on. The picture matches the map icon.</div></div>
        <div id="mt-mc-quiet" class="obj-groups${state.show.meshcore ? '' : ' dim'}">
          <label title="Gold ring on repeaters and room servers that have not been heard recently"><input type="checkbox" id="mo-quiet"${quietOn ? ' checked' : ''}><span><b>Flag gone-quiet repeaters</b>
            <small>A gold ring on repeaters and room servers that have gone silent. Uses the last-heard time already downloaded.</small></span></label>
          <div class="mt-row" id="mo-quiet-row" title="How long with no advert before a repeater or room is marked silent"><span class="lb">Quiet after</span><select id="mo-quiet-h">${QUIET_H.map(h => `<option value="${h}"${h === quietHours ? ' selected' : ''}>${QUIET_LABEL[h]}</option>`).join('')}</select></div>
          <details id="mo-quiet-list"><summary>Gone quiet in view (<span id="mo-quiet-n">0</span>)</summary><ul id="mo-quiet-ul"></ul></details>
        </div>
        <label title="Meshtastic radios reported to meshmap.net"><input type="checkbox" id="mo-cb-meshtastic"><span><b>Show Meshtastic nodes</b> <span style="color:${MT_COLOR}">●M</span>
          <small>Only ones connected to the internet show up.</small><small class="stl" id="mo-st-meshtastic"></small></span></label>
        <div id="mo-err" class="card err" style="display:none"><span class="msg"></span><button type="button" id="mo-retry">↻ Retry</button></div>
        <div class="hint">Tap any node on the map to see its details.</div>
        <details class="adv"><summary>Advanced</summary>
          <div class="mt-row" title="Hide nodes that haven't been heard from recently"><span class="lb">Heard from in the last</span><select id="mo-age">${AGE_OPTS.map(d => `<option value="${d}"${d === CFG.maxAgeDays ? ' selected' : ''}>${d} day${d > 1 ? 's' : ''}</option>`).join('')}</select></div>
          <div class="mt-row" title="Fewer = faster on slow phones"><span class="lb">Most nodes to draw</span><select id="mo-max">${MAX_OPTS.map(m => `<option value="${m}"${m === CFG.maxMarkersPerLayer ? ' selected' : ''}>${m}</option>`).join('')}</select></div>
          <button type="button" id="mo-reload">⟳ Download fresh node lists</button>
        </details>`;
    }
    function wire() {
      for (const src of ['meshcore', 'meshtastic']) {
        const cb = $id('mo-cb-' + src);
        cb.checked = state.show[src];
        cb.addEventListener('change', () => {
          state.show[src] = cb.checked; GM_setValue('show_' + src, cb.checked); refresh();
          // Coverage's plain repeater/room circles follow this switch too, including zoomed out.
          if (src === 'meshcore') { syncMcTypes(); try { if (COVERAGE.isActive()) COVERAGE.refresh(); } catch (e) { /* */ } }
        });
      }
      const syncMcTypes = () => { const box = $id('mt-mc-types'), ob = $id('mo-cb-meshcore'); if (box && ob) box.classList.toggle('dim', !ob.checked); };
      for (const [id] of MC_TYPE_ROWS) {
        const cb = $id('mo-type-' + id);
        cb.addEventListener('change', () => {
          showType[id] = cb.checked; GM_setValue('show_mc_type_' + id, cb.checked);
          draw('meshcore'); // already in memory: no download
          try { if (COVERAGE.isActive()) COVERAGE.refresh(); } catch (e) { /* */ }
        });
      }
      syncMcTypes();
      const syncQuiet = () => { const box = $id('mt-mc-quiet'), ob = $id('mo-cb-meshcore'); if (box && ob) box.classList.toggle('dim', !ob.checked); };
      $id('mo-quiet').addEventListener('change', e => { quietOn = e.target.checked; GM_setValue('mc_quiet_on', quietOn); draw('meshcore'); });
      $id('mo-quiet-h').addEventListener('change', e => { quietHours = pick(e.target.value, QUIET_H, 24); GM_setValue('mc_quiet_h', quietHours); draw('meshcore'); });
      syncQuiet();
      $id('mo-cb-meshcore').addEventListener('change', syncQuiet);
      $id('mo-reload').addEventListener('click', () => refresh(true));
      $id('mo-retry').addEventListener('click', () => { state.error.meshcore = state.error.meshtastic = ''; showError(); refresh(true); });
      $id('mo-age').addEventListener('change', e => { CFG.maxAgeDays = pick(e.target.value, AGE_OPTS, 30); GM_setValue('max_age_days', CFG.maxAgeDays); refresh(); });
      $id('mo-max').addEventListener('change', e => { CFG.maxMarkersPerLayer = pick(e.target.value, MAX_OPTS, 400); GM_setValue('max_markers', CFG.maxMarkersPerLayer); refresh(); });
    }
    function init(map) {
      if (state.active) return;
      state.map = map; state.L = W.L; state.active = true;
      state.layers.meshcore = state.L.layerGroup().addTo(map);
      state.layers.meshtastic = state.L.layerGroup().addTo(map);
      map.on('moveend zoomend', scheduleRefresh);
      mcCacheP.then(rec => applyCache('meshcore', rec));
      mtCacheP.then(rec => applyCache('meshtastic', rec));
      refresh();
    }
    function disable() {
      if (!state.active) return; state.active = false; clearTimeout(state.timer);
      if (state.map) { state.map.off('moveend zoomend', scheduleRefresh); for (const l of Object.values(state.layers)) state.map.removeLayer(l); }
      state.layers = {};
      state.byKey.meshcore.clear(); state.byKey.meshtastic.clear();
      state.drawGen.meshcore++; state.drawGen.meshtastic++;
    }
    return {
      sectionHtml, wire, init, disable, refresh,
      isActive: () => state.active,
      isBusy: () => state.loading.meshcore || state.loading.meshtastic,
      showsMeshcore: () => state.active && !!state.show.meshcore && !!state.map && state.map.getZoom() >= CFG.minZoom,
      // toggle only, ignoring zoom: coverage's plain dots must follow the switch even when zoomed out
      meshcoreWanted: () => !!state.show.meshcore,
      // per-type switch, ignoring zoom. Unknown type numbers share the Other row.
      meshcoreTypeOn: mcTypeOn,
      // slim repeater/room list for Coverage, derived from already-downloaded data (avoids a 2nd big download)
      slimMeshcore: () => !state.stale.meshcore && state.data.meshcore && state.data.meshcore.filter(n => (n.typeId === 2 || n.typeId === 3) && n.key && Math.abs(n.lat) <= 85)
        .map(n => [n.key.slice(0, 16), n.name.slice(0, 40), n.typeId, +n.lat.toFixed(5), +n.lon.toFixed(5), n.heard || 0, slimRadio(n.params)])
    };
  })();

  // =====================================================================
  // [freq MHz, SF, BW kHz] or 0 when the node didn't report its radio settings
  function slimRadio(p) { return p && +p.freq > 100 && +p.freq < 6000 ? [+p.freq, +p.sf || 0, +p.bw || 0] : 0; }
  // MODULE 2: Coverage (from aprsfi-mesh-coverage 0.4.0)
  // =====================================================================
  const COVERAGE = (function () {
    const OPTS = { age: [7, 30, 90], tx: [1, 3, 6, 10, 15, 25], rx: [1, 2, 5, 10], rays: [180, 360], txp: [14, 17, 20, 22, 27, 30], fade: [0, 5, 10, 15, 20], gain: [0, 2, 3, 5, 6, 8] };
    // ---------- antenna heights: stored in METRES, shown/typed in the user's unit (ft or m) ----------
    const H_MIN_M = 0.3, H_MAX_M = 100, M_PER_FT = 0.3048;
    const validM = (v, d) => (isFinite(+v) && +v >= H_MIN_M && +v <= H_MAX_M ? +v : d);
    let UNIT = GM_getValue('cv_unit', 'ft') === 'm' ? 'm' : 'ft';
    const toU = m => UNIT === 'ft' ? Math.round(m / M_PER_FT) : Math.round(m * 10) / 10; // ft: whole numbers; m: 1 decimal max
    const fromU = v => (UNIT === 'ft' ? v * M_PER_FT : v);
    const fmtH = m => `${Math.round(UNIT === 'ft' ? m / M_PER_FT : m)} ${UNIT}`;
    // ---------- distances: stored in KM, shown in the user's unit (mi default, or km) ----------
    const KM_PER_MI = 1.609344, R_MIN_KM = 1, R_MAX_KM = 81;
    const D_PRESETS = { mi: [5, 10, 20, 30, 50], km: [10, 20, 30, 45, 60, 80] };
    let DUNIT = GM_getValue('cv_dunit', 'mi') === 'km' ? 'km' : 'mi';
    const toD = km => { const v = DUNIT === 'mi' ? km / KM_PER_MI : km; return v >= 10 ? Math.round(v) : Math.round(v * 10) / 10; };
    const fromD = v => (DUNIT === 'mi' ? v * KM_PER_MI : v);
    const fmtD = km => `${toD(km)} ${DUNIT}`;
    const validKm = (v, d) => (isFinite(+v) && +v >= R_MIN_KM && +v <= R_MAX_KM ? +v : d);
    const rangeOpts = () => D_PRESETS[DUNIT].map(v => Math.round(fromD(v) * 1000) / 1000); // km values for current unit
    const nearestOpt = km => rangeOpts().reduce((a, b) => (Math.abs(b - km) < Math.abs(a - km) ? b : a));
    const dSubs = new Set();
    function setDUnit(u) {
      DUNIT = u === 'km' ? 'km' : 'mi'; GM_setValue('cv_dunit', DUNIT);
      for (const f of [...dSubs]) { try { if (f() === false) dSubs.delete(f); } catch (e) { dSubs.delete(f); } }
    }
    // '' -> null (use default); bad/out of range -> NaN; else metres
    function parseH(str) {
      const s = String(str == null ? '' : str).trim().replace(',', '.');
      if (s === '') return null;
      const v = Number(s); if (!isFinite(v) || v <= 0) return NaN;
      const m = Math.round(fromU(v) * 1000) / 1000;
      return m >= H_MIN_M && m <= H_MAX_M ? m : NaN;
    }
    const rangeMsg = () => `Type a number from ${toU(H_MIN_M)} to ${toU(H_MAX_M)} ${UNIT}`;
    const unitSubs = new Set();
    function setUnit(u) {
      UNIT = u === 'm' ? 'm' : 'ft'; GM_setValue('cv_unit', UNIT);
      for (const f of [...unitSubs]) { try { if (f() === false) unitSubs.delete(f); } catch (e) { unitSubs.delete(f); } }
    }
    const hBox = cls => `<input type="number" class="${cls}" min="0" step="any" inputmode="decimal" aria-label="Height"><select class="hu" title="Feet or metres"><option value="ft">ft</option><option value="m">m</option></select>`;
    // wires one number box + ft/m dropdown. getM() -> metres|null, setM(metres|null). onUnit() re-renders readouts.
    function heightWidget(root, cls, getM, setM, opt) {
      opt = opt || {};
      const inp = root.querySelector('.' + cls), us = inp.nextElementSibling, er = opt.err;
      const show = () => { const m = getM(); inp.value = m == null ? '' : toU(m); us.value = UNIT; if (opt.def) inp.placeholder = toU(opt.def()); };
      const commit = () => {
        const m = parseH(inp.value);
        if (m === null && !opt.allowBlank) { show(); return; }
        if (Number.isNaN(m)) { const keep = inp.value; show(); if (er) er.textContent = '⚠ ' + rangeMsg() + ` (you typed “${keep}”)`; else inp.title = rangeMsg(); return; }
        if (er) er.textContent = '';
        const cur = getM();
        if (m === cur || (m != null && cur != null && (Math.abs(m - cur) < 0.001 || toU(m) === toU(cur)))) { show(); return; }
        setM(m); show();
      };
      inp.addEventListener('change', commit); inp.addEventListener('blur', commit);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); commit(); } });
      us.addEventListener('change', () => setUnit(us.value));
      const sub = () => { if (!inp.isConnected) return false; show(); if (opt.onUnit) opt.onUnit(); };
      unitSubs.add(sub); show();
      return { show, commit };
    }
    const S = {
      showRep: GM_getValue('cv_rep', true), showRoom: GM_getValue('cv_room', true),
      age: pick(GM_getValue('cv_age', 30), OPTS.age, 30), tx: validM(GM_getValue('cv_tx', 3), 3),
      rx: validM(GM_getValue('cv_rx', 2), 2), range: validKm(GM_getValue('cv_range', 20 * KM_PER_MI), 20 * KM_PER_MI),
      rays: pick(GM_getValue('cv_rays', 360), OPTS.rays, 360), fresnel: GM_getValue('cv_fresnel', false),
      mode: GM_getValue('cv_mode', 'signal') === 'los' ? 'los' : 'signal',
      txp: pick(GM_getValue('cv_txp', LINK_DEF.txDbm), OPTS.txp, LINK_DEF.txDbm), gain: pick(GM_getValue('cv_gain', LINK_DEF.gainDbi), OPTS.gain, LINK_DEF.gainDbi),
      fade: pick(GM_getValue('cv_fade', FADE_DEF), OPTS.fade, FADE_DEF),
      enabled: GM_getValue('cv_enabled', true), allRep: GM_getValue('cv_all', false),
      detail: DETAIL[GM_getValue('cv_detail', 'balanced')] ? GM_getValue('cv_detail', 'balanced') : 'balanced'
    };
    const CFG = { nodesUrl: 'https://map.meshcore.io/api/v1/nodes', nodesTtl: 6 * 3600e3, minZoom: 9, maxNodes: 25,
      tileLru: 600, debounceMs: 800, resCacheMax: 60, dlConc: 12 };
    const COLORS = { 2: [229, 57, 53], 3: [142, 36, 170], pin: [255, 143, 0] };
    // distinct colours for individually selected nodes (orange reserved for pins)
    const PALETTE = [[30, 136, 229], [67, 160, 71], [216, 27, 96], [0, 172, 193], [94, 53, 177], [192, 202, 51], [109, 76, 65], [84, 110, 122]];
    const rgb = c => `rgb(${c.join(',')})`;
    const MARK_MAX = 400;
    const settingsKey = () => [S.mode, S.txp, S.gain, S.fade, S.tx, S.rx, S.range, S.rays, S.fresnel ? 1 : 0, S.detail].join('_');
    // the node's own radio settings when it reported them, else the MeshCore US default
    const siteRadio = s => { const r = Array.isArray(s.radio) ? s.radio : []; return [r[0] || RADIO_DEF.freq, LORA_SNR[r[1]] != null ? r[1] : RADIO_DEF.sf, r[2] > 0 ? r[2] : RADIO_DEF.bw]; };
    const siteZ = s => effZoom(S.detail, s.lat, s.lon, s.range * 1000);
    // per-site key: pins may override tx height / range, so the key uses the site's effective values
    const modeKey = s => S.mode === 'los' ? 'los' : ['sig3', S.txp, S.gain, S.fade].concat(siteRadio(s)).join('~');
    const siteKey = s => s.id + '@' + ['r2', modeKey(s), s.tx, S.rx, s.range, S.rays, S.fresnel ? 1 : 0, stepForZ(siteZ(s))].join('_');

    const st = { map: null, L: null, nodes: null, loading: false, err: '', layers: {}, timer: null,
      queue: [], busy: false, pinMode: false, pins: GM_getValue('cv_pins', []), mem: new Map(), gen: 0, reopen: null };
    // pins: { id, lat, lon, h?: m AGL override, r?: km range override, name?: string }
    st.pins = (Array.isArray(st.pins) ? st.pins : []).filter(p => p && isFinite(p.lat) && isFinite(p.lon))
      .map((p, i) => Object.assign({ id: p.id || ('p' + Date.now().toString(36) + i) }, p));
    const savePins = () => GM_setValue('cv_pins', st.pins);
    // sel: { nodeId: { n: name, k: kind, lat, lon, l: last, c: palette idx } }; nodeH: { nodeId: m AGL override }
    st.sel = GM_getValue('cv_sel', {}); if (!st.sel || typeof st.sel !== 'object' || Array.isArray(st.sel)) st.sel = {};
    st.nodeH = GM_getValue('cv_nodeh', {}); if (!st.nodeH || typeof st.nodeH !== 'object' || Array.isArray(st.nodeH)) st.nodeH = {};
    st.wantKeys = new Set(); st.marks = null;
    const saveSel = () => { GM_setValue('cv_sel', st.sel); GM_setValue('cv_nodeh', st.nodeH); updSelUI(); };
    function nextColor() {
      const used = Object.values(st.sel).map(v => v.c), cnt = PALETTE.map((_, i) => used.filter(u => u === i).length);
      return cnt.indexOf(Math.min(...cnt));
    }
    function nodeSite(id, name, kind, lat, lon, last, radio) {
      const sl = st.sel[id], h = st.nodeH[id];
      return { id, name: name || '(unnamed)', kind, lat, lon, last, radio: radio || 0, tx: h != null ? h : S.tx, range: S.range,
        selected: !!sl, col: sl ? PALETTE[sl.c % PALETTE.length] : (COLORS[kind] || COLORS[2]) };
    }
    const layerKey = s => siteKey(s) + '#' + (s.col || COLORS.pin).join('.');

    // ---------- elevation tiles: memory LRU -> IndexedDB (survives reloads) -> network ----------
    // 1.1.0 and older downloaded every tile again on each page load through GM_xmlhttpRequest, 6 at a time:
    // ~19 MB / 156 tiles for one 50 mi repeater, i.e. 3-15 s before any shading appeared.
    const tiles = new Map(); // key -> Int16Array | Promise | null(failed)
    const TDB = (() => {
      const CAP = 900; // ~115 MB of decoded tiles at most, oldest dropped first
      let dbp = null, keys = null;
      const open = () => dbp || (dbp = new Promise(res => {
        try {
          const r = indexedDB.open('mesh-tools-terrain', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('t').createIndex('ts', 'ts');
          r.onsuccess = () => res(r.result); r.onerror = r.onblocked = () => res(null);
        } catch (e) { res(null); }
      }).then(db => db && new Promise(res => { // load the key list once so we know what is cached without asking per tile
        try { const q = db.transaction('t').objectStore('t').getAllKeys(); q.onsuccess = () => { keys = new Set(q.result); res(db); }; q.onerror = () => res(null); } catch (e) { res(null); }
      })).catch(() => null));
      const req = (db, mode, fn) => new Promise(res => { try { const t = db.transaction('t', mode), r = fn(t.objectStore('t')); t.oncomplete = () => res(r && r.result); t.onerror = t.onabort = () => res(undefined); } catch (e) { res(undefined); } });
      let puts = 0;
      async function prune(db) {
        if (keys.size <= CAP) return;
        await req(db, 'readwrite', os => { const c = os.index('ts').openKeyCursor(); let n = keys.size - CAP;
          c.onsuccess = () => { const cur = c.result; if (!cur || n-- <= 0) return; os.delete(cur.primaryKey); keys.delete(cur.primaryKey); cur.continue(); }; });
      }
      return {
        ready: open,
        has: k => !!(keys && keys.has(k)),
        async get(k) { const db = await open(); if (!db || !keys.has(k)) return null; const v = await req(db, 'readonly', os => os.get(k)); return v && v.e ? new Int16Array(v.e) : null; },
        async put(k, e) { const db = await open(); if (!db) return; await req(db, 'readwrite', os => os.put({ e: e.buffer.slice(0), ts: Date.now() }, k)); keys.add(k); if (++puts % 50 === 0) prune(db); },
        async flush() { const db = await open(); if (db) await prune(db); },
        async clear() { const db = await open(); if (!db) return; await req(db, 'readwrite', os => os.clear()); keys.clear(); }
      };
    })();
    function decodeTile(blob) {
      return createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).catch(() => createImageBitmap(blob)).then(bmp => {
        const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(256, 256) : Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
        const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(bmp, 0, 0);
        const d = ctx.getImageData(0, 0, 256, 256).data, e = new Int16Array(65536); // 1 m precision, half the memory
        for (let i = 0, p = 0; i < 65536; i++, p += 4) e[i] = Math.round(d[p] * 256 + d[p + 1] + d[p + 2] / 256 - 32768);
        if (bmp.close) bmp.close(); return e;
      });
    }
    // plain fetch() first (CORS is open on the tile bucket, no extension round-trip, browser HTTP cache);
    // GM_xmlhttpRequest only if the page blocks it
    let useGM = typeof fetch !== 'function';
    function download(url) {
      const viaGM = () => gmGet(url, 'blob').then(r => { const b = r.response; return b instanceof Blob ? b : new Blob([b], { type: 'image/png' }); });
      if (useGM) return viaGM();
      return fetch(url, { mode: 'cors', credentials: 'omit' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .catch(e => { if (/HTTP/.test(e.message)) throw e; useGM = true; console.warn(TAG, 'fetch blocked, using GM_xmlhttpRequest', e); return viaGM(); });
    }
    const tileCached = (z, x, y) => { const k = z + '/' + x + '/' + y, v = tiles.get(k); return (v != null && !(v instanceof Promise)) || TDB.has(k); };
    let hostFlip = 0;
    function loadTile(z, x, y) {
      const k = z + '/' + x + '/' + y;
      if (tiles.has(k)) { const v = tiles.get(k); tiles.delete(k); tiles.set(k, v); return Promise.resolve(v); }
      const url = (hostFlip++ & 1 ? tileUrl2 : tileUrl)(z, x, y);
      const p = TDB.get(k).then(v => v || download(url).then(decodeTile).then(e => { TDB.put(k, e); return e; }))
        .catch(e => { console.warn(TAG, 'tile', k, e); return null; })
        .then(v => { if (v) tiles.set(k, v); else tiles.delete(k); while (tiles.size > CFG.tileLru) tiles.delete(tiles.keys().next().value); return v; });
      tiles.set(k, p); return p;
    }
    // list: [[z, x, y], ...] -> Map 'z/x/y' -> Int16Array
    async function preloadTiles(list, onProg, cancelled) {
      await TDB.ready();
      const got = new Map(); let i = 0, done = 0;
      const worker = async () => {
        while (i < list.length) {
          if (cancelled && cancelled()) return;
          const [z, x, y] = list[i++]; got.set(z + '/' + x + '/' + y, await loadTile(z, x, y)); done++;
          if (onProg) onProg(done, list.length);
        }
      };
      await Promise.all(Array.from({ length: CFG.dlConc }, worker)); // 12 at a time, split over 2 hostnames
      return got;
    }
    const planList = (s, z, rays) => { const pl = tilePlan(s.lat, s.lon, s.range * 1000, z, rays);
      return { rin: pl.rin, list: pl.fine.map(t => [z, t[0], t[1]]).concat(pl.coarse.map(t => [z - 1, t[0], t[1]])) }; };
    const missingTiles = (s, z) => planList(s, z, S.rays).list.filter(t => !tileCached(t[0], t[1], t[2])).length;
    // fine zoom z inside rin metres of (lat0, lon0), z-1 outside
    function elevFrom(got, z, lat0, lon0, rin) {
      const kx = 111320 * Math.cos((lat0 || 0) * Math.PI / 180), r2 = rin * rin;
      return (lat, lon) => {
        let zz = z;
        if (rin < Infinity) { const dy = (lat - lat0) * 111320, dx = (lon - lon0) * kx; if (dx * dx + dy * dy >= r2) zz = z - 1; }
        const p = lonLatToTilePx(lon, lat, zz), tx = Math.floor(p[0] / 256), ty = Math.floor(p[1] / 256);
        const t = got.get(zz + '/' + tx + '/' + ty); if (!t || t instanceof Promise) return NaN;
        const px = Math.min(255, Math.floor(p[0] - tx * 256)), py = Math.min(255, Math.floor(p[1] - ty * 256));
        return t[py * 256 + px];
      };
    }

    async function sampleGround(lat, lon) {
      const z = (DETAIL[S.detail] || DETAIL.balanced).z;
      const p = lonLatToTilePx(lon, lat, z), x = Math.floor(p[0] / 256), y = Math.floor(p[1] / 256);
      const got = new Map([[z + '/' + x + '/' + y, await loadTile(z, x, y)]]); return elevFrom(got, z, lat, lon, Infinity)(lat, lon);
    }

    // ---------- results cache (memory + GM, compact) ----------
    const enc = segsArr => segsArr.map(s => Array.from(s).map(v => v.toString(36)).join(',')).join(';');
    const dec = s => s.split(';').map(r => r ? Uint16Array.from(r.split(',').map(v => parseInt(v, 36))) : new Uint16Array(0));
    // value = { segs, g } (g = ground elevation m at site); stored as "g|enc"
    function resGet(k) {
      if (st.mem.has(k)) return st.mem.get(k);
      const idx = GM_getValue('cv_res_idx', {}); if (!idx[k]) return null;
      let s = GM_getValue('cv_res_' + k, null); if (!s) return null;
      let g = NaN; const bar = s.indexOf('|'); if (bar >= 0) { g = parseFloat(s.slice(0, bar)); s = s.slice(bar + 1); }
      const r = { segs: dec(s), g }; st.mem.set(k, r); return r;
    }
    function resDel(k) {
      st.mem.delete(k);
      try { const idx = GM_getValue('cv_res_idx', {}); delete idx[k]; GM_deleteValue('cv_res_' + k); GM_setValue('cv_res_idx', idx); } catch (e) { /* */ }
    }
    function resPut(k, segs, g) {
      st.mem.set(k, { segs, g });
      try {
        const idx = GM_getValue('cv_res_idx', {}); idx[k] = Date.now();
        const keys = Object.keys(idx).sort((a, b) => idx[a] - idx[b]);
        while (keys.length > CFG.resCacheMax) { const o = keys.shift(); delete idx[o]; GM_deleteValue('cv_res_' + o); }
        GM_setValue('cv_res_' + k, (isFinite(g) ? g.toFixed(1) : '') + '|' + enc(segs)); GM_setValue('cv_res_idx', idx);
      } catch (e) { console.warn(TAG, 'result cache store failed', e); }
    }
    function clearCache() {
      const idx = GM_getValue('cv_res_idx', {}); for (const k of Object.keys(idx)) GM_deleteValue('cv_res_' + k);
      GM_deleteValue('cv_res_idx'); GM_deleteValue('cv_nodes'); st.mem.clear(); tiles.clear(); TDB.clear(); st.nodes = null;
      for (const l of Object.values(st.layers)) st.map.removeLayer(l.ov); st.layers = {};
    }

    // ---------- compute: Web Worker (own clean global, off the main thread), chunked in-page fallback ----------
    const yieldUI = (() => {
      if (W.scheduler && typeof W.scheduler.yield === 'function') return () => W.scheduler.yield();
      if (typeof MessageChannel === 'function') { const ch = new MessageChannel(), q = []; ch.port1.onmessage = () => { const r = q.shift(); if (r) r(); }; return () => new Promise(r => { q.push(r); ch.port2.postMessage(0); }); }
      return () => new Promise(r => setTimeout(r, 0));
    })();
    // the worker is built from the LOSCORE function sources, so there is one copy of the maths
    const WORKER_SRC = () => [
      `const R_EARTH=${R_EARTH},K_FACTOR=${K_FACTOR},NEAR_M=${NEAR_M},MARGIN_STRONG=${MARGIN_STRONG},MARGIN_FAIR=${MARGIN_FAIR},MARGIN_MARGINAL=${MARGIN_MARGINAL};`,
      lonLatToTilePx, destPoint, computeRay, bestEdge, deygoutDb, groundExcessDb, computeRaySignal, elevFrom,
      'const fsplDb=' + fsplDb, 'const planeEarthDb=' + planeEarthDb, 'const knifeJ=' + knifeJ,
      `onmessage=e=>{const m=e.data,got=new Map(m.got),getElev=elevFrom(got,m.z,m.lat,m.lon,m.rin),ray=m.sig?computeRaySignal:computeRay,segs=[];
        let t0=Date.now();for(let i=0;i<m.rays;i++){segs.push(ray(getElev,m.lat,m.lon,i/m.rays*2*Math.PI,m.o,m.h0));
        if(Date.now()-t0>100){postMessage({p:i/m.rays});t0=Date.now();}}postMessage({segs},segs.map(s=>s.buffer));};`].join('\n');
    let wkUrl = null, wkBroken = typeof Worker !== 'function' || W.__meshToolsNoWorker;
    function workerRays(job, cancelled, onProg) {
      return new Promise((res, rej) => {
        let w;
        try { if (!wkUrl) wkUrl = URL.createObjectURL(new Blob([WORKER_SRC()], { type: 'text/javascript' })); w = new Worker(wkUrl); }
        catch (e) { rej(e); return; }
        const iv = setInterval(() => { if (cancelled()) { clearInterval(iv); w.terminate(); res(null); } }, 50);
        w.onmessage = e => { if (e.data.p != null) { if (onProg) onProg(-1, e.data.p); return; } clearInterval(iv); w.terminate(); res(e.data.segs); };
        w.onerror = e => { clearInterval(iv); w.terminate(); if (e.preventDefault) e.preventDefault(); rej(new Error('worker: ' + (e.message || 'failed'))); };
        w.postMessage(job); // tiles are copied (structured clone), the cache keeps its own
      });
    }
    // preview: coarse terrain + half the rays, shown while the full-detail tiles download
    async function computeSite(site, cancelled, onProg, preview) {
      const z = preview ? previewZ(siteZ(site)) : siteZ(site), step = stepForZ(z), rays = preview ? Math.min(S.rays, PREVIEW.rays) : S.rays;
      const plan = preview ? { rin: Infinity, list: tilesInCircle(site.lat, site.lon, site.range * 1000, z).map(t => [z, t[0], t[1]]) } : planList(site, z, rays);
      const got = await preloadTiles(plan.list, onProg, cancelled);
      if (cancelled()) return null;
      const getElev = elevFrom(got, z, site.lat, site.lon, plan.rin);
      const g = getElev(site.lat, site.lon);
      if (!isFinite(g)) throw new Error('no elevation at site');
      site.g = g;
      const [fMHz, sf, bw] = siteRadio(site), sig = S.mode !== 'los';
      const o = { range: site.range * 1000, step, rx: S.rx, fresnel: S.fresnel, freqMHz: sig ? fMHz : 915, txAgl: site.tx,
        txDbm: S.txp, gainDbi: S.gain, sensDbm: loraSens(sf, bw), fadeDb: S.fade };
      const h0 = g + site.tx; // antenna ASL = sampled ground (nearest terrarium px) + AGL height
      let segs = null;
      if (!wkBroken) {
        const gl = []; for (const [k, v] of got) if (v && !(v instanceof Promise)) gl.push([k, v]);
        try { segs = await workerRays({ got: gl, z, lat: site.lat, lon: site.lon, rin: plan.rin, rays, o, h0, sig }, cancelled, onProg); computeSite.via = 'worker'; if (!segs) return null; }
        catch (e) { wkBroken = true; console.warn(TAG, 'Web Worker unavailable, computing on the page', e); }
      }
      if (!segs) {
        computeSite.via = 'page';
        const ray = sig ? computeRaySignal : computeRay; segs = [];
        let t0 = performance.now();
        for (let i = 0; i < rays; i++) {
          if (cancelled()) return null;
          segs.push(ray(getElev, site.lat, site.lon, i / rays * 2 * Math.PI, o, h0));
          if (performance.now() - t0 > 25) { if (onProg) onProg(-1, i / rays); await yieldUI(); t0 = performance.now(); }
        }
      }
      segs.step = step; return segs;
    }

    // ---------- render: raster ImageOverlay of covered patches ----------
    function render(site, segs, step) {
      const L = st.L, range = site.range * 1000, px = 512, c = px / 2, sc = c / range;
      step = step || segs.step || stepForZ(siteZ(site));
      const cv = document.createElement('canvas'); cv.width = cv.height = px;
      const ctx = cv.getContext('2d'), col = site.col || COLORS[site.kind] || COLORS[2];
      const n = segs.length, half = Math.PI / n * 1.02, sig = S.mode !== 'los', w = sig ? 3 : 2;
      // Same three colours for every repeater. Lightness differs as well as hue, so they stay distinct if colour is hard to see.
      const BAND_FILL = { 3: 'rgb(46,160,67)', 2: 'rgb(240,200,40)', 1: 'rgb(214,72,28)' };
      if (!sig) ctx.fillStyle = `rgb(${col.join(',')})`;
      let prevBand = 0;
      for (let i = 0; i < n; i++) {
        const brg = i / n * 2 * Math.PI, a = brg - Math.PI / 2; // canvas angle: 0 = east, bearing 0 = north
        const s = segs[i];
        for (let j = 0; j < s.length; j += w) {
          if (sig) {
            const band = s[j + 2];
            if (band !== prevBand) { ctx.fillStyle = BAND_FILL[band] || BAND_FILL[1]; prevBand = band; }
          }
          const r0 = Math.max(0, (s[j] - 0.5) * step * sc), r1 = (s[j + 1] + 0.5) * step * sc;
          ctx.beginPath(); ctx.arc(c, c, r1, a - half, a + half); ctx.arc(c, c, r0, a + half, a - half, true); ctx.closePath(); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(c, c, c - 1, 0, 2 * Math.PI); ctx.stroke();
      const dLat = range / 111320, dLon = range / (111320 * Math.cos(site.lat * Math.PI / 180));
      const ov = L.imageOverlay(cv.toDataURL('image/png'), [[site.lat - dLat, site.lon - dLon], [site.lat + dLat, site.lon + dLon]],
        { opacity: sig ? 0.55 : 0.35, pane: 'meshCoverage', interactive: false });
      const m = L.circleMarker([site.lat, site.lon], { radius: site.kind === 'pin' ? 10 : 6, color: '#000', weight: 1, fillColor: `rgb(${col.join(',')})`,
        fillOpacity: 1, pane: 'meshCoverage', bubblingMouseEvents: false });
      const po = { minWidth: 230, maxWidth: 290, autoPanPadding: [20, 20] };
      if (site.kind === 'pin') m.bindPopup(() => pinPopup(site), po); else m.bindPopup(() => nodePopup(site), po);
      const grp = L.layerGroup([ov, m]); grp._cvMarker = m; grp._cvSite = site; return grp;
    }

    const POP_CSS = `<style>
          .cv-pp{font:14px sans-serif;color:#222;min-width:220px}
          .cv-pp .r{display:flex;align-items:center;gap:6px;margin:5px 0;flex-wrap:wrap}
          .cv-pp input[type=number],.cv-pp input[type=text]{font-size:16px;min-height:36px;padding:2px 6px;border:1px solid #aaa;border-radius:6px;box-sizing:border-box}
          .cv-pp input[type=number]{width:80px} .cv-pp input[type=text]{width:100%}
          .cv-pp button{min-height:38px;min-width:38px;font-size:14px;border-radius:6px;border:1px solid #aaa;background:#f4f4f4;padding:0 8px;touch-action:manipulation}
          .cv-pp button.on{background:#ffe0b2;border-color:#ef6c00}
          .cv-pp .q{display:flex;flex-wrap:wrap;gap:4px} .cv-pp .s{color:#666;font-size:12px}
          .cv-pp .act{display:flex;gap:6px;margin-top:8px} .cv-pp .act button{flex:1}
          .cv-pp .sw{display:inline-block;width:22px;height:22px;border-radius:50%;border:1px solid #000;opacity:.8}
          .cv-pp .del{background:#ffebee;border-color:#e57373}
        </style>`;
    // ---------- per-pin popup menu ----------
    function pinPopup(site) {
      const L = st.L, p = st.pins.find(q => q.id === site.pinId);
      const el = document.createElement('div'); el.className = 'cv-pp';
      if (!p) { el.textContent = 'Pin removed'; return el; }
      const curH = () => (p.h != null ? p.h : S.tx);
      el.innerHTML = POP_CSS + `
        <div class="r"><input type="text" class="nm" placeholder="Pin name" maxlength="40"></div>
        <div class="s">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</div>
        <div>Ground height: <b class="ge">sampling…</b></div>
        <div>Antenna above sea level: <b class="asl">–</b></div>
        <div class="r">Antenna height ${hBox('h')} <span class="s hft"></span></div>
        <div class="s herr" style="color:#b71c1c"></div>
        <div class="r">Max range <input type="number" class="rg" min="1" max="50" step="any" inputmode="decimal" placeholder="${toD(S.range)}"> <span class="du">${DUNIT}</span> <span class="s">(blank = default)</span></div>
        <div class="s st"></div>
        <div class="act"><button type="button" class="rc">Recompute</button><button type="button" class="del">Delete pin</button></div>`;
      if (L.DomEvent) { L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el); }
      const $ = s => el.querySelector(s), rIn = $('.rg'), nm = $('.nm');
      nm.value = p.name || ''; const showR = () => { rIn.value = p.r != null ? toD(p.r) : ''; rIn.placeholder = toD(S.range); $('.du').textContent = DUNIT; }; showR();
      dSubs.add(() => { if (!rIn.isConnected) return false; showR(); });
      let g = site.g;
      const upd = () => {
        const h = curH(); $('.hft').textContent = p.h == null ? '(default)' : '';
        $('.ge').textContent = isFinite(g) ? fmtH(g) : (g === undefined ? 'sampling…' : 'n/a');
        $('.asl').textContent = isFinite(g) ? fmtH(g + h) : '–';
      };
      upd();
      if (!isFinite(g)) sampleGround(p.lat, p.lon).then(v => { g = v; site.g = v; upd(); }).catch(() => { g = NaN; upd(); });
      const apply = () => { savePins(); st.reopen = p.id; $('.st').textContent = 'Recomputing…'; refresh(); };
      heightWidget(el, 'h', () => (p.h != null ? p.h : null), m => { if (m == null) delete p.h; else p.h = m; upd(); apply(); },
        { allowBlank: true, def: () => S.tx, err: $('.herr'), onUnit: upd });
      rIn.addEventListener('change', () => {
        const raw = rIn.value === '' ? null : +rIn.value;
        if (raw !== null && !isFinite(raw)) { showR(); return; }
        if (raw !== null && p.r != null && toD(p.r) === raw) { showR(); return; }
        const v = raw === null ? null : Math.min(R_MAX_KM, Math.max(R_MIN_KM, Math.round(fromD(raw) * 1000) / 1000));
        if ((p.r ?? null) === v) { showR(); return; }
        if (v === null) delete p.r; else p.r = v; showR(); apply();
      });
      nm.addEventListener('change', () => { const v = nm.value.trim().slice(0, 40); if (v) p.name = v; else delete p.name; apply(); });
      [rIn, nm].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') i.blur(); }));
      $('.rc').addEventListener('click', () => {
        const k = siteKey(site); resDel(k); if (st.layers[k]) { st.map.removeLayer(st.layers[k].ov); delete st.layers[k]; } apply();
      });
      $('.del').addEventListener('click', () => { st.map.closePopup(); st.pins = st.pins.filter(q => q.id !== p.id); savePins(); refresh(); });
      return el;
    }
    function estTxt(site) {
      if (S.mode === 'los') return ', line of sight' + (S.fresnel ? ', 60% F1' : '');
      const [f, sf, bw] = siteRadio(site);
      return `, signal: ${S.txp} dBm, ${f.toFixed(1)} MHz SF${sf}/${bw} kHz${Array.isArray(site.radio) ? '' : ' (default)'}. Green = strong, yellow = fair, orange = weak`;
    }
    // ---------- per-node popup (repeater / room server) ----------
    function nodePopup(site, embed) {
      const L = st.L, id = site.id, el = document.createElement('div'); el.className = 'cv-pp' + (embed ? ' cv-embed' : '');
      const curH = () => (st.nodeH[id] != null ? st.nodeH[id] : S.tx);
      el.innerHTML = POP_CSS + `
        ${embed ? '<div style="border-top:1px solid #ccc;margin-top:6px;padding-top:4px"><b>📶 Coverage</b></div>' : `<div><b>${esc(site.name)}</b> <span class="s">${site.kind === 2 ? 'Repeater' : 'Room Server'}</span></div>`}
        <div class="r"><span class="sw"></span><span class="s swt"></span></div>
        ${embed ? '' : `<div class="s">${site.lat.toFixed(5)}, ${site.lon.toFixed(5)}${site.last ? ' · heard ' + new Date(site.last).toLocaleString() : ''}</div>`}
        <div>Ground height: <b class="ge">sampling…</b></div>
        <div>Antenna above sea level: <b class="asl">–</b></div>
        <div class="r">Antenna height ${hBox('h')} <span class="s hft"></span></div>
        <div class="s herr" style="color:#b71c1c"></div>
        <div class="s">Estimate: your antenna ${fmtH(S.rx)} up, ${fmtD(S.range)}${estTxt(site)}</div>
        <div class="s st"></div>
        <div class="act"><button type="button" class="tg"></button></div>`;
      if (L.DomEvent) { L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el); }
      const $ = s => el.querySelector(s);
      let g = site.g;
      const upd = () => {
        const h = curH(), sl = st.sel[id];
        $('.hft').textContent = st.nodeH[id] == null ? '(default)' : '';
        $('.ge').textContent = isFinite(g) ? fmtH(g) : (g === undefined ? 'sampling…' : 'n/a');
        $('.asl').textContent = isFinite(g) ? fmtH(g + h) : '–';
        const col = sl ? PALETTE[sl.c % PALETTE.length] : (site.col || COLORS[site.kind]);
        $('.sw').style.background = rgb(col);
        $('.swt').textContent = sl ? 'Coverage shown in this colour' : (Object.keys(st.layers).some(k => k.startsWith(id + '@')) ? 'Shown (all nearby repeaters)' : 'Coverage not shown');
        const tg = $('.tg'); tg.textContent = sl ? 'Hide coverage' : 'Show coverage'; tg.classList.toggle('on', !!sl);
      };
      upd();
      if (!isFinite(g)) sampleGround(site.lat, site.lon).then(v => { g = v; site.g = v; upd(); }).catch(() => { g = NaN; upd(); });
      const apply = (msg) => { saveSel(); st.reopen = st.sel[id] ? id : null; $('.st').textContent = msg || ''; refresh(); };
      heightWidget(el, 'h', () => (st.nodeH[id] != null ? st.nodeH[id] : null), m => { if (m == null) delete st.nodeH[id]; else st.nodeH[id] = m; upd(); apply(st.sel[id] ? 'Recomputing…' : ''); },
        { allowBlank: true, def: () => S.tx, err: $('.herr'), onUnit: upd });
      $('.tg').addEventListener('click', () => {
        if (st.sel[id]) { delete st.sel[id]; st.map.closePopup(); apply(); }
        else { st.sel[id] = { n: site.name, k: site.kind, lat: site.lat, lon: site.lon, l: site.last || 0, r: site.radio || 0, c: nextColor() }; upd(); apply('Computing…'); }
      });
      return el;
    }
    // small tappable markers for in-view nodes that have no coverage layer drawn
    function drawMarkers(vis, drawnIds) {
      const L = st.L;
      if (!st.marks) st.marks = L.layerGroup().addTo(st.map);
      // 1.2.1: these are plain circles (red = repeater, purple = room). They were drawn whenever the ◆
      // markers were not on the map, so turning Show MeshCore nodes off — or zooming out — left the red
      // dots behind. The switch now hides and shows them at every zoom.
      const hidden = NODES.isActive() && !NODES.meshcoreWanted();
      const pp = st.map._popup;
      if (hidden && pp && pp.isOpen && pp.isOpen() && pp._source && st.marks.hasLayer(pp._source)) st.map.closePopup();
      const keep = !hidden && pp && pp.isOpen && pp.isOpen() && pp._source && st.marks.hasLayer(pp._source) ? pp._source : null;
      st.marks.eachLayer(l => { if (l !== keep) st.marks.removeLayer(l); }); // 1.1.3: don't close an open popup on redraw
      if (hidden || overlayActive()) return; // overlay markers carry our controls via popupopen injection
      let n = 0;
      for (const v of vis) {
        if (drawnIds.has(v[0])) continue;
        // Repeaters / Room servers rows also hide these fallback circles. Master off is handled above.
        if (NODES.isActive() && NODES.meshcoreWanted() && !NODES.meshcoreTypeOn(v[2])) continue;
        if (++n > MARK_MAX) break;
        if (keep && keep._cvId === v[0]) continue;
        const site = nodeSite(v[0], v[1], v[2], v[3], v[4], v[5], v[6]);
        const cm = L.circleMarker([site.lat, site.lon], { radius: 6, color: '#000', weight: 1, fillColor: rgb(site.col), fillOpacity: 0.85,
          pane: 'meshCoverage', bubblingMouseEvents: false })
          .bindPopup(() => nodePopup(site), { minWidth: 230, maxWidth: 290, autoPanPadding: [20, 20] }).addTo(st.marks);
        cm._cvId = v[0];
      }
    }
    function addLayer(k, s, r, pv) {
      if (isFinite(r.g)) s.g = r.g;
      const old = st.layers[k]; if (old) st.map.removeLayer(old.ov); // replace the preview in place
      const grp = render(s, r.segs, r.step).addTo(st.map); st.layers[k] = { ov: grp, pv: !!pv };
      if (st.reopen != null && st.reopen === (s.kind === 'pin' ? s.pinId : s.id)) { st.reopen = null; setTimeout(() => grp._cvMarker.openPopup(), 50); }
      syncMapLegend();
    }
    // ---------- integration with aprsfi-mesh-overlay ----------
    const overlayActive = () => { if (NODES.isActive()) return NODES.showsMeshcore(); try { const o = W.__meshOverlay; return !!W.__meshOverlayActive && (!o || !o.showsMeshcore || o.showsMeshcore()); } catch (e) { return false; } };
    // overlay gives full public_key (or 12-char ID); we key on 16-char prefixes. Resolve robustly.
    function resolveId(key) {
      key = String(key || '').trim().toLowerCase(); if (!key) return null;
      if (key.length >= 16) return key.slice(0, 16);
      const pre = k => String(k).toLowerCase().startsWith(key);
      return Object.keys(st.sel).find(pre) || Object.keys(st.nodeH).find(pre) || ((st.nodes || []).find(n => pre(n[0])) || [])[0] || key;
    }
    function overlayNodeInfo(popup) {
      const src = popup._source, o = (src && src.options) || {}, mn = o.meshNode;
      if (mn && mn.src && mn.src !== 'meshcore') return null;
      let key = (mn && mn.public_key) || o.meshKey, type = mn ? +mn.type : NaN;
      const root = popup._contentNode;
      const dn = root && root.querySelector && root.querySelector('[data-mesh-key]');
      if (!key && dn) { key = dn.getAttribute('data-mesh-key'); type = +dn.getAttribute('data-mesh-type'); }
      if (!key && root && /MeshCore/.test(root.textContent || '')) { // last resort: parse table rows
        for (const tr of root.querySelectorAll('tr')) {
          const td = tr.querySelectorAll('td'); if (td.length < 2) continue;
          const k = td[0].textContent.trim(), v = td[1].textContent.trim();
          if (k === 'ID') key = v; else if (k === 'Type' && !isFinite(type)) type = /room/i.test(v) ? 3 : /repeater/i.test(v) ? 2 : NaN;
        }
      }
      if (!key) return null;
      const id = resolveId(key), cached = (st.nodes || []).find(n => n[0] === id), sl = st.sel[id];
      if (!isFinite(type)) type = cached ? cached[2] : (sl ? sl.k : NaN);
      if (type !== 2 && type !== 3) return null;
      const ll = src && src.getLatLng ? src.getLatLng() : null;
      const lat = mn && isFinite(mn.lat) ? +mn.lat : (ll ? ll.lat : cached && cached[3]), lon = mn && isFinite(mn.lon) ? +mn.lon : (ll ? ll.lng : cached && cached[4]);
      if (!isFinite(lat) || !isFinite(lon)) return null;
      return nodeSite(id, (mn && mn.name) || (cached && cached[1]) || (sl && sl.n), type, lat, lon, (mn && mn.heard) || (cached && cached[5]) || 0, (cached && cached[6]) || (sl && sl.r) || 0);
    }
    function onPopupOpen(e) {
      const popup = e.popup, root = popup && popup._contentNode;
      if (!root || root.querySelector('.cv-pp') || !popup._source || st.marks && st.marks.hasLayer(popup._source)) return;
      let site; try { site = overlayNodeInfo(popup); } catch (err) { console.warn(TAG, 'popup parse', err); return; }
      if (!site) return;
      const known = Object.values(st.layers).map(l => l.ov && l.ov._cvSite).find(s => s && s.id === site.id && isFinite(s.g));
      if (known) site.g = known.g;
      root.appendChild(nodePopup(site, true));
      if (popup.options) popup.options.minWidth = Math.max(popup.options.minWidth || 0, 230);
      try { popup._updateLayout(); popup._updatePosition(); popup._adjustPan && popup._adjustPan(); } catch (err) { /* */ }
    }

    // ---------- refresh ----------
    function wantedSites() {
      const out = [];
      for (const p of st.pins) out.push({ id: 'pin:' + p.lat.toFixed(5) + ',' + p.lon.toFixed(5), pinId: p.id, lat: p.lat, lon: p.lon, kind: 'pin',
        name: p.name || ('Pin ' + p.lat.toFixed(4) + ', ' + p.lon.toFixed(4)), tx: p.h != null ? p.h : S.tx, range: p.r != null ? p.r : S.range, col: COLORS.pin });
      st.vis = []; st.lastTotal = 0;
      if (!S.enabled) return out;
      for (const [id, v] of Object.entries(st.sel)) out.push(nodeSite(id, v.n, v.k, v.lat, v.lon, v.l, v.r)); // always, ignores cap/view
      if (st.map.getZoom() < CFG.minZoom || !st.nodes) return out;
      const b = st.map.getBounds().pad(0.2), c = st.map.getCenter(), cut = Date.now() - S.age * 86400e3;
      const vis = st.nodes.filter(n => ((n[2] === 2 && S.showRep) || (n[2] === 3 && S.showRoom)) && n[5] >= cut && b.contains([n[3], n[4]])
        && (!NODES.isActive() || !NODES.meshcoreWanted() || NODES.meshcoreTypeOn(n[2])));
      vis.sort((a, z) => ((a[3] - c.lat) ** 2 + (a[4] - c.lng) ** 2) - ((z[3] - c.lat) ** 2 + (z[4] - c.lng) ** 2));
      st.vis = vis;
      if (S.allRep) {
        for (const n of vis.filter(n => !st.sel[n[0]]).slice(0, CFG.maxNodes)) out.push(nodeSite(n[0], n[1], n[2], n[3], n[4], n[5], n[6]));
        st.lastTotal = vis.length;
      }
      return out;
    }
    async function refresh(force) {
      if (!state.active) return;
      // Drop the plain repeater/room dots immediately when Show MeshCore nodes is off, before any download.
      if (NODES.isActive() && !NODES.meshcoreWanted()) drawMarkers([], new Set());
      if (S.enabled && st.map.getZoom() >= CFG.minZoom) await ensureNodes(force);
      const want = wantedSites(), ids = new Set(want.map(layerKey));
      st.wantKeys = new Set(want.map(siteKey)); st.want = want;
      drawMarkers(st.vis || [], new Set(want.map(w => w.id)));
      for (const k of Object.keys(st.layers)) if (!ids.has(k)) { st.map.removeLayer(st.layers[k].ov); delete st.layers[k]; }
      const todo = [];
      for (const s of want) {
        const k = layerKey(s); if (st.layers[k] && !st.layers[k].pv) continue;
        const r = resGet(siteKey(s)); if (r) { addLayer(k, s, r); continue; }
        todo.push(s);
      }
      st.queue = todo; runQueue();
      if (!todo.length) idleStatus(want.length);
    }
    // two passes: a quick coarse picture for every waiting site first, then full detail (tiles are shared and cached)
    async function runQueue() {
      if (st.busy) return; st.busy = true;
      const gen = st.gen; let done = 0, errs = 0;
      while (st.queue.length && gen === st.gen) {
        const s = st.queue.shift(), k = siteKey(s);
        if (!st.wantKeys.has(k)) continue; // deselected / scrolled away while queued
        { const l = st.layers[layerKey(s)]; if (l && !l.pv) continue; } // already finished (queued twice by a pan)
        await TDB.ready();
        const z = siteZ(s), pz = previewZ(z), lk0 = layerKey(s);
        const preview = !s._pv && pz < z && !st.layers[lk0] && missingTiles(s, z) >= PREVIEW.minMissing;
        const total = done + st.queue.length + 1, pre = `${done + 1}/${total} ${s.name}: `;
        const want = (DETAIL[S.detail] || DETAIL.balanced).z, note = !preview && z < want ? ' (area too big for this detail, using lower)' : '';
        status(pre + (preview ? 'Quick preview…' : 'Computing…'), 0);
        const t0 = performance.now();
        try {
          const segs = await computeSite(s, () => gen !== st.gen || !st.wantKeys.has(k), (a, b) => {
            if (gen !== st.gen) return;
            if (a < 0) status(pre + (preview ? 'Quick preview…' : 'Working out coverage…'), 0.85 + 0.15 * b);
            else status(`${pre}${preview ? 'Quick preview: terrain' : 'Loading terrain'} ${a}/${b}${note}`, 0.85 * a / b);
          }, preview);
          if (segs && gen === st.gen) {
            if (!preview) resPut(k, segs, s.g);
            const w = (st.want || []).find(x => siteKey(x) === k);
            if (w) { const lk = layerKey(w), cur = st.layers[lk]; if (!cur || cur.pv) { w.g = s.g; addLayer(lk, w, { segs, g: s.g, step: segs.step }, preview); } }
            if (preview) { s._pv = 1; st.queue.push(s); } else done++;
            console.log(TAG, (preview ? 'preview ' : 'coverage ') + s.name + ' z' + (preview ? pz : z) + ' ' + Math.round(performance.now() - t0) + ' ms');
          }
        } catch (e) { errs++; done++; st.err = "Couldn't work out coverage for " + s.name + ' (' + friendly(e) + ')'; }
      }
      st.busy = false; TDB.flush();
      if (gen !== st.gen) return runQueue();
      idleStatus(Object.keys(st.layers).length, errs);
    }
    const scheduleRefresh = () => { clearTimeout(st.timer); st.timer = setTimeout(refresh, CFG.debounceMs); };
    function settingsChanged() { st.gen++; st.queue = []; for (const l of Object.values(st.layers)) st.map.removeLayer(l.ov); st.layers = {}; refresh(); }

    // ---------- nodes: reuse the "Mesh nodes" download when possible, slim cache 6h ----------
    async function ensureNodes(force) {
      if (st.nodes && !force) return;
      const c = GM_getValue('cv_nodes', null);
      if (!force && c && Date.now() - c.t < CFG.nodesTtl) { st.nodes = c.n; return; }
      const fromNodes = !force && NODES.slimMeshcore && NODES.slimMeshcore();
      if (fromNodes) { st.nodes = fromNodes; try { GM_setValue('cv_nodes', { t: Date.now(), n: fromNodes }); } catch (e) { /* */ } return; }
      if (st.loading) return; st.loading = true; status('Downloading the repeater list… (first time can take up to a minute)');
      try {
        const arr = await loadMeshcoreRaw();
        const out = [];
        for (const n of arr) {
          if (n.type !== 2 && n.type !== 3) continue;
          const lat = +n.adv_lat, lon = +n.adv_lon;
          if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0) || Math.abs(lat) > 85) continue;
          out.push([String(n.public_key).slice(0, 16), (n.adv_name || '').trim().slice(0, 40), n.type,
            +lat.toFixed(5), +lon.toFixed(5), Date.parse(n.last_advert) || 0, slimRadio(n.params)]);
        }
        st.nodes = out; st.err = '';
        try { GM_setValue('cv_nodes', { t: Date.now(), n: out }); } catch (e) { console.warn(TAG, 'node cache store failed', e); }
      } catch (e) { st.err = "Couldn't download the repeater list (" + friendly(e) + ')'; if (c) st.nodes = c.n; }
      st.loading = false;
    }

    // ---------- UI (lives in the "Coverage" tab) ----------
    // f: 0..1 shows the progress bar, undefined hides it
    function status(t, f) {
      const e = $id('cv-st'); if (e) e.textContent = t;
      const b = $id('cv-prog'); if (b) { b.style.display = f == null ? 'none' : ''; b.firstChild.style.width = Math.round(Math.max(0.03, Math.min(1, f || 0)) * 100) + '%'; }
    }
    function idleStatus(n) {
      let t;
      if (!S.enabled) t = 'Coverage is off';
      else if (st.map.getZoom() < CFG.minZoom) t = 'Zoom in closer to pick a repeater';
      else if (S.allRep) t = `Showing ${n}` + (st.lastTotal > CFG.maxNodes ? ` (nearest ${CFG.maxNodes} of ${st.lastTotal})` : '');
      else t = n ? `Showing ${n}. Tap a repeater to add more.` : 'Tap a repeater on the map, then “Show coverage”.';
      if (st.pinMode) t = '📍 Now tap the map where you want the pin';
      status(t);
      syncMapLegend();
      const e = $id('cv-err');
      if (e) { e.style.display = st.err ? '' : 'none'; const m = e.querySelector('.msg'); if (m) m.textContent = st.err ? '⚠ ' + st.err + '. Tap Retry.' : ''; }
    }
    const BAND_LEGEND = [['#2ea043', 'Strong'], ['#f0c828', 'Fair'], ['#d6481c', 'Weak']];
    const bandLegendHtml = () => BAND_LEGEND.map(([c, name]) => `<span class="cvleg"><i style="background:${c}"></i>${name}</span>`).join('');
    function syncMapLegend() {
      let el = $id('mt-cv-leg');
      const on = state.active && S.enabled && S.mode !== 'los' && Object.keys(st.layers).length > 0;
      if (!on) { if (el) el.hidden = true; return; }
      if (!el) {
        el = document.createElement('div'); el.id = 'mt-cv-leg'; el.setAttribute('aria-label', 'Coverage colours: green strong, yellow fair, orange weak');
        document.body.appendChild(el);
      }
      if (!el.dataset.ready) { el.innerHTML = bandLegendHtml(); el.dataset.ready = '1'; }
      el.hidden = false;
    }
    const sel = (id, label, tip, opts, cur, unit) => `<div class="mt-row" title="${esc(tip)}"><span class="lb">${label}</span><select id="${id}">${opts.map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${v}${unit}</option>`).join('')}</select></div>`;
    function updSelUI() { const e = $id('cv-selc'); if (e) e.textContent = Object.keys(st.sel).length ? `${Object.keys(st.sel).length} picked` : 'None picked yet'; }
    function updPinBtn() { const pb = $id('cv-pin'); if (!pb) return; pb.textContent = st.pinMode ? '📍 Tap the map now… (tap here to cancel)' : '📍 Drop a pin to test a spot'; pb.classList.toggle('on', st.pinMode); }

    function sectionHtml() {
      return `
        <div class="hint">Shows roughly where a repeater's signal can reach over hills (shaded area). <b>Tap a red ◆R repeater</b>, then <b>Show coverage</b>.</div>
        <div id="cv-st" class="info"></div>
        <div id="cv-prog" title="Loading progress" style="display:none;height:6px;margin:4px 0;border-radius:3px;background:#d6dbe1;overflow:hidden"><i style="display:block;height:100%;width:0;background:#1e6fd9;transition:width .2s"></i></div>
        <div id="cv-err" class="card err" style="display:none"><span class="msg"></span><button type="button" id="cv-retry">↻ Retry</button></div>
        <label title="Turn coverage features on or off"><input type="checkbox" id="cv-en"><span><b>Coverage on</b></span></label>
        <div class="mt-row"><span id="cv-selc"></span><button type="button" id="cv-clrsel" class="sm">Clear</button></div>
        <button type="button" id="cv-pin" title="Check what a radio at any spot could reach"></button>
        <button type="button" id="cv-clrpin">Remove my pins</button>
        <div class="mt-row" title="What the shading means"><span class="lb">Map shows</span><select id="cv-mode"><option value="signal"${S.mode !== 'los' ? ' selected' : ''}>Signal strength</option><option value="los"${S.mode === 'los' ? ' selected' : ''}>Clear view only</option></select></div>
        <div class="info" id="cv-legend"></div>
        <details class="adv"><summary>Advanced</summary>
          <label title="Draws coverage for every nearby repeater automatically. Slow on phones."><input type="checkbox" id="cv-all"><span>Show ALL nearby repeaters<small>(slow)</small></span></label>
          <label><input type="checkbox" id="cv-rep"><span><i class="dot" style="background:#e53935"></i>Include repeaters</span></label>
          <label><input type="checkbox" id="cv-room"><span><i class="dot" style="background:#8e24aa"></i>Include chat rooms</span></label>
          ${sel('cv-age', 'Heard in the last', 'Ignore repeaters not heard from recently', OPTS.age, S.age, ' days')}
          <div class="mt-row" id="cv-txrow" title="Guess of how high repeater antennas are above the ground (used unless you set one in a popup)"><span class="lb">Repeater height</span><span class="ig">${hBox('cv-tx')}</span></div>
          <div class="mt-row" id="cv-rxrow" title="How high YOUR radio's antenna is above the ground"><span class="lb">Your height</span><span class="ig">${hBox('cv-rx')}</span></div>
          <div class="info" id="cv-herr" style="color:#b71c1c"></div>
          <div class="mt-row" id="cv-rgrow" title="How far out to check"><span class="lb">Farthest distance</span><span class="ig"><select id="cv-range" class="dv"></select><select id="cv-dunit" class="hu" title="Miles or kilometres"><option value="mi">mi</option><option value="km">km</option></select></span></div>
          <div class="mt-row" title="Sharper = more accurate, slower to load"><span class="lb">Terrain detail<small>Sharper = more accurate, slower to load</small></span><select id="cv-detail">${Object.entries(DETAIL).map(([k, d]) => `<option value="${k}" title="${d.res} terrain grid"${k === S.detail ? ' selected' : ''}>${d.label}</option>`).join('')}</select></div>
          ${sel('cv-rays', 'Smoothness', 'More = smoother but slower', OPTS.rays, S.rays, '')}
          ${sel('cv-txp', 'Repeater power', 'Transmit power used for Signal strength', OPTS.txp, S.txp, ' dBm')}
          ${sel('cv-gain', 'Antenna gain (each)', 'Antenna gain at both ends, for Signal strength', OPTS.gain, S.gain, ' dBi')}
          ${sel('cv-fade', 'Fade margin (dB)', 'Safety cushion: higher = more cautious map', OPTS.fade, S.fade, '')}
          <label title="Stricter check that leaves extra clearance over hills (915 MHz)"><input type="checkbox" id="cv-fr"><span>Strict mode (Fresnel 60%)<small>(Clear view only)</small></span></label>
          <button type="button" id="cv-clr">Clear saved results</button>
        </details>
        <div class="info">This is an estimate from hills only. Trees and buildings are not included. Terrain: AWS Terrain Tiles. Nodes: map.meshcore.io</div>`;
    }
    function wire() {
      const cb = (id, key, gk, recompute) => { const e = $id(id); e.checked = S[key]; e.addEventListener('change', () => { S[key] = e.checked; GM_setValue(gk, e.checked); if (!state.active) return; recompute ? settingsChanged() : refresh(); }); };
      cb('cv-en', 'enabled', 'cv_enabled'); cb('cv-rep', 'showRep', 'cv_rep'); cb('cv-room', 'showRoom', 'cv_room'); cb('cv-all', 'allRep', 'cv_all'); cb('cv-fr', 'fresnel', 'cv_fresnel', true);
      const sl = (id, key, opts, recompute) => $id(id).addEventListener('change', e => { S[key] = pick(e.target.value, opts, S[key]); GM_setValue('cv_' + key, S[key]); if (!state.active) return; recompute ? settingsChanged() : refresh(); });
      sl('cv-age', 'age', OPTS.age); sl('cv-rays', 'rays', OPTS.rays, 1); sl('cv-txp', 'txp', OPTS.txp, 1); sl('cv-gain', 'gain', OPTS.gain, 1); sl('cv-fade', 'fade', OPTS.fade, 1);
      const leg = () => { const e = $id('cv-legend'); if (e) e.innerHTML = S.mode === 'los' ? 'Shaded = clear view of the repeater over the hills.' : bandLegendHtml() + '<span class="cvleg">Clear = unlikely</span>'; syncMapLegend(); };
      leg(); $id('cv-mode').addEventListener('change', e => { S.mode = e.target.value === 'los' ? 'los' : 'signal'; GM_setValue('cv_mode', S.mode); leg(); if (state.active) settingsChanged(); });
      $id('cv-pin').addEventListener('click', () => { if (!state.active) return; st.pinMode = !st.pinMode; updPinBtn(); idleStatus(Object.keys(st.layers).length); });
      $id('cv-clrsel').addEventListener('click', () => { st.sel = {}; saveSel(); if (!state.active) return; st.map.closePopup(); refresh(); });
      $id('cv-clrpin').addEventListener('click', () => { st.pins = []; savePins(); if (!state.active) return; st.map.closePopup(); refresh(); });
      $id('cv-clr').addEventListener('click', () => { if (!state.active) return; st.err = ''; st.gen++; st.queue = []; clearCache(); refresh(); });
      $id('cv-retry').addEventListener('click', () => { if (!state.active) return; st.err = ''; idleStatus(0); st.nodes = null; refresh(true); });
      const herr = $id('cv-herr');
      for (const [rowId, key] of [['cv-txrow', 'tx'], ['cv-rxrow', 'rx']])
        heightWidget($id(rowId), 'cv-' + key, () => S[key], m => { S[key] = m; GM_setValue('cv_' + key, m); if (state.active) settingsChanged(); }, { err: herr });
      $id('cv-detail').addEventListener('change', e => { S.detail = DETAIL[e.target.value] ? e.target.value : 'balanced'; GM_setValue('cv_detail', S.detail); if (state.active) settingsChanged(); });
      const rSel = $id('cv-range'), dSel = $id('cv-dunit');
      const fillR = () => { const cur = nearestOpt(S.range); rSel.innerHTML = rangeOpts().map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${toD(v)}</option>`).join(''); dSel.value = DUNIT; };
      fillR(); dSubs.add(() => { if (!rSel.isConnected) return false; fillR(); });
      rSel.addEventListener('change', () => { S.range = validKm(rSel.value, S.range); GM_setValue('cv_range', S.range); if (state.active) settingsChanged(); });
      dSel.addEventListener('change', () => {
        setDUnit(dSel.value); const n = nearestOpt(S.range);
        if (Math.abs(n - S.range) > 1e-6) { S.range = n; GM_setValue('cv_range', n); fillR(); if (state.active) settingsChanged(); }
      });
      updSelUI(); updPinBtn();
    }
    const state = { active: false };
    function onMapClick(e) {
      if (!st.pinMode) return;
      const t = e.originalEvent && e.originalEvent.target;
      if (t && t.closest && t.closest('.leaflet-popup,#mt-panel')) return;
      st.pins.push({ id: 'p' + Date.now().toString(36), lat: e.latlng.lat, lon: e.latlng.lng }); if (st.pins.length > 10) st.pins.shift();
      st.pinMode = false; updPinBtn(); // one pin per tap of the button: simpler for beginners
      savePins(); refresh();
    }
    function init(map) {
      st.map = map; st.L = W.L; state.active = true;
      if (!map.getPane('meshCoverage')) { map.createPane('meshCoverage'); map.getPane('meshCoverage').style.zIndex = 420; }
      map.on('moveend zoomend', scheduleRefresh);
      map.on('popupopen', onPopupOpen);
      map.on('click', onMapClick);
      refresh();
    }
    function disable() {
      if (!state.active) return; state.active = false; st.gen++; st.queue = []; clearTimeout(st.timer);
      const map = st.map; if (!map) return;
      map.off('moveend zoomend', scheduleRefresh); map.off('popupopen', onPopupOpen); map.off('click', onMapClick);
      for (const l of Object.values(st.layers)) map.removeLayer(l.ov); st.layers = {};
      if (st.marks) { map.removeLayer(st.marks); st.marks = null; }
      syncMapLegend();
    }
    return { sectionHtml, wire, init, disable, refresh, isActive: () => state.active, isBusy: () => st.loading || st.busy,
      _detail: { DETAIL, effZoom, stepForZ, tileRange, tileUrl, siteZ, siteKey, get: () => S.detail },
      _perf: { missingTiles, tileCached, layers: () => Object.values(st.layers).map(l => ({ pv: l.pv })), busy: () => st.busy, viaGM: () => useGM, via: () => computeSite.via },
      _units: { parseH, toU, fromU, fmtH, setUnit, unit: () => UNIT, S, toD, fromD, fmtD, setDUnit, dunit: () => DUNIT, rangeOpts } };
  })();

  // =====================================================================
  // MODULE 3: Map layers (from aprsfi-layer-toggles 0.2.0)
  // =====================================================================
  const LAYERS = (function () {
    const TOGGLES = [
      ['moving',   'Moving stations',        'stations'],
      ['fixed',    'Fixed stations',         'stations'],
      ['weather',  'Weather stations',       'stations'],
      ['object',   'Objects',                'stations'],
      ['winlink',  'Winlink position reports', 'stations'],
      ['item',     'Items',                  'stations'],
      ['ais',      'AIS ships',              'stations'],
      ['aircraft', 'Aircraft (ADS-B)',       'stations'],
      ['labels',   'Callsign labels',        'overlays'],
      ['tracks',   'Track lines',            'overlays'],
      ['dots',     'Old positions (track dots)', 'overlays'],
      ['heading',  'Direction-of-travel lines', 'overlays'],
      ['paths',    'Relay path lines (on hover)', 'overlays'],
      ['phg',      'Range circles (PHG)',      'overlays']
    ];
    // APRS object groups, keyed from aprs.fi's symbol table (constants.js symbol_descr).
    // Primary table is symbol "/X". Alternate "\X" and overlay symbols (A–Z or 0–9, then the symbol)
    // use the alternate table, which is how aprs.fi itself describes them.
    const OBJ_GROUPS = [
      ['obj-radio', 'Repeaters & towers', '/r'],
      ['obj-wx', 'Weather & alerts', '/_'],
      ['obj-event', 'Events', '\\;'],
      ['obj-emerg', 'Emergency', '\\!'],
      ['obj-generic', 'Generic markers', '//'],
      ['obj-other', 'Other objects', '\\.']
    ];
    const OBJ_PRI = {
      '#': 'obj-radio', '%': 'obj-radio', '&': 'obj-radio', '-': 'obj-radio', 'B': 'obj-radio', 'I': 'obj-radio', 'N': 'obj-radio', '`': 'obj-radio', 'm': 'obj-radio', 'n': 'obj-radio', 'r': 'obj-radio', 'y': 'obj-radio',
      'W': 'obj-wx', '_': 'obj-wx',
      ';': 'obj-event', 'E': 'obj-event', 'w': 'obj-event',
      '!': 'obj-emerg', '+': 'obj-emerg', ':': 'obj-emerg', 'A': 'obj-emerg', 'P': 'obj-emerg', 'a': 'obj-emerg', 'c': 'obj-emerg', 'd': 'obj-emerg', 'f': 'obj-emerg', 'h': 'obj-emerg', 'o': 'obj-emerg', 'z': 'obj-emerg',
      '.': 'obj-generic', '/': 'obj-generic', '0': 'obj-generic', '1': 'obj-generic', '2': 'obj-generic', '3': 'obj-generic', '4': 'obj-generic', '5': 'obj-generic', '6': 'obj-generic', '7': 'obj-generic', '8': 'obj-generic', '9': 'obj-generic', '\\': 'obj-generic', 'G': 'obj-generic', 'q': 'obj-generic'
    };
    const OBJ_ALT = {
      '#': 'obj-radio', '&': 'obj-radio', '0': 'obj-radio', '8': 'obj-radio', 'd': 'obj-radio',
      '(': 'obj-wx', '*': 'obj-wx', ':': 'obj-wx', '<': 'obj-wx', '@': 'obj-wx', 'B': 'obj-wx', 'D': 'obj-wx', 'E': 'obj-wx', 'F': 'obj-wx', 'G': 'obj-wx', 'H': 'obj-wx', 'I': 'obj-wx', 'J': 'obj-wx', 'T': 'obj-wx', 'U': 'obj-wx', 'W': 'obj-wx', '[': 'obj-wx', '_': 'obj-wx', '`': 'obj-wx', 'b': 'obj-wx', 'e': 'obj-wx', 'f': 'obj-wx', 'g': 'obj-wx', 'p': 'obj-wx', 't': 'obj-wx', 'w': 'obj-wx', 'y': 'obj-wx', '{': 'obj-wx',
      '+': 'obj-event', ';': 'obj-event',
      '!': 'obj-emerg', "'": 'obj-emerg', 'Q': 'obj-emerg', 'c': 'obj-emerg', 'z': 'obj-emerg',
      '.': 'obj-generic', '/': 'obj-generic', 'A': 'obj-generic', 'i': 'obj-generic', 'n': 'obj-generic', 'o': 'obj-generic'
    };
    function objectGroup(sym) {
      if (!sym || sym.length < 2) return 'obj-other';
      const map = sym.charAt(0) === '/' ? OBJ_PRI : OBJ_ALT;
      return map[sym.charAt(1)] || 'obj-other';
    }
    // aprs.fi sprite: 16×6 cells, symbol index is ASCII code − 33. @2x sheet drawn at 18px.
    function symStyle(sym) {
      if (!sym || sym.length < 2) return '';
      const code = sym.charCodeAt(1);
      if (code < 33 || code > 126) return '';
      const sheet = sym.charCodeAt(0) === 47 ? '0' : '1';
      const idx = code - 33, cell = 18;
      return `background-image:url('https://aprs.fi/s2/aprs-symbols-24-${sheet}@2x.png');background-position:-${(idx % 16) * cell}px -${((idx / 16) | 0) * cell}px`;
    }
    const show = {};
    TOGGLES.forEach(([k]) => { show[k] = GM_getValue('lt_show_' + k, true) !== false; });
    OBJ_GROUPS.forEach(([k]) => { show[k] = GM_getValue('lt_show_' + k, true) !== false; });

    const PATH_COLORS = ['#497cff', '#498341', '#ad4fff'];
    const HEADING_COLOR = '#0010ff';

    // ---------- classification ----------
    const inVals = (obj, layer) => {
      if (!obj) return false;
      for (const k in obj) { try { if (obj[k] === layer) return true; } catch (e) { /* */ } }
      return false;
    };
    // Winlink mirrors a user's GPS to APRS-IS as an object: source WINLINK, destination APWL2K,
    // drawn by aprs.fi as P on a red diamond. Gateways keep their own callsign, so they are left alone.
    function isWinlinkReport(info, pt) {
      if (!info) return false;
      const base = String(info.srccall || '').toUpperCase().split('-')[0];
      if (base !== 'WINLINK') return false;
      const dst = String((pt && pt.dstcall) || (info.Xje && info.Xje.dstcall) || info.dstcall || '').toUpperCase().split('-')[0];
      if (dst) return dst === 'APWL2K';
      const sym = String(info.symbol || '');
      return sym.length >= 2 && sym.charAt(0).toUpperCase() === 'P' && sym.charAt(1).toLowerCase() === 'a';
    }
    function stationKind(info, pt) {
      if (!info) return 'fixed';
      if (info.cla === 'i') return 'ais';
      if (info.cla === 's') return 'aircraft';
      if (info.type === 'w' || info.wxtime) return 'weather';
      if (isWinlinkReport(info, pt)) return 'winlink';
      if (info.type === 'o') return 'object';
      if (info.type === 'i') return 'item';
      const tid = info.tid;
      let n = 0;
      try { if (W.Xq && W.Xq[tid]) n = Object.keys(W.Xq[tid]).length; } catch (e) { /* */ }
      if (n > 1 || (pt && pt.speed > 0) || (info.Xje && info.Xje.speed > 0)) return 'moving';
      return 'fixed';
    }
    // returns list of toggle keys that must ALL be on for the layer to be visible, or null = not ours
    function classify(layer) {
      const L = W.L;
      if (layer instanceof L.Marker) {
        if (layer.Xjf !== undefined) {
          const info = W.Fi ? W.Fi[layer.Xjf] : null;
          const pt = layer.Xkg;
          const latest = !info || !pt || pt.t_end === info.time;
          const k = stationKind(info, pt);
          const keys = k === 'object' ? ['object', objectGroup(info.symbol)] : [k];
          return latest ? keys : keys.concat(['dots']);
        }
        const cn = (layer.options && layer.options.icon && layer.options.icon.options.className) || '';
        if (/(^|\s)nametip(\s|$)/.test(cn)) return ['labels'];  // owner resolved in fullPass
        return null;
      }
      if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
        if (inVals(W.Xac, layer)) return ['phg'];
        return null;
      }
      if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        const o = layer.options || {};
        if (inVals(W.Xr, layer)) return ['tracks'];
        if (inVals(W.Xjr, layer) || (o.color === HEADING_COLOR && o.interactive === false)) return ['heading'];
        if (o.weight === 2 && PATH_COLORS.indexOf(o.color) >= 0) return ['paths'];
        return null;
      }
      return null;
    }

    // ---------- hide / show (non-destructive) ----------
    function setVisible(layer, vis) {
      if (!!layer._ltHidden === !vis) return;   // already in requested state (never-touched counts as visible)
      layer._ltHidden = !vis;
      if (layer instanceof W.L.Marker) {
        const els = [layer._icon, layer._shadow];
        els.forEach(e => { if (e) e.style.display = vis ? '' : 'none'; });
      } else if (layer.setStyle) {
        if (!vis) {
          layer._ltOrig = { opacity: layer.options.opacity, fillOpacity: layer.options.fillOpacity };
          layer.setStyle({ opacity: 0, fillOpacity: 0 });
          if (layer._path) layer._path.style.pointerEvents = 'none';
        } else {
          const o = layer._ltOrig || {};
          layer.setStyle({ opacity: o.opacity == null ? 1 : o.opacity, fillOpacity: o.fillOpacity == null ? 0.2 : o.fillOpacity });
          if (layer._path) layer._path.style.pointerEvents = '';
        }
      }
    }
    const allOn = keys => keys.every(k => show[k]);

    function applyLayer(layer, extraKeys) {
      const keys = classify(layer);
      if (!keys) return;
      const vis = allOn(extraKeys ? keys.concat(extraKeys) : keys);
      setVisible(layer, vis);
      const el = layer._icon;
      if (el && keys.indexOf('winlink') >= 0) {
        if (vis) { el.style.boxShadow = '0 0 0 3px #1d4ed8'; el.style.borderRadius = '3px'; el.dataset.wl = '1'; }
        else if (el.dataset.wl) { el.style.boxShadow = ''; el.style.borderRadius = ''; }
      }
    }

    let map = null, passTimer = null, active = false, ivl = null;
    function fullPass() {
      passTimer = null;
      if (!map || !active) return;
      const labelOwner = new Map();
      map.eachLayer(l => { if (l.Xjf !== undefined && l.Xlb) labelOwner.set(l.Xlb, l); });
      map.eachLayer(l => {
        try {
          const owner = labelOwner.get(l);
          if (owner) {
            // label follows both the labels toggle and its station's own kind toggle
            setVisible(l, show.labels && allOn(classify(owner) || []));
          } else applyLayer(l);
        } catch (e) { /* never break aprs.fi */ }
      });
      updateCounts();
    }
    const schedulePass = () => { if (!passTimer) passTimer = setTimeout(fullPass, 150); };


    const onAdd = ev => {
      if (!active) return;
      const l = ev.layer;
      try { applyLayer(l); } catch (e) { /* */ }
      Promise.resolve().then(() => { try { applyLayer(l); } catch (e) { /* */ } });
      schedulePass();
    };
    function init(m) {
      map = m; active = true;
      m.on('layeradd', onAdd);
      m.on('zoomend moveend', schedulePass);
      m.on('zoomend moveend', ft8OnMove);
      ivl = setInterval(schedulePass, 5000);
      fullPass();
      if (ft8On) ft8Start(); else ft8Status();
    }
    function disable() {
      if (!active) return;
      // put everything back the way aprs.fi drew it, then stop
      try { map.eachLayer(l => { try { setVisible(l, true); if (l._icon && l._icon.dataset.wl) { l._icon.style.boxShadow = ''; l._icon.style.borderRadius = ''; delete l._icon.dataset.wl; } } catch (e) { /* */ } }); } catch (e) { /* */ }
      ft8Stop();
      active = false; clearInterval(ivl);
      map.off('layeradd', onAdd); map.off('zoomend moveend', schedulePass); map.off('zoomend moveend', ft8OnMove);
    }
    let countEl = null;
    function updateCounts() {
      if (!countEl) countEl = $id('lt-count');
      if (!countEl || !map) return;
      let hidden = 0, total = 0;
      map.eachLayer(l => { if (l.Xjf !== undefined) { total++; if (l._ltHidden) hidden++; } });
      countEl.textContent = total ? `${total - hidden} of ${total} map points showing` : '';
    }
    // FT8 spots from PSKReporter. One query at a time, never more often than every 5 minutes (their rule).
    const FT8_GAP = 5 * 60 * 1000;
    let ft8On = GM_getValue('lt_show_ft8', false) === true, ft8At = 0, ft8Spots = [], ft8Grid = '', ft8Busy = false, ft8Err = '', ft8Timer = null, ft8Layer = null;
    function maidenhead(lat, lon, len) {
      const s = String.fromCharCode(65 + Math.floor((lon + 180) / 20)) + String.fromCharCode(65 + Math.floor((lat + 90) / 10))
        + Math.floor(((lon + 180) % 20) / 2) + Math.floor((lat + 90) % 10);
      if ((len || 4) <= 4) return s;
      return s + String.fromCharCode(65 + Math.floor(((lon + 180) % 2) / 2 * 24)) + String.fromCharCode(65 + Math.floor(((lat + 90) % 1) * 24));
    }
    function gridCenter(loc) {
      loc = String(loc || '').trim().toUpperCase();
      if (loc.length < 4) return null;
      const lon0 = (loc.charCodeAt(0) - 65) * 20 + parseInt(loc[2], 10) * 2 - 180;
      const lat0 = (loc.charCodeAt(1) - 65) * 10 + parseInt(loc[3], 10) - 90;
      if (loc.length >= 6) {
        const x = loc.charCodeAt(4) - 65, y = loc.charCodeAt(5) - 65;
        if (x < 0 || x > 23 || y < 0 || y > 23) return [lat0 + 0.5, lon0 + 1];
        return [lat0 + (y + 0.5) / 24, lon0 + (x + 0.5) * 2 / 24];
      }
      return [lat0 + 0.5, lon0 + 1];
    }
    function ft8Band(hz) {
      const m = (+hz || 0) / 1e6;
      const bands = [[1.8, '160m'], [3.5, '80m'], [5, '60m'], [7, '40m'], [10, '30m'], [14, '20m'], [18, '17m'], [21, '15m'], [24, '12m'], [28, '10m'], [50, '6m']];
      let name = '';
      for (const b of bands) if (m >= b[0] && m < b[0] + (b[0] < 10 ? 1 : 2)) name = b[1];
      return (name ? name + ' · ' : '') + (m ? m.toFixed(3) + ' MHz' : 'unknown');
    }
    function ft8Parse(xml) {
      let doc; try { doc = new DOMParser().parseFromString(xml, 'text/xml'); } catch (e) { return []; }
      const rows = doc.getElementsByTagName('receptionReport'), by = new Map();
      for (let i = 0; i < rows.length; i++) {
        const el = rows[i], call = el.getAttribute('senderCallsign'), loc = el.getAttribute('senderLocator');
        if (!call || !loc || loc.length < 4 || !gridCenter(loc)) continue;
        const t = +el.getAttribute('flowStartSeconds') || 0;
        let rec = by.get(call);
        if (!rec) { rec = { call, loc, freq: 0, snr: '', t: 0, heard: [] }; by.set(call, rec); }
        if (t >= rec.t) { rec.t = t; rec.loc = loc; rec.freq = +el.getAttribute('frequency') || rec.freq; rec.snr = el.getAttribute('sNR') || el.getAttribute('snr') || rec.snr; }
        const rx = el.getAttribute('receiverCallsign');
        if (rx && rec.heard.indexOf(rx) < 0 && rec.heard.length < 8) rec.heard.push(rx);
      }
      return Array.from(by.values());
    }
    function ft8Status() {
      const el = $id('lt-ft8-st'); if (!el) return;
      if (!ft8On) { el.textContent = 'Off. Nothing is downloaded until you turn this on.'; return; }
      const wait = Math.max(0, FT8_GAP - (Date.now() - ft8At));
      const mins = Math.ceil(wait / 60000);
      el.textContent = (ft8Err ? 'Couldn\'t load spots (' + ft8Err + '). ' : (ft8Spots.length + ' spots in ' + (ft8Grid || 'the center grid') + '. '))
        + (ft8Busy ? 'Loading…' : 'PSKReporter allows one check every 5 minutes' + (mins ? ' (next in ' + mins + ' min).' : '.'));
    }
    function ft8Draw() {
      if (!map || !W.L) return;
      if (!ft8Layer) ft8Layer = W.L.layerGroup().addTo(map);
      ft8Layer.clearLayers();
      if (!ft8On) return;
      const b = map.getBounds(), s = b.getSouth(), n = b.getNorth(), w = b.getWest(), e = b.getEast(), wrap = w > e;
      let shown = 0;
      const list = ft8Spots.slice().sort((a, c) => c.t - a.t);
      for (const rec of list) {
        if (shown >= 200) break;
        const ll = gridCenter(rec.loc); if (!ll) continue;
        if (ll[0] < s || ll[0] > n) continue;
        if (!wrap) { if (ll[1] < w || ll[1] > e) continue; } else if (ll[1] < w && ll[1] > e) continue;
        const m = W.L.circleMarker(ll, { radius: 7, color: '#0f766e', weight: 2, fillColor: '#5eead4', fillOpacity: 0.9 });
        m.bindPopup(() => `<div style="font:14px sans-serif;min-width:180px"><b>${esc(rec.call)}</b> <small>FT8</small><br><table style="font-size:12px;margin-top:4px">`
          + `<tr><td style="color:#666;padding-right:6px">Band</td><td>${esc(ft8Band(rec.freq))}</td></tr>`
          + `<tr><td style="color:#666;padding-right:6px">SNR</td><td>${esc(rec.snr === '' ? '—' : rec.snr + ' dB')}</td></tr>`
          + `<tr><td style="color:#666;padding-right:6px">Time</td><td>${rec.t ? esc(new Date(rec.t * 1000).toLocaleString()) : '—'}</td></tr>`
          + `<tr><td style="color:#666;padding-right:6px">Grid</td><td>${esc(rec.loc)}</td></tr>`
          + `<tr><td style="color:#666;padding-right:6px">Heard by</td><td>${esc(rec.heard.join(', ') || '—')}</td></tr></table>`
          + `<small style="color:#666">PSKReporter · grid-square center</small></div>`, { maxWidth: 280 });
        m.addTo(ft8Layer); shown++;
      }
    }
    function ft8Arm() {
      clearTimeout(ft8Timer);
      if (!ft8On) return;
      const wait = Math.max(1000, FT8_GAP - (Date.now() - ft8At));
      ft8Timer = setTimeout(() => { if (ft8On && map) ft8Fetch(); }, ft8At ? wait : 1000);
    }
    function ft8Fetch() {
      if (!ft8On || !map || ft8Busy) return;
      if (ft8At && Date.now() - ft8At < FT8_GAP) { ft8Draw(); ft8Status(); ft8Arm(); return; }
      ft8Busy = true; ft8At = Date.now(); ft8Status(); ft8Arm();
      const c = map.getCenter();
      const grid = maidenhead(c.lat, c.lng, map.getZoom() < 5 ? 2 : 4);
      ft8Grid = grid;
      const url = 'https://retrieve.pskreporter.info/query?modify=grid&callsign=' + encodeURIComponent(grid)
        + '&mode=FT8&rronly=1&noactive=1&flowStartSeconds=-3600&rptlimit=200&appcontact=' + encodeURIComponent('https://github.com/thescrawler/aprsfi-mesh-tools');
      gmGet(url, 'text', 30000).then(r => {
        ft8Spots = ft8Parse(r.responseText); ft8Err = '';
        try { GM_setValue('ft8_cache', { t: ft8At, grid, spots: ft8Spots }); } catch (e) { /* */ }
      }).catch(e => { ft8Err = friendly(e); }).then(() => { ft8Busy = false; ft8Draw(); ft8Status(); });
    }
    function ft8Start() {
      if (!ft8On || !map) { ft8Draw(); ft8Status(); return; }
      const cached = GM_getValue('ft8_cache', null);
      if (cached && cached.t && Date.now() - cached.t < FT8_GAP && Array.isArray(cached.spots)) {
        ft8At = cached.t; ft8Spots = cached.spots; ft8Grid = cached.grid || '';
        ft8Draw(); ft8Status(); ft8Arm(); return;
      }
      ft8Fetch();
    }
    function ft8Stop() {
      clearTimeout(ft8Timer); ft8Timer = null; ft8Busy = false;
      if (ft8Layer && map) { map.removeLayer(ft8Layer); ft8Layer = null; }
    }
    function ft8OnMove() { if (ft8On) { ft8Draw(); if (!ft8At || Date.now() - ft8At >= FT8_GAP) ft8Fetch(); else ft8Status(); } }
    const TIPS = { moving: 'Cars, hikers, anything that moves', fixed: 'Home stations, digipeaters, gateways', weather: 'Weather stations', object: 'All APRS objects. The list under this splits them by symbol.',
      winlink: 'GPS reports that Winlink posts onto APRS. A blue ring. Gateways are not affected.',
      item: 'Like objects', ais: 'Boats and ships', aircraft: 'Planes', labels: 'The name text next to each icon', tracks: 'Lines showing where something has travelled',
      dots: 'Small dots along a track', heading: 'Lines showing where something is heading', paths: 'Lines that appear when you hover over a station', phg: 'Circles estimating a station\'s range',
      'obj-radio': 'Repeater towers, digipeaters, gateways and antennas placed as objects',
      'obj-wx': 'Weather stations and storm or flood warnings placed as objects',
      'obj-event': 'Camps, picnics and other gatherings placed on the map',
      'obj-emerg': 'Police, fire, medical, shelter and other emergency markers',
      'obj-generic': 'Plain dots, numbered circles and other simple markers',
      'obj-other': 'Objects whose symbol does not fit the groups above' };
    function sectionHtml() {
      const row = ([k, label]) => `<label title="${esc(TIPS[k] || '')}"><input type="checkbox" data-k="${k}"${show[k] ? ' checked' : ''}><span>${label}</span></label>`;
      const objRows = OBJ_GROUPS.map(([k, label, sym]) =>
        `<label title="${esc(TIPS[k] || '')}"><input type="checkbox" data-k="${k}"${show[k] ? ' checked' : ''}><span><i class="sym" style="${symStyle(sym)}"></i><b>${label}</b></span></label>`).join('');
      const stations = TOGGLES.filter(t => t[2] === 'stations').map(t => row(t) + (t[0] === 'object'
        ? `<div id="mt-obj-groups" class="obj-groups${show.object ? '' : ' dim'}">${objRows}<div class="hint">These only hide objects while <b>Objects</b> is on. The picture matches the map icon.</div></div>` : '')).join('');
      return `
        <div class="hint">Untick things to hide them and clean up the map. Nothing is deleted.</div>
        <div class="btns"><button type="button" id="lt-all">Show all</button><button type="button" id="lt-none">Hide all</button></div>
        <div class="sec">What to show</div>
        ${stations}
        <label title="FT8 stations from PSKReporter. Off until you turn it on."><input type="checkbox" id="lt-ft8"${ft8On ? ' checked' : ''}><span><b>FT8 spots</b>
          <small>Teal dots at each station's grid square. One download every 5 minutes, only while this is on.</small></span></label>
        <div class="info" id="lt-ft8-st"></div>
        <details class="adv"><summary>Advanced: lines, labels &amp; circles</summary>
        ${TOGGLES.filter(t => t[2] === 'overlays').map(row).join('')}
        </details>
        <div class="info" id="lt-count"></div>`;
    }
    function wire() {
      const boxes = [...document.querySelectorAll('#mt-pane-layers input[data-k]')];
      const set = (k, v) => { show[k] = v; GM_setValue('lt_show_' + k, v); };
      const grp = $id('mt-obj-groups');
      const syncObj = () => { const ob = boxes.find(cb => cb.dataset.k === 'object'); if (grp && ob) grp.classList.toggle('dim', !ob.checked); };
      boxes.forEach(cb => cb.addEventListener('change', () => { set(cb.dataset.k, cb.checked); if (cb.dataset.k === 'object') syncObj(); fullPass(); }));
      const all = v => { boxes.forEach(cb => { cb.checked = v; set(cb.dataset.k, v); }); syncObj(); fullPass(); };
      $id('lt-all').addEventListener('click', () => all(true));
      $id('lt-none').addEventListener('click', () => all(false));
      const ft = $id('lt-ft8');
      ft.addEventListener('change', () => {
        ft8On = ft.checked; GM_setValue('lt_show_ft8', ft8On);
        if (ft8On) ft8Start(); else { ft8Stop(); ft8Status(); }
      });
      ft8Status();
    }
    return { sectionHtml, wire, init, disable, isActive: () => active, isBusy: () => ft8Busy };
  })();

  // =====================================================================
  // ONE PANEL: tabs, welcome tip, conflict notice, busy indicator
  // =====================================================================
  const MODS = { nodes: NODES, coverage: COVERAGE, layers: LAYERS };
  const TABS = [['nodes', '📡 Mesh nodes', 'See mesh radios on the map'], ['coverage', '📶 Coverage', 'Where can a repeater reach?'], ['layers', '🗺️ Map layers', 'Hide clutter on the aprs.fi map']];
  const off = {}; // module key -> true when an old separate script is doing that job
  let MAP = null;
  const CSS = `
    #mt-panel,#mt-panel *,#mt-panel *::before,#mt-panel *::after{box-sizing:border-box}
    #mt-panel{--mt-acc:#1e6fd9;--mt-acc2:#1558b0;--mt-bd:#d6dbe1;--mt-mut:#6b7280;--mt-bg2:#f5f7fa;--mt-h:32px;--mt-cw:128px;
      position:fixed;right:8px;bottom:24px;z-index:100000;width:320px;max-width:calc(100vw - 16px);max-height:calc(100vh - 110px);
      overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;
      box-shadow:0 4px 18px rgba(0,0,0,.18),0 1px 3px rgba(0,0,0,.12);
      font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1f2933;text-align:left;letter-spacing:normal}
    @media (pointer:coarse){#mt-panel{--mt-h:40px}}
    #mt-panel b{font-weight:600}
    #mt-panel .mv-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 6px 4px 12px;min-height:34px;cursor:move;touch-action:none;user-select:none;
      background:var(--mt-bg2);border-bottom:1px solid #e6e9ee;border-radius:12px 12px 0 0;font-size:12px;color:var(--mt-mut)}
    #mt-panel .mv-bar .mv-rst{width:auto;min-width:36px;height:28px;min-height:0;margin:0;padding:0 8px;font-size:14px;line-height:1;flex:none}
    #mt-panel .hd{display:flex;align-items:center;gap:8px;padding:10px 12px;min-height:44px;font-weight:600;font-size:15px;cursor:pointer;user-select:none}
    #mt-panel .hd .tt{flex:1;min-width:0} #mt-panel .hd .car{color:var(--mt-mut);font-size:12px;font-weight:400}
    #mt-busy{display:none;width:16px;height:16px;border:2px solid #d6dbe1;border-top-color:#1e6fd9;border-radius:50%;animation:mtspin 1s linear infinite}
    @keyframes mtspin{to{transform:rotate(360deg)}}
    #mt-panel .bd{padding:0 12px 12px}
    #mt-panel .tabs{display:flex;gap:2px;margin:0 0 12px;padding:3px;background:var(--mt-bg2);border:1px solid #e6e9ee;border-radius:10px}
    #mt-panel .tabs button{flex:1;min-width:0;width:auto;height:auto;min-height:var(--mt-h);margin:0;padding:4px 2px;font-size:12px;line-height:1.2;
      border:0;border-radius:7px;background:transparent;color:#374151;white-space:normal}
    #mt-panel .tabs button:hover{background:#e9edf2}
    #mt-panel .tabs button.on{background:#fff;color:var(--mt-acc2);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.15)}
    #mt-panel button{display:block;width:100%;height:auto;min-height:var(--mt-h);margin:8px 0 0;padding:4px 12px;border:1px solid var(--mt-bd);border-radius:8px;
      background:#fff;color:#1f2933;font:inherit;font-size:14px;cursor:pointer;touch-action:manipulation;text-align:center}
    #mt-panel button:hover{background:var(--mt-bg2);border-color:#c3c9d1}
    #mt-panel button:focus-visible,#mt-panel select:focus-visible,#mt-panel input:focus-visible{outline:2px solid var(--mt-acc);outline-offset:1px}
    #mt-panel button.on{background:#fff4e5;border-color:#ef8a00;color:#8a4b00}
    #mt-panel button.sm{width:auto;min-width:64px;margin:0;flex:none}
    #mt-panel a.mt-link{all:unset;box-sizing:border-box;display:flex!important;align-items:center;justify-content:center;width:100%;min-height:var(--mt-h);margin:8px 0 0;padding:4px 12px;border:1px solid var(--mt-bd);border-radius:8px;background:#fff;color:var(--mt-acc2);font-size:14px;cursor:pointer;text-decoration:none}
    #mt-panel a.mt-link:hover{background:var(--mt-bg2)} #mt-panel a.mt-link:focus-visible{outline:2px solid var(--mt-acc);outline-offset:1px}
    #mt-panel .btns{display:flex;gap:8px} #mt-panel .btns button{flex:1}
    #mt-panel button.mt-ib{all:unset;box-sizing:border-box;display:inline-flex!important;align-items:center;justify-content:center;width:18px;height:18px;min-height:0;margin:0 0 0 6px!important;padding:0;
      border:1.5px solid #8a96a3;border-radius:50%;background:#fff;color:#4b5563;font:italic 700 11px/1 Georgia,serif;cursor:pointer;vertical-align:-3px;position:relative;flex:none;touch-action:manipulation}
    #mt-panel button.mt-ib:hover,#mt-panel button.mt-ib[aria-expanded="true"]{background:var(--mt-acc);border-color:var(--mt-acc);color:#fff}
    #mt-panel button.mt-ib:focus-visible{outline:2px solid var(--mt-acc);outline-offset:2px}
    @media (pointer:coarse){#mt-panel button.mt-ib::after{content:"";position:absolute;left:-11px;top:-11px;width:40px;height:40px}}
    #mt-panel .mt-ix{margin:2px 0 8px;padding:8px 10px;border-radius:8px;background:#eef5ff;border:1px solid #cfe0f7;color:#1f2933;font-size:13px;line-height:1.4}
    #mt-panel .mt-ix[hidden]{display:none!important}
    #mt-panel .mt-ibw{display:flex;align-items:center;gap:4px} #mt-panel .mt-ibw>button:first-child{flex:1;min-width:0}
    #mt-panel .mt-ibw>button.mt-ib{margin:8px 2px 0 6px!important}
    #mt-panel label{display:flex;align-items:flex-start;gap:10px;min-height:var(--mt-h);margin:0;padding:6px 0;cursor:pointer;font-size:14px;font-weight:400;color:inherit}
    #mt-panel label>span{flex:1;min-width:0;padding-top:1px}
    #mt-panel label small,#mt-panel .mt-row small{display:block;color:var(--mt-mut);font-size:12px;line-height:1.35;margin-top:2px}
    #mt-panel input[type=checkbox]{-webkit-appearance:none;appearance:none;position:relative;flex:none;width:36px;height:20px;margin:1px 0 0;padding:0;
      border:0;border-radius:10px;background:#c5ccd5;cursor:pointer;transition:background .15s;vertical-align:middle}
    #mt-panel input[type=checkbox]::before{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;
      box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s}
    #mt-panel input[type=checkbox]:checked{background:var(--mt-acc)}
    #mt-panel input[type=checkbox]:checked::before{transform:translateX(16px)}
    #mt-panel input[type=checkbox]:disabled{opacity:.5}
    #mt-panel .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin:0 6px 0 0;vertical-align:0;flex:none}
    #mt-panel .sym{display:inline-block;width:18px;height:18px;margin:0 6px 0 0;vertical-align:-4px;background-repeat:no-repeat;background-size:288px 108px}
    #mt-panel .obj-groups{margin:0 0 4px 22px;padding:0 0 2px 8px;border-left:2px solid #e6e9ee}
    #mt-panel .obj-groups.dim{opacity:.45}
    #mt-panel .obj-groups .hint{margin:2px 0 6px;font-size:12px}
    #mt-panel .mcico{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;margin:0 6px 0 0;vertical-align:-3px;border:2px solid #fff;box-shadow:0 0 2px #000;transform:rotate(45deg);flex:none}
    #mt-panel .mcico span{transform:rotate(-45deg);color:#fff;font:bold 9px/1 sans-serif}
    #mt-panel #mo-quiet-list summary{cursor:pointer;color:var(--mt-acc2);font-size:13px;font-weight:600;padding:4px 0}
    #mt-panel #mo-quiet-ul{max-height:140px;overflow:auto;margin:4px 0 8px;padding-left:18px;font-size:12px;line-height:1.35}
    #mt-panel .mt-row{all:unset;display:grid!important;grid-template-columns:minmax(0,1fr) var(--mt-cw);align-items:center;column-gap:10px;
      box-sizing:border-box;width:100%;min-width:0;max-width:100%;min-height:var(--mt-h);margin:0!important;padding:4px 0!important;
      float:none;position:static;text-indent:0;font-size:14px;line-height:1.35;color:inherit;text-align:left}
    #mt-panel .mt-row>*{box-sizing:border-box;min-width:0;max-width:100%;margin:0!important;float:none!important;text-indent:0;position:static}
    #mt-panel .mt-row>.lb,#mt-panel .mt-row>span:first-child{padding:0;overflow-wrap:anywhere;white-space:normal}
    #mt-panel .mt-row>select,#mt-panel .mt-row>.ig,#mt-panel .mt-row>button{width:100%!important;justify-self:stretch}
    #mt-panel .mt-row>button.sm{width:auto!important;justify-self:end}
    #mt-panel select,#mt-panel input[type=number]{height:var(--mt-h);min-height:0;margin:0;padding:0 8px;border:1px solid var(--mt-bd);border-radius:8px;
      background:#fff;color:#1f2933;font:inherit;font-size:14px;max-width:100%}
    #mt-panel select{width:var(--mt-cw);float:none;text-indent:0;box-sizing:border-box;padding-right:4px;cursor:pointer}
    #mt-panel .ig{display:flex!important;align-items:stretch;width:100%;padding:0}
    #mt-panel .ig input[type=number]{flex:1 1 auto;min-width:0!important;width:auto!important;margin:0!important;border-radius:8px 0 0 8px;text-align:right}
    #mt-panel .ig select.dv{flex:1 1 auto;width:auto!important;min-width:0;margin:0!important;border-radius:8px 0 0 8px}
    #mt-panel .ig select.hu{flex:0 0 52px;width:52px!important;min-width:0;margin:0!important;border-left:0;border-radius:0 8px 8px 0;background:var(--mt-bg2)}
    #mt-panel .hint{background:#eef5ff;border:1px solid #d5e5fb;border-radius:8px;padding:8px 10px;font-size:13px;margin:0 0 10px;color:#1f3b5c}
    #mt-panel .cvleg{display:inline-flex;align-items:center;margin:2px 8px 2px 0;white-space:nowrap}
    #mt-panel .cvleg i,#mt-cv-leg i{display:inline-block;width:14px;height:14px;margin-right:4px;border-radius:3px;border:1px solid rgba(0,0,0,.28);flex:none}
    #mt-cv-leg{position:fixed;left:8px;bottom:28px;z-index:99990;display:flex;gap:8px;align-items:center;padding:5px 8px;background:rgba(255,255,255,.92);border:1px solid rgba(0,0,0,.12);border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.15);font:12px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1f2933;pointer-events:none}
    #mt-cv-leg[hidden]{display:none}
    #mt-cv-leg .cvleg{margin:0}
    #mt-panel .info{color:var(--mt-mut);font-size:12px;margin:8px 0 0}
    #mt-panel .info:empty{display:none}
    #mt-panel .sec{font-size:11px;font-weight:600;letter-spacing:.06em;color:var(--mt-mut);text-transform:uppercase;margin:12px 0 2px}
    #mt-panel .card{border-radius:8px;padding:10px 12px;margin:0 0 10px;font-size:13px}
    #mt-panel .card.tip{background:#fffbea;border:1px solid #f3d36b} #mt-panel .card ul{margin:6px 0;padding-left:18px} #mt-panel .card li{margin:3px 0}
    #mt-panel .card.warn{background:#fff4e5;border:1px solid #f0a54a}
    #mt-panel .card.err{background:#fdecec;border:1px solid #f0a3a3;color:#9b1c1c}
    #mt-panel details.adv{margin-top:12px;border-top:1px solid #e6e9ee;padding-top:2px}
    #mt-panel details.adv summary{display:list-item;min-height:var(--mt-h);padding:8px 0 4px;cursor:pointer;color:var(--mt-acc2);font-weight:600;font-size:13px;line-height:1.4}
    #mt-panel details.adv[open] summary{margin-bottom:2px}
    #mt-panel .offpane{background:var(--mt-bg2);border-radius:8px;padding:10px 12px;font-size:13px}
`;
  const TIP_HTML = `<div id="mt-tip" class="card tip"><b>👋 Welcome to Mesh Tools!</b><ul>
      <li><b>Zoom in</b> on the map to see mesh radios (◆ diamonds and ● dots).</li>
      <li><b>Tap any node</b> to see its details.</li>
      <li>Tap a red <b>◆R repeater</b>, then <b>Show coverage</b> to see where it can reach.</li>
      <li>Use the <b>tabs</b> above to switch tools. Drag the top bar to move this box.</li></ul>
      <button type="button" id="mt-tip-ok">Got it</button></div>`;
  const conflictSig = keys => keys.slice().sort().join(',');
  function conflictHtml(keys) {
    return `<div id="mt-conflict" class="card warn"><b>⚠ Old scripts are still on</b><br>
      Mesh Tools now does everything these did. Please turn them off in Tampermonkey (click the Tampermonkey icon, then flip their switch off) and reload the page:
      <ul>${keys.map(k => `<li>${esc(OLD[k].name)}</li>`).join('')}</ul>
      Until then, those parts of Mesh Tools stay off so nothing shows twice.
      <button type="button" id="mt-conf-ok">OK</button></div>`;
  }
  const offPane = k => `<div class="offpane">This part is turned off because the old <b>${esc(OLD[k].name)}</b> script is running. Turn the old script off in Tampermonkey and reload the page to use it here.</div>`;

  function showConflict(keys) {
    const sig = conflictSig(keys);
    if (!keys.length || GM_getValue('mt_conflict_seen', '') === sig) return;
    const old = $id('mt-conflict'); if (old) old.remove();
    $id('mt-cards').insertAdjacentHTML('afterbegin', conflictHtml(keys));
    $id('mt-conf-ok').addEventListener('click', () => { GM_setValue('mt_conflict_seen', sig); const c = $id('mt-conflict'); if (c) c.remove(); });
  }
  function showTip() {
    if ($id('mt-tip')) return;
    $id('mt-cards').insertAdjacentHTML('beforeend', TIP_HTML);
    $id('mt-tip-ok').addEventListener('click', () => { GM_setValue('mt_tip_seen', true); const t = $id('mt-tip'); if (t) t.remove(); });
  }
  function selectTab(k) {
    for (const [t] of TABS) {
      const b = document.querySelector(`#mt-panel [data-tab="${t}"]`), pane = $id('mt-pane-' + t);
      if (b) { b.classList.toggle('on', t === k); b.setAttribute('aria-selected', t === k ? 'true' : 'false'); }
      if (pane) pane.style.display = t === k ? '' : 'none';
    }
    GM_setValue('mt_tab', k);
  }
  function markOff(k) {
    if (off[k]) return; off[k] = true;
    try { MODS[k].disable(); } catch (e) { console.warn(TAG, 'disable', k, e); }
    const pane = $id('mt-pane-' + k); if (pane) { pane.innerHTML = offPane(k); addInfo(pane); }
  }

  // --- movable panel: drag via grip bar (pointer events), clamp, persist, reset (dbl-click/⟲) ---
  function makeMovable(p, key) {
    const bar = document.createElement('div'); bar.className = 'mv-bar';
    bar.innerHTML = '<span class="mv-grip">⠿ drag to move</span><button type="button" class="mv-rst" title="Reset position">⟲</button>';
    const rst = bar.querySelector('.mv-rst');
    p.insertBefore(bar, p.querySelector('.hd'));
    const clamp = () => {
      if (!p.style.left) return;
      const r = p.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
      const x = Math.max(0, Math.min(parseFloat(p.style.left) || 0, W - r.width));
      const y = Math.max(0, Math.min(parseFloat(p.style.top) || 0, H - Math.min(r.height, 40)));
      p.style.left = x + 'px'; p.style.top = y + 'px'; return { x, y };
    };
    const place = (x, y) => { p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.right = 'auto'; p.style.bottom = 'auto'; return clamp(); };
    const reset = () => { p.style.left = p.style.top = p.style.right = p.style.bottom = ''; GM_setValue(key, null); };
    const sv = GM_getValue(key, null);
    if (sv && isFinite(sv.x) && isFinite(sv.y)) place(sv.x, sv.y);
    let drag = null, moved = false;
    bar.addEventListener('pointerdown', e => {
      if (e.target.closest('button,input,select,textarea,a')) return;
      if (e.button !== undefined && e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      const r = p.getBoundingClientRect(); drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY }; moved = false;
      try { bar.setPointerCapture(e.pointerId); } catch (_) { /* */ }
    });
    bar.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 6) moved = true; e.preventDefault(); e.stopPropagation(); place(e.clientX - drag.dx, e.clientY - drag.dy); });
    const end = e => { if (!drag || e.pointerId !== drag.id) return; e.stopPropagation(); drag = null; const c = clamp(); if (c) GM_setValue(key, c); };
    bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
    let lastTap = 0;
    bar.addEventListener('dblclick', e => { e.stopPropagation(); if (!e.target.closest('button')) reset(); });
    bar.addEventListener('pointerup', e => { if (e.pointerType !== 'touch' || e.target.closest('button')) return; if (moved) { lastTap = 0; return; } const t = Date.now(); if (t - lastTap < 350) reset(); lastTap = t; });
    rst.addEventListener('click', e => { e.stopPropagation(); reset(); });
    ['mousedown', 'touchstart', 'wheel', 'dblclick', 'click'].forEach(ev => bar.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
    const reclamp = () => { const c = clamp(); if (c) GM_setValue(key, c); };
    window.addEventListener('resize', reclamp); window.addEventListener('orientationchange', () => setTimeout(reclamp, 300));
    return { clamp, reset, place };
  }


  // --- ⓘ info buttons: plain-English help under each setting (tap to open, tap again/elsewhere to close) ---
  const INFO = {
    'mo-cb-meshcore': 'Shows or hides every MeshCore radio from map.meshcore.io. Off hides the diamonds and the plain repeater and chat-room dots, at every zoom. The rows under it hide one kind at a time.',
    'mo-type-2': 'Repeaters pass messages along and extend the mesh. They are the red ◆R diamonds. Hiding them also hides the plain red repeater dots.',
    'mo-type-1': 'Companions are someone\'s own radio, usually paired with a phone. They are the blue ◆C diamonds. These are the chat nodes.',
    'mo-type-3': 'Room servers are chat rooms that store messages. They are the purple ◆S diamonds. Hiding them also hides the plain purple room dots.',
    'mo-type-4': 'Sensors report a reading, such as temperature. They are the teal ◆s diamonds.',
    'mo-type-0': 'Any MeshCore radio whose type is not a repeater, companion, room server, or sensor. Shown as a grey ◆?.',
    'mo-quiet': 'Draws a gold ring around MeshCore repeaters and room servers that have not advertised for longer than Quiet after. The popup says Silent for, with days and hours. No extra download: it uses the last-heard time already saved.',
    'mo-quiet-row': 'How long a repeater or room server can go without an advert before it is marked gone quiet. Choices are 12 hours, 24 hours, 3 days, and 7 days.',
    'mo-cb-meshtastic': 'Shows Meshtastic radios from meshmap.net. Only radios connected to the internet appear.',
    'mo-age': 'Hides nodes that have not been heard from in this many days, so old or switched-off radios disappear.',
    'mo-max': 'The most nodes drawn at once. Lower this if the map feels slow on your phone.',
    'mo-reload': 'Throws away the saved node lists and downloads fresh copies. Use it if new nodes are missing.',
    'cv-en': 'Turns the coverage tools on or off. When off, nothing is shaded and repeater popups have no coverage button.',
    'cv-pin': 'Tap this, then tap anywhere on the map to see what a radio at that spot could reach.',
    'cv-clrpin': 'Removes every test pin you dropped and its shaded area.',
    'cv-all': 'Draws coverage for every repeater in view automatically. Handy for an overview, but slow on phones.',
    'cv-rep': 'Count repeaters when drawing coverage for all nearby nodes.',
    'cv-room': 'Also count chat rooms (room servers), which can relay messages too.',
    'cv-age': 'Only use repeaters heard from in this many days, so dead ones are skipped.',
    'cv-txrow': 'How high the repeater antenna is above the ground. Higher = farther coverage.',
    'cv-rxrow': 'How high your radio is held. About 6 ft for a handheld, higher for a car or house antenna.',
    'cv-range': 'How far out from the repeater to check. Bigger takes longer to work out.',
    'cv-detail': 'How fine the hill map is. Sharp catches small ridges but downloads more and is slower.',
    'cv-rays': 'How many directions are checked around the repeater. More = smoother shading, but slower.',
    'cv-mode': 'Signal strength (recommended) estimates how strong the repeater would be, including signal bending over hills. Green is strong, yellow is fair, and orange is weak. Clear view only shades places with a straight, unblocked line to the repeater (the older, stricter method).',
    'cv-txp': 'How much power the repeater transmits. Most MeshCore repeaters use 22 dBm. Only used for Signal strength.',
    'cv-gain': 'Antenna gain, used for both the repeater and your radio. A typical small antenna is about 3 dBi. Only used for Signal strength.',
    'cv-fade': 'A safety cushion. Real signals come and go (people, trucks, weather, a hand on the radio), so the map only counts a spot as covered if the signal is this much stronger than the bare minimum. 10 is a good everyday choice. Lower shows more area but expect dropouts; higher shows only very dependable spots. Only used for Signal strength.',
    'cv-fr': 'Requires extra clearance above hills (Fresnel zone). More realistic, shows less coverage.',
    'cv-clr': 'Deletes saved coverage results so they are worked out again from scratch.',
    'mt-wiki': 'Opens the full Mesh Tools help pages in a new tab: install steps, every setting explained, and fixes for common problems.',
    'mt-tips-again': 'Shows the welcome tip again at the top of this panel.',
    'mt-reset-pos': 'Moves this panel back to its normal corner if you dragged it somewhere awkward.',
    'lt:moving': 'Cars, hikers and anything else that moves and reports its position.',
    'lt:fixed': 'Stations that stay put: home stations, digipeaters and internet gateways.',
    'lt:weather': 'Weather stations that report temperature, wind and rain.',
    'lt:object': 'Things someone placed on the map, such as a net or a repeater object. They are not moving radios. Turn this off to hide every object. The rows under it hide one kind at a time.',
    'lt:winlink': 'GPS position reports that Winlink copies onto APRS. aprs.fi shows them as P in a red diamond, from the station WINLINK to APWL2K. On adds a blue ring and keeps aprs.fi\'s own info box. Off hides those reports. Winlink gateways are not changed.',
    'lt-ft8': 'Shows FT8 stations reported to PSKReporter, drawn at the middle of their grid square. Off by default. While on, Mesh Tools asks PSKReporter at most once every 5 minutes, for the grid at the middle of the map.',
    'lt:obj-radio': 'Repeater towers, digipeaters, internet gateways and antenna sites that were placed on the map as objects.',
    'lt:obj-wx': 'Weather stations, plus storm, tornado, flood and other weather warnings placed as objects.',
    'lt:obj-event': 'Camps, picnics, parks and other gatherings someone put on the map.',
    'lt:obj-emerg': 'Police, fire, ambulance, hospital, shelter and other emergency markers.',
    'lt:obj-generic': 'Plain dots, numbered circles, crosses and other simple markers with no special picture.',
    'lt:obj-other': 'Objects whose symbol does not fit the groups above, such as shops, ships or restrooms.',
    'lt:item': 'Like objects: markers placed on the map by someone, not radios.',
    'lt:ais': 'Boats and ships reporting their position over AIS.',
    'lt:aircraft': 'Planes reporting their position over ADS-B.',
    'lt:labels': 'The callsign text next to each icon. Hide it to unclutter a busy map.',
    'lt:tracks': 'Lines showing where a moving station has travelled.',
    'lt:dots': 'Small dots marking older positions along a track.',
    'lt:heading': 'Short lines showing which way a station is heading.',
    'lt:paths': 'Lines that appear when you hover over a station, showing which stations relayed its signal.',
    'lt:phg': 'Circles estimating a station\'s range from its power and antenna. Rough guesses only.'
  };
  let infoSeq = 0;
  function infoKey(ctl) { return ctl.dataset && ctl.dataset.k ? 'lt:' + ctl.dataset.k : ctl.id; }
  function closeInfo(except) {
    document.querySelectorAll('#mt-panel .mt-ib[aria-expanded="true"]').forEach(b => {
      if (b === except) return; b.setAttribute('aria-expanded', 'false'); const box = $id(b.getAttribute('aria-controls')); if (box) box.hidden = true;
    });
  }
  function addInfo(root) {
    if (!root) return;
    root.querySelectorAll('input[type=checkbox],.mt-row[id],select,button,a.mt-link').forEach(ctl => {
      const txt = INFO[infoKey(ctl)]; if (!txt) return;
      const row = ctl.classList.contains('mt-row') ? ctl : (ctl.closest('.mt-row') || ctl.closest('label') || ctl);
      if (row.dataset.mtInfo) return; row.dataset.mtInfo = '1';
      let host, name;
      if (row.tagName === 'LABEL') { host = row.querySelector('span'); name = (host.querySelector('b') || host).firstChild.textContent || host.textContent; }
      else if (row.classList.contains('mt-row')) { host = row.querySelector('.lb'); name = host.firstChild.textContent; }
      else { const w = document.createElement('div'); w.className = 'mt-ibw'; row.replaceWith(w); w.appendChild(row); host = w; name = row.textContent; }
      name = name.replace(/[^\w ()%-]/g, '').trim();
      const id = 'mt-ix-' + (++infoSeq);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mt-ib'; b.textContent = 'i';
      b.setAttribute('aria-label', 'What is ' + name + '?'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', id);
      if (row.tagName === 'LABEL' || row.classList.contains('mt-row')) {
        const after = row.tagName === 'LABEL' ? (host.querySelector('b') || host.firstChild) : host.firstChild;
        if (row.tagName === 'LABEL' && !host.querySelector('b')) { // after the label text, before <small>
          let n = host.firstChild; while (n && !(n.nodeType === 3 && n.textContent.trim())) n = n.nextSibling; (n || host.lastChild).after(b);
        } else after.after(b);
      } else host.appendChild(b);
      const box = document.createElement('div'); box.className = 'mt-ix'; box.id = id; box.hidden = true; box.setAttribute('role', 'note'); box.textContent = txt;
      (row.parentNode.classList && row.parentNode.classList.contains('mt-ibw') ? row.parentNode : row).after(box);
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const open = b.getAttribute('aria-expanded') !== 'true'; closeInfo(b); b.setAttribute('aria-expanded', String(open)); box.hidden = !open; });
    });
  }
  document.addEventListener('click', e => { if (!e.target.closest || !e.target.closest('.mt-ib')) closeInfo(); }, true);
  function buildPanel() {
    const p = document.createElement('div'); p.id = 'mt-panel';
    const sel = TABS.some(t => t[0] === GM_getValue('mt_tab', 'nodes')) ? GM_getValue('mt_tab', 'nodes') : 'nodes';
    p.innerHTML = `<style>${CSS}</style>
      <div class="hd" title="Tap to open or close"><span class="tt">🛰️ Mesh Tools</span><span id="mt-busy" title="Loading…"></span><span class="car"></span></div>
      <div class="bd">
        <div id="mt-cards"></div>
        <div class="tabs" role="tablist">${TABS.map(([k, l, tip]) => `<button type="button" role="tab" data-tab="${k}" title="${esc(tip)}">${l}</button>`).join('')}</div>
        ${TABS.map(([k]) => `<div id="mt-pane-${k}" role="tabpanel">${off[k] ? offPane(k) : MODS[k].sectionHtml()}</div>`).join('')}
        <details class="adv" id="mt-adv"><summary>⚙ Panel settings</summary>
          <a id="mt-wiki" class="mt-link" href="${esc(WIKI_URL)}" target="_blank" rel="noopener noreferrer">📖 Help / Wiki</a>
          <button type="button" id="mt-tips-again">Show tips again</button>
          <button type="button" id="mt-reset-pos">Put this box back in the corner</button>
          <div class="info">Mesh Tools ${VERSION}. Coverage is only an estimate.</div>
        </details>
      </div>`;
    document.body.appendChild(p);
    const mv = makeMovable(p, 'mt_pos');
    const bd = p.querySelector('.bd'), hd = p.querySelector('.hd'), car = p.querySelector('.car');
    let collapsed = GM_getValue('mt_collapsed', false);
    const ap = () => { bd.style.display = collapsed ? 'none' : ''; car.textContent = collapsed ? '▸ open' : '▾'; };
    ap(); hd.addEventListener('click', () => { collapsed = !collapsed; GM_setValue('mt_collapsed', collapsed); ap(); if (mv) mv.clamp(); });
    p.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.tab)));
    selectTab(sel);
    for (const k of Object.keys(MODS)) if (!off[k]) { try { MODS[k].wire(); } catch (e) { console.warn(TAG, 'wire', k, e); } }
    $id('mt-tips-again').addEventListener('click', () => { GM_deleteValue('mt_tip_seen'); GM_deleteValue('mt_conflict_seen'); showTip(); const ks = Object.keys(off); if (ks.length) showConflict(ks); });
    $id('mt-reset-pos').addEventListener('click', () => { if (mv) mv.reset(); });
    if (W.L && W.L.DomEvent) { W.L.DomEvent.disableClickPropagation(p); W.L.DomEvent.disableScrollPropagation(p); }
    else ['mousedown', 'touchstart', 'wheel', 'dblclick'].forEach(ev => p.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
    addInfo(p);
    if (!GM_getValue('mt_tip_seen', false)) showTip();
    setInterval(() => { const b = $id('mt-busy'); if (b) b.style.display = Object.values(MODS).some(m => { try { return m.isActive() && m.isBusy(); } catch (e) { return false; } }) ? 'inline-block' : 'none'; }, 400);
  }

  function findMap() {
    const L = W.L; if (!L || !L.Map) return null;
    if (W.LM instanceof L.Map) return W.LM;
    for (const k of Object.keys(W)) { try { if (W[k] instanceof L.Map) return W[k]; } catch (e) { /* */ } }
    return null;
  }
  function start(map) {
    MAP = map;
    detectOld().forEach(k => { off[k] = true; if (k === 'nodes' && NODES.isActive()) NODES.disable(); });
    buildPanel();
    showConflict(Object.keys(off));
    for (const k of Object.keys(MODS)) if (!off[k]) {
      if (k === 'nodes' && NODES.isActive()) continue; // already started as soon as the map existed
      try { MODS[k].init(map); } catch (e) { console.warn(TAG, 'init', k, e); }
    }
    // an old script might start a little later than us: keep watching for 30 s
    let n = 0;
    const iv = setInterval(() => {
      const found = detectOld().filter(k => !off[k]);
      if (found.length) { found.forEach(markOff); showConflict(Object.keys(off)); }
      if (++n >= 30) clearInterval(iv);
    }, 1000);
    W.__meshTools = { version: VERSION, off, mods: MODS };
    console.log(TAG, VERSION, 'ready', Object.keys(off).length ? '(old scripts detected: ' + Object.keys(off).join(', ') + ')' : '');
  }
  function waitForMap(t) {
    const m = findMap();
    if (m) {
      // Don't wait out the grace period before drawing nodes. The grace is for the rest of the panel.
      try { if (!detectOld().includes('nodes') && !NODES.isActive()) NODES.init(m); } catch (e) { console.warn(TAG, 'early nodes', e); }
      const g = +W.__meshToolsGraceMs; return setTimeout(() => start(m), isFinite(g) && g >= 0 ? g : 1500);
    }
    if (t > 120) return console.warn(TAG, 'map not found');
    setTimeout(() => waitForMap(t + 1), 500);
  }
  waitForMap(0);
})();
