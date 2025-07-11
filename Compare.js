// ==UserScript==
// @name         Compare
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Select up to 5 VIDs and open a comparison tab with images
// @author       Tyler
// @match        https://madame.ynap.biz/worklist/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function checkForClass() {
        return document.querySelector('.MuiBox-root.css-7v0sgd') !== null;
    }

    function waitForClass() {
        const interval = setInterval(() => {
            if (checkForClass()) {
                clearInterval(interval);
                startScript();
            }
        }, 100);
    }

    function startScript() {
        const worklistId = window.location.pathname.match(/worklist\/(\d+)/)?.[1] || '';
        let selectedImages = [];
        let selectedVIDs = [];

        function createButton(text, onClick) {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.classList.add('compare-button');
            btn.addEventListener('click', onClick);
            return btn;
        }

        function toggleActiveStyle(el, isActive) {
            el.classList.toggle('compare-active', isActive);
        }

        function addClickListeners() {
            const imageContainers = document.querySelectorAll('img.css-18m31dc');
            imageContainers.forEach(image => {
                if (!image.hasAttribute('data-listener-attached')) {
                    image.addEventListener('click', onImageClick);
                    image.setAttribute('data-listener-attached', 'true');
                    image.style.border = '1px solid rgba(255, 255, 255, 0)';
                }
            });
        }

        setInterval(addClickListeners, 1000);

        function onImageClick(event) {
            const image = event.target;
            const imgSrc = image.src;
            const vid = extractVIDFromURL(imgSrc);

            if (selectedImages.length >= 5 && !selectedImages.includes(image)) {
                showLimitAlert();
                return;
            }

            const alreadySelected = selectedImages.includes(image);
            if (alreadySelected) {
                image.style.transition = 'all 0.3s ease';
                image.style.borderRadius = '0px';
                image.style.boxShadow = '';
                image.style.border = '2px solid rgba(255, 255, 255, 0)';
                image.style.backdropFilter = '';
                image.style.webkitBackdropFilter = '';
                image.style.backgroundColor = '';
                image.style.position = '';
                image.style.zIndex = '';
                image.style.overflow = '';
                image.style.willChange = '';

                selectedImages = selectedImages.filter(img => img !== image);
                selectedVIDs = selectedVIDs.filter(id => id !== vid);
            } else {
                image.style.position = 'relative';
                image.style.zIndex = '10';
                image.style.borderRadius = '16px';
                image.style.overflow = 'hidden';
                image.style.border = '2px solid rgba(0, 255, 195, 0.5)';
                image.style.boxShadow = `
                    inset 0 1px 2px rgba(255, 255, 255, 0.3),
                    0 0 0 2px rgba(0, 255, 195, 0.4),
                    0 12px 32px rgba(0, 255, 195, 0.35)
                `;
                image.style.backdropFilter = 'blur(14px)';
                image.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
                image.style.transition = 'all 0.3s ease';

                selectedImages.push(image);
                selectedVIDs.push(vid);
            }

            toggleCompareButton();
        }

        function showLimitAlert() {
            alert('You can only select up to 5 VIDs at once');
        }

        function extractVIDFromURL(url) {
            const napMatch = url.match(/nap\/(\d+)\/1\//);
            const mrpMatch = url.match(/mrp\/(\d+)\/1\//);
            return napMatch?.[1] || mrpMatch?.[1] || null;
        }

        function toggleCompareButton() {
            const compareButton = document.getElementById('compareButton');
            if (compareButton) {
                const isActive = selectedImages.length > 0 && selectedImages.length <= 5;
                toggleActiveStyle(compareButton, isActive);
                compareButton.style.pointerEvents = 'auto';
                compareButton.style.opacity = isActive ? '1' : '0.5';
            }
        }

        function showSelectionAlert() {
            alert('Please Select:\n1 VID for high resolution images\n2-5 VIDs to compare images');
        }

        function addCompareButton() {
            const gridContainer = document.querySelector('.MuiGrid-root.MuiGrid-container.MuiGrid-direction-xs-row.css-mzvwjm');
            const targetElement = document.querySelector('.MuiGrid-root.MuiGrid-direction-xs-row.css-c9cix2');

            if (gridContainer && targetElement && !document.getElementById('compareButton')) {
                const compareButton = createButton('Compare', () => {});
                compareButton.id = 'compareButton';

                const style = document.createElement('style');
                style.textContent = `
                    .compare-button {
                        margin: 0 5px;
                        padding: 4px 10px;
                        height: 32px;
                        line-height: 1.2;
                        font-size: 0.8125rem;
                        font-weight: 500;
                        border-radius: 8px;
                        background-color: #f5f5f5;
                        border: 1px solid rgba(0, 0, 0, 0.23);
                        color: rgba(0, 0, 0, 0.87);
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                        z-index: 1000;
                    }
                    .compare-button:hover {
                        background-color: #e0e0e0;
                        border-color: rgba(0, 0, 0, 0.4);
                    }
                    .compare-button.compare-active {
                        background-color: rgba(0, 255, 195, 0.15);
                        border: 2px solid rgba(0, 255, 195, 0.6);
                        color: #00695c;
                        font-weight: 600;
                        box-shadow: 0 0 0 1px rgba(0, 255, 195, 0.3), 0 4px 12px rgba(0, 255, 195, 0.25);
                    }
                    .compare-button.compare-active:hover {
                        background-color: rgba(0, 255, 195, 0.25);
                        border-color: rgba(0, 255, 195, 0.8);
                        box-shadow: 0 0 0 1px rgba(0, 255, 195, 0.4), 0 6px 16px rgba(0, 255, 195, 0.35);
                    }
                    .compare-button.clicked {
                        transform: scale(0.95);
                    }
                `;
                document.head.appendChild(style);

                compareButton.addEventListener('click', (e) => {
                    compareButton.classList.add('clicked');
                    setTimeout(() => compareButton.classList.remove('clicked'), 400);

                    if (e.metaKey || e.ctrlKey) {
                        selectedImages.forEach(img => (img.style = ''));
                        selectedImages = [];
                        selectedVIDs = [];
                        toggleCompareButton();
                        return;
                    }

                    if (selectedVIDs.length === 0) {
                        showSelectionAlert();
                    } else if (selectedVIDs.length > 5) {
                        alert('Please only select 1–5 VIDs');
                    } else {
                        setTimeout(openComparisonTab, 150);
                    }
                });

                gridContainer.insertBefore(compareButton, targetElement);
                toggleCompareButton();
            }
        }

        function openComparisonTab() {
            const vidsWithImages = [];
            const vidsWithoutImages = [];

            const imageCheckPromises = selectedVIDs.map(vid => {
                const netAPorterUrl = `https://cache.net-a-porter.com/variants/images/${vid}/IN/w2000_a3-4_q80.jpg`;
                const mrPorterUrl = `https://cache.mrporter.com/variants/images/${vid}/IN/w2000_a3-4_q80.jpg`;

                return Promise.all([
                    checkImageAvailability(netAPorterUrl),
                    checkImageAvailability(mrPorterUrl)
                ]).then(results => {
                    if (results[0] || results[1]) {
                        vidsWithImages.push({ vid, baseUrl: results[0] ? 'https://cache.net-a-porter.com' : 'https://cache.mrporter.com' });
                    } else {
                        vidsWithoutImages.push(vid);
                    }
                });
            });

            Promise.all(imageCheckPromises).then(() => {
                if (vidsWithImages.length === 0) {
                    alert(`No images found for selected VIDs:\n${selectedVIDs.join(', ')}`);
                    return;
                }

                if (vidsWithoutImages.length > 0) {
                    alert(`No images found for these VIDs:\n${vidsWithoutImages.join(', ')}`);
                }

                const comparisonTab = window.open('', '_blank');
                comparisonTab.document.title = 'Image Comparison';
                comparisonTab.document.body.style.margin = '0';
                comparisonTab.document.body.style.padding = '0';
                comparisonTab.document.body.style.fontFamily = 'Arial, sans-serif';
                comparisonTab.document.body.style.backgroundColor = 'white';

                const container = comparisonTab.document.createElement('div');
                container.style.display = 'flex';
                container.style.flexWrap = 'wrap';
                container.style.justifyContent = 'space-around';
                comparisonTab.document.body.appendChild(container);

                vidsWithImages.forEach(({ vid, baseUrl }) => {
                    const column = comparisonTab.document.createElement('div');
                    column.style.flex = '1 1 20%';
                    column.style.margin = '0';
                    column.style.textAlign = 'center';
                    container.appendChild(column);

                    const label = comparisonTab.document.createElement('div');
                    label.style.margin = '10px 0 4px';
                    label.style.fontSize = '14px';
                    label.textContent = vid;
                    column.appendChild(label);

                    const linksRow = comparisonTab.document.createElement('div');
                    linksRow.style.display = 'flex';
                    linksRow.style.justifyContent = 'center';
                    linksRow.style.gap = '6px';
                    linksRow.style.marginBottom = '8px';
                    linksRow.style.fontSize = '13px';

                    const retouchLink = document.createElement('a');
                    retouchLink.href = `https://madame.ynap.biz/retouching/${vid}`;
                    retouchLink.target = '_blank';
                    retouchLink.title = 'Go to Retouching';
                    retouchLink.textContent = 'Retouching';
                    retouchLink.style.textDecoration = 'none';
                    retouchLink.style.color = 'black';

                    const validateLink = document.createElement('a');
                    validateLink.href = `https://madame.ynap.biz/retouching-validation/${vid}?wl=${worklistId}`;
                    validateLink.target = '_blank';
                    validateLink.title = 'Go to Retouch Validation';
                    validateLink.textContent = 'Validation';
                    validateLink.style.textDecoration = 'none';
                    validateLink.style.color = 'black';

                    linksRow.appendChild(retouchLink);
                    linksRow.appendChild(document.createTextNode('|'));
                    linksRow.appendChild(validateLink);
                    column.appendChild(linksRow);

                    const locales = ['IN', 'OU', 'FR', 'BK', 'OU2', 'CU', 'E1', 'E2', 'E3', 'E4', 'E5'];
                    loadImagesForLocales(baseUrl, vid, locales, column, comparisonTab);
                });
            });
        }

        function checkImageAvailability(url) {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = url;
            });
        }

        function loadImagesForLocales(baseUrl, vid, locales, column, comparisonTab) {
            locales.forEach(locale => {
                const imgUrl = `${baseUrl}/variants/images/${vid}/${locale}/w2000_a3-4_q80.jpg`;

                const imgElement = comparisonTab.document.createElement('img');
                imgElement.src = imgUrl;
                imgElement.alt = `VID: ${vid} Locale: ${locale}`;
                imgElement.style.margin = '0';
                imgElement.style.padding = '0';
                imgElement.style.width = '100%';
                imgElement.style.objectFit = 'cover';
                imgElement.style.cursor = 'zoom-in';

                imgElement.addEventListener('click', () => {
                    const overlay = comparisonTab.document.createElement('div');
                    overlay.id = 'zoomOverlay';
                    Object.assign(overlay.style, {
                        position: 'fixed',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: '10000',
                        cursor: 'grab'
                    });

                    const zoomedImg = comparisonTab.document.createElement('img');
                    zoomedImg.src = imgUrl;
                    zoomedImg.draggable = false;
                    zoomedImg.style.userSelect = 'none';
                    zoomedImg.style.maxWidth = '90vw';
                    zoomedImg.style.maxHeight = '90vh';
                    zoomedImg.style.objectFit = 'contain';
                    overlay.appendChild(zoomedImg);
                    comparisonTab.document.body.appendChild(overlay);

                    let scale = 1;
                    let isDragging = false;
                    let startX = 0;
                    let startY = 0;
                    let currentX = 0;
                    let currentY = 0;

                    function updateTransform() {
                        zoomedImg.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
                    }

                    overlay.addEventListener('wheel', (e) => {
                        e.preventDefault();
                        const prevScale = scale;
                        scale += e.deltaY * -0.0025;
                        scale = Math.min(Math.max(1, scale), 10);

                        const rect = zoomedImg.getBoundingClientRect();
                        const offsetX = e.clientX - rect.left;
                        const offsetY = e.clientY - rect.top;
                        const dx = offsetX - rect.width / 2;
                        const dy = offsetY - rect.height / 2;

                        currentX -= dx * (scale - prevScale) / prevScale;
                        currentY -= dy * (scale - prevScale) / prevScale;

                        updateTransform();
                    });

                    overlay.addEventListener('mousedown', (e) => {
                        if (e.target !== overlay && e.target !== zoomedImg) return;
                        isDragging = true;
                        overlay.style.cursor = 'grabbing';
                        startX = e.clientX;
                        startY = e.clientY;
                    });

                    overlay.addEventListener('mouseup', () => {
                        isDragging = false;
                        overlay.style.cursor = 'grab';
                    });

                    overlay.addEventListener('mouseleave', () => {
                        isDragging = false;
                        overlay.style.cursor = 'grab';
                    });

                    overlay.addEventListener('mousemove', (e) => {
                        if (!isDragging) return;
                        e.preventDefault();
                        currentX += e.movementX;
                        currentY += e.movementY;
                        startX = e.clientX;
                        startY = e.clientY;
                        updateTransform();
                    });

                    overlay.addEventListener('click', (e) => {
                        if (e.target === overlay) overlay.remove();
                    });

                    function onEscapePress(e) {
                        if (e.key === 'Escape') {
                            overlay.remove();
                            comparisonTab.document.removeEventListener('keydown', onEscapePress);
                        }
                    }
                    comparisonTab.document.addEventListener('keydown', onEscapePress);

                    updateTransform();
                });

                imgElement.onerror = () => imgElement.remove();

                column.appendChild(imgElement);
            });
        }

        addCompareButton();
    }

    waitForClass();
})();
