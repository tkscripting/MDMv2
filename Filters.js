(function () {
    'use strict';

    function createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.margin = '0 5px';
        btn.style.textAlign = 'center';
        btn.style.padding = '8px 16px';
        btn.style.borderRadius = '8px';
        btn.style.border = '1px solid #ccc';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.2s ease';
        btn.addEventListener('click', onClick);
        return btn;
    }

    function toggleActiveStyle(el, isActive) {
        el.style.backgroundColor = isActive ? '#e0f7fa' : '';
        el.style.borderColor = isActive ? '#00796b' : '#ccc';
        el.style.fontWeight = isActive ? 'bold' : 'normal';
    }

    function waitForElement(selector, callback) {
        const checkExist = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(checkExist);
                callback(el);
            }
        }, 500);
    }

    function initButtons(container) {
        console.log('[Filters] Adding filters...');

        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.justifyContent = 'center';
        buttonWrapper.style.marginTop = '10px';

        const getOuterBoxes = () => Array.from(document.querySelectorAll('.MuiBox-root.css-0')).filter(box => {
            let parent = box.parentElement;
            while (parent) {
                if (parent.classList.contains('MuiBox-root') && parent.classList.contains('css-0')) {
                    return false;
                }
                parent = parent.parentElement;
            }
            return true;
        });

        let personalActive = false;

        const nameDropdown = document.createElement('select');
        nameDropdown.style = 'margin: 0 5px; padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc; cursor: pointer; transition: all 0.2s ease;';
        const defaultOption = new Option('All Retouchers', '');
        nameDropdown.appendChild(defaultOption);

        const colorDropdown = document.createElement('select');
        colorDropdown.style = 'margin: 0 5px; padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc; cursor: pointer; transition: all 0.2s ease;';
        const defaultColorOption = new Option('All Colors', '');
        colorDropdown.appendChild(defaultColorOption);

        const personalBtn = createButton('Personal', () => {
            personalActive = !personalActive;

            nameDropdown.value = '';
            colorDropdown.value = '';
            toggleActiveStyle(nameDropdown, false);
            toggleActiveStyle(colorDropdown, false);
            toggleActiveStyle(personalBtn, personalActive);

            console.log(`[Filters] Personal filter ${personalActive ? 'applied' : 'removed'}`);

            const usernameEl = document.querySelector('.MuiTypography-root.MuiTypography-subtitle1.MuiTypography-noWrap.css-aj6ovs');
            const username = usernameEl ? usernameEl.textContent.trim().toLowerCase() : 'unknown';

            getOuterBoxes().forEach(box => {
                const labels = box.querySelectorAll('[aria-label]');
                const matched = Array.from(labels).some(el => el.getAttribute('aria-label')?.toLowerCase().includes(username));
                box.style.display = (!personalActive || matched) ? '' : 'none';
            });
        });

        const nameSet = new Set();
        const colorSet = new Set();
        const outerBoxesInit = getOuterBoxes();

        outerBoxesInit.forEach(outerBox => {
            outerBox.querySelectorAll('.MuiBox-root.css-hfakad').forEach(innerBox => {
                const containsVideo = innerBox.textContent.includes('Video');
                if (containsVideo) return;

                const buttons = innerBox.querySelectorAll('.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeMedium.css-1n031t6');
                if (buttons.length >= 2) {
                    const aria = buttons[1].getAttribute('aria-label');
                    const match = aria?.match(/Author\s+(.+?)\s+-/i);
                    if (match && match[1]) nameSet.add(match[1].trim());
                }
            });

            const typoEls = outerBox.querySelectorAll('.MuiTypography-root.MuiTypography-body2.css-1pngg4p');
            if (typoEls.length >= 1) {
                const colorText = typoEls[0].textContent.trim();
                if (colorText) colorSet.add(colorText);
            }
        });

        Array.from(nameSet).sort().forEach(name => {
            nameDropdown.appendChild(new Option(name, name.toLowerCase()));
        });

        Array.from(colorSet).sort().forEach(color => {
            colorDropdown.appendChild(new Option(color, color.toLowerCase()));
        });

        function applyFilters(type) {
            const selectedName = nameDropdown.value.toLowerCase();
            const selectedColor = colorDropdown.value.toLowerCase();

            toggleActiveStyle(personalBtn, false);

            if (type === 'retoucher') {
                console.log(`[Filters] Filtering by retoucher: "${selectedName}"`);
                toggleActiveStyle(nameDropdown, selectedName !== '');
                toggleActiveStyle(colorDropdown, false);
                colorDropdown.value = '';
                personalActive = false;
            } else if (type === 'color') {
                console.log(`[Filters] Filtering by color: "${selectedColor}"`);
                toggleActiveStyle(colorDropdown, selectedColor !== '');
                toggleActiveStyle(nameDropdown, false);
                nameDropdown.value = '';
                personalActive = false;
            }

            getOuterBoxes().forEach(outerBox => {
                let match = true;

                if (type === 'retoucher' && selectedName) {
                    match = Array.from(outerBox.querySelectorAll('.MuiBox-root.css-hfakad')).some(innerBox => {
                        const buttons = innerBox.querySelectorAll('.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeMedium.css-1n031t6');
                        return buttons.length >= 2 && buttons[1].getAttribute('aria-label')?.toLowerCase().includes(selectedName);
                    });
                } else if (type === 'color' && selectedColor) {
                    const typoEls = outerBox.querySelectorAll('.MuiTypography-root.MuiTypography-body2.css-1pngg4p');
                    const colorText = typoEls.length >= 1 ? typoEls[0].textContent.trim().toLowerCase() : '';
                    match = colorText === selectedColor;
                }

                outerBox.style.display = match ? '' : 'none';
            });
        }

        nameDropdown.addEventListener('change', () => applyFilters('retoucher'));
        colorDropdown.addEventListener('change', () => applyFilters('color'));

        const resetBtn = createButton('Reset', () => {
            getOuterBoxes().forEach(box => box.style.display = '');
            nameDropdown.value = '';
            colorDropdown.value = '';
            toggleActiveStyle(nameDropdown, false);
            toggleActiveStyle(colorDropdown, false);
            personalActive = false;
            toggleActiveStyle(personalBtn, false);
            console.log('[Filters] Resetting filters');
        });

        buttonWrapper.appendChild(personalBtn);
        buttonWrapper.appendChild(nameDropdown);
        buttonWrapper.appendChild(colorDropdown);
        buttonWrapper.appendChild(resetBtn);
        container.appendChild(buttonWrapper);
    }

    waitForElement('.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation2.css-q5d465', initButtons);
})();
