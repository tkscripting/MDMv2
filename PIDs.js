// ==UserScript==
// @name         PIDs
// @namespace    https://madame.ynap.biz/
// @version      1.13
// @description  - Append PIDs above VIDs on worklists
// @description  - Auto-convert pasted PIDs into VIDs in search inputs
// @description  - Scan barcodes to:
// @description     - On worklists: navigate to the item, open its retouching panel, and assign it to you
// @description     - On search: populate the field and convert the PID into a VID
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // =========================
    // PID → VID Conversion (Global Paste)
    // =========================

    function simulateReactInput(element, value) {
        if (!element) return;
        try {
            const prototype = element instanceof HTMLTextAreaElement
                ? HTMLTextAreaElement.prototype
                : HTMLInputElement.prototype;
            const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
            if (descriptor?.set) descriptor.set.call(element, value);
            else element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (error) {
            console.warn('[PIDS] Input simulation failed:', error);
        }
    }

    async function matchmakerTranslateBatch(pids, endpoint) {
        console.log('[PIDS] Batch translating PIDs:', pids);
        try {
            const body = '[' + pids.map(p => `"${p}"`).join(',') + ']';
            const response = await fetch(
                `https://matchmaker-api.product.ynapgroup.com/${endpoint}`,
                { credentials: 'omit', headers: { accept: 'application/json', clientid: 'pidConverter', 'content-type': 'application/json;charset=UTF-8' }, referrerPolicy: 'no-referrer', body, method: 'POST', mode: 'cors' }
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            const vids = (json.matches || []).map(m => m.translatedId);
            console.log(`[PIDS] Converted ${pids.length} PIDs to ${vids.length} VIDs`);
            console.log('[PIDS] PID→VID mappings:', pids.map((p, i) => `${p}→${vids[i] || 'none'}`).join(', '));
            return vids;
        } catch (err) {
            console.error('[PIDS] Batch translate error:', err);
            return [];
        }
    }

    document.addEventListener('paste', async e => {
        if (e.target?.id === 'search-by-id') return;
        const text = (e.clipboardData || window.clipboardData).getData('text').trim();
        if (text.match(/\b\d{10,}\b/)) return;
        const pids = text.match(/\b\d{6,7}\b/g);
        if (!pids) return;
        console.log(`[PIDS] Global paste detected ${pids.length} PIDs`);
        e.preventDefault();
        const vids = await matchmakerTranslateBatch(pids, 'pids');
        if (!vids.length) { alert('No VID matches found for pasted PIDs.'); return; }
        let target = e.target;
        if (!/INPUT|TEXTAREA/.test(target.tagName)) target = target.querySelector('input, textarea');
        if (!target) return;
        const curr = target.value.trim();
        const newVal = curr ? `${curr} ${vids.join(' ')}` : vids.join(' ');
        simulateReactInput(target, newVal);
        console.log(`[PIDS] Global paste: inserted ${vids.length} VIDs`);
    }, true);
})();

