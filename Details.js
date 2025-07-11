// ==UserScript==
// @name         Details
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Renames cell labels on Madame Worklist depending on brand (NAP vs MRP), changes comment box color, and live‐updates without spammy logs
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';
  // 1) Style the comment icon
  const style = document.createElement('style');
  style.textContent = `
    button[title="Comments"] svg path[d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2"] {
      fill: #D500D5 !important;
    }
  `;
  document.head.appendChild(style);
  // 2) Label maps
  const napMap = {
    'Front Still Life': 'Index',
    'Outfit 1': 'OU',
    'Outfit 2': 'OU 2',
    'Front Model': 'FR',
    'Back Still Life': 'BK',
    'Detail 1': 'CU',
    'Detail 2': 'E1',
    'Detail 3': 'E2',
    'Detail 4': 'E3',
    'Extra 1': 'E4',
    'Extra 2': 'E5',
    'Runway': 'Runway',
    'Swatch': 'Swatch',
    'Press': 'PR'
  };
  const mrpMap = {
    'Front Still Life': 'Index',
    'Outfit 1': 'OU',
    'Outfit 2': 'OU 2',
    'Front Model': 'FR',
    'Back Model': 'BK',
    'Detail 1': 'CU',
    'Side Still Life': 'E1',
    'Detail 2': 'E2',
    'Detail 3': 'E3',
    'Extra 1': 'E4',
    'Extra 2': 'E5',
    'Runway': 'Runway',
    'Swatch': 'Swatch',
    'Press': 'PR'
  };
  // 3) Helpers
  function getBrand() {
    return document.querySelector('#tool-channel')?.textContent.trim() || null;
  }
  // Rename but return how many you actually changed
  function renameCellsAndCount(map) {
    let changed = 0;
    document
      .querySelectorAll('div[class*="css-b6m7zh"] span[title]')
      .forEach(span => {
        const txt = span.textContent.trim();
        const replacement = map[txt];
        if (replacement && span._renamed !== replacement) {
          span.textContent = replacement;
          span._renamed = replacement;    // mark so we don't rename again
          changed++;
        }
      });
    return changed;
  }
  function debounce(fn, delay = 100) {
    let t;
    return () => {
      clearTimeout(t);
      t = setTimeout(fn, delay);
    };
  }
  // 4) Live renamer — only logs when new renames happen
  function startLiveRenamer(map) {
    // track total renamed so far
    let total = 0;
    // initial pass
    total += renameCellsAndCount(map);
    if (total) console.log(`[Details] Renamed ${total} cells`);
    // watch for new spans
    const observer = new MutationObserver(debounce(() => {
      const newly = renameCellsAndCount(map);
      if (newly > 0) {
        total += newly;
        console.log(`[Details] Renamed ${newly} more cells (total ${total})`);
      }
    }));
    observer.observe(document.body, { childList: true, subtree: true });
  }
  // 5) Init: detect brand then kick off live renamer
  (function init(attempts = 0) {
    const brand = getBrand();
    if (brand) {
      const map = brand.includes('Mr Porter') ? mrpMap : napMap;
      console.log(`[Details] Detected brand: ${brand}`);
      startLiveRenamer(map);
    } else if (attempts < 20) {
      setTimeout(() => init(attempts + 1), 500);
    } else {
      console.error('[Details] Failed to detect brand');
    }
  })();
})();
