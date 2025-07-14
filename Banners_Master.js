// ==UserScript==
// @name         Banners_Master
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Allows user to edit and delete banners
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ──────────────────────────────────────────────────────────────────────────
    // 1) OPTIMIZED FIREBASE SETUP
    // ──────────────────────────────────────────────────────────────────────────
    function loadFirebaseIfNeeded() {
        // Check if Firebase is already available
        if (window.firebase?.initializeApp && window.firebase?.firestore) {
            console.log('[BannersMaster] ✅ Firebase already loaded by another script');
            initFirebase();
            return;
        }

        // Only load what we need (no auth required for banner management)
        const LIBS = [
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'
        ];

        let loadedCount = 0;
        const totalLibs = LIBS.length;

        for (const src of LIBS) {
            // Check if script is already loaded
            if ([...document.scripts].some(s => s.src === src)) {
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
                console.error('[BannersMaster] Failed to load Firebase script:', src);
                loadedCount++;
                if (loadedCount === totalLibs) {
                    setTimeout(initFirebase, 100);
                }
            };
            document.head.prepend(script);
        }
    }

    const firebaseConfig = {
        apiKey: 'AIzaSyCMOQbRMnv_P89_g8PiWqxQm7rlgsrZ7jw',
        authDomain: 'mdms-67bd4.firebaseapp.com',
        projectId: 'mdms-67bd4',
        storageBucket: 'mdms-67bd4.firebasestorage.app',
        messagingSenderId: '968504770003',
        appId: '1:968504770003:web:afa2c955c6658ff761c326'
    };
    const APP_NAME = 'bannerMasterApp';
    let db;

    function initFirebase() {
        if (!window.firebase?.initializeApp) {
            console.error('[BannersMaster] Firebase not available');
            return;
        }

        try {
            // Check if our app already exists
            let app;
            try {
                app = firebase.app(APP_NAME);
                console.log('[BannersMaster] ✅ Using existing Firebase app');
            } catch (e) {
                // App doesn't exist, create it
                app = firebase.initializeApp(firebaseConfig, APP_NAME);
                console.log('[BannersMaster] ✅ Created new Firebase app');
            }

            if (window.firebase.firestore) {
                db = app.firestore();
                console.log('[BannersMaster] ✅ Firestore initialized');
                init();
            } else {
                console.error('[BannersMaster] Firestore not available');
            }
        } catch (error) {
            console.error('[BannersMaster] Firebase initialization error:', error);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2) COMMON UTILITIES
    // ──────────────────────────────────────────────────────────────────────────
    function makeBanner(id) {
        const wrap = document.createElement('div');
        wrap.id = 'bn-' + id;
        wrap.style.cssText = [
            'width:100%', 'background:transparent', 'color:#000',
            'padding:8px 12px','box-sizing:border-box',
            'display:flex','justify-content:center','align-items:center','text-align:center',
            'z-index:9999','user-select:none'
        ].join(';');
        wrap.dataset.link = '';
        const txt = document.createElement('span');
        wrap.appendChild(txt);
        return { wrap, txt };
    }

    function updateClick(el) {
        const url = el.dataset.link || '';
        if (url) {
            el.style.cursor = 'pointer';
            el.onclick = e => { if (e.target.tagName !== 'BUTTON') window.open(url, '_blank'); };
        } else {
            el.style.cursor = '';
            el.onclick = null;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3) MODAL: buildModal, openModal, saveModal, loadPageList
    // ──────────────────────────────────────────────────────────────────────────
    let modalBg, modal, swWrap, selectedColor = '';
    function buildModal() {
        modalBg = document.createElement('div');
        modalBg.style.cssText = `
            position:fixed; inset:0; display:none;
            align-items:center; justify-content:center;
            z-index:2147483647;
        `;
        modal = document.createElement('div');
        modal.style.cssText = `
            background:rgba(255,255,255,0.25);
            backdrop-filter:blur(10px) saturate(150%);
            padding:20px; border-radius:12px;
            max-width:480px; width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.2);
            color:#000;
        `;
        modal.innerHTML = `
            <h3 style="margin:0 0 12px; font-size:1.2rem;">Edit Banner</h3>
            <label>Message:</label><br>
            <textarea id="bn-msg" style="width:100%;height:100px;margin:8px 0;padding:8px;
                resize:vertical;border:none;border-radius:6px;background:rgba(255,255,255,0.6);
                font-size:.95rem;"></textarea>
            <label>Background Color:</label>
            <div id="bn-swatches" style="display:flex;flex-wrap:wrap;margin:8px 0;"></div>
            <label>Link (URL):</label><br>
            <input id="bn-link" type="text" placeholder="https://example.com" style="
                width:100%;padding:8px;border:none;border-radius:6px;
                background:rgba(255,255,255,0.6);font-size:.95rem;margin-bottom:12px;
            "/>
            <div style="text-align:right;">
                <button id="bn-save" style="
                    padding:8px 14px;margin-right:8px;border:none;border-radius:6px;
                    background:rgba(25,118,210,0.8);color:#fff;font-size:.95rem;cursor:pointer;
                ">Save</button>
                <button id="bn-cancel" style="
                    padding:8px 14px;border:none;border-radius:6px;
                    background:rgba(200,200,200,0.6);color:#000;font-size:.95rem;cursor:pointer;
                ">Cancel</button>
            </div>
            <hr style="margin:16px 0;border:none;border-top:1px solid rgba(0,0,0,0.2);" />
            <h4 style="margin:0 0 8px;font-size:1rem;">All Page Banners</h4>
            <div id="bn-page-list" style="max-height:200px;overflow:auto;"></div>
        `;
        modalBg.appendChild(modal);

        const attach = () => {
            document.body.appendChild(modalBg);
            modalBg.addEventListener('click', e => { if (e.target===modalBg) modalBg.style.display='none'; });
            document.addEventListener('keydown', e => { if (e.key==='Escape'&&modalBg.style.display==='flex') modalBg.style.display='none'; });
            modal.querySelector('#bn-cancel').onclick = () => modalBg.style.display='none';
            modal.querySelector('#bn-save').onclick   = saveModal;
        };
        if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', attach);
        else attach();

        // swatches
        const colors = ['#ffffff','#e0f7fa','#ffeb3b','#f8bbd0','#c5e1a5','#ffe082','#b3e5fc','#ffcdd2','#d1c4e9'];
        swWrap = modal.querySelector('#bn-swatches');
        colors.forEach(col=>{
            const sw=document.createElement('div');
            sw.style.cssText=`width:24px;height:24px;margin:4px;border-radius:4px;
                background:${col};cursor:pointer;border:2px solid transparent;`;
            sw.addEventListener('click',()=>{
                swWrap.querySelectorAll('div').forEach(d=>d.style.border='2px solid transparent');
                sw.style.border='2px solid #000';
                selectedColor=col;
            });
            swWrap.appendChild(sw);
        });
    }

    function openModal(e) {
        const id = e.currentTarget.dataset.banner;
        const wrap = document.getElementById('bn-' + id);

        // populate fields
        modal.querySelector('#bn-msg').value  = wrap.querySelector('span').textContent;
        modal.querySelector('#bn-link').value = wrap.dataset.link || '';
        swWrap.querySelectorAll('div').forEach(d => d.style.border = '2px solid transparent');
        selectedColor = '';

        // remember which banner we're editing
        modalBg.dataset.current = id;

        // show modal
        modalBg.style.display = 'flex';

        // focus the message textarea
        const msgField = modal.querySelector('#bn-msg');
        msgField.focus();
        // optionally put cursor at end:
        msgField.setSelectionRange(msgField.value.length, msgField.value.length);

        // load page-list beneath
        loadPageList();
    }

    function saveModal() {
        if (!db) {
            console.error('[BannersMaster] Database not available');
            return;
        }

        const id = modalBg.dataset.current;
        const msg = modal.querySelector('#bn-msg').value;
        const raw = modal.querySelector('#bn-link').value.trim();
        const link = raw && !/^https?:\/\//i.test(raw) ? 'https://'+raw : raw;
        const key = id==='global' ? 'global' : 'page-'+encodeURIComponent(location.pathname+location.search);
        const data = {message:msg,link};
        if(selectedColor) data.bgColor=selectedColor;

        db.doc('banners/'+key).set(data,{merge:true})
            .then(()=>console.log('[BannersMaster] • saved',key))
            .catch(e=>console.error('[BannersMaster] Save error:',e));
        modalBg.style.display='none';
    }

    function loadPageList() {
        if (!db) {
            console.error('[BannersMaster] Database not available for loading page list');
            return;
        }

        const listEl = modal.querySelector('#bn-page-list');
        listEl.textContent='Loading…';
        db.collection('banners').get().then(snap=>{
            listEl.innerHTML='';
            snap.forEach(doc=>{
                const key=doc.id;
                if(!key.startsWith('page-')) return;
                const raw=decodeURIComponent(key.slice(5));
                const url=new URL(raw,window.location.origin);
                let display='Home';
                if(url.pathname!=='/'&&url.pathname) {
                    const parts=url.pathname.split('/').filter(Boolean);
                    display=parts.pop();
                }
                const row=document.createElement('div');
                row.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:4px 0;';
                const linkA=document.createElement('a');
                linkA.href='#'; linkA.textContent=display;
                linkA.style.cssText=`cursor:pointer;text-decoration:none;color:inherit;`;
                linkA.onclick=e=>{e.preventDefault();window.location=raw;};
                const del=document.createElement('button');
                del.textContent='Delete';
                del.style.cssText=`padding:6px 10px;border:none;border-radius:4px;
                    background:rgba(25,118,210,0.8);color:#fff;cursor:pointer;font-size:.9rem;`;
                del.onclick=e=>{
                    e.stopPropagation();
                    if(confirm(`Delete banner for ${display}?`)) {
                        db.doc(`banners/${key}`).delete()
                            .then(loadPageList)
                            .catch(err => console.error('[BannersMaster] Delete error:', err));
                    }
                };
                row.append(linkA,del);
                listEl.appendChild(row);
            });
        }).catch(err => {
            console.error('[BannersMaster] Error loading page list:', err);
            listEl.textContent = 'Error loading banners';
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4) DOCK STYLES & CREATION
    // ──────────────────────────────────────────────────────────────────────────
    function injectDockStyles() {
        const style=document.createElement('style');
        style.textContent=`
            #floating-glass-dock::before{content:'';position:absolute;inset:0;border-radius:inherit;
                background:linear-gradient(135deg,rgba(255,0,150,0.2),rgba(0,200,255,0.2));
                mix-blend-mode:screen;opacity:0.3;pointer-events:none;filter:blur(6px);}
            .dock-tooltip{position:fixed;background:rgba(0,0,0,0.85);color:#fff;padding:4px 8px;
                border-radius:6px;font-size:11px;pointer-events:none;opacity:0;transition:opacity .2s;
                z-index:10001;white-space:nowrap;}
            .dock-icon-wrapper:hover svg,.dock-icon-wrapper:hover .material-icons{transform:scale(1.25);}
        `;
        document.head.appendChild(style);
    }

    function createTooltip() {
        const t=document.createElement('div');t.className='dock-tooltip';document.body.append(t);return t;
    }

    function createDock() {
        const dock=document.createElement('div');
        dock.id='floating-glass-dock';
        Object.assign(dock.style,{
            position:'fixed',top:'-100px',left:'50%',transform:'translateX(-50%)',
            minWidth:'300px',maxWidth:'90%',height:'72px',padding:'12px 18px',
            display:'flex',gap:'16px',justifyContent:'center',alignItems:'center',
            background:'rgba(255,255,255,0.12)',backdropFilter:'blur(20px) saturate(180%)',
            borderRadius:'24px',border:'1px solid rgba(255,255,255,0.3)',
            boxShadow:'0 0 12px rgba(255,255,255,0.25),0 4px 20px rgba(0,0,0,0.3)',
            transition:'top 400ms cubic-bezier(0.4,0,0.2,1)',zIndex:'9999',pointerEvents:'auto',
        });
        document.body.append(dock);
        return dock;
    }

    function addDockButton(dock,tooltip,iconHTML,label,handler){
        const btn=document.createElement('button');
        btn.className='dock-icon-wrapper';btn.innerHTML=iconHTML;
        Object.assign(btn.style,{display:'flex',alignItems:'center',justifyContent:'center',
                                 width:'48px',height:'48px',border:'none',borderRadius:'50%',background:'transparent',
                                 cursor:'pointer',padding:'6px',transition:'transform .2s'});
        btn.onmouseenter=()=>{
            tooltip.textContent=label;tooltip.style.opacity='1';
            const r=btn.getBoundingClientRect();
            tooltip.style.top=`${r.bottom+6}px`;
            tooltip.style.left=`${r.left+r.width/2-tooltip.offsetWidth/2}px`;
        };
        btn.onmouseleave=()=>tooltip.style.opacity='0';
        btn.onclick=handler;
        dock.append(btn);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5) BUILD & REVEAL DOCK
    // ──────────────────────────────────────────────────────────────────────────
    function buildDockControls(dock, tooltip) {
        // Global Edit (globe)
        addDockButton(dock, tooltip,
                      `<span class="material-icons">public</span>`,
                      'Edit Global Banner',
                      () => openModal({ currentTarget: { dataset: { banner: 'global' } } })
                     );

        // Global Delete
        addDockButton(dock, tooltip,
                      `<span class="material-icons">delete</span>`,
                      'Delete Global Banner',
                      () => {
                          if (!db) {
                              console.error('[BannersMaster] Database not available');
                              return;
                          }
                          if (confirm('Delete Global Banner?')) {
                              const wrap = document.getElementById('bn-global');
                              db.doc('banners/global').delete().then(() => {
                                  // clear the DOM immediately
                                  wrap.querySelector('span').textContent = '';
                                  wrap.dataset.link = '';
                                  wrap.style.display = 'none';
                                  console.log('[BannersMaster] Global banner deleted');
                              }).catch(err => {
                                  console.error('[BannersMaster] Delete error:', err);
                              });
                          }
                      }
                     );

        // ---- DIVIDER ----
        const divider = document.createElement('div');
        Object.assign(divider.style, {
            width: '2px',
            height: '40px',
            margin: '0 6px',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(0,0,0,0.3))',
            borderRadius: '1px',
            opacity: 0.8,
            boxShadow: '0 0 2px rgba(255,255,255,0.2)',
            backdropFilter: 'blur(4px)',
            mixBlendMode: 'screen',
        });
        dock.appendChild(divider);

        // Page Edit (document)
        addDockButton(dock, tooltip,
                      `<span class="material-icons">description</span>`,
                      'Edit Page Banner',
                      () => openModal({ currentTarget: { dataset: { banner: 'page' } } })
                     );

        // Page Delete
        addDockButton(dock, tooltip,
                      `<span class="material-icons">delete</span>`,
                      'Delete Page Banner',
                      () => {
                          if (!db) {
                              console.error('[BannersMaster] Database not available');
                              return;
                          }
                          if (confirm('Delete Page Banner?')) {
                              const key = 'page-'+encodeURIComponent(location.pathname+location.search);
                              const wrap = document.getElementById('bn-page');
                              db.doc(`banners/${key}`).delete().then(() => {
                                  wrap.querySelector('span').textContent = '';
                                  wrap.dataset.link = '';
                                  wrap.style.display = 'none';
                                  console.log(`[BannersMaster] Page banner deleted (${key})`);
                              }).catch(err => {
                                  console.error('[BannersMaster] Delete error:', err);
                              });
                          }
                      }
                     );
    }

    function setupDockReveal(dock, tooltip) {
        // How tall from the very top?
        const revealHeight = 100;     // px down from top edge

        // How wide around center?
        const revealHalfWidth = 200;  // px left/right of exact center

        document.addEventListener('mousemove', e => {
            const fromTop    = e.clientY;
            const fromCenter = Math.abs(window.innerWidth/2 - e.clientX);

            if (fromTop < revealHeight && fromCenter < revealHalfWidth) {
                dock.style.top = '20px';
            } else {
                dock.style.top = '-100px';
                tooltip.style.opacity = '0';
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6) INIT
    // ──────────────────────────────────────────────────────────────────────────
    function init(){
        if (!db) {
            console.error('[BannersMaster] Database not initialized');
            return;
        }

        buildModal();

        const {wrap: globalBanner, txt: globalTxt} = makeBanner('global');
        const {wrap: pageBanner, txt: pageTxt}     = makeBanner('page');

        // Firestore subscriptions
        db.doc('banners/global').onSnapshot(doc=>{
            const d=doc.exists?doc.data():{};
            if(d.message||d.link){
                globalBanner.style.display='flex';
                globalTxt.textContent=d.message||'';
                globalBanner.style.background=d.bgColor||'transparent';
                globalBanner.dataset.link=d.link||'';
                updateClick(globalBanner);
            } else globalBanner.style.display='none';
        }, error => {
            console.error('[BannersMaster] Global banner subscription error:', error);
        });

        let unsubPage;
        function subscribePage(){
            const key='page-'+encodeURIComponent(location.pathname+location.search);
            unsubPage?.();
            unsubPage=db.doc(`banners/${key}`).onSnapshot(doc=>{
                const d=doc.exists?doc.data():{};
                if(d.message||d.link){
                    pageBanner.style.display='flex';
                    pageTxt.textContent=d.message||'';
                    pageBanner.style.background=d.bgColor||'transparent';
                    pageBanner.dataset.link=d.link||'';
                    updateClick(pageBanner);
                } else pageBanner.style.display='none';
            }, error => {
                console.error('[BannersMaster] Page banner subscription error:', error);
            });
        }
        subscribePage();
        ['pushState','replaceState'].forEach(fn=>{
            const o=history[fn];
            history[fn]=function(){o.apply(this,arguments);subscribePage();};
        });
        window.addEventListener('popstate',subscribePage);

        // insert banners at top
        const insert=()=>{
            if(!globalBanner.parentNode)document.body.prepend(globalBanner);
            if(!pageBanner.parentNode)document.body.insertBefore(pageBanner,globalBanner.nextSibling);
        };
        if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',insert);
        else insert();

        // dock
        injectDockStyles();
        const tooltip=createTooltip();
        const dock=createDock();
        buildDockControls(dock,tooltip);
        setupDockReveal(dock,tooltip);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7) START INITIALIZATION
    // ──────────────────────────────────────────────────────────────────────────
    loadFirebaseIfNeeded();
})();
