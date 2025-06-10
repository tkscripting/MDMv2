// ==UserScript==
// @name         Compare
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Select up to 5 VIDs and opens a comparison tab with images
// @author       Tyler
// @match        https://madame.ynap.biz/worklist/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to check if the class is present
    function checkForClass() {
        const targetElement = document.querySelector('.MuiBox-root.css-7v0sgd');
        return targetElement !== null;
    }

    // Loop to wait for the class to be present
    function waitForClass() {
        const interval = setInterval(() => {
            if (checkForClass()) {
                clearInterval(interval); // Stop the loop once the class is found
                startScript(); // Start the rest of the script
            }
        }, 100); // Check every 100ms
    }

    // Main script functionality
    function startScript() {
        const selectedImageStyle = `
            border: 5px solid #10f390 !important;
            border-radius: 4px !important;
            position: relative !important;
            z-index: 9999 !important;
        `;

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
            const imageContainers = document.querySelectorAll('.MuiBox-root img.css-x6lorw');
            imageContainers.forEach(image => {
                if (!image.hasAttribute('data-listener-attached')) {
                    image.addEventListener('click', onImageClick);
                    image.setAttribute('data-listener-attached', 'true');
                    image.style.border = '1px solid rgba(255, 255, 255, 0)';
                }
            });
        }

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
    image.style.borderColor = 'rgba(255, 255, 255, 0)';
    image.style.borderWidth = '2px'; // keep structure for transition
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
    image.style.border = '2px solid rgba(0, 255, 195, 0.5)'; // brighter aqua border
    image.style.borderColor = 'rgba(0, 255, 195, 0.5)';
    image.style.boxShadow = `
        inset 0 1px 2px rgba(255, 255, 255, 0.3),
        0 0 0 2px rgba(0, 255, 195, 0.4),
        0 12px 32px rgba(0, 255, 195, 0.35)
    `;
    image.style.backdropFilter = 'blur(14px)';
    image.style.webkitBackdropFilter = 'blur(14px)';
    image.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
    image.style.transition = 'all 0.3s ease';
    image.style.willChange = 'transform, box-shadow, border-radius, backdrop-filter';

    selectedImages.push(image);
    selectedVIDs.push(vid);
}


            toggleCompareButton();
        }

        function showLimitAlert() {
            alert('You can only select up to 5 VIDs at once');
        }

        function extractVIDFromURL(url) {
            const napRegex = /nap\/(\d+)\/1\//;
            const mrpRegex = /mrp\/(\d+)\/1\//;

            const napMatch = url.match(napRegex);
            const mrpMatch = url.match(mrpRegex);

            if (napMatch) {
                return napMatch[1];
            } else if (mrpMatch) {
                return mrpMatch[1];
            }

            return null;
        }

