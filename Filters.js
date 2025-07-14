// ==UserScript==
// @name         Filters
// @namespace    http://tampermonkey.net/
// @version      1.8.1
// @description  Filters VIDs by name, color and priority
// @match        https://madame.ynap.biz/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /*****************************************************************
   *  CONSTANTS / HELPERS
   *****************************************************************/
    const FILTER_WRAPPER_ID = 'madame-filters-wrapper';
    const worklistRootSelector =
          '.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation2.css-mcze3t';

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
   *  MAIN UI INJECTOR
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
            justifyContent: 'center',
            marginTop: '10px',
        });

        let personalActive = false;
        let fullVidsActive = false;
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
        colorDropdown.appendChild(new Option('All Colors',     ''));

        /* ----------  Buttons  ---------- */
        const personalBtn = createButton('Personal', () => {
            personalActive = !personalActive;
            resetDropdowns();
            toggleActiveStyle(personalBtn, personalActive);
            fullVidsActive = false;
            toggleActiveStyle(fullVidsBtn, false);
            filterRows();
        });

        const fullVidsBtn = createButton('Full VIDs', () => {
            // 1) Flip the full-vids flag
            fullVidsActive = !fullVidsActive;

            // 2) Clear everything else
            personalActive   = false;
            nameDropdown.value  = '';
            colorDropdown.value = '';
            toggleActiveStyle(personalBtn, false);
            toggleActiveStyle(nameDropdown, false);
            toggleActiveStyle(colorDropdown, false);

            // 3) Reset all rows to visible before we reorder
            const boxes = getOuterBoxes();
            boxes.forEach(b => b.style.display = '');

            // 4) Apply or clear the sort
            if (fullVidsActive) {
                // take a snapshot of “unsorted” for later
                originalOrder = boxes;
                sortRows();
            } else {
                restoreOriginalOrder();
            }

            // 5) Toggle the Full-VIDs button styling last
            toggleActiveStyle(fullVidsBtn, fullVidsActive);
        });

        const resetBtn = createButton('Reset', () => {
            personalActive = fullVidsActive = false;
            resetDropdowns();
            toggleActiveStyle(personalBtn, false);
            toggleActiveStyle(fullVidsBtn, false);
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
                if (isVideo(el.closest('.css-hfakad'))) return;
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
            personalActive = fullVidsActive = false;
            toggleActiveStyle(personalBtn, false);
            toggleActiveStyle(fullVidsBtn, false);
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
            personalActive = fullVidsActive = false;
            toggleActiveStyle(personalBtn, false);
            toggleActiveStyle(fullVidsBtn, false);
            if (colorDropdown.value !== '') {
                filterRows();
            } else {
                restoreOriginalOrder();
                getOuterBoxes().forEach((b) => (b.style.display = ''));
            }
        });

        /* ----------  Assemble wrapper ---------- */
        wrapper.append(
            personalBtn,
            nameDropdown,
            colorDropdown,
            fullVidsBtn,
            resetBtn
        );
        container.appendChild(wrapper);

        /********************  INNER HELPERS  ********************/
        function resetDropdowns() {
            nameDropdown.value = colorDropdown.value = '';
            toggleActiveStyle(nameDropdown, false);
            toggleActiveStyle(colorDropdown, false);
        }

        function isVideo(box) {
            return box?.querySelector('.css-b6m7zh')?.textContent.trim() === 'Video';
        }

        function filterRows() {
            const selectedName  = nameDropdown.value.toLowerCase();
            const selectedColor = colorDropdown.value.toLowerCase();
            const username =
                  $(
                      '.MuiTypography-root.MuiTypography-subtitle1.MuiTypography-noWrap.css-ywpd4f'
                  )?.textContent.trim().toLowerCase() || '';

            getOuterBoxes().forEach((box) => {
                if (isVideo(box)) return;

                let show = true;

                if (personalActive) {
                    // Updated selector for personal filtering
                    const spans = $$('.css-chodnj[title*="Latest Retouched Author"]', box)
                    .filter((el) => !isVideo(el.closest('.css-hfakad')));
                    show = spans.some((s) =>
                                      s.getAttribute('title')?.toLowerCase().includes(username)
                                     );
                } else if (selectedName) {
                    // Updated selector for name filtering
                    const spans = $$('.css-chodnj[title*="Latest Retouched Author"]', box)
                    .filter((el) => !isVideo(el.closest('.css-hfakad')));
                    show = spans.some((s) =>
                                      s.getAttribute('title')?.toLowerCase().includes(selectedName)
                                     );
                } else if (selectedColor) {
                    // Updated selector for color filtering
                    const colorEl = box.querySelector(
                        '.MuiTypography-root.MuiTypography-body2.css-g82sz9'
                    );
                    show =
                        colorEl &&
                        colorEl.textContent.trim().toLowerCase() === selectedColor;
                }

                box.style.display = show ? '' : 'none';
            });
        }

        function sortRows() {
            const parent = getOuterBoxes()[0]?.parentElement;
            if (!parent) return;

            if (fullVidsActive) {
                originalOrder = getOuterBoxes(); // snapshot

                const sorted = originalOrder.slice().sort((a, b) => {
                    // ---------- tier(): decide which rows float to the top ----------
                    const tier = (box) => {
                        // Helper: does this row contain an image in a cell whose label includes <tag> ?
                        const cellHas = (tag) =>
                        Array.from(box.querySelectorAll('.css-hfakad')).some((cell) => {
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
                        if (box.querySelector('.css-hfakad img')) return 2;
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
   *  OBSERVATION & RE-INJECTION
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