(function() {
    'use strict';

    // =========================
    // PID Adder – Prepend VIDs on Worklists
    // =========================

    function injectPIDStyles() {
        const style = document.createElement('style');
        style.textContent = `.PID { display: flex; align-items: center; font-size:14px; font-weight:bold; color: rgba(0,0,0,0.87); margin:0; }`;
        document.head.appendChild(style);
    }

    function matchmakerTranslate(ids, endpoint) {
        return fetch(`https://matchmaker-api.product.ynapgroup.com/${endpoint}`, { credentials: 'omit', headers: { accept: 'application/json', clientid: 'pidConverter', 'content-type': 'application/json;charset=UTF-8' }, referrerPolicy: 'no-referrer', body: JSON.stringify(ids), method: 'POST', mode: 'cors' })
            .then(r => r.json()).then(json => (json.matches?.[0]?.translatedId) || null)
            .catch(err => { console.error('[PIDS] translate error:', err); return null; });
    }

    function checkProduct(text) {
        const v = text.match(/\b\d{10,19}\b/g);
        if (v) return { ids: v, type: 'variants' };
        const p = text.match(/\b\d{6,7}\b/g);
        return p ? { ids: p, type: 'pids' } : null;
    }

    function prependTranslatedId(el, vid) {
        const c = el.closest('.MuiBox-root.css-1y7qnee');
        if (!c || c.querySelector('.PID')) return;
        const span = document.createElement('span'); span.className = 'PID'; span.textContent = vid + ' ';
        c.insertBefore(span, c.firstChild);
    }

    async function processElement(el) {
        if (el.dataset.pidAdded) return;
        const prod = checkProduct(el.textContent.trim());
        if (!prod) return;
        el.dataset.pidAdded = 'true';
        const vid = await matchmakerTranslate(prod.ids, prod.type);
        if (vid) prependTranslatedId(el, vid);
    }

    async function addPidToWorklist() {
        const els = [...document.querySelectorAll('.css-10pdxui')].filter(e => !e.dataset.pidAdded);
        if (!els.length) return;
        await Promise.all(els.map(processElement));
        console.log('[PIDS] Processed', els.length, 'items');
    }

    function observeMutations() {
        new MutationObserver(addPidToWorklist).observe(document.body, { childList:true, subtree:true });
    }

    // =========================
    // Barcode Scanning & Search Paste Handling
    // =========================

    let scanBuf = '', reading = false;
    function isValidPage() { return location.pathname.startsWith('/worklist/') || !!document.querySelector('#search-by-id'); }

    function handleKeyPress(e) {
        if (!isValidPage()) return;
        if (e.key === 'Enter') { if (scanBuf.length >= 5) processScan(scanBuf); scanBuf = ''; }
        else if (e.key.length === 1) { scanBuf += e.key; if (!reading) { reading=true; setTimeout(() => { scanBuf=''; reading=false; }, 250); } }
    }

    async function handlePaste(e) {
        if (!isValidPage()) return;
        const txt = (e.clipboardData||window.clipboardData).getData('text').trim();
        const searchInput = document.querySelector('#search-by-id');
        if (searchInput && e.target === searchInput) {
            if (txt.match(/\b\d{10,}\b/)) return;
            const pids = txt.match(/\b\d{6,7}\b/g);
            if (!pids) return;
            console.log(`[PIDS] Search paste detected ${pids.length} PIDs`);
            e.preventDefault();
            const vidsAll = await Promise.all(pids.map(pid => matchmakerTranslate([pid], 'pids')));
            console.log('[PIDS] PID→VID mappings in search:', pids.map((p,i) => `${p}→${vidsAll[i] || 'none'}`).join(', '));
            const vids = vidsAll.filter(v => v);
            console.log(`[PIDS] Converted ${pids.length} PIDs to ${vids.length} VIDs in search`);
            if (!vids.length) { alert('No VID matches found for pasted PIDs.'); return; }
            const str = vids.join(' ');
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(searchInput),'value')?.set;
            if (setter) setter.call(searchInput, str); else searchInput.value = str;
            searchInput.dispatchEvent(new Event('input',{bubbles:true}));
            searchInput.dispatchEvent(new Event('change',{bubbles:true}));
            return;
        }
        if (/^\d{6,7}$/.test(txt)) processScan(txt);
    }

    async function processScan(input) {
        if (input.match(/\b\d{10,}\b/)) {
            const inp = document.querySelector('#search-by-id');
            if (inp) { const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp),'value')?.set; if (s) s.call(inp, input); else inp.value = input; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); }
            return;
        }
        const pid = input.match(/\b\d{6,7}\b/)[0];
        if (location.pathname.startsWith('/worklist/')) { const vid = await matchmakerTranslate([pid],'pids'); if (vid) scrollToVid(vid); }
    }

    function scrollToVid(vid) {
        const re = new RegExp(vid,'gi');
        document.querySelectorAll('.tampermonkey-highlight').forEach(s=>s.replaceWith(document.createTextNode(s.textContent)));
        [...document.querySelectorAll('.css-10pdxui, [class*="MuiBox"], div, span, td, p')].some(el => {
            if (re.test(el.textContent)) {
                el.scrollIntoView({behavior:'smooth',block:'center'});
                const win = window.open(`https://madame.ynap.biz/retouching/${vid}`,'_blank');
                if (win) setTimeout(() => { try{ win.document.querySelector('[data-assign-button]')?.click(); }catch{} },2000);
                return true;
            }
        });
    }

    window.addEventListener('load', () => {
        injectPIDStyles(); addPidToWorklist(); observeMutations(); document.addEventListener('keypress', handleKeyPress); document.addEventListener('paste', handlePaste);
    });
})();
