// ==UserScript==
// @name         Appearance
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  UI styling only (glassmorphism, rounded corners, cleanup) — light mode only
// @match        https://madame.ynap.biz/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
/* ===== Base ===== */
body {
    overflow-y: hidden !important;
}

/* ===== App Header Fix: force black text/icons ===== */
header.MuiAppBar-root,
header.MuiAppBar-root * {
    color: #000 !important;
    fill: #000 !important;
}

/* ===== App Bar ===== */
.MuiAppBar-root.MuiAppBar-colorPrimary.MuiAppBar-positionStatic.css-1osjwd3,
.MuiAppBar-root.MuiAppBar-colorPrimary.MuiAppBar-positionRelative {
    background: rgba(255, 255, 255, 0.12) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.2), 0 4px 10px rgba(0, 0, 0, 0.3);
}

/* ===== Paper / Cards ===== */
.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded {
    border-radius: 18px !important;
}
.MuiBox-root.css-1rdqg8f .MuiPaper-root.MuiPaper-elevation2 {
    background: rgba(255, 255, 255, 0.12) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 18px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    box-sizing: border-box;
}
.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation2.css-1m9yl2a {
    border-radius: 18px !important;
}

/* ===== Dialogs ===== */
.MuiDialog-paper {
    border-radius: 12px !important;
    backdrop-filter: none !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35) !important;
}

/* ===== Dialog Glassy Overlay Look with Readable Text ===== */
.MuiDialog-paper.MuiDialog-paperScrollPaper.MuiDialog-paperWidthMd.MuiDialog-paperFullWidth.css-ju9f09 {
    background: rgba(255, 255, 255, 0.12) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 18px !important;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    box-sizing: border-box;
    color: #111 !important;
}

/* Force readable text/icons inside glassy dialog */
.MuiDialog-paper.css-ju9f09 * {
    color: #111 !important;
    fill: #111 !important;
    font-weight: 500;
}
/* ===== Remove Modal Backdrop ===== */
.MuiBackdrop-root.MuiModal-backdrop.css-919eu4 {
    display: none !important;
}

/* ===== Chips / Pills ===== */
.css-q5d465 {
    background: rgba(255, 255, 255, 0.12) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    border-radius: 16px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

/* ===== Layout Cleanup ===== */
.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation2.css-ccvm9b {
    display: none !important;
}
.MuiBox-root.css-7v0sgd,
.MuiBox-root.css-19xjdoc {
    background: transparent !important;
}
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

    const checkHead = setInterval(() => {
        if (document.head) {
            clearInterval(checkHead);
            injectStyles();
        }
    }, 50);
})();
