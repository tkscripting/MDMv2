// ==UserScript==
// @name         Filters
// @namespace    http://tampermonkey.net/
// @version      1.8.5
// @description  Filter VIDs by uploads, amends, names, colors, full VIDs, and no color match
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

        let personalActive = false;
        let amendsActive = false;
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
        nameDropdown .appendChild(new Option('All Retouchers', ''));
        // Add US Retoucher option
        nameDropdown .appendChild(new Option('US Retouchers', 'US_RETOUCHER'));
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

        /* ----------  Buttons  ---------- */
        const personalBtn = createButton('Personal', () => {
            personalActive = !personalActive;
            resetDropdowns();
            toggleActiveStyle(personalBtn, personalActive);
            amendsActive = false;
            fullVidsActive = false;
            noColorMatchActive = false;
            toggleActiveStyle(amendsBtn, false);
            toggleActiveStyle(fullVidsBtn, false);
            toggleActiveStyle(noColorMatchBtn, false);
            hideMessage();
            filterRows();
        });

        const amendsBtn = createButton('Amends', () => {
            amendsActive = !amendsActive;
            resetDropdowns();
            toggleActiveStyle(amendsBtn, amendsActive);
            personalActive = false;
            fullVidsActive = false;
            noColorMatchActive = false;
            toggleActiveStyle(personalBtn, false);
            toggleActiveStyle(fullVidsBtn, false);
            toggleActiveStyle(noColorMatchBtn, false);
            hideMessage();
            filterRows();
        });

        const noColorMatchBtn = createButton('No Color Match', () => {
            // 1) Flip the no-color-match flag
            noColorMatchActive = !noColorMatchActive;

            // 2) Clear everything else
            personalActive   = false;
            amendsActive     = false;
            fullVidsActive   = false;
            nameDropdown.value  = '';
            colorDropdown.value = '';
            toggleActiveStyle(personalBtn, false);
            toggleActiveStyle(amendsBtn, false);
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
            } else {
                restoreOriginalOrder();
            }

            // 5) Toggle the button styling last
            toggleActiveStyle(noColorMatchBtn, noColorMatchActive);
        });

        const fullVidsBtn = createButton('Full VIDs', () => {
            // 1) Flip the full-vids flag
            fullVidsActive = !fullVidsActive;

            // 2) Clear everything else
            personalActive   = false;
            amendsActive     = false;
            noColorMatchActive = false;
            nameDropdown.value  = '';
            colorDropdown.value = '';
            toggleActiveStyle(personalBtn, false);
            toggleActiveStyle(amendsBtn, false);
            toggleActiveStyle(noColorMatchBtn, false);
            toggleActiveStyle(nameDropdown, false);
            toggleActiveStyle(colorDropdown, false);
            hideMessage();

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
            personalActive = amendsActive = fullVidsActive = noColorMatchActive = false;
            resetDropdowns();
            toggleActiveStyle(personalBtn, false);
            toggleActiveStyle(amendsBtn, false);
            toggleActiveStyle(noColorMatchBtn, false);
            toggleActiveStyle(fullVidsBtn, false);
            hideMessage();
            restoreOriginalOrder();
            getOuterBoxes().forEach((b) => (b.style.display = ''));
            console.log('[Filters] Reset');
        });

        /* ----------  Populate dropdowns ---------- */
        const nameSet  = new Set();
        const colorSet = new Set();

        getOuterBoxes().forEach((box) => {
            if (isVideo(box)) return;

            // Updated selector for names - now using css-chodnj
            box
                .querySelectorAll('.css-chodnj[title*="Latest Retouched Author"]')
                .forEach((el) => {
                if (isVideo(el.closest('.MuiBox-root.css-1dcsz0a'))) return;
                const m = el
                .getAttribute('title')
                ?.match(/Latest Retouched Author\s+(.+)\s+\d/);
                if (m?.[1]) nameSet.add(m[1].trim());
            });

            // Updated selector for colors - now using css-g82sz9
            const colorEl = box.querySelector(
                '.MuiTypography-root.MuiTypography-body2.css-g82sz9'
            );
            if (colorEl) colorSet.add(colorEl.textContent.trim());
        });

        [...nameSet].sort().forEach((n) => nameDropdown.add(new Option(n, n)));
        [...colorSet].sort().forEach((c) => colorDropdown.add(new Option(c, c)));

        /* ----------  Event wiring ---------- */
        nameDropdown.addEventListener('change', () => {
            toggleActiveStyle(nameDropdown, nameDropdown.value !== '');
            toggleActiveStyle(colorDropdown, false);
            colorDropdown.value = '';
            personalActive = amendsActive = fullVidsActive = noColorMatchActive = false;
            toggleActiveStyle(personalBtn, false);
            toggleActiveStyle(amendsBtn, false);
            toggleActiveStyle(fullVidsBtn, false);
            toggleActiveStyle(noColorMatchBtn, false);
            hideMessage();
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
            personalActive = amendsActive = fullVidsActive = noColorMatchActive = false;
            toggleActiveStyle(personalBtn, false);
            toggleActiveStyle(amendsBtn, false);
            toggleActiveStyle(fullVidsBtn, false);
            toggleActiveStyle(noColorMatchBtn, false);
            hideMessage();
            if (colorDropdown.value !== '') {
                filterRows();
            } else {
                restoreOriginalOrder();
                getOuterBoxes().forEach((b) => (b.style.display = ''));
            }
        });

        /* ----------  Assemble wrapper ---------- */
        buttonContainer.append(
            personalBtn,
            amendsBtn,
            nameDropdown,
            colorDropdown,
            fullVidsBtn,
            noColorMatchBtn,
            resetBtn
        );
        wrapper.appendChild(buttonContainer);
        wrapper.appendChild(messageElement);
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

        // Updated filterRows function with message support
        function filterRows() {
            const selectedName  = nameDropdown.value;
            const selectedColor = colorDropdown.value.toLowerCase();

            // Fixed username selector - use the h6 element with id="name"
            const username = $('h6.MuiTypography-root.MuiTypography-subtitle1.MuiTypography-noWrap.css-ywpd4f#name')?.textContent.trim().toLowerCase() || '';

            let visibleCount = 0;

            getOuterBoxes().forEach((box) => {
                if (isVideo(box)) return;

                let show = true;

                if (personalActive) {
                    // Personal filtering - show items retouched by current user
                    const spans = $$('.css-chodnj[title*="Latest Retouched Author"]', box)
                    .filter((el) => !isVideo(el.closest('.MuiBox-root.css-1dcsz0a')));
                    show = spans.some((s) =>
                                      s.getAttribute('title')?.toLowerCase().includes(username)
                                     );
                } else if (amendsActive) {
                    // Amends filtering - show items that are amends AND retouched by current user
                    show = false; // Start with false, only show if conditions are met

                    // Find all cells in this row
                    const cells = $$('.MuiBox-root.css-1dcsz0a', box);

                    // Check each cell for amends by current user
                    show = cells.some((cell) => {
                        // Skip video cells
                        if (isVideo(cell)) return false;

                        // Check if this cell has an amend marker
                        const hasAmend = cell.querySelector('.css-1gl1v3l');
                        if (!hasAmend) return false;

                        // Check if this cell has a retouched author span with current user's name
                        const retouchedSpan = cell.querySelector('.css-chodnj[title*="Latest Retouched Author"]');
                        if (!retouchedSpan) return false;

                        const retouchedAuthor = retouchedSpan.getAttribute('title')?.toLowerCase() || '';
                        const hasUsername = retouchedAuthor.includes(username);

                        return hasUsername;
                    });
                } else if (selectedName === 'US_RETOUCHER') {
                    // Filter by US Retouchers
                    const spans = $$('.css-chodnj[title*="Latest Retouched Author"]', box)
                    .filter((el) => !isVideo(el.closest('.MuiBox-root.css-1dcsz0a')));
                    show = spans.some((s) => {
                        const title = s.getAttribute('title')?.toLowerCase() || '';
                        return US_RETOUCHERS.some(usRetoucher => title.includes(usRetoucher));
                    });
                } else if (selectedName) {
                    // Name filtering
                    const spans = $$('.css-chodnj[title*="Latest Retouched Author"]', box)
                    .filter((el) => !isVideo(el.closest('.MuiBox-root.css-1dcsz0a')));
                    show = spans.some((s) =>
                                      s.getAttribute('title')?.toLowerCase().includes(selectedName.toLowerCase())
                                     );
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

            // Show messages when no results found
            if (visibleCount === 0) {
                if (personalActive) {
                    showMessage("You haven't uploaded any images to this list", 'info');
                } else if (amendsActive) {
                    showMessage("🎉 No amends! 🎉", 'celebration');
                }
            } else {
                hideMessage();
            }
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
