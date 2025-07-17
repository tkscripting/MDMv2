// ==UserScript==
// @name         PIDs
// @namespace    https://madame.ynap.biz/
// @version      1.9
// @description  - Append PIDs above VIDs on worklists
// @description  - Auto-convert pasted PIDs into VIDs in search inputs
// @description  - Scan barcodes to:
// @description     - On worklists: navigate to the item, open its retouching panel, and assign it to you
// @description     - On search: populate the field and convert the PID into a VID
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    /////////////////////
    // PID → VID
    /////////////////////

    function simulateReactInput(element, value) {
        if (!element) return;

        try {
            const prototype = element instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
            const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

            if (descriptor?.set) {
                descriptor.set.call(element, value);
            } else {
                element.value = value;
            }

            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (error) {
            console.warn('[PIDS] Input simulation failed:', error);
            try {
                element.value = value;
                element.focus();
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.blur();
            } catch (fallbackError) {
                console.error('[PIDS] All input methods failed:', fallbackError);
            }
        }
    }
    function extractPIDsOnly(text) {
        const pids = text.match(/\b\d{6,7}\b/g);
        return pids?.length ? pids : null;
    }

    function productStringConvert(pidArray) {
        return "[" + pidArray.map(p => `"${p}"`).join(",") + "]";
    }

    async function matchmakerTranslateBatch(pids, matchmakerSearch) {
        console.log(`[PIDS] Sending ${pids.length} PIDs to matchmaker:`, pids);
        try {
            const response = await fetch(
                `https://matchmaker-api.product.ynapgroup.com/${matchmakerSearch}`, {
                    credentials: "omit",
                    headers: {
                        accept: "application/json, text/plain, */*",
                        clientid: "pidConverter",
                        "content-type": "application/json;charset=UTF-8"
                    },
                    referrerPolicy: "no-referrer",
                    body: productStringConvert(pids),
                    method: "POST",
                    mode: "cors"
                });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            const matches = json.matches ?? [];
            console.log(`[PIDS] Matchmaker returned ${matches.length} matches.`);
            return matches;
        } catch (err) {
            console.error("[PIDS] Matchmaker fetch error:", err);
            return [];
        }
    }

    document.addEventListener('paste', async (e) => {
        const text = (e.clipboardData || window.clipboardData).getData('text').trim();
        const pids = extractPIDsOnly(text);
        if (!pids) return;

        console.log(`[PIDS] Pasted text detected with PIDs:`, pids);
        const matches = await matchmakerTranslateBatch(pids, "pids");

        if (matches.length > 0) {
            e.preventDefault();

            const vids = matches.map(m => m.translatedId);
            console.log(`[PIDS] Successfully converted to VIDs:`, vids);

            // Find the actual input element
            let targetElement = e.target;
            if (!targetElement.tagName || (targetElement.tagName !== 'INPUT' && targetElement.tagName !== 'TEXTAREA')) {
                const input = targetElement.querySelector('input, textarea');
                if (input) targetElement = input;
            }

            // Paste all VIDs at once
            const currentValue = targetElement.value.trim();
            const newValue = currentValue ? `${currentValue} ${vids.join(' ')}` : vids.join(' ');
            simulateReactInput(targetElement, newValue);
            console.log(`[PIDS] Pasted all VIDs: ${vids.join(' ')}`);

        } else {
            console.warn("[PIDS] No VID matches found for pasted PIDs.");
            alert("No VID matches found for pasted PIDs. Please double-check at https://matchmaker.product.ynapgroup.com/");
        }
    }, true);
})();

