// ==UserScript==
// @name Runway
// @namespace http://tampermonkey.net/
// @version 1.2
// @description Alerts user by inserting a red message if "RUNWAY" or "LOOK" is found in descriptions
// @match https://madame.ynap.biz/worklist/*
// @grant none
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

            if (text.includes("RUNWAY") || text.includes("LOOK")) {
                if (!paragraph.parentElement.querySelector('.runway-check-message')) {
                    // Find the parent container for this specific product card
                    const productContainer = paragraph.closest('.MuiBox-root.css-hboir5');

                    if (!productContainer) {
                        console.log("Could not find the product container for the matched paragraph.");
                        return;
                    }

                    // Get the season and brand, but now scoped to the specific product container
                    const seasonElements = productContainer.querySelectorAll('p.MuiTypography-root.MuiTypography-body2.css-g82sz9');
                    const brandEl = productContainer.querySelector('.css-zr7m9w');

                    if (seasonElements.length < 2 || !brandEl) {
                        console.log("Could not find required elements inside the product container. Link cannot be created.");
                        return;
                    }

                    const season = seasonElements[1].textContent.trim();
                    const brand = brandEl.textContent.trim().toUpperCase();

                    // Construct the dynamic URL
                    const baseUrl = "https://ynap.sharepoint.com/sites/O365G-Ecommerce-Studio/Files/Forms/AllItems.aspx?id=%2Fsites%2FO365G%2DEcommerce%2DStudio%2FFiles%2FRunway%20Imagery%2F";
                    const queryParams = "&viewid=3d9e4502%2D9604%2D49d1%2Dbbbb%2D1fb5c1bf0b96";
                    const folderPath = encodeURIComponent(`${season}/${brand}`);
                    const newUrl = `${baseUrl}${folderPath}${queryParams}`;

                    // Create the clickable link element
                    const newElement = document.createElement('a');
                    newElement.href = newUrl;
                    newElement.target = '_blank';
                    newElement.className = 'runway-check-message';
                    newElement.style.fontWeight = 'bold';
                    newElement.style.color = 'red';
                    newElement.style.fontSize = '.8em';
                    newElement.style.textDecoration = 'none';
                    newElement.style.whiteSpace = 'nowrap';
                    newElement.textContent = 'CHECK FOR RUNWAY';
                    newElement.style.display = 'block';

                    // Insert the new element
                    paragraph.parentNode.insertBefore(newElement, paragraph.nextSibling);

                    // Find the parent with the target class and add the border
                    let parent = paragraph.closest('.MuiBox-root.css-19xjdoc');
                    if (parent) {
                        parent.style.border = '2px solid red';
                    }
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
