// ==UserScript==
// @name         Enhance
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Adds color correction progress and makes the list overall more compact
// @match        https://madame.ynap.biz/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    const ENHANCE_KEY = 'enhanceToggle';

    function waitForElements(selector, callback) {
        const observer = new MutationObserver(() => {
            const targets = document.querySelectorAll(selector);
            if (targets.length > 0) {
                observer.disconnect();
                callback(targets);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function setPrivateSwitchBaseInput(on) {
        const toggleAction = () => {
            const switchInputs = document.querySelectorAll('input.PrivateSwitchBase-input.MuiSwitch-input.css-1m9pwf3');
            const switchInput = switchInputs[1];
            if (switchInput && switchInput.checked !== on) {
                switchInput.click();
            }
        };

        let attempts = 0;
        const interval = setInterval(() => {
            toggleAction();
            attempts++;
            if (document.querySelectorAll('input.PrivateSwitchBase-input.MuiSwitch-input.css-1m9pwf3').length > 1 || attempts > 10) {
                clearInterval(interval);
            }
        }, 0);
    }

    function addProgressBar() {
        const paperEl = document.querySelector('.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation2.css-q5d465');
        if (!paperEl || paperEl.querySelector('.enhance-progress-bar')) return;

        const allBoxes = Array.from(document.querySelectorAll('.MuiBox-root.css-0'));
        const outerBoxes = allBoxes.filter(box => !box.parentElement.closest('.MuiBox-root.css-0'));

        const total = outerBoxes.length;
        let correctedCount = 0;
        let readyCount = 0;

        outerBoxes.forEach(box => {
            const hfakad = box.querySelector('.MuiBox-root.css-hfakad');
            if (hfakad) {
                const has2kprcj = hfakad.querySelector('.MuiBox-root.css-2kprcj');
                const has12n9byu = hfakad.querySelector('.MuiBox-root.css-12n9byu');

                if (!has2kprcj && !has12n9byu) correctedCount++;
                else if (has2kprcj && !has12n9byu) readyCount++;
            }
        });

        const leftCount = total - correctedCount - readyCount;

        const bar = document.createElement('div');
        bar.className = 'enhance-progress-bar';

        const fillCorrected = document.createElement('div');
        fillCorrected.className = 'enhance-progress-fill';
        fillCorrected.style.width = '0%';

        const fillReady = document.createElement('div');
        fillReady.className = 'enhance-progress-fill-ready';
        fillReady.style.width = '0%';

        bar.appendChild(fillCorrected);
        bar.appendChild(fillReady);

        const label = document.createElement('div');
        label.className = 'enhance-progress-label';
        label.innerHTML = `
            ${correctedCount} Color Corrected
            &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
            ${readyCount} Ready to Color Correct
            &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
            ${leftCount} Left
        `;

        const insertProgress = () => {
            const buttonWrapper = paperEl.querySelector('div[style*="justify-content: center"]');
            if (buttonWrapper && buttonWrapper.parentElement === paperEl) {
                buttonWrapper.insertAdjacentElement('afterend', bar);
                bar.insertAdjacentElement('afterend', label);
            } else {
                paperEl.appendChild(bar);
                paperEl.appendChild(label);
            }

            setTimeout(() => {
                fillCorrected.style.width = `${(correctedCount / total) * 100}%`;
                fillReady.style.width = `${(readyCount / total) * 100}%`;

                if (readyCount === 0) {
                    fillCorrected.style.borderTopRightRadius = '4px';
                    fillCorrected.style.borderBottomRightRadius = '4px';
                }
            }, 200);
        };

        let attempts = 0;
        const interval = setInterval(() => {
            const buttonWrapper = paperEl.querySelector('div[style*="justify-content: center"]');
            if (buttonWrapper || attempts >= 10) {
                clearInterval(interval);
                insertProgress();
            }
            attempts++;
        }, 0);
    }

    function removeProgressBar() {
        document.querySelectorAll('.enhance-progress-bar, .enhance-progress-label').forEach(el => el.remove());
    }

    function hideEmptyHfakadIfNoImage() {
        document.querySelectorAll('.MuiBox-root.css-hfakad').forEach(hfakad => {
            if (!hfakad.querySelector('img')) {
                hfakad.style.display = 'none';
            }
        });
    }

    function showAllHfakad() {
        document.querySelectorAll('.MuiBox-root.css-hfakad[style*="display: none"]').forEach(el => {
            el.style.display = '';
        });
    }

    function createToggle() {
        const style = document.createElement('style');
        style.textContent = `
        .enhance-toggle-wrapper {
            display: flex;
            align-items: center;
            padding-left: 24px;
            padding-top: 16px;
            margin: 0;
            font-weight: 400;
            font-size: 1rem;
            line-height: 1.5;
        }

        .toggle-wrapper {
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
        }

        .toggle-checkbox {
            appearance: none;
            position: absolute;
            z-index: 1;
            border-radius: inherit;
            width: 100%;
            height: 100%;
            font: inherit;
            opacity: 0;
            cursor: pointer;
        }

        .toggle-container {
            display: flex;
            align-items: center;
            position: relative;
            border-radius: .375em;
            width: 3em;
            height: 1.5em;
            background-color: #e8e8e8;
            box-shadow: inset 0 0 .0625em .125em rgb(255 255 255 / .2), inset 0 .0625em .125em rgb(0 0 0 / .4);
            transition: background-color .4s linear;
        }

        .toggle-checkbox:checked + .toggle-container {
            background-color: #f3b519;
        }

        .toggle-button {
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

        .toggle-checkbox:checked + .toggle-container > .toggle-button {
            left: 1.5625em;
        }

        .toggle-button-circles-container {
            display: grid;
            grid-template-columns: repeat(3, min-content);
            gap: .125em;
            position: absolute;
            margin: 0 auto;
        }

        .toggle-button-circle {
            border-radius: 50%;
            width: .125em;
            height: .125em;
            background-image: radial-gradient(circle at 50% 0, #f5f5f5, #c4c4c4);
        }

        .enhance-progress-bar {
            width: 100%;
            height: 8px;
            background-color: #eee;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 12px;
            display: flex;
        }

        .enhance-progress-fill {
            height: 100%;
            background: linear-gradient(to right, #f3b519, #ffdd57);
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
            transition: width 0.7s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .enhance-progress-fill-ready {
            height: 100%;
            background: linear-gradient(to right, #7dd3fc, #38bdf8);
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
            transition: width 0.7s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .enhance-progress-label {
            font-size: 0.75rem;
            margin-top: 4px;
            text-align: center;
            font-weight: 500;
            color: #333;
        }

        .enhance-enabled .MuiBox-root.css-1rdqg8f {
            padding: 5px !important;
        }

        .enhance-enabled .MuiGrid-root.MuiGrid-container.css-16divny {
            display: none !important;
        }
        `;
        document.head.appendChild(style);

        const container = document.createElement('div');
        container.className = 'enhance-toggle-wrapper';

        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'toggle-wrapper';

        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.className = 'toggle-checkbox';

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-container';

        const toggleButton = document.createElement('div');
        toggleButton.className = 'toggle-button';

        const circleContainer = document.createElement('div');
        circleContainer.className = 'toggle-button-circles-container';

        for (let i = 0; i < 12; i++) {
            const circle = document.createElement('div');
            circle.className = 'toggle-button-circle';
            circleContainer.appendChild(circle);
        }

        toggleButton.appendChild(circleContainer);
        toggleContainer.appendChild(toggleButton);
        toggleWrapper.appendChild(toggleInput);
        toggleWrapper.appendChild(toggleContainer);

        const label = document.createElement('label');
        label.textContent = 'Enhance';

        const savedState = GM_getValue(ENHANCE_KEY, 'off');
        if (savedState === 'on') {
            document.body.classList.add('enhance-enabled');
            toggleInput.checked = true;

            const tryApplyEnhance = setInterval(() => {
                const hasGrid = document.querySelector('.MuiGrid-root.MuiGrid-item.css-1g6ax51');
                const hasProgressTarget = document.querySelector('.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation2.css-q5d465');
                const hasImageCells = document.querySelectorAll('.MuiBox-root.css-hfakad').length > 0;

                if (hasGrid && hasProgressTarget && hasImageCells) {
                    clearInterval(tryApplyEnhance);
                    addProgressBar();
                    hideEmptyHfakadIfNoImage();
                    setPrivateSwitchBaseInput(true);
                }
            }, 100);
        }

        toggleInput.addEventListener('change', function () {
            const state = this.checked ? 'on' : 'off';
            GM_setValue(ENHANCE_KEY, state);

            if (state === 'on') {
                document.body.classList.add('enhance-enabled');
                addProgressBar();
                hideEmptyHfakadIfNoImage();
                setPrivateSwitchBaseInput(true);
            } else {
                document.body.classList.remove('enhance-enabled');
                removeProgressBar();
                showAllHfakad();
                setPrivateSwitchBaseInput(false);
            }
        });

        container.appendChild(toggleWrapper);
        container.appendChild(label);
        return container;
    }

    waitForElements('.MuiGrid-root.MuiGrid-item.css-1g6ax51', function (elements) {
        const firstElement = elements[0];
        const toggleElement = createToggle();
        firstElement.parentNode.insertBefore(toggleElement, firstElement);
    });

    function changeTextContent() {
        document.querySelectorAll('.MuiBox-root.css-hfakad').forEach(element => {
            const textContainer = element.querySelector('.MuiBox-root.css-b6m7zh');
            if (textContainer) {
                const text = textContainer.textContent.trim();
                const map = {
                    "Front Still Life": "Index",
                    "Outfit 1": "OU",
                    "Front Model": "FR",
                    "Back Model": "BK",
                    "Back Still Life": "BK",
                    "Outfit 2": "OU 2",
                    "Detail 1": "CU",
                    "Detail 2": "E1",
                    "Detail 3": "E2",
                    "Detail 4": "E3",
                    "Extra 1": "E4",
                    "Extra 2": "E5"
                };
                if (map[text]) textContainer.textContent = map[text];
            }
        });
    }

    function changePathColor() {
        document.querySelectorAll('path[d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2"]').forEach(path => {
            path.setAttribute('fill', 'rgb(255, 0, 255)');
        });
    }

    changeTextContent();
    changePathColor();

    new MutationObserver(() => {
        changeTextContent();
        changePathColor();
    }).observe(document.body, {
        childList: true,
        subtree: true,
    });
})();