function addCompareButton() {
    const gridContainer = document.querySelector('.MuiGrid-root.MuiGrid-container.css-1w32p15');
    if (gridContainer && !document.getElementById('compareButton')) {
        const compareButton = createButton('Compare', () => {});
        compareButton.id = 'compareButton';
        compareButton.style.transform = 'translateX(20px) translateY(15px)';

        // Inject elegant styles
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
        box-shadow: none;
        transition:
            background-color 0.3s ease,
            border-color 0.3s ease,
            color 0.3s ease,
            box-shadow 0.3s ease,
            font-weight 0.3s ease;
    }

    .compare-button:hover {
        background-color: #b2fff0;
        border-color: #00a58c;
        color: #000;
    }

    .compare-button.clicked {
        animation: compareClickFlash 500ms ease;
    }

    .compare-button.compare-active {
        background-color: #d1f8f6;
        border-color: #009688;
        color: black;
        font-weight: bold;
    }

    .compare-button.compare-active:hover {
        background-color: #a9f7eb;
        border-color: #00796b;
    }

    .compare-button.compare-active.clicked {
        animation: compareClickFlashActive 500ms ease;
    }

    @keyframes compareClickFlash {
        0% {
            background-color: #62ffe2;
            box-shadow: inset 0 0 0 4px rgba(0, 255, 195, 0.6);
        }
        50% {
            background-color: #b2fff0;
            box-shadow: inset 0 0 0 2px rgba(0, 255, 195, 0.4);
        }
        100% {
            background-color: #f5f5f5;
            box-shadow: none;
        }
    }

    @keyframes compareClickFlashActive {
        0% {
            background-color: #62ffe2;
            box-shadow: inset 0 0 0 4px rgba(0, 200, 170, 0.6);
        }
        50% {
            background-color: #a9f7eb;
            box-shadow: inset 0 0 0 2px rgba(0, 200, 170, 0.4);
        }
        100% {
            background-color: #d1f8f6;
            box-shadow: none;
        }
    }
`;

        document.head.appendChild(style);

        compareButton.addEventListener('click', (e) => {
    // Add click animation
    compareButton.classList.add('clicked');
    setTimeout(() => {
        compareButton.classList.remove('clicked');
    }, 400); // matches keyframe duration

    if (e.metaKey || e.ctrlKey) {
        // Reset selection
        selectedImages.forEach(image => {
            image.style.transition = 'all 0.3s ease';
            image.style.borderRadius = '0px';
            image.style.boxShadow = '';
            image.style.borderColor = 'rgba(255, 255, 255, 0)';
            image.style.borderWidth = '2px';
            image.style.backdropFilter = '';
            image.style.webkitBackdropFilter = '';
            image.style.backgroundColor = '';
            image.style.position = '';
            image.style.zIndex = '';
            image.style.overflow = '';
            image.style.willChange = '';
        });

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
        // Delay opening new tab just enough to show animation
        setTimeout(() => {
            openComparisonTab();
        }, 150);
    }
});


        gridContainer.prepend(compareButton);
        toggleCompareButton(); // initialize visual state
    }
}


        function showSelectionAlert() {
            alert('Please Select:\n1 VID for high resolution images\n2-5 VIDs to compare images');
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
        comparisonTab.document.body.style.backgroundColor = 'white';
        comparisonTab.document.body.style.margin = '0';
        comparisonTab.document.body.style.padding = '0';
        comparisonTab.document.body.style.fontFamily = 'Arial, sans-serif';

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

            const vidLink = comparisonTab.document.createElement('a');
            vidLink.href = `https://madame.ynap.biz/retouching/${vid}`;
            vidLink.innerText = vid;
            vidLink.target = '_blank';
            vidLink.style.display = 'block';
            vidLink.style.margin = '10px 0';
            vidLink.style.color = 'black';
            vidLink.style.textDecoration = 'none';
            column.appendChild(vidLink);

            const locales = ['IN', 'OU', 'FR', 'BK', 'OU2', 'CU', 'E1', 'E2', 'E3', 'E4', 'E5'];
            loadImagesForLocales(baseUrl, vid, locales, column, comparisonTab);
        });

        // Inject zoom overlay styles
        const style = comparisonTab.document.createElement('style');
        style.textContent = `
            #zoomOverlay {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                cursor: grab;
            }
            #zoomOverlay img {
                max-width: 100%;
                max-height: 100%;
                transform-origin: center center;
                transition: none;
            }
        `;
        comparisonTab.document.head.appendChild(style);

        comparisonTab.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const overlay = comparisonTab.document.getElementById('zoomOverlay');
                if (overlay) overlay.remove();
            }
        });
    });
}


        function checkAndDisplayImages(vid, locales, column, comparisonTab) {
            let selectedBaseUrl = '';
            const netAPorterUrl = `https://cache.net-a-porter.com/variants/images/${vid}/IN/w2000_a3-4_q80.jpg`;
            const mrPorterUrl = `https://cache.mrporter.com/variants/images/${vid}/IN/w2000_a3-4_q80.jpg`;

            const imagePromises = [
                checkImageAvailability(netAPorterUrl),
                checkImageAvailability(mrPorterUrl)
            ];

            Promise.all(imagePromises).then(results => {
                if (results[0]) {
                    selectedBaseUrl = 'https://cache.net-a-porter.com';
                } else if (results[1]) {
                    selectedBaseUrl = 'https://cache.mrporter.com';
                } else {
                    alert('No images found for this VID.');
                    return;
                }

                loadImagesForLocales(selectedBaseUrl, vid, locales, column, comparisonTab);
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

    const zoomedImg = comparisonTab.document.createElement('img');
    zoomedImg.src = imgUrl;
    zoomedImg.draggable = false; // prevents ghost dragging
    zoomedImg.style.userSelect = 'none'; // prevents text/image selection during drag
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
        scale = Math.min(Math.max(1, scale),10);

        // Optional: zoom into cursor
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
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    updateTransform();
    overlay.style.overflow = 'hidden';
    overlay.style.cursor = 'grab';
});


        imgElement.onerror = function () {
            imgElement.remove();
        };

        column.appendChild(imgElement);
    });
}

        function toggleCompareButton() {
            const compareButton = document.getElementById('compareButton');
            if (compareButton) {
                const isActive = selectedImages.length > 0 && selectedImages.length <= 5;
                toggleActiveStyle(compareButton, isActive);
                compareButton.style.pointerEvents = isActive ? 'auto' : 'auto'; // always clickable
                compareButton.style.opacity = isActive ? '1' : '0.5'; // visual cue
            }
        }

        addClickListeners();
        addCompareButton();
    }

    // Wait for the target class to be found
    waitForClass();
})();
