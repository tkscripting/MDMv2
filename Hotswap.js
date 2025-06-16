// ==UserScript==
// @name         Hotswap
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Conviently switch between brands
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    let mode = localStorage.getItem('hotswapMode') || 'button'; // 'button' or 'auto'
    const BUTTON_ID = 'brandSwitchNoticeButton';
    const MODE_TOGGLE_ID = 'hotswapModeToggleBtn';
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
    }, 300); // 1 second buffer
}, 100);

                }, 100);
            }, 100);
        }, 100);
    }

function createModeToggle() {
    if (document.getElementById(MODE_TOGGLE_ID)) return;

    // Inject matching styles from Enhance toggle
    const style = document.createElement('style');
    style.textContent = `
    .hotswap-toggle-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        border-radius: .5em;
        padding: .125em;
        background-image: linear-gradient(to bottom, #d5d5d5, #e8e8e8);
        box-shadow: 0 1px 1px rgb(255 255 255 / .6);
        transform: scale(0.75);
        transform-origin: left center;
        margin-right: 8px;
    }

    .hotswap-toggle-checkbox {
        appearance: none;
        position: absolute;
        z-index: 1;
        border-radius: inherit;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
    }

    .hotswap-toggle-container {
        display: flex;
        align-items: center;
        position: relative;
        border-radius: .375em;
        width: 3em;
        height: 1.5em;
        background-color: #e8e8e8;
        box-shadow: inset 0 0 .0625em .125em rgb(255 255 255 / .2),
                    inset 0 .0625em .125em rgb(0 0 0 / .4);
        transition: background-color .4s linear;
    }

    .hotswap-toggle-checkbox:checked + .hotswap-toggle-container {
        background-color: #4caf50;
    }

    .hotswap-toggle-button {
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        left: .0625em;
        border-radius: .3125em;
        width: 1.375em;
        height: 1.375em;
        background-color: #e8e8e8;
        box-shadow: inset 0 -.0625em .0625em .125em rgb(0 0 0 / .1),
                    inset 0 -.125em .0625em rgb(0 0 0 / .2),
                    inset 0 .1875em .0625em rgb(255 255 255 / .3),
                    0 .125em .125em rgb(0 0 0 / .5);
        transition: left .4s;
    }

    .hotswap-toggle-checkbox:checked + .hotswap-toggle-container .hotswap-toggle-button {
        left: 1.5625em;
    }

    .hotswap-toggle-button-circles-container {
        display: grid;
        grid-template-columns: repeat(3, min-content);
        gap: .125em;
        position: absolute;
        margin: 0 auto;
    }

    .hotswap-toggle-button-circle {
        border-radius: 50%;
        width: .125em;
        height: .125em;
        background-image: radial-gradient(circle at 50% 0, #f5f5f5, #c4c4c4);
    }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.className = 'hotswap-toggle-wrapper';
    wrapper.id = MODE_TOGGLE_ID;

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.className = 'hotswap-toggle-checkbox';
    toggleInput.checked = (mode === 'auto');

    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'hotswap-toggle-container';

    const toggleButton = document.createElement('div');
    toggleButton.className = 'hotswap-toggle-button';

    const circleContainer = document.createElement('div');
    circleContainer.className = 'hotswap-toggle-button-circles-container';

    for (let i = 0; i < 12; i++) {
        const circle = document.createElement('div');
        circle.className = 'hotswap-toggle-button-circle';
        circleContainer.appendChild(circle);
    }

    toggleButton.appendChild(circleContainer);
    toggleContainer.appendChild(toggleButton);
    wrapper.appendChild(toggleInput);
    wrapper.appendChild(toggleContainer);

    toggleInput.addEventListener('change', () => {
        mode = toggleInput.checked ? 'auto' : 'button';
        localStorage.setItem('hotswapMode', mode);
        console.log(`🔄 Hotswap mode switched to: ${mode}`);
    });

    const settingsBtn = document.querySelector('.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-colorInherit.MuiIconButton-sizeMedium.css-fjrl3o');
    if (settingsBtn && settingsBtn.parentElement) {
        settingsBtn.parentElement.insertBefore(wrapper, settingsBtn);
    }
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
            if (mode === 'auto') {
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
            sessionStorage.removeItem('hotswapJustSwitched'); // reset once page is valid again
        }
    }

    const observer = new MutationObserver(() => checkForTrigger());
    observer.observe(document.body, { childList: true, subtree: true });

    checkForTrigger();
   const interval = setInterval(() => {
    const settingsBtn = document.querySelector('.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-colorInherit.MuiIconButton-sizeMedium.css-fjrl3o');
    if (settingsBtn && settingsBtn.parentElement && !document.getElementById(MODE_TOGGLE_ID)) {
        createModeToggle();
        clearInterval(interval);
    }
}, 300);

})();
