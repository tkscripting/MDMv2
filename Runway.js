// ==UserScript==
// @name         Runway
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Alerts user by inserting a red message if "RUNWAY" or "LOOK" is found in descriptions
// @author       Tyler
// @match        https://madame.ynap.biz/worklist/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let matchesFound = false;
    let debounceTimeout;
    const DEBOUNCE_DELAY = 100;

    function checkForRunway() {
        const paragraphs = document.querySelectorAll('p.MuiTypography-body2');

        let matched = false;

        paragraphs.forEach(paragraph => {
            if (paragraph.dataset.checked === 'true') return;

            const text = paragraph.textContent.trim();
            const upperText = text.toUpperCase();

            if (upperText.includes("RUNWAY") || upperText.includes("LOOK")) {
                if (!paragraph.parentElement.querySelector('.runway-check-message')) {
                    const newElement = document.createElement('p');
                    newElement.className = 'runway-check-message';
                    newElement.style.fontWeight = 'bold';
                    newElement.style.margin = '0';
                    newElement.style.color = 'red';
                    newElement.style.fontSize = '0.9em';
                    newElement.style.whiteSpace = 'nowrap';
                    newElement.textContent = 'Check for Runway';

                    paragraph.parentNode.insertBefore(newElement, paragraph.nextSibling);
                }

                paragraph.dataset.checked = 'true';
                matched = true;
            }
        });

        if (matched && !matchesFound) {
            matchesFound = true;
            observer.disconnect();
        }
    }

    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(checkForRunway, DEBOUNCE_DELAY);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('load', () => {
        checkForRunway();
    });
})();