(function () {
    'use strict';

    /////////////////////
    // PID Adder
    /////////////////////

    function injectPIDStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .PID {
                display: flex;
                align-items: center;
                font-size: 14px;
                font-weight: bold;
                color: rgba(0, 0, 0, 0.87);
                line-height: 1.2;
                margin: 0;
            }
        `;
        document.head.appendChild(style);
    }

    function matchmakerTranslate(singleProduct, matchmakerSearch) {
        return fetch(
            `https://matchmaker-api.product.ynapgroup.com/${matchmakerSearch}`, {
                credentials: 'omit',
                headers: {
                    accept: 'application/json, text/plain, */*',
                    clientid: 'pidConverter',
                    'content-type': 'application/json;charset=UTF-8',
                },
                referrerPolicy: 'no-referrer',
                body: JSON.stringify(singleProduct),
                method: 'POST',
                mode: 'cors',
            })
            .then(res => res.json())
            .then(json => {
            const matched = json.matches;
            if (!matched?.length) {
                console.warn(`[PIDS] No match for`, singleProduct);
                return null;
            }
            return matched[0].translatedId;
        })
            .catch(err => {
            console.error('[PIDS] Matchmaker error:', err);
            return null;
        });
    }

    function checkProduct(str) {
        const variantMatch = str.match(/\d{10,19}/g);
        if (variantMatch) return { ids: variantMatch, type: 'variants' };
        const pidMatch = str.match(/\d{6,7}/g);
        if (pidMatch) return { ids: pidMatch, type: 'pids' };
        return null;
    }

    function prependTranslatedId(el, translatedId) {
        const container = el.closest('.MuiBox-root.css-1y7qnee');
        if (!container || container.querySelector('.PID')) return;
        const pidSpan = document.createElement('span');
        pidSpan.className = 'PID';
        pidSpan.textContent = translatedId + ' ';
        container.insertBefore(pidSpan, container.firstChild);
    }

    async function processElement(el) {
        if (el.dataset.pidAdded) return;
        const txt = el.textContent.trim();
        const product = checkProduct(txt);
        if (!product) return;
        el.dataset.pidAdded = "true";
        const result = await matchmakerTranslate(product.ids, product.type);
        if (result) prependTranslatedId(el, result);
    }

    async function addPidToWorklist() {
        const els = Array.from(document.querySelectorAll('.css-10pdxui'))
        .filter(el => !el.dataset.pidAdded);
        if (!els.length) return;
        await Promise.all(els.map(processElement));
        console.log(`[PIDS] Found ${els.length} new IDs, processed.`);
    }

    function observeMutations() {
        new MutationObserver(addPidToWorklist)
            .observe(document.body, { childList: true, subtree: true });
        console.log("[PIDS] MutationObserver watching worklist.");
    }

    let scanBuf = '', reading = false;

    function isValidPage() {
        return window.location.pathname.startsWith('/worklist/') ||
            !!document.querySelector('#search-by-id');
    }

    function handleKeyPress(e) {
        if (!isValidPage()) return;
        if (e.key === 'Enter') {
            if (scanBuf.length >= 5) processScan(scanBuf);
            scanBuf = '';
        } else if (e.key.length === 1) {
            scanBuf += e.key;
            if (!reading) {
                reading = true;
                setTimeout(() => { scanBuf = ''; reading = false; }, 250);
            }
        }
    }

    function handlePaste(e) {
        if (!isValidPage()) return;
        const txt = (e.clipboardData || window.clipboardData).getData('text').trim();
        if (txt.length >= 5) processScan(txt);
    }

    async function processScan(input) {
        const m = input.match(/(\d{5,7})/);
        if (!m) return;
        const pid = m[1];
        console.log('[PIDS] ▶ PID captured:', pid);

        if (window.location.pathname.startsWith('/worklist/')) {
            const vid = await matchmakerTranslate([pid], 'pids');
            if (!vid) return console.warn('[PIDS] no VID for', pid);
            console.log('[PIDS] ✅ VID is', vid);
            scrollToVid(vid);
        } else {
            const inp = document.querySelector('#search-by-id');
            if (!inp) return;

            const vid = await matchmakerTranslate([pid], 'pids');
            if (!vid) {
                console.warn('[PIDS] no VID for', pid);
                return;
            }

            const setter = Object.getOwnPropertyDescriptor(
                Object.getPrototypeOf(inp), 'value'
            )?.set;
            if (setter) setter.call(inp, vid);
            else inp.value = vid;

            inp.dispatchEvent(new Event('input',  { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function scrollToVid(text) {
        console.log('[PIDS] 🔍 Searching for VID:', text);
        function attemptScroll(retry = 0) {
            const max = 10, delay = 500;
            document.querySelectorAll('.tampermonkey-highlight').forEach(span => {
                try {
                    const p = span.parentNode;
                    p.replaceChild(document.createTextNode(span.textContent), span);
                    p.normalize();
                } catch {}
            });
            const re = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
            const selectors = ['.css-10pdxui','[class*="MuiBox"]','[class*="css-"]','div','span','td','p'];
            let found = false;

            for (const sel of selectors) {
                if (found) break;
                const elems = document.querySelectorAll(sel);
                console.log(`[PIDS] Checking ${elems.length} elements with selector: ${sel}`);
                for (const el of elems) {
                    if (found) break;
                    if (el.textContent.match(re)) {
                        console.log('[PIDS] 🎯 Found VID in element:', el);
                        highlightTextInElement(el, text, re);
                        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                        setTimeout(() => {
                            const url = `https://madame.ynap.biz/retouching/${text}`;
                            const newTab = window.open(url, '_blank');
                            console.log('[PIDS] 🔗 Opened retouching page:', url);
                            if (newTab) {
                                const chk = () => {
                                    try {
                                        if (newTab.document.readyState==='complete') {
                                            const btn = newTab.document.querySelector('[data-assign-button="true"]');
                                            if (btn) {
                                                btn.click();
                                                console.log('[PIDS] ✅ Auto-clicked "Assign to me"');
                                            } else setTimeout(chk,1000);
                                        } else setTimeout(chk,500);
                                    } catch {
                                        console.log('[PIDS] ℹ️ Manual assignment needed');
                                    }
                                };
                                setTimeout(chk,2000);
                            }
                        }, 1000);
                        found = true;
                    }
                }
            }

            if (!found && retry < max) {
                console.log(`[PIDS] VID not found, retrying (${retry+1}/${max})…`);
                setTimeout(() => attemptScroll(retry+1), delay);
            } else if (!found) {
                console.warn('[PIDS] ❌ VID not found after all retries');
            } else {
                console.log('[PIDS] ✅ Successfully scrolled to VID');
            }
        }
        attemptScroll();
    }

    function highlightTextInElement(el, txt, regex) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode: node => {
                if (['SCRIPT','STYLE'].includes(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
                return regex.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        const textNode = walker.nextNode();
        if (textNode) {
            const m = textNode.nodeValue.match(regex);
            if (m) {
                try {
                    const r = document.createRange();
                    r.setStart(textNode, m.index);
                    r.setEnd(textNode, m.index + m[0].length);
                    const span = document.createElement('span');
                    span.style.backgroundColor = 'yellow';
                    span.style.fontWeight = 'bold';
                    span.style.padding = '2px';
                    span.style.borderRadius = '3px';
                    span.className = 'tampermonkey-highlight';
                    r.surroundContents(span);
                    setTimeout(() => {
                        try {
                            const p = span.parentNode;
                            p.replaceChild(document.createTextNode(span.textContent), span);
                            p.normalize();
                        } catch {}
                    },3000);
                } catch (err) {
                    console.error('[PIDS] Error highlighting:', err);
                }
            }
        }
    }

    function initializeAdder() {
        console.log("[PIDS] Initializing adder...");
        injectPIDStyles();
        addPidToWorklist();
        observeMutations();
    }

    window.addEventListener('load', () => {
        initializeAdder();
        document.addEventListener('keypress', handleKeyPress);
        document.addEventListener('paste', handlePaste);
    });
})();
