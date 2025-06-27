// ==UserScript==
// @name         Restore
// @namespace    http://tampermonkey.net/
// @version      3.6
// @description  Restores scroll position
// @author       Tyler
// @match        https://madame.ynap.biz/worklist/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const SCROLL_KEY = 'scrollPos_' + location.pathname;
    const SELECTOR = '.MuiBox-root.css-o744zt';
    const RETRY_INTERVAL = 300;
    const MAX_ATTEMPTS = 100;
    let restoreDone = false;

    function log(msg) {
        console.log('[Restore]', msg);
    }

    function warn(msg) {
        console.warn('[Restore]', msg);
    }

    function getContainer() {
        return document.querySelector(SELECTOR);
    }

    function saveScrollPosition() {
        const container = getContainer();
        if (container) {
            const scrollTop = container.scrollTop;
            localStorage.setItem(SCROLL_KEY, scrollTop);
            log(`Saved scrollTop = ${scrollTop}`);
        }
    }

    function tryRestoreScroll(attempt = 1) {
        if (attempt === 1) {
            log(`Attempting to restore scroll`);
        }

        const container = getContainer();
        const savedScroll = parseInt(localStorage.getItem(SCROLL_KEY), 10);

        if (container && !isNaN(savedScroll)) {
            if (container.scrollHeight > container.clientHeight + 50) {
                container.scrollTop = savedScroll;
                log(`Scroll restored to ${savedScroll} on attempt ${attempt}`);
                restoreDone = true;
                return;
            }
        }

        if (attempt < MAX_ATTEMPTS) {
            setTimeout(() => tryRestoreScroll(attempt + 1), RETRY_INTERVAL);
        } else {
            warn('Scroll restore failed — max attempts reached.');
            observeForLateContainer();
        }
    }

    function observeForLateContainer() {
        const observer = new MutationObserver(() => {
            if (!restoreDone) {
                const container = getContainer();
                const savedScroll = parseInt(localStorage.getItem(SCROLL_KEY), 10);
                if (container && !isNaN(savedScroll)) {
                    container.scrollTop = savedScroll;
                    log(`Scroll restored via MutationObserver to ${savedScroll}`);
                    restoreDone = true;
                    observer.disconnect();
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('beforeunload', saveScrollPosition);

    window.addEventListener('DOMContentLoaded', () => {
        tryRestoreScroll();
    });

    window.addEventListener('load', () => {
        if (!restoreDone) {
            tryRestoreScroll();
        }
    });
})();
