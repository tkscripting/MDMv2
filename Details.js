// ==UserScript==
// @name         Details
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Renames cell labels on Madame Worklist depending on brand (NAP vs MRP) and changes comment box color
// @match        https://madame.ynap.biz/worklist/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
  /* only the "Comments" chat-bubble icon */
  button[title="Comments"]
    svg[data-testid="ChatBubbleOutlinedIcon"]
    path {
      fill: #D500D5 !important;
    }
`;
    document.head.appendChild(style);

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

    function getBrand() {
        const el = document.querySelector('#tool-channel');
        return el ? el.textContent.trim() : null;
    }

    function renameCells(map) {
        let renamed = 0;
        document.querySelectorAll('div[class*="css-b6m7zh"] span[title]').forEach(span => {
            const original = span.textContent.trim();
            if (map[original]) {
                console.log(`Renaming "${original}" → "${map[original]}"`);
                span.textContent = map[original];
                renamed++;
            }
        });
        if (renamed === 0) {
            console.warn('⚠️ No matching labels found to rename.');
        }
    }

    function waitForBrandAndRename(attempts = 0) {
        const brand = getBrand();
        if (brand) {
            console.log(`🪪 Detected brand: ${brand}`);
            const map = brand.includes('Mr Porter') ? mrpMap : napMap;

            const labelInterval = setInterval(() => {
                const spans = document.querySelectorAll('div[class*="css-b6m7zh"] span[title]');
                if (spans.length > 0) {
                    console.log(`🔍 Found ${spans.length} label(s), starting rename...`);
                    renameCells(map);
                    clearInterval(labelInterval);
                } else {
                    console.log('⏳ Waiting for cell labels to load...');
                }
            }, 500);
        } else if (attempts < 20) {
            console.log('⏳ Waiting for brand element...');
            setTimeout(() => waitForBrandAndRename(attempts + 1), 500);
        } else {
            console.error('❌ Failed to detect brand after multiple attempts.');
        }
    }

    waitForBrandAndRename();
})();
