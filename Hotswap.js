// ==UserScript==
// @name         Hotswap
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Conveniently switch between brands
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const MODE = 'auto'; // 🔄 Change to 'button' or 'auto'
    const BUTTON_ID = 'brandSwitchNoticeButton';
    const TARGET_CLASS = 'MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation2 css-1tvp2se';
    const TARGET_TEXT = 'Worklist with no imported variants.';

    function switchBrand() {
        console.group('🔁 Brand Switch Triggered');
        const savedUrl = window.location.href;
        console.log('1️⃣ Saved current URL:', savedUrl);

        const settingsBtn = document.querySelector('.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-colorInherit.MuiIconButton-sizeMedium.css-fjrl3o');
        if (!settingsBtn) return console.warn('2️⃣ Settings button not found');
        settingsBtn.click();
        console.log('2️⃣ Opened settings modal');

        setTimeout(() => {
            const brandCode = document.querySelector('#channel-selection')?.value;
            const brandDisplay = document.querySelector('#mui-component-select-channel')?.textContent.trim();
            console.log('3️⃣ Current brand (code):', brandCode, '| Display:', brandDisplay);

            const dropdown = document.querySelector('#mui-component-select-channel');
            if (!dropdown) return console.warn('4️⃣ Dropdown not found');
            dropdown.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            console.log('4️⃣ Dispatched mousedown on dropdown');

            setTimeout(() => {
                const options = document.querySelectorAll('li[role="option"]');
                const targetCode = brandCode === 'NAP' ? 'MRP' : 'NAP';
                const targetOption = [...options].find(el => el.getAttribute('data-value') === targetCode);
                if (!targetOption) return console.warn('5️⃣ Could not find target brand option:', targetCode);
                targetOption.click();
                console.log(`5️⃣ Clicked ${targetCode} option`);

                setTimeout(() => {
                    const confirmBtn = document.querySelector('#settings-confirm-button');
                    if (!confirmBtn) return console.warn('6️⃣ Confirm button not found');
                    confirmBtn.click();
                    console.log('6️⃣ Clicked Confirm');

                    setTimeout(() => {
                        console.log('7️⃣ Waiting for brand context to settle...');
                        sessionStorage.setItem('hotswapJustSwitched', 'true'); // prevent auto-loop
                        setTimeout(() => {
                            console.log('8️⃣ Restoring saved URL...');
                            window.location.href = savedUrl;
                            console.groupEnd();
                        }, 300);
                    }, 100);
                }, 100);
            }, 100);
        }, 100);
    }

    function createAlertButton() {
        if (document.getElementById(BUTTON_ID)) return;

        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.textContent = '⚠️ This webpage might be for another brand. Click to switch';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 14px 24px;
            font-size: 14px;
            font-weight: bold;
            background-color: #f44336;
            color: white;
            border: none;
            border-radius: 30px;
            cursor: pointer;
            z-index: 9999;
            max-width: 360px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        `;

        button.onmouseover = () => button.style.backgroundColor = '#d32f2f';
        button.onmouseout = () => button.style.backgroundColor = '#f44336';
        button.onclick = () => switchBrand();

        document.body.appendChild(button);
    }

    function removeAlertButton() {
        const btn = document.getElementById(BUTTON_ID);
        if (btn) btn.remove();
    }

    function checkForTrigger() {
        const elements = document.getElementsByClassName(TARGET_CLASS);
        let shouldTrigger = false;

        for (const el of elements) {
            if (el.textContent.includes(TARGET_TEXT)) {
                shouldTrigger = true;
                break;
            }
        }

        if (shouldTrigger) {
            if (MODE === 'auto') {
                const switchedFlag = sessionStorage.getItem('hotswapJustSwitched');
                if (!switchedFlag) {
                    sessionStorage.setItem('hotswapJustSwitched', 'true');
                    switchBrand();
                }
            } else {
                createAlertButton();
            }
        } else {
            removeAlertButton();
            sessionStorage.removeItem('hotswapJustSwitched');
        }
    }

    const observer = new MutationObserver(() => checkForTrigger());
    observer.observe(document.body, { childList: true, subtree: true });

    checkForTrigger();
})();
