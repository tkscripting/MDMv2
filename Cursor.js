// ==UserScript==
// @name         Cursor
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Upload or choose a custom cursor
// @match        https://madame.ynap.biz/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const EMOJI_LIST = ['💅', '🐚', '🪱', '☄️', '🗿', '💊'];
    const STORAGE_KEY = 'madameCustomCursorImage';
    const SIZE_KEY = 'madameCustomCursorSize';
    const OFFSET_X_KEY = 'madameCustomCursorOffsetX';
    const OFFSET_Y_KEY = 'madameCustomCursorOffsetY';

    let tempCursorURL = localStorage.getItem(STORAGE_KEY);
    let tempSize = localStorage.getItem(SIZE_KEY) || 32;
    let tempOffsetX = localStorage.getItem(OFFSET_X_KEY) || 0;
    let tempOffsetY = localStorage.getItem(OFFSET_Y_KEY) || 0;

function injectCursor(url, size, offsetX, offsetY, showCrosshair = false) {
    removeCursor(); // Remove old cursor and crosshair

    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    cursor.style = `
        position: fixed;
        top: 0; left: 0;
        width: ${size}px;
        height: ${size}px;
        pointer-events: none;
        background-image: url(${url});
        background-size: contain;
        background-repeat: no-repeat;
        z-index: 99999;
        transition: transform 0.2s ease;
    `;
    document.body.appendChild(cursor);

    if (showCrosshair) {
        const crosshair = document.createElement('div');
        crosshair.id = 'cursor-crosshair';
        crosshair.style = `
            position: fixed;
            top: 0; left: 0;
            width: 6px;
            height: 6px;
            background: red;
            border-radius: 50%;
            pointer-events: none;
            z-index: 100000;
            transform: translate(-50%, -50%);
        `;
        document.body.appendChild(crosshair);
    }

    const style = document.createElement('style');
    style.id = 'global-cursor-none';
    style.textContent = `* { cursor: none !important; }`;
    document.head.appendChild(style);

    document.body.style.cursor = 'none';

    document.addEventListener('mousemove', e => {
        cursor.style.left = `${e.clientX + Number(offsetX)}px`;
        cursor.style.top = `${e.clientY + Number(offsetY)}px`;

        const cross = document.getElementById('cursor-crosshair');
        if (cross) {
            cross.style.left = `${e.clientX}px`;
            cross.style.top = `${e.clientY}px`;
        }
    });

    document.addEventListener('mousedown', () => {
        cursor.style.transform = 'scale(0.85)';
    });

    document.addEventListener('mouseup', () => {
        cursor.style.transform = 'scale(1)';
    });

    document.addEventListener('mouseover', e => {
        const tag = e.target.tagName.toLowerCase();
        const isInteractive = ['button', 'a', 'input', 'label'].includes(tag) || e.target.getAttribute('role') === 'button';
        if (isInteractive) {
            cursor.style.transform = 'scale(1.25) rotate(-10deg)';
        }
    });

    document.addEventListener('mouseout', () => {
        cursor.style.transform = 'scale(1) rotate(0deg)';
    });
}


    function updateCursorPosition(e) {
        const cursor = document.getElementById('custom-cursor');
        const crosshair = document.getElementById('cursor-crosshair');
        if (cursor) {
            cursor.style.left = `${e.clientX + parseInt(tempOffsetX)}px`;
            cursor.style.top = `${e.clientY + parseInt(tempOffsetY)}px`;
        }
        if (crosshair) {
            crosshair.style.left = `${e.clientX}px`;
            crosshair.style.top = `${e.clientY}px`;
        }
    }

    function removeCursor() {
        ['custom-cursor', 'cursor-crosshair', 'global-cursor-none'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        document.body.style.cursor = 'auto';
        document.removeEventListener('mousemove', updateCursorPosition);
    }

    function applyAndSave() {
        localStorage.setItem(STORAGE_KEY, tempCursorURL);
        localStorage.setItem(SIZE_KEY, tempSize);
        localStorage.setItem(OFFSET_X_KEY, tempOffsetX);
        localStorage.setItem(OFFSET_Y_KEY, tempOffsetY);
        injectCursor(tempCursorURL, tempSize, tempOffsetX, tempOffsetY, false);
    }

    function resetCursor() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SIZE_KEY);
    localStorage.removeItem(OFFSET_X_KEY);
    localStorage.removeItem(OFFSET_Y_KEY);
    removeCursor();
    document.body.style.cursor = 'auto';
    const styleTag = document.getElementById('global-cursor-none');
    if (styleTag) styleTag.remove();
}

    function showPopup() {
        if (document.getElementById('emoji-cursor-popup')) return;

        injectCursor(tempCursorURL, tempSize, tempOffsetX, tempOffsetY, true);

        const popup = document.createElement('div');
        popup.id = 'emoji-cursor-popup';
        popup.style = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1e1e1e;
            padding: 24px 32px;
            border-radius: 16px;
            z-index: 9999;
            color: white;
            font-family: 'Segoe UI', sans-serif;
            text-align: center;
            box-shadow: 0 0 24px rgba(0,0,0,0.5);
            min-width: 300px;
        `;

        const emojiBox = document.createElement('div');
        emojiBox.style = 'display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-bottom: 24px;';
        EMOJI_LIST.forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.style = 'cursor: pointer; font-size: 30px;';
            span.onclick = () => {
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
                    <text y="50%" x="50%" dominant-baseline="middle" text-anchor="middle" font-size="48">${emoji}</text>
                </svg>`;
                tempCursorURL = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
                injectCursor(tempCursorURL, tempSize, tempOffsetX, tempOffsetY, true);
            };
            emojiBox.appendChild(span);
        });
        popup.appendChild(emojiBox);

        const addSlider = (label, value, min, max, oninput) => {
            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            labelEl.style = 'display: block; margin-bottom: 6px; font-size: 14px;';
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.value = value;
            slider.style = 'width: 100%; margin-bottom: 16px;';
            slider.oninput = oninput;
            popup.appendChild(labelEl);
            popup.appendChild(slider);
        };

        addSlider('Size', tempSize, 16, 96, e => {
            tempSize = e.target.value;
            injectCursor(tempCursorURL, tempSize, tempOffsetX, tempOffsetY, true);
        });

