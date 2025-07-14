// ==UserScript==
// @name         PID Adder
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  1) Adds translated VIDs above VIDs in worklists 2) Scan/paste a 5–7 digit PID anywhere to convert→VID, scroll, and assign
// @author       Tyler
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    //
    // ─── PART A: PID ADDER ON WORKLIST ─────────────────────────────────────────
    //

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
        return fetch(`https://matchmaker-api.product.ynapgroup.com/${matchmakerSearch}`, {
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
        .then(response => response.json())
        .then(jsonResponse => {
            const matched = jsonResponse.matches;
            if (!matched || matched.length === 0) {
                console.warn(`[PID Adder] No match for`, singleProduct);
                return null;
            }
            return matched[0].translatedId;
        })
        .catch(err => {
            console.error('[PID Adder] Matchmaker error:', err);
            return null;
        });
    }

    function checkProduct(productString) {
        const variantMatch = productString.match(/\d{10,19}/g);
        if (variantMatch) return { ids: variantMatch, type: 'variants' };
        const pidMatch = productString.match(/\d{6,7}/g);
        if (pidMatch) return { ids: pidMatch, type: 'pids' };
        return null;
    }

    function prependTranslatedId(element, translatedId) {
        const container = element.closest('.MuiBox-root.css-1y7qnee');
        if (!container || container.querySelector('.PID')) return;
        const pidSpan = document.createElement('span');
        pidSpan.className = 'PID';
        pidSpan.textContent = translatedId + ' ';
        container.insertBefore(pidSpan, container.firstChild);
    }

    async function processElement(element) {
        if (element.dataset.pidAdded) return;
        const text = element.textContent.trim();
        const product = checkProduct(text);
        if (!product) return;
        element.dataset.pidAdded = "true";
        const result = await matchmakerTranslate(product.ids, product.type);
        if (result) prependTranslatedId(element, result);
    }

    async function addPidToWorklist() {
        const els = Array.from(document.querySelectorAll('.css-10pdxui'))
                        .filter(el => !el.dataset.pidAdded);
        if (!els.length) return;
        await Promise.all(els.map(processElement));
        console.log(`[PID Adder] Found ${els.length} new IDs, processed.`);
    }

    function observeMutations() {
        const obs = new MutationObserver(addPidToWorklist);
        obs.observe(document.body, { childList: true, subtree: true });
        console.log("[PID Adder] MutationObserver watching worklist.");
    }

    function initializeAdder() {
        console.log("[PID Adder] Initializing adder...");
        injectPIDStyles();
        addPidToWorklist();
        observeMutations();
    }

    //
    // ─── PART B: BARCODE / PASTE SCANNER → HIGHLIGHT & SCROLL ────────────────
    //

    let scanBuf = '';
    let reading = false;

    function isValidPage() {
        return window.location.href.includes('/worklist/') ||
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
        const m = input.match(/(\d{5,7})/);  // Removed word boundaries
        if (!m) return;
        const pid = m[1];
        console.log('[PID Adder] ▶ PID captured:', pid);
        const vid = await matchmakerTranslate([pid], 'pids');
        if (!vid) return console.warn('[PID Adder] no VID for', pid);
        console.log('[PID Adder] ✅ VID is', vid);
        scrollToVid(vid);
        if (!window.location.href.includes('/worklist/')) {
            const inp = document.querySelector('#search-by-id');
            if (inp) {
                const setter = Object.getOwnPropertyDescriptor(
                  Object.getPrototypeOf(inp), 'value'
                )?.set;
                if (setter) setter.call(inp, vid);
                else inp.value = vid;
                inp.dispatchEvent(new Event('input',{bubbles:true}));
                inp.dispatchEvent(new Event('change',{bubbles:true}));
                const btn = Array.from(document.querySelectorAll('button'))
                              .find(b=>b.textContent.trim().toUpperCase()==='SEARCH');
                if (btn) btn.click();
            }
        }
    }

    function scrollToVid(text) {
        console.log('[PID Adder] 🔍 Searching for VID:', text);

        // Function to attempt the scroll
        function attemptScroll(retryCount = 0) {
            const maxRetries = 10;
            const retryDelay = 500; // ms

            // Clear any existing highlights first
            document.querySelectorAll('.tampermonkey-highlight').forEach(el => {
                try {
                    const parent = el.parentNode;
                    if (parent) {
                        parent.replaceChild(document.createTextNode(el.textContent), el);
                        parent.normalize();
                    }
                } catch (error) {
                    // Silently handle case where element was already removed
                    console.debug('[PID Adder] Highlight cleanup error:', error.message);
                }
            });

            // Create regex to find the VID
            const re = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');

            // Try multiple selectors for finding VID elements
            const selectors = [
                '.css-10pdxui', // Original selector from your script
                '[class*="MuiBox"]',
                '[class*="css-"]',
                'div', 'span', 'td', 'p'
            ];

            let found = false;

            // Search through different selectors
            for (const selector of selectors) {
                if (found) break;

                const elements = document.querySelectorAll(selector);
                console.log(`[PID Adder] Checking ${elements.length} elements with selector: ${selector}`);

                for (const element of elements) {
                    if (found) break;

                    const textContent = element.textContent;
                    const match = textContent.match(re);

                    if (match) {
                        console.log('[PID Adder] 🎯 Found VID in element:', element);

                        // Highlight the text
                        highlightTextInElement(element, text, re);

                        // Scroll to the element
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'nearest'
                        });

                        // Open retouching page in new tab after a short delay
                        setTimeout(() => {
                            const retouchingUrl = `https://madame.ynap.biz/retouching/${text}`;
                            const newTab = window.open(retouchingUrl, '_blank');
                            console.log('[PID Adder] 🔗 Opened retouching page:', retouchingUrl);

                            // Set up listener to auto-click "Assign to me" button when new tab loads
                            if (newTab) {
                                // Poll the new tab to see when it's loaded and click the button
                                const checkAndAssign = () => {
                                    try {
                                        if (newTab.document && newTab.document.readyState === 'complete') {
                                            // Look for the "Assign to me" button
                                            const assignButton = newTab.document.querySelector('[data-assign-button="true"]');
                                            if (assignButton) {
                                                assignButton.click();
                                                console.log('[PID Adder] ✅ Auto-clicked "Assign to me" button');
                                            } else {
                                                console.log('[PID Adder] ⚠️ "Assign to me" button not found, will retry...');
                                                setTimeout(checkAndAssign, 1000);
                                            }
                                        } else {
                                            setTimeout(checkAndAssign, 500);
                                        }
                                    } catch (e) {
                                        // Cross-origin access might be blocked, that's okay
                                        console.log('[PID Adder] ℹ️ Cannot access new tab (cross-origin), manual assignment needed');
                                    }
                                };

                                // Start checking after a short delay
                                setTimeout(checkAndAssign, 2000);
                            }
                        }, 1000);

                        found = true;
                        break;
                    }
                }
            }

            if (!found && retryCount < maxRetries) {
                console.log(`[PID Adder] VID not found, retrying... (${retryCount + 1}/${maxRetries})`);
                setTimeout(() => attemptScroll(retryCount + 1), retryDelay);
            } else if (!found) {
                console.warn('[PID Adder] ❌ VID not found on page after all retries');
            } else {
                console.log('[PID Adder] ✅ Successfully scrolled to VID');
            }
        }

        // Start the search
        attemptScroll();
    }

    function highlightTextInElement(element, searchText, regex) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: node => {
                    // Skip script and style elements
                    if (node.parentElement.tagName === 'SCRIPT' ||
                        node.parentElement.tagName === 'STYLE') {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // Check if this text node contains our search text
                    return regex.test(node.nodeValue) ?
                        NodeFilter.FILTER_ACCEPT :
                        NodeFilter.FILTER_REJECT;
                }
            },
            false
        );

        let textNode = walker.nextNode();
        if (textNode) {
            const match = textNode.nodeValue.match(regex);
            if (match) {
                try {
                    const range = document.createRange();
                    range.setStart(textNode, match.index);
                    range.setEnd(textNode, match.index + match[0].length);

                    const span = document.createElement('span');
                    span.style.backgroundColor = 'yellow';
                    span.style.fontWeight = 'bold';
                    span.style.padding = '2px';
                    span.style.borderRadius = '3px';
                    span.className = 'tampermonkey-highlight';

                    range.surroundContents(span);

                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                        try {
                            if (span.parentNode) {
                                const parent = span.parentNode;
                                parent.replaceChild(
                                    document.createTextNode(span.textContent),
                                    span
                                );
                                parent.normalize();
                            }
                        } catch (error) {
                            // Silently handle case where element was already removed
                            console.debug('[PID Adder] Highlight already removed:', error.message);
                        }
                    }, 3000);

                    return true;
                } catch (error) {
                    console.error('[PID Adder] Error highlighting text:', error);
                    return false;
                }
            }
        }
        return false;
    }

    //
    // ─── BOOTSTRAP ONCE ─────────────────────────────────────────────────────
    //

    window.addEventListener('load', () => {
        initializeAdder();
        document.addEventListener('keypress', handleKeyPress);
        document.addEventListener('paste', handlePaste);
    });

})();
