(function () {
    'use strict';

    function injectPIDStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .PID {
                display: flex;
                align-items: center;
                font-size: 14px;
                font-weight: bold;
                color: rgba(0, 0, 0, 0.87);
                line-height: 1.2;
                margin: 0;
            }
        `;
        document.head.appendChild(style);
    }

    function matchmakerTranslate(singleProduct, matchmakerSearch) {
        return fetch(`https://matchmaker-api.product.ynapgroup.com/${matchmakerSearch}`, {
            credentials: 'omit',
            headers: {
                accept: 'application/json, text/plain, */*',
                clientid: 'pidConverter',
                'content-type': 'application/json;charset=UTF-8',
            },
            referrerPolicy: 'no-referrer',
            body: JSON.stringify(singleProduct),
            method: 'POST',
            mode: 'cors',
        })
            .then(response => response.json())
            .then(jsonResponse => {
                let matchedResponses = jsonResponse.matches;
                if (!matchedResponses || matchedResponses.length === 0) {
                    console.warn(`[PID Adder] No match found for:`, singleProduct);
                    return null;
                } else {
                    return matchedResponses[0].translatedId;
                }
            })
            .catch(error => {
                console.error("[PID Adder] Matchmaker request failed:", error);
                return null;
            });
    }

    function checkProduct(productString) {
        const variantMatch = productString.match(/\d{10,19}/g);
        if (variantMatch) return { ids: variantMatch, type: 'variants' };

        const pidMatch = productString.match(/\d{6,7}/g);
        if (pidMatch) return { ids: pidMatch, type: 'pids' };

        return null;
    }

    function prependTranslatedId(element, translatedId) {
        const container = element.closest('.MuiBox-root.css-1y7qnee');
        if (!container) {
            console.warn('[PID Adder] Container not found for:', element);
            return;
        }

        // Avoid duplicate insertions
        if (container.querySelector('.PID')) return;

        const pidSpan = document.createElement('span');
        pidSpan.className = 'PID';
        pidSpan.textContent = translatedId + ' ';

        container.insertBefore(pidSpan, container.firstChild);
    }

    async function processElement(element) {
        if (element.dataset.pidAdded) return false;

        const number = element.textContent.trim();
        const product = checkProduct(number);
        if (!product) return false;

        element.dataset.pidAdded = "true";
        const resultNumber = await matchmakerTranslate(product.ids, product.type);

        if (resultNumber) {
            prependTranslatedId(element, resultNumber);
            return true;
        }

        return false;
    }

    async function addPidToWorklist() {
        const elements = Array.from(document.querySelectorAll('.css-1nyh8gd'))
            .filter(el => !el.dataset.pidAdded);

        const totalFound = elements.length;
        let translatedCount = 0;

        await Promise.all(
            elements.map(async el => {
                const translated = await processElement(el);
                if (translated) translatedCount++;
            })
        );

        if (totalFound > 0) {
            console.log(`[PID Adder] Found ${totalFound} new IDs, translated ${translatedCount} successfully.`);
        }
    }

    function observeMutations() {
        const observer = new MutationObserver(() => {
            addPidToWorklist();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        console.log("[PID Adder] MutationObserver initialized and watching.");
    }

    function initializeScript() {
        console.log("[PID Adder] Initializing...");
        injectPIDStyles();     // Inject styles for .PID
        addPidToWorklist();    // Initial run
        observeMutations();    // Watch for dynamic content
    }

    window.addEventListener('DOMContentLoaded', initializeScript);
    window.addEventListener('load', initializeScript);
})();
