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
        const container = getContainer();
        const savedScroll = parseInt(localStorage.getItem(SCROLL_KEY), 10);

        if (attempt === 1) console.groupCollapsed('[Restore] Attempts');

        if (container && !isNaN(savedScroll)) {
            if (container.scrollHeight > container.clientHeight + 50) {
                container.scrollTop = savedScroll;
                console.groupEnd();
                log(`Restored scrollTop = ${savedScroll} (Attempt ${attempt})`);
                restoreDone = true;
                return;
            } else {
                log(`Container not scrollable yet (Attempt ${attempt})`);
            }
        } else {
            log(`Waiting for container or saved scroll (Attempt ${attempt})`);
        }

        if (attempt < MAX_ATTEMPTS) {
            setTimeout(() => tryRestoreScroll(attempt + 1), RETRY_INTERVAL);
        } else {
            console.groupEnd();
            warn('Max attempts reached — scroll not restored.');
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
                    log(`Restored scrollTop via MutationObserver = ${savedScroll}`);
                    restoreDone = true;
                    observer.disconnect();
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('beforeunload', saveScrollPosition);

    // Try both events for better reliability
    window.addEventListener('DOMContentLoaded', () => {
        log('DOMContentLoaded — Starting Restore Loop');
        tryRestoreScroll();
    });

    window.addEventListener('load', () => {
        if (!restoreDone) {
            log('window.load — Fallback Restore Loop');
            tryRestoreScroll();
        }
    });
})();
