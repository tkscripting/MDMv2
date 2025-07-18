// ==UserScript==
// @name         Emails
// @namespace    https://madame.ynap.biz/
// @version      3.12
// @description  Adds "Generate Email" button to validation page, creates a formatted clipboard to paste into emails
// @match        https://madame.ynap.biz/shooting-validation*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // URL guard: run only on shooting-validation pages
    if (!/\/shooting-validation/.test(location.pathname)) return;

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Inject Font Awesome CSS if not already present
    function injectFontAwesome() {
        if (document.querySelector('link[href*="font-awesome"]')) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
        document.head.appendChild(link);
    }

    // Create generate button with icon
    function createGenerateButton(text, onClick) {
        const button = document.createElement('button');
        button.className = 'cssbuttons-io-button';
        button.innerHTML = `
      ${text}
      <div class="icon">
        <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"></path>
        </svg>
      </div>
    `;
        button.addEventListener('click', onClick);
        return button;
    }

    // Create copy button with animated states
    function createCopyButton(text, onClick) {
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.innerHTML = `
      <span>COPY</span>
      <div class="copy-icon">
        <svg class="copy-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
        <i class="fa fa-check check-icon"></i>
      </div>
    `;

        button.addEventListener('click', async (e) => {
            await onClick(e);
            // Add success state
            button.classList.add('success');
            // Remove success state after 2 seconds
            setTimeout(() => {
                button.classList.remove('success');
            }, 2000);
        });

        return button;
    }

    // Inject CSS styles for buttons
    function injectStyles() {
        if (document.getElementById('button-styles')) return;

        const style = document.createElement('style');
        style.id = 'button-styles';
        style.textContent = `
      .cssbuttons-io-button {
        background: transparent;
        color: #212121;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        padding: 5px 15px;
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: 4px;
        border: 1px solid rgba(33, 33, 33, 0.5);
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        box-shadow: none;
        overflow: hidden;
        position: relative;
        height: 36.5px;
        min-width: 64px;
        cursor: pointer;
        padding-right: 3.3em;
        transition: all 0.3s;
        text-transform: uppercase;
        line-height: 1.75;
      }

      .cssbuttons-io-button:hover {
        background: rgba(33, 33, 33, 0.04);
        border-color: #212121;
      }

      .cssbuttons-io-button .icon {
        background: #212121;
        margin-left: 1em;
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 2.2em;
        width: 2.2em;
        border-radius: 4px;
        box-shadow: 0.1em 0.1em 0.6em 0.2em rgba(33, 33, 33, 0.2);
        right: 0.3em;
        transition: all 0.3s;
      }

      .cssbuttons-io-button:hover .icon {
        width: calc(100% - 0.6em);
      }

      .cssbuttons-io-button .icon svg {
        width: 1.1em;
        transition: transform 0.3s;
        color: white;
      }

      .cssbuttons-io-button:hover .icon svg {
        transform: translateX(0.1em);
      }

      .cssbuttons-io-button:active .icon {
        transform: scale(0.95);
      }

      /* Copy button styles */
      .copy-button {
        display: block;
        background-color: #212121;
        width: 160px;
        height: 50px;
        line-height: 50px;
        margin: 16px auto 0;
        color: #fff;
        position: relative;
        cursor: pointer;
        overflow: hidden;
        border-radius: 5px;
        box-shadow: 0 0 20px 0 rgba(0,0,0,.3);
        transition: all 0.25s cubic-bezier(0.310, -0.105, 0.430, 1.400);
        text-decoration: none;
        border: none;
        font-family: inherit;
      }

      .copy-button span,
      .copy-button .copy-icon {
        display: block;
        height: 100%;
        text-align: center;
        position: absolute;
        top: 0;
      }

      .copy-button span {
        width: 72%;
        line-height: inherit;
        font-size: 16px;
        text-transform: uppercase;
        left: 0;
        transition: all 0.25s cubic-bezier(0.310, -0.105, 0.430, 1.400);
      }

      .copy-button span:after {
        content: '';
        background-color: #fff;
        width: 2px;
        height: 70%;
        position: absolute;
        top: 15%;
        right: -1px;
      }

      .copy-button .copy-icon {
        width: 28%;
        right: 0;
        transition: all 0.25s cubic-bezier(0.310, -0.105, 0.430, 1.400);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .copy-button .copy-icon svg {
        width: 18px;
        height: 18px;
        transition: all 0.25s cubic-bezier(0.310, -0.105, 0.430, 1.400);
        fill: currentColor;
      }

      .copy-button .check-icon {
        display: none;
        font-size: 24px;
        color: currentColor;
        transition: all 0.25s cubic-bezier(0.310, -0.105, 0.430, 1.400);
      }

      .copy-button.success,
      .copy-button:hover {

      }

      .copy-button:hover span {
        left: -72%;
        opacity: 0;
      }

      .copy-button:hover .copy-icon {
        width: 100%;
      }

      .copy-button:hover .copy-icon svg {
        width: 22px;
        height: 22px;
      }

      .copy-button:hover .check-icon {
        font-size: 28px;
      }

      .copy-button.success {
        background-color: #27ae60;
      }

      .copy-button.success .copy-icon .copy-svg {
        display: none;
      }

      .copy-button.success .check-icon {
        display: block;
      }

      .copy-button.success span {
        left: -72%;
        opacity: 0;
      }

      .copy-button.success .copy-icon {
        width: 100%;
      }

      .copy-button:active {
        opacity: 1;
      }

      /* Hide scrollbar for webkit browsers */
      .popup-box::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }

      .popup-box {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
    `;
        document.head.appendChild(style);
    }

    // Find scrollable container for loading more content
    function findScrollableContainer() {
        for (const el of document.querySelectorAll('*')) {
            const s = getComputedStyle(el);
            if ((s.overflow === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                return el;
            }
        }
        return document.documentElement;
    }

    // Ensure all VIDs are loaded by scrolling
    async function ensureAllLoaded() {
        const container = findScrollableContainer();
        let last = 0, same = 0;

        while (same < 5) {
            container.scrollTop = container.scrollHeight;
            await sleep(100);
            const curr = document.querySelectorAll('.MuiBox-root.css-17amug2').length;
            if (curr > last) {
                last = curr;
                same = 0;
            } else {
                same++;
            }
        }

        container.scrollTop = 0;
        await sleep(200);
    }

    // Collect all VID and brand pairs from the page
    function collectItems() {
        return Array.from(document.querySelectorAll('.MuiBox-root.css-17amug2')).map(el => {
            const vid = el.textContent.trim();
            const box = el.closest('.MuiBox-root.css-1qm1lh');
            const brand = box?.querySelector('h3.css-1j3qkuf')?.textContent.trim() || '—';
            return { vid, brand };
        });
    }

    // Build and show the popup with VID list
    function buildPopup(items) {
        const count = items.length;

        // Modal box
        const box = document.createElement('div');
        box.className = 'popup-box';
        Object.assign(box.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'auto',
            minWidth: '200px',
            maxWidth: '80vw',
            maxHeight: '98vh',
            padding: '20px 24px',
            background: 'rgba(255,255,255,0.20)',
            backdropFilter: 'blur(18px)',
            border: '1px solid rgba(0,0,0,0.25)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            color: '#000',
            fontFamily: 'Aptos, sans-serif',
            fontSize: '14px',
            lineHeight: '1.4',
            overflow: 'auto',
            whiteSpace: 'nowrap',
            wordBreak: 'break-word',
            zIndex: 9999999
        });

        // Header
        const hdr = document.createElement('div');
        hdr.textContent = `${count} ${count === 1 ? 'VID' : 'VIDs'}`;
        hdr.style.cssText = 'font-weight:600; font-size:16px; margin-bottom:12px; text-align:center;';
        box.appendChild(hdr);

        // List entries with numbering
        items.forEach(({ vid, brand }, index) => {
            const line = document.createElement('div');
            line.textContent = `${index + 1}. ${vid} – ${brand}`;
            line.style.margin = '4px 0';
            box.appendChild(line);
        });

        // Copy button
        const copyBtn = createCopyButton('COPY', async () => {
            const ids = items.map(i => i.vid).join(',');
            const url = `https://madame.ynap.biz/shooting-validation?id=${ids}`;

            // HTML: two <br> between link and numbered list
            const html =
                  `<div style="font-family:Aptos, sans-serif; line-height:1.4;">` +
                  `<a href="${url}">Madame</a><br><br>` +
                  items.map((i, index) => `${index + 1}. ${i.vid} – ${i.brand}`).join('<br>') +
                  `</div>`;

            // Plain text: two newlines between URL and numbered list
            const listText = items.map((i, index) => `${index + 1}. ${i.vid} – ${i.brand}`).join('\n');
            const plain = `${url}\n\n${listText}`;

            try {
                if (navigator.clipboard && navigator.clipboard.write) {
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'text/html': new Blob([html], { type: 'text/html' }),
                            'text/plain': new Blob([plain], { type: 'text/plain' })
                        })
                    ]);
                } else {
                    const listener = e => {
                        e.preventDefault();
                        e.clipboardData.setData('text/html', html);
                        e.clipboardData.setData('text/plain', plain);
                    };
                    document.addEventListener('copy', listener);
                    document.execCommand('copy');
                    document.removeEventListener('copy', listener);
                }
            } catch (e) {
                alert('Clipboard error: ' + e);
            }
        });

        box.appendChild(copyBtn);
        document.body.appendChild(box);

        // Event handlers for closing popup
        function remove() {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('click', onClick, true);
            box.remove();
        }

        function onKey(e) {
            if (e.key === 'Escape') remove();
        }

        function onClick(e) {
            if (!box.contains(e.target)) remove();
        }

        document.addEventListener('keydown', onKey);
        document.addEventListener('click', onClick, true);
    }

    // Main function to show the popup
    async function showPopup() {
        await ensureAllLoaded();
        const items = collectItems();
        if (!items.length) return alert('No VIDs found.');
        items.sort((a, b) => a.brand.localeCompare(b.brand));
        buildPopup(items);
    }

    // Inject the generate button into the page
    function injectButton() {
        const anchor = document.querySelector('.MuiBox-root.css-70qvj9');
        if (!anchor || document.getElementById('vid-popup-btn')) return;

        const btn = createGenerateButton('Generate Email', showPopup);
        btn.id = 'vid-popup-btn';
        btn.style.marginRight = '8px';

        // Insert the button inside the css-70qvj9 container, before the "Select items to copy" button
        anchor.insertBefore(btn, anchor.firstChild);
    }

    // Initialize the script
    injectFontAwesome();
    injectStyles();
    const root = document.querySelector('#root') || document.body;
    new MutationObserver(injectButton).observe(root, { childList: true, subtree: true });
    injectButton();

})();
