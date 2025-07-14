// ==UserScript==
// @name         Banners_Viewer
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Allows user to view banners
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';
  console.log('[Banner]', 'init');

  // ────────────────────────────────────────────────────────────────
  // 1)  Load Firebase compat libs if missing
  // ────────────────────────────────────────────────────────────────
  const LIBS = [
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  ];
  for (const src of LIBS) {
    if (![...document.scripts].some((s) => s.src === src)) {
      const script = document.createElement('script');
      script.src = src;
      document.head.prepend(script);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 2)  Firebase config
  // ────────────────────────────────────────────────────────────────
  const firebaseConfig = {
    apiKey: 'AIzaSyCMOQbRMnv_P89_g8PiWqxQm7rlgsrZ7jw',
    authDomain: 'mdms-67bd4.firebaseapp.com',
    projectId: 'mdms-67bd4',
    storageBucket: 'mdms-67bd4.firebasestorage.app',
    messagingSenderId: '968504770003',
    appId: '1:968504770003:web:afa2c955c6658ff761c326',
  };
  const APP_NAME = 'bannerViewer';
  let db;

  // ────────────────────────────────────────────────────────────────
  // 3)  Wait for firebase to load then init
  // ────────────────────────────────────────────────────────────────
  (function waitForFirebase() {
    if (window.firebase?.initializeApp) {
      if (!firebase.apps.find((a) => a.name === APP_NAME)) {
        firebase.initializeApp(firebaseConfig, APP_NAME);
      }
      db = firebase.app(APP_NAME).firestore();
      init();
    } else {
      setTimeout(waitForFirebase, 100);
    }
  })();

  // ────────────────────────────────────────────────────────────────
  // 4)  Banner factory
  // ────────────────────────────────────────────────────────────────
function makeBanner(id) {
  const wrap = document.createElement('div');
  wrap.id = 'bn-' + id;
  wrap.style.cssText = [
    'width:100%',
    'display:none',            // shown later as "flex"
    'box-sizing:border-box',
    'padding:8px 12px',
    'z-index:9999',
    'user-select:none',
    'justify-content:center',  // ⟵ center horizontally
    'align-items:center',      // ⟵ center vertically
    'text-align:center'        // ⟵ span text centered
  ].join(';');
  const txt = document.createElement('span');
  wrap.appendChild(txt);
  return { wrap, txt };
}

  // ────────────────────────────────────────────────────────────────
  // 5)  Insertion helpers
  // ────────────────────────────────────────────────────────────────
  function insertGlobal() {
    if (!document.body) return setTimeout(insertGlobal, 50);
    if (!globalB.wrap.parentNode) {
      document.body.prepend(globalB.wrap);
    }
  }
  function insertPage() {
    if (!document.body) return setTimeout(insertPage, 50);
    if (!pageB.wrap.parentNode) {
      if (globalB.wrap.parentNode) {
        globalB.wrap.insertAdjacentElement('afterend', pageB.wrap);
      } else {
        document.body.prepend(pageB.wrap);
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 6)  Subscribe & render logic
  // ────────────────────────────────────────────────────────────────
  function watchDoc(ref, banner, inserter) {
    let wasVisible = false;
    return ref.onSnapshot((doc) => {
      const d = doc.exists ? doc.data() : {};
      const msg = (d.message || '').trim();

      inserter();

      if (msg) {
        // — banner *should* be visible —
        banner.txt.textContent = msg;
        banner.wrap.style.background = d.bgColor || 'transparent';
        banner.wrap.style.color = d.fgColor || '#000';
        banner.wrap.style.display = 'flex';
        banner.wrap.style.cursor = d.link ? 'pointer' : '';
        banner.wrap.onclick = d.link
          ? (e) => {
              if (e.target === banner.wrap) window.open(d.link, '_blank');
            }
          : null;

        if (!wasVisible) console.log('[Banner]', 'Added banner');
        wasVisible = true;
      } else {
        // — banner *should not* be visible —
        banner.wrap.style.display = 'none';

        if (wasVisible) {
          console.log('[Banner]', 'Removed banner');
        } else {
          console.log('[Banner]', 'No banner message to add');
        }
        wasVisible = false;
      }
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 7)  Main init
  // ────────────────────────────────────────────────────────────────
  let globalB, pageB, unsubPage;
  function init() {
    globalB = makeBanner('global');
    pageB = makeBanner('page');

    // global banner
    watchDoc(db.doc('banners/global'), globalB, insertGlobal);

    // page banner (SPA-aware)
    function subscribePage() {
      unsubPage?.();
      const key = 'page-' + encodeURIComponent(location.pathname + location.search);
      unsubPage = watchDoc(db.doc(`banners/${key}`), pageB, insertPage);
    }
    subscribePage();

    // SPA hooks
    ['pushState', 'replaceState'].forEach((fn) => {
      const orig = history[fn];
      history[fn] = function () {
        orig.apply(this, arguments);
        subscribePage();
      };
    });
    window.addEventListener('popstate', subscribePage);
  }
})();
