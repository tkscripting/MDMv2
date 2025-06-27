// ==UserScript==
// @name         Appearance
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  UI styling only (glassmorphism, colors, cleanup)
// @match        https://madame.ynap.biz/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
body {
    overflow-y: hidden !important;
}

/* Global glassmorphism bar */
.MuiAppBar-root.MuiAppBar-colorPrimary.MuiAppBar-positionRelative {
    background: rgba(255, 255, 255, 0.12) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.2), 0 4px 10px rgba(0, 0, 0, 0.3);
    color: #222 !important;
}

/* Cards / modules */
.MuiBox-root.css-1rdqg8f .MuiPaper-root.MuiPaper-elevation2 {
    background: rgba(255, 255, 255, 0.12) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 18px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    box-sizing: border-box;
}

/* Restore all rounded elevation paper elements */
.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded {
    border-radius: 18px !important;
}

/* Dialogs */
.MuiDialog-paper {
    background: #fff !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35) !important;
    backdrop-filter: none !important;
}

/* Hide header bar */
.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation2.css-ccvm9b {
    display: none !important;
}

.MuiBox-root.css-7v0sgd {
    background: transparent !important;
}

/* Filter pill style */
.css-q5d465 {
    background: rgba(255, 255, 255, 0.12) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    border-radius: 16px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

/* Ensure text/icons are visible */
.css-q5d465 *,
.MuiAppBar-root * {
    color: #222 !important;
    fill: #222 !important;
}

/* Specific known container */
.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation2.css-1m9yl2a {
    border-radius: 18px !important;
}

/* Main column layout */
.MuiBox-root.css-1g7m72v {
    display: flex !important;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    padding: 0 !important;
    box-sizing: border-box;
}
    `;
    document.head.appendChild(style);
}

    let darkMode = false;

function toggleDarkMode() {
    darkMode = !darkMode;

    const existingDark = document.getElementById('dark-mode-styles');
    if (existingDark) existingDark.remove();

    if (darkMode) {
        const style = document.createElement('style');
        style.id = 'dark-mode-styles';
        style.textContent = `
body {
    background: #1a1a1a !important;
    color: #eaeaea !important;
}

.MuiAppBar-root,
.MuiPaper-root,
.MuiDialog-paper,
.css-q5d465 {
    background: rgba(40, 40, 45, 0.75) !important;
    color: #eaeaea !important;
    backdrop-filter: blur(20px) saturate(160%) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
}

.MuiAppBar-root *,
.MuiPaper-root *,
.MuiDialog-paper *,
.css-q5d465 * {
    color: #eaeaea !important;
    fill: #eaeaea !important;
}

input, textarea {
    background-color: rgba(255, 255, 255, 0.05) !important;
    color: #eaeaea !important;
    border-radius: 6px !important;
}
        `;
        document.head.appendChild(style);
    }
}


    const interval = setInterval(() => {
        if (document.getElementById('go-to-home-menu-button')) {
            clearInterval(interval);
            injectStyles();
        }
    }, 250);

        const konamiCode = [
        'ArrowUp', 'ArrowUp',
        'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight',
        'ArrowLeft', 'ArrowRight',
        'b', 'a'
    ];

    let konamiIndex = 0;
    window.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                toggleDarkMode();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });

})();
