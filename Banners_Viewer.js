// ==UserScript==
// @name         Banners_Viewer
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Allows user to view banners
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────────
  // 1)  Check if Firebase is already loaded by another script
  // ────────────────────────────────────────────────────────────────
  function loadFirebaseIfNeeded() {
    // Check if Firebase is already available
    if (window.firebase?.initializeApp && window.firebase?.firestore) {
      console.log('[Banners] ✅ Firebase already loaded by another script');
      initFirebase();
      return;
    }

    // Only load what we need for banners (no auth required)
    const LIBS = [
      'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
    ];

    let loadedCount = 0;
    const totalLibs = LIBS.length;

    for (const src of LIBS) {
      // Check if script is already loaded
      if ([...document.scripts].some((s) => s.src === src)) {
        loadedCount++;
        if (loadedCount === totalLibs) {
          setTimeout(initFirebase, 100);
        }
        continue;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loadedCount++;
        if (loadedCount === totalLibs) {
          setTimeout(initFirebase, 100);
        }
      };
      script.onerror = () => {
        console.error('[Banners] Failed to load Firebase script:', src);
        loadedCount++;
        if (loadedCount === totalLibs) {
          setTimeout(initFirebase, 100);
        }
      };
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
  // 3)  Initialize Firebase
  // ────────────────────────────────────────────────────────────────
  function initFirebase() {
    if (!window.firebase?.initializeApp) {
      console.error('[Banners] Firebase not available');
      return;
    }

    try {
      // Check if our app already exists
      let app;
      try {
        app = firebase.app(APP_NAME);
        console.log('[Banners] ✅ Using existing Firebase app');
      } catch (e) {
        // App doesn't exist, create it
        app = firebase.initializeApp(firebaseConfig, APP_NAME);
        console.log('[Banners] ✅ Created new Firebase app');
      }

      if (window.firebase.firestore) {
        db = app.firestore();
        console.log('[Banners] ✅ Firestore initialized');
        init();
      } else {
        console.error('[Banners] Firestore not available');
      }
    } catch (error) {
      console.error('[Banners] Firebase initialization error:', error);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 4)  Banner factory
  // ────────────────────────────────────────────────────────────────
  function makeBanner(id) {
    const wrap = document.createElement('div');
    wrap.id = 'bn-' + id;
    wrap.style.cssText = [
      'width:100%',
      'display:none',
      'box-sizing:border-box',
      'padding:8px 12px',
      'z-index:9999',
      'user-select:none',
      'justify-content:center',
      'align-items:center',
      'text-align:center'
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

        if (!wasVisible) console.log('[Banners] Added banner');
        wasVisible = true;
      } else {
        banner.wrap.style.display = 'none';
        if (wasVisible) {
          console.log('[Banners] Removed banner');
        } else {
          console.log('[Banners] No banner message to add');
        }
        wasVisible = false;
      }
    }, error => {
      console.error('[Banners] Firestore error:', error);
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 7)  Main init
  // ────────────────────────────────────────────────────────────────
  let globalB, pageB, unsubPage;

  function init() {
    if (!db) {
      console.error('[Banners] Database not initialized');
      return;
    }

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

  // ────────────────────────────────────────────────────────────────
  // 8)  Start the initialization process
  // ────────────────────────────────────────────────────────────────
  loadFirebaseIfNeeded();
})();
