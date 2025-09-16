// ==UserScript==
// @name         Filters
// @namespace    http://tampermonkey.net/
// @version      1.8.7
// @description  Filters VIDs by uploads, name, color, full VIDs, and color match
// @match        https://madame.ynap.biz/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /*****************************************************************
   * CONSTANTS / HELPERS
   *****************************************************************/
    const FILTER_WRAPPER_ID = 'madame-filters-wrapper';
    const MESSAGE_ID = 'madame-filter-message';
    const PROGRESS_BAR_ID = 'no-color-match-progress-bar';
    const worklistRootSelector =
          '.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation2.css-mcze3t';

    // Define US Retoucher names
    const US_RETOUCHERS = [
        'brandon lee',
        'brian koenig',
        'deon hurst',
        'dylan de libero',
        'freddie devivo',
        'jennine cusimano',
        'katie hawran',
        'katie paiva',
        'lexi damico',
        'michael tilley',
        'morgan ostrander',
        'patricia evans',
        'tyler knipping',
    ];

    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const debounce = (fn, ms = 100) => {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    };

    function createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        Object.assign(btn.style, {
            margin: '0 5px',
            textAlign: 'center',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        });
        btn.addEventListener('click', onClick);
        return btn;
    }

    function toggleActiveStyle(el, isActive) {
        el.style.backgroundColor = isActive ? '#e0f7fa' : '';
        el.style.borderColor    = isActive ? '#00796b' : '#ccc';
        el.style.fontWeight     = isActive ? 'bold' : 'normal';
    }

    const getOuterBoxes = () =>
    $$('.MuiBox-root.css-0').filter((box) => {
        let p = box.parentElement;
        while (p) {
            if (p.classList.contains('MuiBox-root') && p.classList.contains('css-0'))
                return false;
            p = p.parentElement;
        }
        return true;
    });

    // Clean retoucher names by removing suffixes like "- External"
    function cleanRetoucherName(name) {
        if (!name) return name;

        // Remove common suffixes
        return name
            .replace(/\s*-\s*External\s*$/i, '')
            .replace(/\s*-\s*Internal\s*$/i, '')
            .replace(/\s*-\s*Ext\s*$/i, '')
            .replace(/\s*-\s*Int\s*$/i, '')
            .trim();
    }

    // Wait for content to load before extracting names
    function waitForContent(callback, maxAttempts = 15) {
        let attempts = 0;
        let previousProductCount = 0;
        let stableChecks = 0;

        function checkForContent() {
            attempts++;
            const productBoxes = getOuterBoxes();
            const totalProducts = productBoxes.length;

            // Count how many products have retoucher data
            let productsWithRetouchers = 0;
            productBoxes.forEach(box => {
                const retoucherSpans = box.querySelectorAll('span[title*="Latest Retouched Author"]');
                if (retoucherSpans.length > 0) {
                    productsWithRetouchers++;
                }
            });

            const completionPercentage = totalProducts > 0 ? (productsWithRetouchers / totalProducts) * 100 : 0;

            console.log(`[Filters] Attempt ${attempts}: ${totalProducts} products, ${productsWithRetouchers} with retoucher data (${completionPercentage.toFixed(1)}%)`);

            // Check if product count has stabilized (same count for 2 consecutive checks)
            if (totalProducts === previousProductCount) {
                stableChecks++;
            } else {
                stableChecks = 0;
            }
            previousProductCount = totalProducts;

            // Proceed if:
            // 1. We have a good completion rate (80%+) AND product count is stable, OR
            // 2. We have some retouchers and have reached max attempts
            const shouldProceed = (completionPercentage >= 80 && stableChecks >= 2) ||
                                  (attempts >= maxAttempts && productsWithRetouchers > 0);

            if (shouldProceed) {
                console.log(`[Filters] Content loading complete! Proceeding with ${productsWithRetouchers}/${totalProducts} products loaded.`);
                callback();
            } else {
                console.log(`[Filters] Waiting... (stable checks: ${stableChecks}, completion: ${completionPercentage.toFixed(1)}%)`);
                setTimeout(checkForContent, 1500); // Slightly longer delay
            }
        }

        checkForContent();
    }

    /*****************************************************************
   * MAIN UI INJECTOR
   *****************************************************************/
    function initButtons(container) {
        // Guard: don't double-inject
        if ($( `#${FILTER_WRAPPER_ID}` )) return;

        console.log('[Filters] Adding filters');

        /* =================  ELEMENT CREATION  ================= */
        const wrapper = document.createElement('div');
        wrapper.id = FILTER_WRAPPER_ID;
        Object.assign(wrapper.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '10px',
        });

        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            display: 'flex',
            justifyContent: 'center',
        });

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.id = MESSAGE_ID;
        Object.assign(messageElement.style, {
            marginTop: '10px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 'bold',
            textAlign: 'center',
            display: 'none',
        });

        // Create progress bar element for "No Color Match"
        const progressBar = document.createElement('div');
        progressBar.id = PROGRESS_BAR_ID;
        Object.assign(progressBar.style, {
            marginTop: '10px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 'bold',
            textAlign: 'center',
            display: 'none',
            color: '#c66900', // Warm orange text
            backgroundColor: '#ffecb3', // Warm light yellow background
            border: '1px solid #ffab00' // Warm dark orange border
        });

        let fullVidsActive = false;
        let noColorMatchActive = false;
        let originalOrder  = [];

        /* ----------  Dropdowns  ---------- */
        const nameDropdown  = document.createElement('select');
        const colorDropdown = document.createElement('select');
        [nameDropdown, colorDropdown].forEach((dd) =>
                                              Object.assign(dd.style, {
            margin: '0 5px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        })
                                             );
        nameDropdown .appendChild(new Option('Loading...', ''));
        colorDropdown.appendChild(new Option('All Colors',     ''));

        /* ----------  Message Functions  ---------- */
        function showMessage(text, type = 'info') {
            messageElement.textContent = text;
            messageElement.style.display = 'block';

            // Style based on type
            if (type === 'celebration') {
                messageElement.style.backgroundColor = '#e8f5e8';
                messageElement.style.color = '#2e7d32';
                messageElement.style.border = '1px solid #4caf50';
            } else {
                messageElement.style.backgroundColor = '#fff3e0';
                messageElement.style.color = '#f57c00';
                messageElement.style.border = '1px solid #ff9800';
            }
        }

        function hideMessage() {
            messageElement.style.display = 'none';
        }

        function updateNoColorMatchProgressBar() {
            const noColorMatchCount = getOuterBoxes().filter(box => {
                const frontStillLifeCell = box.querySelector('.MuiBox-root.css-1dcsz0a > .MuiBox-root.css-b6m7zh span[title*="Front Still Life"]')?.parentElement?.parentElement;
                return frontStillLifeCell && frontStillLifeCell.querySelector('.css-ikqxcw > .css-2kprcj');
            }).length;

            if (noColorMatchCount > 0) {
                progressBar.textContent = `${noColorMatchCount} left to color match`;
                progressBar.style.display = 'block';
            } else {
                progressBar.style.display = 'none';
            }
        }

        /* ----------  Buttons  ---------- */
        const noColorMatchBtn = createButton('No Color Match', () => {
            // 1) Flip the no-color-match flag
            noColorMatchActive = !noColorMatchActive;

            // 2) Clear everything else
            fullVidsActive   = false;
            nameDropdown.value  = '';
            colorDropdown.value = '';
            toggleActiveStyle(fullVidsBtn, false);
            toggleActiveStyle(nameDropdown, false);
            toggleActiveStyle(colorDropdown, false);
            hideMessage();

            // 3) Reset all rows to visible before we reorder
            const boxes = getOuterBoxes();
            boxes.forEach(b => b.style.display = '');

            // 4) Apply or clear the sort
            if (noColorMatchActive) {
                originalOrder = boxes;
                sortRows();
                updateNoColorMatchProgressBar();
            } else {
                restoreOriginalOrder();
                progressBar.style.display = 'none';
            }

            // 5) Toggle the button styling last
            toggleActiveStyle(noColorMatchBtn, noColorMatchActive);
        });

        const fullVidsBtn = createButton('Full VIDs', () => {
            // 1) Flip the full-vids flag
            fullVidsActive = !fullVidsActive;

            // 2) Clear everything else
            noColorMatchActive = false;
            nameDropdown.value  = '';
            colorDropdown.value = '';
            toggleActiveStyle(noColorMatchBtn, false);
            toggleActiveStyle(nameDropdown, false);
            toggleActiveStyle(colorDropdown, false);
            hideMessage();
            progressBar.style.display = 'none';

            // 3) Reset all rows to visible before we reorder
            const boxes = getOuterBoxes();
            boxes.forEach(b => b.style.display = '');

            // 4) Apply or clear the sort
            if (fullVidsActive) {
                // take a snapshot of "unsorted" for later
                originalOrder = boxes;
                sortRows();
            } else {
                restoreOriginalOrder();
            }

            // 5) Toggle the Full-VIDs button styling last
            toggleActiveStyle(fullVidsBtn, fullVidsActive);
        });

        const resetBtn = createButton('Reset', () => {
            fullVidsActive = noColorMatchActive = false;
            resetDropdowns();
            toggleActiveStyle(noColorMatchBtn, false);
            toggleActiveStyle(fullVidsBtn, false);
            hideMessage();
            progressBar.style.display = 'none';
            restoreOriginalOrder();
            getOuterBoxes().forEach((b) => (b.style.display = ''));
            console.log('[Filters] Reset');
        });

        /* ----------  Wait for content then populate dropdowns ---------- */
        waitForContent(() => {
            const nameSet  = new Set();
            const colorSet = new Set();

            getOuterBoxes().forEach((box) => {
                if (isVideo(box)) return;

                // Extract retoucher names using the corrected newline format
                box.querySelectorAll('span[title*="Latest Retouched Author"]')
                    .forEach((el) => {
                        if (isVideo(el.closest('.MuiBox-root.css-1dcsz0a'))) return;
                        const title = el.getAttribute('title');
                        if (title) {
                            // Split by newlines and get the name (second line)
                            const lines = title.split('\n');
                            if (lines.length >= 2) {
                                const rawName = lines[1].trim();
                                const cleanName = cleanRetoucherName(rawName);
                                if (cleanName && cleanName !== '') {
                                    nameSet.add(cleanName);
                                }
                            }
                        }
                    });

                // Extract colors
                const colorEl = box.querySelector(
                    '.MuiTypography-root.MuiTypography-body2.css-g82sz9'
                );
                if (colorEl) colorSet.add(colorEl.textContent.trim());
            });

            // Clear loading text and populate dropdowns
            nameDropdown.innerHTML = '';
            nameDropdown.appendChild(new Option('All Retouchers', ''));
            nameDropdown.appendChild(new Option('US Retouchers', 'US_RETOUCHER'));

            [...nameSet].sort().forEach((n) => nameDropdown.add(new Option(n, n)));
            [...colorSet].sort().forEach((c) => colorDropdown.add(new Option(c, c)));

            console.log('[Filters] Populated dropdowns with names:', [...nameSet].sort());
        });

        /* ----------  Event wiring ---------- */
        nameDropdown.addEventListener('change', () => {
            toggleActiveStyle(nameDropdown, nameDropdown.value !== '');
            toggleActiveStyle(colorDropdown, false);
            colorDropdown.value = '';
            fullVidsActive = noColorMatchActive = false;
            toggleActiveStyle(fullVidsBtn, false);
            toggleActiveStyle(noColorMatchBtn, false);
            hideMessage();
            progressBar.style.display = 'none';
            if (nameDropdown.value !== '') {
                filterRows();
            } else {
                restoreOriginalOrder();
                getOuterBoxes().forEach((b) => (b.style.display = ''));
            }
        });

        colorDropdown.addEventListener('change', () => {
            toggleActiveStyle(colorDropdown, colorDropdown.value !== '');
            toggleActiveStyle(nameDropdown, false);
            nameDropdown.value = '';
            fullVidsActive = noColorMatchActive = false;
            toggleActiveStyle(fullVidsBtn, false);
            toggleActiveStyle(noColorMatchBtn, false);
            hideMessage();
            progressBar.style.display = 'none';
            if (colorDropdown.value !== '') {
                filterRows();
            } else {
                restoreOriginalOrder();
                getOuterBoxes().forEach((b) => (b.style.display = ''));
            }
        });

        /* ----------  Assemble wrapper ---------- */
        buttonContainer.append(
            nameDropdown,
            colorDropdown,
            fullVidsBtn,
            noColorMatchBtn,
            resetBtn
        );
        wrapper.appendChild(buttonContainer);
        wrapper.appendChild(messageElement);
        wrapper.appendChild(progressBar);
        container.appendChild(wrapper);

        /******************** INNER HELPERS  ********************/
        function resetDropdowns() {
            nameDropdown.value = colorDropdown.value = '';
            toggleActiveStyle(nameDropdown, false);
            toggleActiveStyle(colorDropdown, false);
        }

        function isVideo(box) {
            return box?.querySelector('.css-b6m7zh')?.textContent.trim() === 'Video';
        }

        // Updated filterRows function with corrected name extraction
        function filterRows() {
            const selectedName  = nameDropdown.value;
            const selectedColor = colorDropdown.value.toLowerCase();

            let visibleCount = 0;

            getOuterBoxes().forEach((box) => {
                if (isVideo(box)) return;

                let show = true;

                if (selectedName === 'US_RETOUCHER') {
                    // Filter by US Retouchers using corrected format
                    const spans = $('span[title*="Latest Retouched Author"]', box)
                        .filter((el) => !isVideo(el.closest('.MuiBox-root.css-1dcsz0a')));
                    show = spans.some((s) => {
                        const title = s.getAttribute('title');
                        if (title) {
                            const lines = title.split('\n');
                            if (lines.length >= 2) {
                                const rawName = lines[1].trim();
                                const cleanName = cleanRetoucherName(rawName).toLowerCase();
                                return US_RETOUCHERS.some(usRetoucher =>
                                    cleanName.includes(usRetoucher) || usRetoucher.includes(cleanName)
                                );
                            }
                        }
                        return false;
                    });
                } else if (selectedName) {
                    // Individual name filtering using corrected format
                    const spans = $('span[title*="Latest Retouched Author"]', box)
                        .filter((el) => !isVideo(el.closest('.MuiBox-root.css-1dcsz0a')));
                    show = spans.some((s) => {
                        const title = s.getAttribute('title');
                        if (title) {
                            const lines = title.split('\n');
                            if (lines.length >= 2) {
                                const rawName = lines[1].trim();
                                const cleanName = cleanRetoucherName(rawName).toLowerCase();
                                return cleanName.includes(selectedName.toLowerCase());
                            }
                        }
                        return false;
                    });
                } else if (selectedColor) {
                    // Color filtering
                    const colorEl = box.querySelector(
                        '.MuiTypography-root.MuiTypography-body2.css-g82sz9'
                    );
                    show =
                        colorEl &&
                        colorEl.textContent.trim().toLowerCase() === selectedColor;
                }

                box.style.display = show ? '' : 'none';
                if (show) visibleCount++;
            });
        }

        function sortRows() {
            const parent = getOuterBoxes()[0]?.parentElement;
            if (!parent) return;

            if (noColorMatchActive) {
                originalOrder = getOuterBoxes();
                const sorted = originalOrder.slice().sort((a, b) => {
                    const hasNoColorMatch = (box) => {
                        // Find the "Front Still Life" cell
                        const frontStillLifeCell = box.querySelector('.MuiBox-root.css-1dcsz0a > .MuiBox-root.css-b6m7zh span[title*="Front Still Life"]')?.parentElement?.parentElement;
                        // Check if the "Color Matched" button exists within this cell
                        return frontStillLifeCell && frontStillLifeCell.querySelector('.css-ikqxcw > .css-2kprcj');
                    };

                    const tierA = hasNoColorMatch(a) ? 0 : 1;
                    const tierB = hasNoColorMatch(b) ? 0 : 1;

                    return tierA - tierB;
                });

                getOuterBoxes().forEach((b) => b.remove());
                sorted.forEach((b) => parent.appendChild(b));

            } else if (fullVidsActive) {
                originalOrder = getOuterBoxes(); // snapshot

                const sorted = originalOrder.slice().sort((a, b) => {
                    // ---------- tier(): decide which rows float to the top ----------
                    const tier = (box) => {
                        // Helper: does this row contain an image in a cell whose label includes <tag> ?
                        const cellHas = (tag) =>
                        Array.from(box.querySelectorAll('.MuiBox-root.css-1dcsz0a')).some((cell) => {
                            const txt = cell.textContent || '';
                            const img = cell.querySelector('img');
                            return txt.includes(tag) && img;
                        });

                        // Individual tag checks
                        const hasOU = cellHas('Outfit 1') || cellHas('OU');
                        const hasFR = cellHas('Front Model') || cellHas('FR');
                        const hasBK = cellHas('Back Still Life') || cellHas('BK');

                        /* ----------  TIER RULES  ----------
                0 =  OU present
                OR (BK and FR present)               // FR+BK combo, no OU
                1 =  BK or FR present (but not Tier 0)   // single priority tag
                2 =  some image but none of the tags
                3 =  no images at all
                -----------------------------------*/
                        if (hasOU || (hasBK && hasFR))      return 0;   // top tier
                        if (hasBK || hasFR)                 return 1;   // second tier
                        if (box.querySelector('.MuiBox-root.css-1dcsz0a img')) return 2;
                        return 3;                                       // bottom
                    };
                    return tier(a) - tier(b);
                });

                getOuterBoxes().forEach((b) => b.remove());
                sorted.forEach((b) => parent.appendChild(b));
            } else restoreOriginalOrder();
        }

        function restoreOriginalOrder() {
            if (!originalOrder.length) return;
            const parent = originalOrder[0]?.parentElement;
            if (!parent) return;
            getOuterBoxes().forEach((b) => b.remove());
            originalOrder.forEach((b) => parent.appendChild(b));
        }
    }

    /*****************************************************************
   * OBSERVATION & RE-INJECTION
   *****************************************************************/
    const tryInject = debounce(() => {
        const container = $(worklistRootSelector);
        if (container) initButtons(container);
    }, 100);

    // Initial load
    tryInject();

    // Observe DOM for React route swaps
    const globalObserver = new MutationObserver(tryInject);
    globalObserver.observe(document.body, { childList: true, subtree: true });

    // Patch History API (pushState / replaceState) to catch SPA nav
    ['pushState', 'replaceState'].forEach((m) => {
        const orig = history[m];
        history[m] = function (...args) {
            orig.apply(this, args);
            setTimeout(tryInject, 50);
        };
    });
    window.addEventListener('popstate', () => setTimeout(tryInject, 50));
})();
