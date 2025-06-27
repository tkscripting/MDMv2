// ==UserScript==
// @name         Appearance
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  UI styling only (glassmorphism, colors, cleanup) with persistent dark mode
// @match        https://madame.ynap.biz/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    // === LIGHT MODE BASE STYLES ===
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
/* ===== Base ===== */
body {
    overflow-y: hidden !important;
}

/* ===== App Bar ===== */
.MuiAppBar-root.MuiAppBar-colorPrimary.MuiAppBar-positionStatic.css-1osjwd3 {
    background: #fff !important;
}
.MuiAppBar-root.MuiAppBar-colorPrimary.MuiAppBar-positionRelative {
    background: rgba(255, 255, 255, 0.12) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.2), 0 4px 10px rgba(0, 0, 0, 0.3);
    color: #222 !important;
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
    background: #fff !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35) !important;
    backdrop-filter: none !important;
}

/* ===== Chips / Pills ===== */
.css-q5d465 {
    background: rgba(255, 255, 255, 0.12) !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    border-radius: 16px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

/* ===== Visibility / Typography Fixes ===== */
.css-q5d465 *,
.MuiAppBar-root *,
.MuiPaper-root *,
.MuiDialog-paper * {
    color: #222 !important;
    fill: #222 !important;
}
.MuiSvgIcon-root.MuiSvgIcon-fontSizeSmall.css-ia1en0 {
    color: #000 !important;
    fill: #000 !important;
}

/* ===== Layout / Hidden ===== */
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

/* Target all 4 icons and force paths/circles inside to white */
a#go-to-shooting-button svg *,
a#go-to-shooting-validation-button svg *,
a#go-to-retouching-button svg *,
a#go-to-retouching-validation-button svg * {
    fill: #fff !important;
    color: #fff !important;
}
        `;
        document.head.appendChild(style);
    }

    // === DARK MODE TOGGLE ===
    function toggleDarkMode(force = null) {
        const existing = document.getElementById('dark-mode-styles');
        const shouldEnable = force !== null ? force : !existing;

        if (!shouldEnable && existing) {
            existing.remove();
            GM_setValue('appearanceDarkMode', 'off');
            return;
        }

        if (shouldEnable && !existing) {
            const style = document.createElement('style');
            style.id = 'dark-mode-styles';
            style.textContent = `
/* ===== Dark Mode: Base ===== */
body {
    background: #1a1a1a !important;
    color: #eaeaea !important;
}

/* ===== Dark Mode: Paper & Cards ===== */
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

/* AppBar override */
.MuiAppBar-root.MuiAppBar-colorPrimary.MuiAppBar-positionStatic.css-1osjwd3 {
    background: rgba(40, 40, 45, 0.75) !important;
}

/* Transparent areas */
.MuiChip-root.MuiChip-filled.MuiChip-sizeMedium.MuiChip-colorDefault.MuiChip-filledDefault.css-1x53f8m,
.MuiBox-root.css-19xjdoc,
.MuiBox-root.css-1cf4usq,
.MuiBox-root.css-1xa2jh3,
.MuiButtonBase-root.Mui-disabled.MuiIconButton-root.Mui-disabled.MuiIconButton-sizeMedium.css-i0uwzg,
.MuiBox-root.css-1fqp046,
.MuiBox-root.css-13n36c,
.MuiBox-root.css-6es26n,
.MuiBox-root.css-n6y94z {
    background: #242428 !important;
}

.MuiButtonBase-root.MuiTab-root.MuiTab-labelIcon.MuiTab-textColorPrimary.Mui-selected.css-1n33su5 {
    background-color: #242428 !important;
    color: #fff !important;
}

/* Inputs */
input, textarea {
    background-color: rgba(255, 255, 255, 0.05) !important;
    color: #eaeaea !important;
    border-radius: 6px !important;
}

/* Text/Icon visibility */
.MuiAppBar-root *,
.MuiPaper-root *,
.MuiDialog-paper *,
.css-q5d465 * {
    color: #eaeaea !important;
    fill: #eaeaea !important;
}
.MuiSvgIcon-root.MuiSvgIcon-fontSizeSmall.css-ia1en0 {
    color: #fff !important;
    fill: #fff !important;
}
            `;
            document.head.appendChild(style);
            GM_setValue('appearanceDarkMode', 'on');
        }
    }

    // === INITIAL INJECTION ON EVERY PAGE ===
    const init = async () => {
        injectStyles();
        const saved = await GM_getValue('appearanceDarkMode', 'off');
        if (saved === 'on') toggleDarkMode(true);
    };
    // Wait for head to exist
    const checkHead = setInterval(() => {
        if (document.head) {
            clearInterval(checkHead);
            init();
        }
    }, 50);

    // === KONAMI CODE TOGGLE ===
    const konami = [
        'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
        'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
        'b','a'
    ];
    let idx = 0;
    window.addEventListener('keydown', e => {
        if (e.key === konami[idx]) {
            idx++;
            if (idx === konami.length) {
                toggleDarkMode();
                idx = 0;
            }
        } else {
            idx = 0;
        }
    });
})();
