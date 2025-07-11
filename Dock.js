// ==UserScript==
// @name         Dock
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Removes the old sidebar, gives more space, adds a floating dock to access key pages
// @match        https://madame.ynap.biz/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const MENU_ITEMS = [
        { id: 'go-to-home-menu-button', label: 'Home' },
        { id: 'go-to-search-menu-button', label: 'Search' },
        { id: 'go-to-retouchingValidationVariants-menu-button', label: 'Retouch Validation' },
        { id: 'go-to-shootingValidation-menu-button', label: 'Shooting Validation' },
        { id: 'go-to-bulkDownload-menu-button', label: 'Bulk Download' },
    ];

    const SUB_UPLOAD_ITEMS = [
        { id: 'go-to-bulkUploadOriginal-menu-button', label: 'Bulk Upload Original' },
        { id: 'go-to-bulkUploadRetouching-menu-button', label: 'Bulk Upload Retouched' }
    ];

    function hideSidebar() {
        const sidebar = document.querySelector('.MuiDrawer-root')?.closest('.MuiPaper-root');
        if (sidebar) sidebar.style.display = 'none';
    }

    function injectDockStyles() {
        const style = document.createElement('style');
        style.textContent = `
#floating-glass-dock::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(255,0,150,0.2), rgba(0,200,255,0.2));
    mix-blend-mode: screen;
    opacity: 0.3;
    pointer-events: none;
    filter: blur(6px);
}
.dock-tooltip {
    position: fixed;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 10001;
    white-space: nowrap;
}
.dock-tooltip a {
    display: block;
    padding: 2px 4px;
    transition: background 0.2s, color 0.2s;
}
.dock-tooltip a:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #00e5ff;
    border-radius: 4px;
}
.dock-icon-wrapper:hover svg,
.dock-icon-wrapper:hover .material-icons {
    transform: scale(1.25);
}`;
        document.head.appendChild(style);
    }

    function createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'dock-tooltip';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    function createDock(tooltip) {
        const dock = document.createElement('div');
        dock.id = 'floating-glass-dock';
        Object.assign(dock.style, {
            position: 'fixed',
            bottom: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: '300px',
            maxWidth: '90%',
            height: '72px',
            padding: '12px 18px',
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 0 12px rgba(255,255,255,0.25), 0 4px 20px rgba(0,0,0,0.3)',
            transition: 'bottom 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: '9999',
            pointerEvents: 'auto',
        });
        document.body.appendChild(dock);
        return dock;
    }

    function createDockDivider() {
        const divider = document.createElement('div');
        Object.assign(divider.style, {
            width: '2px',
            height: '40px',
            margin: '0 6px',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(0,0,0,0.3))',
            borderRadius: '1px',
            opacity: 0.8,
            boxShadow: '0 0 2px rgba(255,255,255,0.2)',
            backdropFilter: 'blur(4px)',
            mixBlendMode: 'screen',
        });
        return divider;
    }

    function addDockButton(dock, tooltip, { id, label }) {
        if (dock.querySelector(`[data-id="${id}"]`)) return;
        const original = document.getElementById(id);
        if (!original) return;

        const iconEl = original.querySelector('.material-icons, svg');
        const iconHTML = iconEl ? iconEl.outerHTML : '❔';

        const btn = document.createElement('button');
        btn.innerHTML = iconHTML;
        btn.className = 'dock-icon-wrapper';
        btn.setAttribute('data-id', id);

        Object.assign(btn.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            border: 'none',
            borderRadius: '50%',
            background: 'transparent',
            cursor: 'pointer',
            padding: '6px',
            transition: 'transform 0.2s ease',
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.25)';
            tooltip.textContent = label;
            tooltip.style.opacity = '1';
            const rect = btn.getBoundingClientRect();
            tooltip.style.top = `${rect.top - 32}px`;
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            tooltip.style.opacity = '0';
        });

        btn.addEventListener('click', () => {
            original.click();
        });

        dock.appendChild(btn);
    }

function buildDock(dock, tooltip) {
    const hasRetouching = !!document.getElementById('go-to-retouchingValidationVariants-menu-button');
    const hasShooting  = !!document.getElementById('go-to-shootingValidation-menu-button');

    let lastValidationBtn = null;

    MENU_ITEMS.forEach(item => {
        // Add the main button
        addDockButton(dock, tooltip, item);

        // Track last validation button
        if (item.id === 'go-to-retouchingValidationVariants-menu-button' && hasRetouching) {
            lastValidationBtn = item.id;
        }
        if (item.id === 'go-to-shootingValidation-menu-button' && hasShooting) {
            lastValidationBtn = item.id;
        }

        // Add first divider after search
        if (item.id === 'go-to-search-menu-button') {
            dock.appendChild(createDockDivider());
        }
    });

    // === Insert second divider ===
    if (lastValidationBtn) {
        const lastBtn = dock.querySelector(`[data-id="${lastValidationBtn}"]`);
        if (lastBtn && lastBtn.nextSibling) {
            dock.insertBefore(createDockDivider(), lastBtn.nextSibling);
        } else {
            dock.appendChild(createDockDivider());
        }
    } else {
        // Fallback: no validation buttons, put divider before Bulk Download
        const bulkDownloadBtn = dock.querySelector('[data-id="go-to-bulkDownload-menu-button"]');
        if (bulkDownloadBtn) {
            dock.insertBefore(createDockDivider(), bulkDownloadBtn);
        }
    }

    // Expand bulk upload menu and add those buttons
    const bulkUpload = document.getElementById('go-to-bulkUpload-menu-button');
    if (bulkUpload) {
        bulkUpload.click();
        setTimeout(() => {
            SUB_UPLOAD_ITEMS.forEach(item => addDockButton(dock, tooltip, item));
        }, 400);
    }
}


    function setupDockReveal(dock, tooltip) {
        document.addEventListener('mousemove', e => {
            const fromBottom = window.innerHeight - e.clientY;
            const fromCenter = Math.abs(window.innerWidth / 2 - e.clientX);
            const horizontalThreshold = window.innerWidth * 0.2;
            const verticalThreshold = 100;

            if (
                fromBottom < verticalThreshold &&
                fromCenter < horizontalThreshold &&
                !document.querySelector('.dock-tooltip:hover')
            ) {
                dock.style.bottom = '20px';
            } else if (!document.querySelector('.dock-tooltip:hover')) {
                dock.style.bottom = '-100px';
                tooltip.style.opacity = '0';
                tooltip.style.pointerEvents = 'none';
            }
        });
    }

    function init() {
        hideSidebar();
        injectDockStyles();
        const tooltip = createTooltip();
        const dock = createDock(tooltip);
        buildDock(dock, tooltip);
        setupDockReveal(dock, tooltip);
    }

    const interval = setInterval(() => {
        if (document.getElementById('go-to-home-menu-button')) {
            clearInterval(interval);
            init();
        }
    }, 250);
})();
