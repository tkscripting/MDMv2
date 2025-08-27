// ==UserScript==
// @name        Preview
// @namespace   http://tampermonkey.net/
// @version     0.25
// @description Adds a feature to view uploads before confirming
// @match       https://madame.ynap.biz/retouching/*
// @grant       none
// ==/UserScript==

(function() {
    'use strict';

    function addButton() {
        const target = document.querySelector('.MuiBox-root.css-snppej');
        if (!target) return;
        if (document.querySelector('#preview-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'preview-btn';
        btn.textContent = 'Preview';

        btn.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100px;
            height: 29px;
            padding: 0 16px;
            cursor: pointer;
            user-select: none;
            vertical-align: middle;
            text-decoration: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-weight: 500;
            font-size: 0.875rem;
            text-transform: uppercase;
            border: 0;
            border-radius: 4px;
            color: #fff;
            background-color: #212121;
            box-shadow: rgba(0, 0, 0, 0.2) 0px 3px 1px -2px,
                        rgba(0, 0, 0, 0.14) 0px 2px 2px 0px,
                        rgba(0, 0, 0, 0.12) 0px 1px 5px 0px;
        `;

        btn.addEventListener('click', () => {
            const boxes = document.querySelectorAll('.MuiBox-root.css-v2kfba');
            const imageSrcs = [];

            boxes.forEach(box => {
                const imgs = box.querySelectorAll('img');
                imgs.forEach(img => {
                    if (!img || !img.src) return;
                    const src = img.src;
                    if (src.includes('_sw.jpg')) return;
                    const url = new URL(src);
                    url.searchParams.set('height', '1000');
                    url.searchParams.set('width', '');
                    imageSrcs.push(url.toString());
                });
            });

            if (imageSrcs.length === 0) {
                alert('No suitable images found!');
                return;
            }

            const html = `
                <html>
                <head>
                    <title>Image Preview</title>
                    <style>
                        html, body {
                            margin: 0;
                            padding: 0;
                            height: 100%;
                            background: #111;
                        }
                        body {
                            display: flex;
                            flex-direction: row;
                            flex-wrap: nowrap;
                            overflow-x: auto;
                            overflow-y: hidden;
                            align-items: flex-start;
                        }
                        .image-container {
                            position: relative;
                            height: 100vh;
                            display: flex;
                        }
                        .image-container img {
                            height: 100%;
                            width: auto;
                            object-fit: contain;
                        }
                        .overlay-image {
                            position: absolute;
                            top: 0;
                            left: 0;
                            height: 100%;
                            width: 100%;
                            object-fit: contain;
                            display: none; /* Initially hidden */
                            mix-blend-mode: darken; /* Apply darken blend mode */
                        }
                        #floating-preview-dock {
                            position: fixed;
                            bottom: -100px;
                            left: 50%;
                            transform: translateX(-50%);
                            display: flex;
                            gap: 24px;
                            padding: 12px 18px;
                            backdrop-filter: blur(20px) saturate(180%);
                            background: rgba(255,255,255,0.12);
                            border-radius: 24px;
                            border: 1px solid rgba(255,255,255,0.3);
                            box-shadow: 0 0 12px rgba(255,255,255,0.25), 0 4px 20px rgba(0,0,0,0.3);
                            z-index: 9999;
                            pointer-events: auto;
                            transition: bottom 400ms cubic-bezier(0.4,0,0.2,1);
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        }
                        .dock-btn {
                            background: none;
                            border: none;
                            padding: 0;
                            margin: 0;
                            cursor: pointer;
                            color: black;
                            font-weight: bold;
                            font-size: 0.95rem;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: transform 0.2s ease;
                        }
                        .dock-btn:hover {
                            transform: scale(1.2);
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
                        .dock-divider {
                            width: 2px;
                            height: 24px;
                            background: rgba(255,255,255,0.5);
                            opacity: 0.7;
                            align-self: center;
                        }
                        .dock-btn .icon {
                            width: 20px;
                            height: 20px;
                            fill: currentColor;
                            stroke: currentColor;
                            stroke-width: 1.5
                            stroke-linecap: round;
                            stroke-linejoin: round;
                        }
                        .dock-btn.icon-only {
                            width: 32px;
                            height: 32px;
                            padding: 6px;
                        }
                    </style>
                </head>
                <body>
                    ${imageSrcs.map(src => `<div class="image-container"><img src="${src}" /><img class="overlay-image" /></div>`).join('')}
                    <div id="floating-preview-dock"></div>
                    <div class="dock-tooltip" id="dock-tooltip"></div>
                </body>
                </html>
            `;

            const newWindow = window.open();
            newWindow.document.write(html);
            newWindow.document.close();

            newWindow.onload = () => {
                const dock = newWindow.document.getElementById('floating-preview-dock');
                const tooltip = newWindow.document.getElementById('dock-tooltip');
                const body = newWindow.document.body;
                const concreteImgUrl = 'https://studiotools.dev.product.ext.net-a-porter.com/subSites/Image%20Viewer/references/NAP%20Concrete.jpg';
                const woodImgUrl = 'https://studiotools.dev.product.ext.net-a-porter.com/subSites/Image%20Viewer/references/NAP%20Panel.jpg';
                const indexTemplateUrl = 'https://studiotools.dev.product.ext.net-a-porter.com/subSites/Image%20Viewer/templates/NAP%20Index%20Template.jpg';
                const accessoryTemplateUrl = 'https://studiotools.dev.product.ext.net-a-porter.com/subSites/Image%20Viewer/templates/NAP%20Accessory%20Template.jpg';

                function updateImageView(mode) {
                    // Remove any dynamically added reference images
                    body.querySelectorAll('.injected-ref').forEach(img => img.remove());
                    // Hide all overlays
                    body.querySelectorAll('.overlay-image').forEach(img => img.style.display = 'none');

                    const allImages = Array.from(body.querySelectorAll('.image-container img:not(.overlay-image)'));
                    allImages.forEach(img => img.style.display = 'block');

                    if (mode === 'Concrete' || mode === 'Wood') {
                        const visibleImages = allImages.filter(img => {
                            const shouldHide = img.src.includes('_in.tif.webp') || img.src.includes('_cu.tif.webp') || img.src.includes('_pr.tif.webp');
                            if (shouldHide) {
                                img.style.display = 'none';
                            }
                            return !shouldHide;
                        });

                        const imageUrl = (mode === 'Wood') ? woodImgUrl : concreteImgUrl;

                        const createRefImg = () => {
                            const img = newWindow.document.createElement('img');
                            img.src = imageUrl;
                            img.className = 'injected-ref';
                            return img;
                        };

                        if (visibleImages.length === 1) {
                            visibleImages[0].insertAdjacentElement('afterend', createRefImg());
                        } else if (visibleImages.length > 1) {
                            visibleImages.slice(0, -1).forEach(currentImg => {
                                currentImg.insertAdjacentElement('afterend', createRefImg());
                            });
                        }
                    } else if (mode === 'Index' || mode === 'Accessory') {
                        const imageUrl = (mode === 'Accessory') ? accessoryTemplateUrl : indexTemplateUrl;
                        body.querySelectorAll('.overlay-image').forEach(overlayImg => {
                            overlayImg.src = imageUrl;
                            overlayImg.style.display = 'block';
                        });
                    } else if (mode === 'Reset') {
                        // All existing logic handles a "reset" by default
                        // so no need to do anything, it's just a button.
                    }
                }

                function handleClose() {
                    newWindow.close();
                }

                const resetIcon = `<svg class="icon" viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.418 0-8 3.582-8 8s3.582 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.992 5.992 0 0 1 12 18c-3.313 0-6-2.687-6-6s2.687-6 6-6c1.373 0 2.63.46 3.65 1.23l-1.65 1.77h4.98v-4.98L17.65 6.35z"/></path></svg>`;
                const closeIcon = `<svg class="icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

                const buttons = [
                    { label: 'Concrete', tooltip: 'Show concrete set reference' },
                    { label: 'Wood', tooltip: 'Show wood set reference' },
                    { divider: true },
                    { label: 'Index', tooltip: 'Show index template' },
                    { label: 'Accessory', tooltip: 'Show accessory template' },
                    { divider: true },
                    { label: resetIcon, tooltip: 'Reset the view' },
                    { label: closeIcon, tooltip: 'Close the preview window' }
                ];

                buttons.forEach(btnData => {
                    if (btnData.divider) {
                        const divider = newWindow.document.createElement('div');
                        divider.className = 'dock-divider';
                        dock.appendChild(divider);
                        return;
                    }
                    const btn = newWindow.document.createElement('button');
                    btn.className = 'dock-btn';
                    btn.innerHTML = btnData.label;

                    if (btnData.label === closeIcon) {
                        btn.addEventListener('click', handleClose);
                    } else if (btnData.label === resetIcon) {
                        btn.addEventListener('click', () => updateImageView('Reset'));
                    } else {
                        btn.addEventListener('click', () => updateImageView(btnData.label));
                    }

                    btn.addEventListener('mouseenter', e => {
                        tooltip.textContent = btnData.tooltip;
                        tooltip.style.opacity = '1';
                        const rect = btn.getBoundingClientRect();
                        tooltip.style.top = `${rect.top - 32}px`;
                        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                    });
                    btn.addEventListener('mouseleave', () => {
                        tooltip.style.opacity = '0';
                    });
                    dock.appendChild(btn);
                });

                newWindow.document.addEventListener('mousemove', e => {
                    const fromBottom = newWindow.innerHeight - e.clientY;
                    const fromCenter = Math.abs(newWindow.innerWidth / 2 - e.clientX);
                    const horizontalThreshold = newWindow.innerWidth * 0.2;
                    const verticalThreshold = 100;

                    if (fromBottom < verticalThreshold && fromCenter < horizontalThreshold) {
                        dock.style.bottom = '20px';
                    } else {
                        dock.style.bottom = '-100px';
                        tooltip.style.opacity = '0';
                    }
                });
            };
        });

        target.parentNode.insertBefore(btn, target);
    }

    const observer = new MutationObserver(() => addButton());
    observer.observe(document.body, { childList: true, subtree: true });

    addButton();
})();
