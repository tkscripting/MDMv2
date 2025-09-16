// ==UserScript==
// @name         Hotswap
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Conveniently switch between brands
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const TARGET_TEXT = 'Worklist with no imported variants.';
    const DELAY_MS = 100; // Adjustable delay for all timeouts

    function checkForText() {
        const found = document.body.textContent.includes(TARGET_TEXT);

        if (found) {
            const switchedFlag = sessionStorage.getItem('hotswapJustSwitched');
            if (!switchedFlag) {
                sessionStorage.setItem('hotswapJustSwitched', 'true');

                const currentUrl = window.location.href;
                console.log('🎯 Found target text:', TARGET_TEXT);
                console.log('💾 Saved URL:', currentUrl);

                // Look for brand element
                const brandElement = document.querySelector('.MuiTypography-root.MuiTypography-subtitle1.MuiTypography-noWrap.css-1ngtdl5');
                if (brandElement) {
                    const brandText = brandElement.textContent.trim();
                    console.log('🏷️ Detected brand:', brandText);

                    // Click settings button - UPDATED CLASS
                    const settingsBtn = document.querySelector('.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-colorInherit.MuiIconButton-sizeMedium.css-v5gbz4');
                    if (settingsBtn) {
                        settingsBtn.click();
                        console.log('⚙️ Clicked settings button');

                        // Wait for settings modal to open, then find dropdown
                        setTimeout(() => {
                            const dropdown = document.querySelector('#mui-component-select-channel');
                            if (dropdown) {
                                dropdown.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                                console.log('📋 Opened dropdown menu');

                                // Wait for dropdown to open, then select opposite brand
                                setTimeout(() => {
                                    const targetBrand = brandText.includes('NET-A-PORTER') ? 'MRP' : 'NAP';
                                    const option = document.querySelector(`li[data-value="${targetBrand}"]`);
                                    if (option) {
                                        option.click();
                                        console.log(`✅ Selected ${targetBrand} option`);

                                        // Wait then click confirm button
                                        setTimeout(() => {
                                            const confirmBtn = document.querySelector('.MuiButtonBase-root.MuiButton-root.MuiButton-contained.MuiButton-containedPrimary.MuiButton-sizeMedium.MuiButton-containedSizeMedium.MuiButton-colorPrimary.css-imiqud');
                                            if (confirmBtn) {
                                                confirmBtn.click();
                                                console.log('✅ Clicked confirm button');

                                                // Wait for server to process, then restore URL
                                                setTimeout(() => {
                                                    window.location.href = currentUrl;
                                                    console.log('🔄 Restored URL:', currentUrl);
                                                }, DELAY_MS * 3); // Longer delay for final step
                                            } else {
                                                console.log('❌ Confirm button not found');
                                            }
                                        }, DELAY_MS);
                                    } else {
                                        console.log(`❌ Could not find ${targetBrand} option`);
                                    }
                                }, DELAY_MS);
                            } else {
                                console.log('❌ Dropdown not found');
                            }
                        }, DELAY_MS);
                    } else {
                        console.log('❌ Settings button not found');
                    }
                } else {
                    console.log('❌ Brand element not found');
                }
            }
        } else {
            // Clear the flag when target text is not found (page loaded successfully)
            sessionStorage.removeItem('hotswapJustSwitched');
        }
    }

    const observer = new MutationObserver(() => checkForText());
    observer.observe(document.body, { childList: true, subtree: true });

    checkForText();
})();
