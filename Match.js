// ==UserScript==
// @name         Match
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Color matching with comments and filtering by color matches
// @match        https://madame.ynap.biz/worklist/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('YNAP Combined Match & Filter - Starting...');

    // ===== CLEANUP & STYLES =====
    function cleanup() {
        document.querySelectorAll('[id*="color-matching"], [id*="floating-glass-dock"]').forEach(el => el.remove());
        document.querySelectorAll('.dock-tooltip').forEach(el => el.remove());
    }

    function addStyles() {
        if (document.getElementById('combined-dock-styles')) return;

        const style = document.createElement('style');
        style.id = 'combined-dock-styles';
        style.textContent = `
            #combined-dock {
                position: fixed;
                left: -100px;
                top: 50%;
                transform: translateY(-50%);
                width: 72px;
                min-height: 120px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                justify-content: center;
                align-items: center;
                background: rgba(255,255,255,0.12);
                backdrop-filter: blur(20px) saturate(180%);
                border-radius: 0 24px 24px 0;
                border: 1px solid rgba(255,255,255,0.3);
                border-left: none;
                box-shadow: 0 0 12px rgba(255,255,255,0.25), 4px 0 20px rgba(0,0,0,0.3);
                transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 10000;
            }

            #combined-dock.visible {
                left: 0px;
            }

            #combined-dock::before {
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

            .dock-button {
                width: 48px;
                height: 48px;
                border: none;
                border-radius: 50%;
                background: transparent;
                color: white;
                font-size: 22px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                position: relative;
                z-index: 1;
            }

            .dock-button:hover {
                transform: scale(1.25);
            }

            .dock-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .dock-tooltip {
                position: fixed;
                background: rgba(0,0,0,0.85);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                opacity: 0;
                transition: opacity 0.2s;
                pointer-events: none;
                z-index: 10001;
                white-space: nowrap;
            }

            .color-group-container {
                border: 4px solid transparent;
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 24px;
                background: rgba(255,255,255,0.03);
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
                position: relative;
            }
        `;
        document.head.appendChild(style);
    }

    // ===== DOCK CREATION =====
    function createDock() {
        const dock = document.createElement('div');
        dock.id = 'combined-dock';
        document.body.appendChild(dock);
        return dock;
    }

    function createButton(dock, emoji, tooltip, clickHandler) {
        const button = document.createElement('button');
        button.className = 'dock-button';
        button.innerHTML = emoji;
        button.title = tooltip;

        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'dock-tooltip';
        tooltipEl.textContent = tooltip;
        document.body.appendChild(tooltipEl);

        button.addEventListener('mouseenter', () => {
            tooltipEl.style.opacity = '1';
            const rect = button.getBoundingClientRect();
            tooltipEl.style.left = (rect.right + 12) + 'px';
            tooltipEl.style.top = (rect.top + rect.height/2 - tooltipEl.offsetHeight/2) + 'px';
        });

        button.addEventListener('mouseleave', () => {
            tooltipEl.style.opacity = '0';
        });

        button.addEventListener('click', clickHandler);
        dock.appendChild(button);

        return { button, tooltip: tooltipEl };
    }

    function setupDockBehavior(dock) {
        let isVisible = false;

        document.addEventListener('mousemove', (e) => {
            const fromLeft = e.clientX;
            const verticalCenter = Math.abs(e.clientY - window.innerHeight / 2);

            if (fromLeft < 100 && verticalCenter < window.innerHeight * 0.3) {
                if (!isVisible) {
                    dock.classList.add('visible');
                    isVisible = true;
                }
            } else {
                if (isVisible) {
                    dock.classList.remove('visible');
                    isVisible = false;
                }
            }
        });
    }

    // ===== CHECKBOX FUNCTIONALITY =====
    let checkOrder = 0; // Global counter to track check order

    function addCheckboxes() {
        const products = Array.from(document.querySelectorAll('.css-0')).filter(el => {
            return el.querySelector('h4.css-10pdxui') !== null;
        });

        products.forEach(product => {
            const productIdEl = product.querySelector('h4.css-10pdxui');
            if (!productIdEl) return;

            const productId = productIdEl.textContent.trim();

            const frontStillLifeSection = Array.from(product.querySelectorAll('.css-1dcsz0a')).find(section => {
                const titleSpan = section.querySelector('.css-b6m7zh span');
                return titleSpan && (
                    titleSpan.textContent.includes('Front Still Life') ||
                    titleSpan.getAttribute('title')?.includes('Front Still Life')
                );
            });

            if (frontStillLifeSection) {
                const titleContainer = frontStillLifeSection.querySelector('.css-b6m7zh');
                if (titleContainer && !titleContainer.querySelector('.color-match-checkbox')) {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'color-match-checkbox';
                    checkbox.dataset.productId = productId;
                    checkbox.style.cssText = `
                        margin-left: 10px;
                        transform: scale(1.2);
                        cursor: pointer;
                    `;

                    // Track the order when checkbox is checked/unchecked
                    checkbox.addEventListener('change', function() {
                        if (this.checked) {
                            checkOrder++;
                            this.dataset.checkOrder = checkOrder;
                        } else {
                            delete this.dataset.checkOrder;
                        }
                    });

                    titleContainer.appendChild(checkbox);
                }
            }
        });
    }

    // ===== COLOR MATCHING (ADD COMMENTS) =====
    function getSelectedProducts() {
        const checkboxes = document.querySelectorAll('.color-match-checkbox:checked');
        // Sort by check order (first checked = master)
        const sorted = Array.from(checkboxes).sort((a, b) => {
            const orderA = parseInt(a.dataset.checkOrder) || 0;
            const orderB = parseInt(b.dataset.checkOrder) || 0;
            return orderA - orderB;
        });
        return sorted.map(cb => cb.dataset.productId);
    }

    async function createCommentOnProduct(productId, commentText) {
        const products = Array.from(document.querySelectorAll('.css-0')).filter(el => {
            return el.querySelector('h4.css-10pdxui') !== null;
        });

        const targetProduct = products.find(product => {
            const idEl = product.querySelector('h4.css-10pdxui');
            return idEl && idEl.textContent.trim() === productId;
        });

        if (!targetProduct) return;

        const frontStillLifeSection = Array.from(targetProduct.querySelectorAll('.css-1dcsz0a')).find(section => {
            const titleSpan = section.querySelector('.css-b6m7zh span');
            return titleSpan && (
                titleSpan.textContent.includes('Front Still Life') ||
                titleSpan.getAttribute('title')?.includes('Front Still Life')
            );
        });

        if (!frontStillLifeSection) return;

        const commentButton = frontStillLifeSection.querySelector('button[title="Comments"]');
        if (!commentButton) return;

        commentButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));

        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return;

        const commentInput = dialog.querySelector('#insert-comment');
        if (!commentInput) return;

        commentInput.focus();
        await new Promise(resolve => setTimeout(resolve, 100));

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(commentInput, commentText);

        commentInput.dispatchEvent(new Event('input', { bubbles: true }));
        commentInput.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 500));

        const addButton = Array.from(dialog.querySelectorAll('button')).find(btn =>
                                                                             btn.textContent.trim() === 'Add' && !btn.disabled
                                                                            );
        if (addButton) {
            addButton.click();
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const backdrop = document.querySelector('.MuiBackdrop-root');
        if (backdrop) {
            backdrop.click();
        } else {
            document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
        }

        await new Promise(resolve => setTimeout(resolve, 300));
    }

    async function handleColorMatching() {
        const selectedProducts = getSelectedProducts();

        if (selectedProducts.length < 2) {
            alert('Please select at least 2 products for color matching.');
            return;
        }

        const button = document.querySelector('.dock-button');
        const originalText = button.innerHTML;
        button.innerHTML = '⏳';
        button.disabled = true;

        try {
            // First product in order = master (first checked)
            const referenceProduct = selectedProducts[0];
            const otherProducts = selectedProducts.slice(1);

            console.log(`🎨 Master product (first checked): ${referenceProduct}`);
            console.log(`🔗 Matching products: ${otherProducts.join(', ')}`);

            const referenceComment = `${referenceProduct} matches ${otherProducts.join(' and ')}`;
            await createCommentOnProduct(referenceProduct, referenceComment);

            for (const productId of otherProducts) {
                const comment = `Match to ${referenceProduct}`;
                await createCommentOnProduct(productId, comment);
            }

            document.querySelectorAll('.color-match-checkbox:checked').forEach(cb => {
                cb.checked = false;
                delete cb.dataset.checkOrder; // Clear the order
            });

            alert(`Color matching complete! Comments added to ${selectedProducts.length} products.`);

        } catch (error) {
            console.error('Error during color matching:', error);
            alert('Error occurred during color matching.');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    // ===== API KEY EXTRACTION =====
    async function extractAPIKey() {
        console.log("🔑 Extracting API key...");

        const allScripts = Array.from(document.querySelectorAll('script[src]'));

        // Filter to only local/same-origin scripts
        const localScripts = allScripts.filter(script => {
            try {
                const url = new URL(script.src, window.location.origin);
                return url.origin === window.location.origin;
            } catch (e) {
                return !script.src.startsWith('http') || script.src.startsWith(window.location.origin);
            }
        });

        // Find the main script
        let scriptTag = localScripts.find(s => /\/main\.[^/]*\.js$/i.test(s.src));
        if (!scriptTag) scriptTag = localScripts.find(s => /main.*\.js$/i.test(s.src));
        if (!scriptTag) scriptTag = localScripts.find(s => /bundle.*\.js$/i.test(s.src));
        if (!scriptTag) scriptTag = localScripts.find(s => /app.*\.js$/i.test(s.src));
        if (!scriptTag && localScripts.length > 0) {
            scriptTag = localScripts
                .filter(s => !s.src.includes('vendor') && !s.src.includes('polyfill'))
                .sort((a, b) => b.src.length - a.src.length)[0];
        }

        if (!scriptTag) {
            throw new Error("Could not find suitable script tag for API key extraction");
        }

        console.log(`✅ Using script: ${scriptTag.src}`);

        const scriptUrl = scriptTag.src.startsWith('http') ? scriptTag.src : window.location.origin + scriptTag.src;
        const response = await fetch(scriptUrl);

        if (!response.ok) {
            throw new Error(`HTTP error fetching script! Status: ${response.status}`);
        }

        const scriptContent = await response.text();

        // Search for API key patterns
        const patterns = [
            { name: 'X-Api-Key', regex: /['"]X-Api-Key['"]\s*:\s*['"]([^'"]+)['"]/i },
            { name: 'api_key', regex: /['"]api[_-]?key['"]\s*:\s*['"]([^'"]+)['"]/i },
        ];

        for (const pattern of patterns) {
            const match = scriptContent.match(pattern.regex);
            if (match && match[1]) {
                console.log(`🔑 API Key found: ${match[1]}`);
                return match[1];
            }
        }

        throw new Error("No API key found in script");
    }

    // ===== CHANNEL DETECTION =====
    function detectChannel() {
        const channelElement = document.getElementById('tool-channel');
        if (channelElement && channelElement.textContent.trim() === 'Mr Porter') {
            console.log('🏷️ Channel detected: MRP (Mr Porter)');
            return 'MRP';
        }
        console.log('🏷️ Channel detected: NAP (default)');
        return 'NAP';
    }

    // ===== COLOR FILTERING (REORGANIZE BY COMMENTS) =====
    async function getCommentsForProduct(productId, apiKey, channel, shotType = 'Front Still Life') {
        const apiUrl = `https://madame.ynap.biz/api/comments?channel=${channel}&variantId=${productId}&shotType=${encodeURIComponent(shotType)}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'accept': '*/*',
                    'accept-language': 'en-US,en;q=0.9',
                    'cache-control': 'no-cache',
                    'pragma': 'no-cache',
                    'x-api-key': apiKey
                },
                mode: 'cors',
                credentials: 'include'
            });

            if (!response.ok) {
                console.warn(`⚠️ Failed to fetch comments for ${productId}: ${response.status}`);
                return [];
            }

            const commentsData = await response.json();

            // Extract comment text from the response
            const comments = [];

            // Try different possible structures
            if (Array.isArray(commentsData)) {
                commentsData.forEach(item => {
                    if (typeof item === 'string') {
                        comments.push(item);
                    } else if (item.comment) {
                        comments.push(item.comment);
                    } else if (item.text) {
                        comments.push(item.text);
                    } else if (item.message) {
                        comments.push(item.message);
                    } else if (item.content) {
                        comments.push(item.content);
                    }
                });
            } else if (commentsData.comments && Array.isArray(commentsData.comments)) {
                commentsData.comments.forEach(item => {
                    if (typeof item === 'string') {
                        comments.push(item);
                    } else if (item.comment) {
                        comments.push(item.comment);
                    } else if (item.text) {
                        comments.push(item.text);
                    } else if (item.message) {
                        comments.push(item.message);
                    } else if (item.content) {
                        comments.push(item.content);
                    }
                });
            } else if (commentsData.data && Array.isArray(commentsData.data)) {
                commentsData.data.forEach(item => {
                    if (typeof item === 'string') {
                        comments.push(item);
                    } else if (item.comment) {
                        comments.push(item.comment);
                    } else if (item.text) {
                        comments.push(item.text);
                    } else if (item.message) {
                        comments.push(item.message);
                    } else if (item.content) {
                        comments.push(item.content);
                    }
                });
            }

            return comments;
        } catch (error) {
            console.warn(`⚠️ Error fetching comments for ${productId}:`, error);
            return [];
        }
    }

    function extractProductIdsFromComment(commentText) {
        // Extract all product IDs (14+ digit numbers) from comment
        const idPattern = /\b\d{14,}\b/g;
        const matches = commentText.match(idPattern);
        return matches || [];
    }

    // ===== HYPERLINK COMMENTS IN DIALOG =====
    function convertProductIdsToLinks(element) {
        if (!element || element.dataset.linksConverted) return;

        // Mark as processed to avoid re-processing
        element.dataset.linksConverted = 'true';

        // Get all text nodes
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        // Process each text node
        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const pattern = /\b(\d{14,})\b/g;

            if (pattern.test(text)) {
                // Create a span to replace the text node
                const span = document.createElement('span');

                // Split text and create links
                let lastIndex = 0;
                let match;
                pattern.lastIndex = 0; // Reset regex

                while ((match = pattern.exec(text)) !== null) {
                    // Add text before match
                    if (match.index > lastIndex) {
                        span.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                    }

                    // Create link for the product ID
                    const link = document.createElement('a');
                    link.href = `https://madame.ynap.biz/retouching/${match[1]}`;
                    link.target = '_blank';
                    link.textContent = match[1];

                    span.appendChild(link);
                    lastIndex = match.index + match[0].length;
                }

                // Add remaining text
                if (lastIndex < text.length) {
                    span.appendChild(document.createTextNode(text.substring(lastIndex)));
                }

                // Replace the text node with the span
                textNode.parentNode.replaceChild(span, textNode);
            }
        });
    }

    function setupCommentDialogObserver() {
        // Watch for comment dialogs opening
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if this is a dialog or contains a dialog
                        const dialogs = node.matches?.('[role="dialog"]')
                        ? [node]
                        : node.querySelectorAll?.('[role="dialog"]') || [];

                        dialogs.forEach(dialog => {
                            console.log('📝 Comment dialog detected, waiting for content to load...');

                            // Wait for content to load with polling
                            let attempts = 0;
                            const maxAttempts = 20;

                            const checkForContent = setInterval(() => {
                                attempts++;
                                const contentArea = dialog.querySelector('.MuiDialogContent-root.css-cgcpoo');

                                if (contentArea && contentArea.textContent.trim().length > 0) {
                                    console.log('✅ Content loaded, converting product IDs to links...');
                                    clearInterval(checkForContent);
                                    convertProductIdsToLinks(contentArea);
                                } else if (attempts >= maxAttempts) {
                                    console.log('⏱️ Timeout waiting for content');
                                    clearInterval(checkForContent);
                                }
                            }, 100); // Check every 100ms
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('👁️ Comment dialog observer active');
    }

    async function handleColorFiltering() {
        console.log('═'.repeat(60));
        console.log('🔀 STARTING COLOR FILTERING');
        console.log('═'.repeat(60));

        const filterButton = document.getElementById('filter-button');
        const originalText = filterButton.innerHTML;
        filterButton.innerHTML = '⏳';
        filterButton.disabled = true;

        try {
            // Extract API key first
            console.log('🔑 Extracting API key...');
            const apiKey = await extractAPIKey();

            // Detect channel
            const channel = detectChannel();

            // Get all products
            const products = Array.from(document.querySelectorAll('.css-0')).filter(el => {
                return el.querySelector('h4.css-10pdxui') !== null;
            });

            console.log(`\n📦 Found ${products.length} products on page`);
            console.log('─'.repeat(60));

            // Build match map using API calls
            const matchMap = new Map(); // productId -> [matching productIds]

            console.log('\n💬 Fetching comments via API...');

            // Fetch all comments in parallel for speed
            const commentPromises = products.map(async (product, index) => {
                const productIdEl = product.querySelector('h4.css-10pdxui');
                if (!productIdEl) return null;

                const productId = productIdEl.textContent.trim();
                const comments = await getCommentsForProduct(productId, apiKey, channel);

                return { productId, comments };
            });

            const results = await Promise.all(commentPromises);

            // Calculate summary stats
            const productsWithComments = results.filter(r => r && r.comments.length > 0).length;
            const totalComments = results.reduce((sum, r) => sum + (r ? r.comments.length : 0), 0);

            console.log(`✅ Fetched comments for ${products.length} products`);
            console.log(`   Products with comments: ${productsWithComments}`);
            console.log(`   Total comments found: ${totalComments}`);

            console.log('\n' + '─'.repeat(60));
            console.log('🔍 Analyzing color matches...');

            // Process results and build match map
            results.forEach(result => {
                if (!result) return;

                const { productId, comments } = result;
                const allMatchedIds = new Set();

                comments.forEach(comment => {
                    const ids = extractProductIdsFromComment(comment);
                    ids.forEach(id => {
                        if (id !== productId) {
                            allMatchedIds.add(id);
                        }
                    });
                });

                if (allMatchedIds.size > 0) {
                    matchMap.set(productId, Array.from(allMatchedIds));
                }
            });

            console.log(`✅ Found ${matchMap.size} products with color matches`);

            // Build groups of matched products
            const groups = [];
            const processed = new Set();

            matchMap.forEach((matches, productId) => {
                if (processed.has(productId)) return;

                const group = new Set([productId]);
                const queue = [productId];

                while (queue.length > 0) {
                    const current = queue.shift();
                    processed.add(current);

                    const currentMatches = matchMap.get(current) || [];
                    currentMatches.forEach(matchId => {
                        if (!group.has(matchId)) {
                            group.add(matchId);
                            queue.push(matchId);
                        }
                    });
                }

                groups.push(Array.from(group));
            });

            console.log(`✅ Formed ${groups.length} matching groups`);

            // Generate elegant colors for groups - sophisticated jewel tones
            const groupColors = [
                '#7C3AED', // Deep Violet
                '#DB2777', // Rose
                '#047857', // Forest Green
                '#0891B2', // Deep Cyan
                '#D97706', // Rich Amber
                '#2563EB', // Sapphire Blue
                '#059669', // Emerald
                '#DC2626', // Ruby
                '#7C2D12', // Mahogany
                '#4F46E5', // Indigo
                '#BE123C', // Crimson
                '#0D9488', // Teal
                '#EA580C', // Burnt Orange
                '#6D28D9', // Imperial Purple
                '#BE185D' // Magenta
            ];

            // Reorganize DOM and add visual indicators
            console.log('🔄 Reorganizing products...');
            const container = products[0].parentElement;
            const unmatched = [];

            // Clear any existing group styling
            document.querySelectorAll('.color-group-container').forEach(el => el.remove());
            products.forEach(product => {
                product.style.border = '';
            });

            // Remove all products from DOM first
            products.forEach(product => {
                const productIdEl = product.querySelector('h4.css-10pdxui');
                const productId = productIdEl?.textContent.trim();

                if (!matchMap.has(productId) && !Array.from(matchMap.values()).some(arr => arr.includes(productId))) {
                    unmatched.push(product);
                }

                product.remove();
            });

            // Re-add products with visual grouping - wrap each group in a container
            groups.forEach((group, groupIndex) => {
                const groupColor = groupColors[groupIndex % groupColors.length];

                // Create group container
                const groupContainer = document.createElement('div');
                groupContainer.className = 'color-group-container';
                groupContainer.style.borderColor = groupColor;

                // Add all products in this group to the container
                group.forEach(productId => {
                    const product = products.find(p => {
                        const idEl = p.querySelector('h4.css-10pdxui');
                        return idEl && idEl.textContent.trim() === productId;
                    });

                    if (product) {
                        groupContainer.appendChild(product);
                    }
                });

                container.appendChild(groupContainer);
            });

            // Add unmatched products at the end (no styling)
            unmatched.forEach(product => {
                container.appendChild(product);
            });

            console.log(`✅ Complete! ${groups.length} groups, ${unmatched.length} unmatched products`);
            console.log('═'.repeat(60));

            alert(`✅ Filtering complete!\n\n${groups.length} matching groups reorganized.\nCheck console for details.`);

        } catch (error) {
            console.error('❌ ERROR during color filtering:', error);
            alert(`❌ Error: ${error.message}\n\nCheck console for details.`);
        } finally {
            filterButton.innerHTML = originalText;
            filterButton.disabled = false;
        }
    }

    // ===== INITIALIZATION =====
    function init() {
        console.log('Initializing combined dock...');

        cleanup();
        addStyles();

        const dock = createDock();

        // Button 1: Color Matching (add comments)
        createButton(dock, '🎨', 'Color Matching', handleColorMatching);

        // Button 2: Color Filtering (reorganize)
        const { button: filterButton } = createButton(dock, '🔀', 'Color Filtering', handleColorFiltering);
        filterButton.id = 'filter-button';

        setupDockBehavior(dock);
        addCheckboxes();

        // Set up comment dialog observer for hyperlinks
        setupCommentDialogObserver();

        // Re-add checkboxes on content changes
        const observer = new MutationObserver(() => {
            addCheckboxes();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        console.log('Combined dock initialization complete!');
    }

    // Start when page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