addSlider('Horizontal Offset', tempOffsetX, -128, 128, e => {
    tempOffsetX = e.target.value;
    injectCursor(tempCursorURL, tempSize, tempOffsetX, tempOffsetY, true);
});

addSlider('Vertical Offset', tempOffsetY, -128, 128, e => {
    tempOffsetY = e.target.value;
    injectCursor(tempCursorURL, tempSize, tempOffsetX, tempOffsetY, true);
});


        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/png,image/webp,image/jpeg,image/svg+xml';
        fileInput.style.display = 'none';
        fileInput.id = 'cursor-upload-input';

        const uploadLabel = document.createElement('label');
        uploadLabel.textContent = '📁 Browse Image';
        uploadLabel.setAttribute('for', 'cursor-upload-input');
        uploadLabel.style = `
            display: inline-block;
            padding: 8px 16px;
            background: #333;
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 20px;
        `;

        fileInput.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = evt => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const size = 64;
                    canvas.width = size;
                    canvas.height = size;
                    const scale = Math.min(size / img.width, size / img.height);
                    const newWidth = img.width * scale;
                    const newHeight = img.height * scale;
                    const offsetX = (size - newWidth) / 2;
                    const offsetY = (size - newHeight) / 2;
                    ctx.clearRect(0, 0, size, size);
                    ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight);
                    tempCursorURL = canvas.toDataURL('image/png');
                    injectCursor(tempCursorURL, tempSize, tempOffsetX, tempOffsetY, true);
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        };

        popup.appendChild(uploadLabel);
        popup.appendChild(fileInput);

const btnRow = document.createElement('div');
btnRow.style = 'display: flex; justify-content: center; gap: 12px; margin-top: 16px;';

const applyBtn = document.createElement('button');
applyBtn.textContent = 'Apply';
applyBtn.style = 'padding: 6px 14px; background: #0b7; color: white; border: none; border-radius: 8px; cursor: pointer;';
applyBtn.onclick = () => {
    applyAndSave();
    popup.remove();
};

const resetBtn = document.createElement('button');
resetBtn.textContent = 'Reset';
resetBtn.style = 'padding: 6px 14px; background: #c33; color: white; border: none; border-radius: 8px; cursor: pointer;';
resetBtn.onclick = () => {
    resetCursor();
    popup.remove();
};

const cancelBtn = document.createElement('button');
cancelBtn.textContent = 'Cancel';
cancelBtn.style = 'padding: 6px 14px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer;';
cancelBtn.onclick = () => {
    removeCursor();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        injectCursor(saved, localStorage.getItem(SIZE_KEY), localStorage.getItem(OFFSET_X_KEY), localStorage.getItem(OFFSET_Y_KEY), false);
    }
    popup.remove();
};

btnRow.appendChild(applyBtn);
btnRow.appendChild(resetBtn);
btnRow.appendChild(cancelBtn);
popup.appendChild(btnRow);


        document.body.appendChild(popup);
    }

    const combo = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Enter'];
    let buffer = [];

    document.addEventListener('keydown', e => {
        buffer.push(e.key);
        if (buffer.length > combo.length) buffer.shift();
        if (combo.every((key, i) => buffer[i]?.toLowerCase() === key.toLowerCase())) {
            showPopup();
            buffer = [];
        }
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        injectCursor(
            saved,
            localStorage.getItem(SIZE_KEY),
            localStorage.getItem(OFFSET_X_KEY),
            localStorage.getItem(OFFSET_Y_KEY),
            false
        );
    }
})();
