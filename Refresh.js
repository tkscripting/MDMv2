// ==UserScript==
// @name         Refresh
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Adds a Refresh button to research a search query
// @author       Tyler
// @match        https://madame.ynap.biz/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let attemptCount = 0;
    const maxAttempts = 5;
    let intervalId;
    let debounceTimeout;

    function simulateInputChange(element, value) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function addButton() {
        const existingButton = document.querySelector('.MuiButtonBase-root.MuiButton-root.MuiButton-containedPrimary');
        if (existingButton && !document.querySelector('#refreshButton')) {
            const refreshButton = document.createElement('button');
            refreshButton.id = 'refreshButton';
            refreshButton.innerText = 'Refresh';
            refreshButton.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                position: relative;
                box-sizing: border-box;
                outline: 0px;
                border: 0px;
                margin: 0px;
                cursor: pointer;
                user-select: none;
                vertical-align: middle;
                text-decoration: none;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
                font-weight: 500;
                font-size: 0.875rem;
                line-height: 1.75;
                text-transform: uppercase;
                min-width: 64px;
                padding: 6px 16px;
                border-radius: 4px;
                transition: none;
                color: rgb(255, 255, 255);
                background-color: rgb(33, 33, 33);
                box-shadow: rgba(0, 0, 0, 0.2) 0px 3px 1px -2px, rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 1px 5px 0px;
                margin-left: 10px;
            `;
            existingButton.parentNode.insertBefore(refreshButton, existingButton.nextSibling);

            refreshButton.addEventListener('click', () => {
                console.log('[Refresh Button] Clicked.');

                const elements = document.querySelectorAll('.css-1nyh8gd');
                if (!elements.length) {
                    console.warn('[Refresh Button] No .css-1nyh8gd elements found.');
                    return;
                }

                let allStrings = '';
                elements.forEach((el) => {
                    if (el && typeof el.textContent === 'string') {
                        const text = el.textContent.trim();
                        console.log('[Refresh Button] Found text:', text);
                        if (text) allStrings += text + ' ';
                    } else {
                        console.warn('[Refresh Button] Element missing textContent:', el);
                    }
                });

                const finalInput = allStrings.trim();
                console.log('[Refresh Button] Final input string:', finalInput);

                const input = document.querySelector('.MuiInputBase-inputMultiline') ||
                              document.querySelector('textarea');
                if (!input) {
                    console.warn('[Refresh Button] Input element not found.');
                    return;
                }

                input.focus();
                simulateInputChange(input, finalInput);

                setTimeout(() => {
                    const searchBtn = document.querySelector('.MuiButton-containedPrimary.css-169cicp') ||
                                      document.querySelector('.MuiButton-containedPrimary');
                    if (searchBtn) {
                        console.log('[Refresh Button] Clicking search button.');
                        searchBtn.click();
                    } else {
                        console.warn('[Refresh Button] Search button not found.');
                    }
                }, 300);
            });
        }
    }

    function checkAndAddButton() {
        if (!location.href.includes('https://madame.ynap.biz/search') || document.querySelector('#refreshButton')) return;
        console.log('[Refresh Button] Attempting to add...');
        addButton();
        attemptCount++;
        if (attemptCount >= maxAttempts) clearInterval(intervalId);
    }

    function setupURLChangeDetection() {
        window.addEventListener('popstate', checkAndAddButton);
        window.addEventListener('pushstate', checkAndAddButton);
        window.addEventListener('replacestate', checkAndAddButton);

        const history = window.history;
        const origPush = history.pushState;
        const origReplace = history.replaceState;

        history.pushState = function () {
            origPush.apply(this, arguments);
            checkAndAddButton();
        };
        history.replaceState = function () {
            origReplace.apply(this, arguments);
            checkAndAddButton();
        };

        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(checkAndAddButton, 100);
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (location.href.includes('https://madame.ynap.biz/search')) {
        checkAndAddButton();
        intervalId = setInterval(checkAndAddButton, 500);
    }

    setupURLChangeDetection();
})();
