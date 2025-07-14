// ==UserScript==
// @name         Games
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Unlimited games, but no games
// @match        https://madame.ynap.biz/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- OPTIMIZED FIREBASE SETUP ---
    const firebaseScripts = [
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'
    ];

    const firebaseConfig = {
        apiKey: "AIzaSyCMOQbRMnv_P89_g8PiWqxQm7rlgsrZ7jw",
        authDomain: "mdms-67bd4.firebaseapp.com",
        projectId: "mdms-67bd4",
        storageBucket: "mdms-67bd4.firebasestorage.app",
        messagingSenderId: "968504770003",
        appId: "1:968504770003:web:afa2c955c6658ff761c326"
    };

    let db;
    let firebaseReady = false;
    const firebaseCallbacks = [];

    // --- CLEANUP: keep only top-5 ChromaKey scores ---
    function cleanupChromaKey(db) {
        if (!db) return;
        const col = db.collection('ChromaKey_scores');
        col.orderBy('score','desc').limit(5).get()
            .then(topSnap => {
                const keep = new Set(topSnap.docs.map(d => d.id));
                return col.get().then(allSnap => {
                    allSnap.docs.forEach(d => {
                        if (!keep.has(d.id)) col.doc(d.id).delete();
                    });
                });
            })
            .catch(console.error);
    }

    // --- CLEANUP: keep only top-5 Pathfinder scores ---
    function cleanupPathfinder(db) {
        if (!db) return;
        const col = db.collection('Pathfinder_scores');
        col.orderBy('score','desc').limit(5).get()
            .then(topSnap => {
                const keep = new Set(topSnap.docs.map(d => d.id));
                return col.get().then(allSnap => {
                    allSnap.docs.forEach(d => {
                        if (!keep.has(d.id)) col.doc(d.id).delete();
                    });
                });
            })
            .catch(console.error);
    }

    function loadScripts(scripts, cb) {
        // Check if Firebase is already loaded (by banners script or other)
        if (typeof firebase !== 'undefined') {
            console.log('[Games] ✅ Firebase already loaded, checking modules...');

            // Check if required modules are available
            if (typeof firebase.auth === 'function' && typeof firebase.firestore === 'function') {
                console.log('[Games] ✅ All Firebase modules available, skipping script loading');
                cb();
                return;
            } else {
                console.log('[Games] ⚠️ Firebase loaded but missing modules, loading additional scripts...');
            }
        }

        // Only load scripts that aren't already loaded
        const scriptsToLoad = scripts.filter(src =>
            ![...document.scripts].some(script => script.src === src)
        );

        if (scriptsToLoad.length === 0) {
            console.log('[Games] ✅ All Firebase scripts already loaded');
            cb();
            return;
        }

        let loaded = 0;
        scriptsToLoad.forEach(src => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => {
                console.log('[Games] ✅ Loaded:', src);
                if (++loaded === scriptsToLoad.length) cb();
            };
            s.onerror = () => {
                console.error('[Games] ❌ Failed to load Firebase script:', src);
                if (++loaded === scriptsToLoad.length) cb();
            };
            document.head.appendChild(s);
        });
    }

    function whenFirebaseReady(callback) {
        if (firebaseReady) {
            callback(db);
        } else {
            firebaseCallbacks.push(callback);
        }
    }

    function initializeFirebase() {
        // Add a small delay and check if Firebase is actually available
        if (typeof firebase === 'undefined') {
            console.log('[Games] ⏳ Firebase not yet available, waiting...');
            setTimeout(initializeFirebase, 200);
            return;
        }

        try {
            // Use a unique app name to avoid conflicts with banners script
            const appName = 'games-userscript-app';
            let app;

            try {
                // Try to get existing app with our unique name
                app = firebase.app(appName);
                console.log('[Games] ✅ Using existing Games Firebase app');
            } catch (e) {
                // App doesn't exist, create it with unique name
                app = firebase.initializeApp(firebaseConfig, appName);
                console.log('[Games] ✅ Created new Games Firebase app');
            }

            // Check if auth module is available
            if (typeof firebase.auth !== 'function') {
                console.warn('[Games] ⚠️ Firebase Auth module not available, continuing without authentication');
                setupFirestore(app);
                return;
            }

            // Sign in anonymously using our specific app
            const auth = app.auth();
            if (auth.currentUser) {
                console.log('[Games] ✅ Already authenticated');
                setupFirestore(app);
            } else {
                auth.signInAnonymously()
                    .then(() => {
                        console.log('[Games] ✅ Firebase auth successful');
                    })
                    .catch(err => {
                        console.error('[Games] ❌ Firebase auth error:', err);
                        console.warn('[Games] 🔧 Please enable Anonymous Authentication in Firebase Console');
                    })
                    .finally(() => {
                        setupFirestore(app);
                    });
            }
        } catch (initErr) {
            console.error('[Games] ❌ Firebase initialization error:', initErr);
            // Allow game to continue without Firebase
            firebaseReady = true;
            firebaseCallbacks.forEach(cb => cb(null));
            firebaseCallbacks.length = 0;
        }
    }

    function setupFirestore(app) {
        try {
            // Check if firestore module is available
            if (typeof firebase.firestore !== 'function') {
                console.warn('[Games] ⚠️ Firebase Firestore module not available');
                db = null;
            } else {
                db = app.firestore();
                console.log('[Games] ✅ Firestore initialized successfully');
            }

            firebaseReady = true;
            firebaseCallbacks.forEach(cb => cb(db));
            firebaseCallbacks.length = 0;
        } catch (firestoreErr) {
            console.error('[Games] ❌ Firestore initialization error:', firestoreErr);
            // Allow game to continue without Firebase
            firebaseReady = true;
            firebaseCallbacks.forEach(cb => cb(null));
            firebaseCallbacks.length = 0;
        }
    }

    // Start Firebase initialization
    loadScripts(firebaseScripts, initializeFirebase);

    // --- HELPER: name-click menu launcher ---
    function attachNameClick() {
        const selectors = [
            '.MuiTypography-root.MuiTypography-subtitle1.MuiTypography-noWrap.css-ywpd4f',
            '.MuiTypography-root.MuiTypography-subtitle1.MuiTypography-noWrap.css-aj6ovs',
            '.MuiTypography-root.MuiTypography-subtitle1.MuiTypography-noWrap[class*="css-"]',
            '.MuiTypography-subtitle1.MuiTypography-noWrap',
            '[class*="MuiTypography-subtitle1"][class*="MuiTypography-noWrap"]'
        ];

        const bind = el => {
            el.addEventListener('click', showGameMenu);
        };

        const findAndBind = () => {
            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el) {
                    bind(el);
                    return true;
                }
            }
            return false;
        };

        const init = () => {
            if (findAndBind()) return;

            const mo = new MutationObserver(() => {
                if (findAndBind()) {
                    mo.disconnect();
                }
            });
            mo.observe(document.body, { childList: true, subtree: true });
        };

        init();
    }

    function showGameMenu(e) {
        const full = e.currentTarget.textContent.trim();
        const parts = full.split(' ');
        const formatted = parts.length > 1
        ? `${parts[0]} ${parts[1][0]}`
        : parts[0];

        window.playerName = formatted;
        window.playerNameCK = formatted;

        const overlay = document.createElement('div');
        overlay.style = `
            position:fixed;
            top:0; left:0;
            width:100%; height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:10000;
        `;
        document.body.appendChild(overlay);

        const panel = document.createElement('div');
        panel.style = `
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(16px);
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.25);
            display: flex;
            gap: 12px;
            padding: 24px;
            flex-wrap: wrap;
            justify-content: center;
        `;
        panel.innerHTML = `
            <button
                id="chromakey-btn"
                style="
                    padding: 10px 16px;
                    border: none;
                    border-radius: 8px;
                    background: linear-gradient(to right, #43e97b, #38f9d7);
                    color: #111;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    transition: transform 0.15s;
                "
            >
                ChromaKey
            </button>
        `;
        overlay.appendChild(panel);

        overlay.addEventListener('click', ev => {
            if (ev.target === overlay) overlay.remove();
        });

        // Use event delegation to avoid timing issues
        panel.addEventListener('click', (ev) => {
            if (ev.target.id === 'chromakey-btn') {
                overlay.remove();
                startGame();
            }
        });
    }

    // ==================================
    // ======  CHROMAKEY GAME CODE ======
    // ==================================
    (function () {
        'use strict';

        // --- CONSTANTS ---
        const CONFIG = {
            MIN_GRID_SIZE: 2,
            MAX_GRID_SIZE: 8,
            GRID_INCREMENT: 1,
            MAX_SCORE_PER_ROUND: 100,
            TIME_PENALTY_DIVISOR: 100,
            ROUND_MULTIPLIER: 0.3,
            MIN_SCORE: 5,
            TILE_GAP: 10,
            TILE_MARGIN: 10,
            GRID_PADDING: 2,
            ANIMATION_DURATION: 300,
            CLICK_DELAY: 100,
            MAX_VARIANCE: 65,
            MIN_VARIANCE: 12,
            VARIANCE_REDUCTION: 1.8,
            COLOR_RANGES: {
                HUE: { min: 0, max: 360 },
                SATURATION: { min: 60, max: 100 },
                LIGHTNESS: { min: 40, max: 80 }
            }
        };

        // --- GAME STATE ---
        class GameState {
            constructor() {
                this.reset();
            }

            reset() {
                this.playerName = '';
                this.gameContainer = null;
                this.gameActive = false;
                this.roundNumber = 1;
                this.score = 0;
                this.roundStartTime = 0;
                this.outsideClickListener = null;
                this.tiles = [];
                this.roundComplete = false;
                this.isGameOver = false;
                this.oddTileIndex = -1;
                this.currentGridSize = 0;
            }
        }

        const gameState = new GameState();

        // --- UTILITY FUNCTIONS ---
        const Utils = {
            hslCache: new Map(),

            parseHSL(colorString) {
                if (this.hslCache.has(colorString)) {
                    return this.hslCache.get(colorString);
                }

                const match = colorString.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
                const result = match
                ? { h: +match[1], s: +match[2], l: +match[3] }
                : { h: 0, s: 100, l: 50 };

                this.hslCache.set(colorString, result);
                return result;
            },

            generateRandomColor() {
                const { COLOR_RANGES } = CONFIG;
                const h = Math.floor(Math.random() * COLOR_RANGES.HUE.max);
                const s = Math.floor(Math.random() * (COLOR_RANGES.SATURATION.max - COLOR_RANGES.SATURATION.min) + COLOR_RANGES.SATURATION.min);
                const l = Math.floor(Math.random() * (COLOR_RANGES.LIGHTNESS.max - COLOR_RANGES.LIGHTNESS.min) + COLOR_RANGES.LIGHTNESS.min);
                return `hsl(${h}, ${s}%, ${l}%)`;
            },

            generateVariantColor(baseColor, difficulty) {
                const { MIN_VARIANCE, MAX_VARIANCE } = CONFIG;
                const maxRound = 20;
                const t = Math.min(difficulty / maxRound, 1);
                const variance = MAX_VARIANCE - t * (MAX_VARIANCE - MIN_VARIANCE);

                const { h, s, l } = this.parseHSL(baseColor);
                const offset = () => Math.random() * variance - variance / 2;

                const newH = (h + offset() + 360) % 360;
                const newS = Math.max(0, Math.min(100, s + offset()));
                const newL = Math.max(0, Math.min(100, l + offset()));

                return `hsl(${Math.round(newH)}, ${Math.round(newS)}%, ${Math.round(newL)}%)`;
            },

            shuffleArray(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            },

            calculateOptimalTileSize(gridSize) {
                const containerPadding = 56;
                const availableWidth = window.innerWidth - (CONFIG.GRID_PADDING * 2 * CONFIG.TILE_MARGIN);
                const availableHeight = window.innerHeight - containerPadding - (CONFIG.GRID_PADDING * 2 * CONFIG.TILE_MARGIN);

                const maxTileWidth = Math.floor((availableWidth - (gridSize - 1) * CONFIG.TILE_GAP) / gridSize);
                const maxTileHeight = Math.floor((availableHeight - (gridSize - 1) * CONFIG.TILE_GAP) / gridSize);

                const maxSize = Math.min(maxTileWidth, maxTileHeight);
                return Math.max(40, Math.min(maxSize, 100));
            },

            debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            }
        };

        // --- GAME LOGIC ---
        const GameLogic = {
            calculateGridSize(round) {
                if (round <= 2) return 2;
                if (round <= 4) return 3;
                if (round <= 7) return 4;
                if (round <= 11) return 5;
                return Math.min(6, CONFIG.MAX_GRID_SIZE);
            },

            generateRoundData(round) {
                const gridSize = this.calculateGridSize(round);
                const tileCount = gridSize * gridSize;

                const baseColor = Utils.generateRandomColor();
                const oddColor = Utils.generateVariantColor(baseColor, round);

                const colorArray = new Array(tileCount - 1).fill(baseColor);
                colorArray.push(oddColor);

                Utils.shuffleArray(colorArray);

                return {
                    colors: colorArray,
                    gridSize,
                    oddColor,
                    baseColor
                };
            },

            calculateScore(timeTaken, round) {
                const timeScore = Math.max(0, CONFIG.MAX_SCORE_PER_ROUND - (timeTaken / CONFIG.TIME_PENALTY_DIVISOR));
                const multiplier = 1 + (round * CONFIG.ROUND_MULTIPLIER);
                return Math.floor(Math.max(CONFIG.MIN_SCORE, timeScore * multiplier));
            },

            isCorrectTile(clickedColor, oddColor) {
                return clickedColor === oddColor;
            }
        };

        // --- UI MANAGEMENT ---
        const UI = {
            createGameContainer() {
                const container = document.createElement('div');
                container.className = 'chromakey-game-container';

                container.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: radial-gradient(ellipse at center, #1a1a1a, #121212);
                    backdrop-filter: blur(12px);
                    padding: 20px;
                    border-radius: 24px;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.15);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #f8f9fa;
                    font-family: 'Segoe UI', sans-serif;
                    max-width: 95vw;
                    max-height: 95vh;
                    overflow: visible;
                    box-sizing: border-box;
                `;

                return container;
            },

            createTileGrid(colors, gridSize, oddColor) {
                const tileSize = Utils.calculateOptimalTileSize(gridSize);
                gameState.currentGridSize = gridSize;

                const gridContainer = document.createElement('div');
                gridContainer.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(${gridSize}, ${tileSize}px);
                    gap: ${CONFIG.TILE_GAP}px;
                    justify-content: center;
                    align-items: center;
                `;

                const tiles = [];
                const fragment = document.createDocumentFragment();

                colors.forEach((color, index) => {
                    const tile = this.createTile(color, tileSize, index, oddColor);
                    tiles.push(tile);
                    fragment.appendChild(tile);
                });

                gridContainer.appendChild(fragment);
                return { gridContainer, tiles };
            },

            createTile(color, size, index, oddColor) {
                const tile = document.createElement('div');
                tile.className = 'chromakey-tile';
                tile.style.cssText = `
                    width: ${size}px;
                    height: ${size}px;
                    background: ${color};
                    border-radius: 16px;
                    cursor: pointer;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                `;

                tile.addEventListener('mouseenter', this.handleTileHover);
                tile.addEventListener('mouseleave', this.handleTileLeave);
                tile.addEventListener('click', () => GameEvents.handleTileClick(index, color, oddColor));

                return tile;
            },

            handleTileHover(event) {
                event.target.style.transform = 'scale(1.05)';
                event.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
            },

            handleTileLeave(event) {
                event.target.style.transform = 'scale(1)';
                event.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
            },

            createGameOverModal(score, round) {
                const overlay = document.createElement('div');
                overlay.className = 'game-over-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(30, 30, 30, 0.8);
                    backdrop-filter: blur(8px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10001;
                `;

                const modal = document.createElement('div');
                modal.className = 'game-over-modal';
                modal.innerHTML = `
                    <h2 style="margin-bottom:10px;">Game Over</h2>
                    <p style="margin:4px 0;">Round: ${round}</p>
                    <p style="margin:4px 0 16px;">Score: ${score}</p>
                    <button class="replay-btn" style="
                        margin-bottom:20px;
                        padding:10px 20px;
                        border:none;
                        border-radius:8px;
                        background:linear-gradient(to right, #fdfbfb, #ebedee);
                        color:#111;
                        font-weight:bold;
                        cursor:pointer;
                        transition:transform 0.2s;
                    ">
                        REPLAY
                    </button>
                    <h3 style="margin-top:16px;">Leaderboard</h3>
                    <div class="leaderboard-content"></div>
                `;

                modal.style.cssText = `
                    background: linear-gradient(to bottom right, #222, #333);
                    color: #f0f0f0;
                    padding: 32px;
                    border-radius: 24px;
                    box-shadow: 0 12px 24px rgba(0,0,0,0.25);
                    text-align: center;
                    max-width: 90vw;
                    font-family: 'Segoe UI', sans-serif;
                    border: 1px solid rgba(255,255,255,0.1);
                `;

                overlay.appendChild(modal);
                return { overlay, modal };
            },

            showLeaderboardModal() {
                Database.fetchTopScores().then(scores => {
                    const overlay = document.createElement('div');
                    overlay.style.cssText = `
                        position: fixed;
                        top: 0; left: 0;
                        width: 100vw; height: 100vh;
                        background: rgba(30,30,30,0.8);
                        backdrop-filter: blur(8px);
                        display: flex; justify-content: center; align-items: center;
                        z-index: 10001;
                    `;
                    overlay.addEventListener('click', e => {
                        if (e.target === overlay) {
                            e.stopPropagation();
                            overlay.remove();
                        }
                    });

                    const modal = document.createElement('div');
                    modal.style.cssText = `
                        position: relative;
                        background: linear-gradient(to bottom right,#222,#333);
                        color: #f0f0f0;
                        padding: 32px;
                        border-radius: 24px;
                        box-shadow: 0 12px 24px rgba(0,0,0,0.25);
                        text-align: center;
                        max-width: 90vw;
                        font-family: 'Segoe UI', sans-serif;
                        border: 1px solid rgba(255,255,255,0.1);
                    `;
                    overlay.appendChild(modal);

                    const closeBtn = document.createElement('button');
                    closeBtn.textContent = '×';
                    closeBtn.style.cssText = `
                        position: absolute;
                        top: 12px; right: 12px;
                        background: transparent;
                        border: none;
                        color: #f0f0f0;
                        font-size: 24px;
                        cursor: pointer;
                    `;
                    closeBtn.addEventListener('click', e => {
                        e.stopPropagation();
                        overlay.remove();
                    });
                    modal.appendChild(closeBtn);

                    const header = document.createElement('h2');
                    header.textContent = 'Leaderboard';
                    header.style.cssText = `margin: 0 0 16px; font-size: 24px;`;
                    modal.appendChild(header);

                    scores.forEach((s,i) => {
                        const p = document.createElement('p');
                        p.textContent = `#${i+1}: ${s.name || 'Anon'} — ${s.score} pts (Round ${s.round})`;
                        p.style.margin = '8px 0';
                        modal.appendChild(p);
                    });

                    document.body.appendChild(overlay);
                });
            },

            updateLeaderboard(modal, scores) {
                const leaderboardContent = modal.querySelector('.leaderboard-content');
                leaderboardContent.innerHTML = '';

                scores.forEach((score, index) => {
                    const entry = document.createElement('p');
                    entry.style.margin = '2px 0';
                    entry.textContent = `#${index + 1}: ${score.name || 'Anon'} - ${score.score} (Round ${score.round})`;
                    leaderboardContent.appendChild(entry);
                });
            }
        };

        // --- EVENT HANDLING ---
        const GameEvents = {
            handleTileClick(index, clickedColor, oddColor) {
                if (gameState.roundComplete || gameState.isGameOver) return;

                const isCorrect = GameLogic.isCorrectTile(clickedColor, oddColor);

                if (isCorrect) {
                    this.handleCorrectChoice(index);
                } else {
                    this.handleIncorrectChoice();
                }
            },

            handleCorrectChoice(index) {
                const timeTaken = Date.now() - gameState.roundStartTime;
                const roundScore = GameLogic.calculateScore(timeTaken, gameState.roundNumber);

                gameState.score += roundScore;
                gameState.roundComplete = true;

                const tile = gameState.tiles[index];
                tile.style.border = '4px solid white';
                tile.style.transform = 'scale(1.1)';

                setTimeout(() => {
                    if (!gameState.isGameOver) {
                        gameState.roundNumber++;
                        GameFlow.showRound();
                    }
                }, CONFIG.ANIMATION_DURATION);
            },

            handleIncorrectChoice() {
                gameState.isGameOver = true;

                if (gameState.oddTileIndex >= 0 && gameState.tiles[gameState.oddTileIndex]) {
                    gameState.tiles[gameState.oddTileIndex].style.border = '4px solid white';
                }

                GameFlow.endGame();
            },

            setupOutsideClickListener() {
                const listener = Utils.debounce((event) => {
                    if (gameState.gameContainer && !gameState.gameContainer.contains(event.target)) {
                        GameFlow.resetGame();
                    }
                }, 50);

                setTimeout(() => {
                    gameState.outsideClickListener = listener;
                    document.addEventListener('click', listener);
                }, CONFIG.CLICK_DELAY);
            },

            removeOutsideClickListener() {
                if (gameState.outsideClickListener) {
                    document.removeEventListener('click', gameState.outsideClickListener);
                    gameState.outsideClickListener = null;
                }
            }
        };

        // === GAME FLOW (ChromaKey) ===
        const GameFlow = {
            startGame() {
                whenFirebaseReady(db => {
                    if (db) {
                        // Get the Firebase auth instance from our app
                        const auth = firebase.app('games-userscript-app').auth();

                        // Only set up notifications if user is authenticated
                        if (auth.currentUser) {
                            const userId = auth.currentUser.uid;
                            db.collection('CK_notifications')
                                .where('user', '==', userId)
                                .onSnapshot(snapshot => {
                                    snapshot.docChanges().forEach(change => {
                                        if (change.type === 'added') {
                                            alert(change.doc.data().message);
                                            change.doc.ref.delete();
                                        }
                                    });
                                }, error => {
                                    console.warn('[Games] Notifications error (this is normal if not authenticated):', error.message);
                                });
                        } else {
                            console.log('[Games] No authenticated user, skipping notifications setup');
                        }
                    }
                });

                whenFirebaseReady(db => cleanupChromaKey(db));
                gameState.playerName = window.playerNameCK || 'Player';
                if (gameState.gameActive) return;

                gameState.gameActive = true;
                gameState.roundNumber = 1;
                gameState.score = 0;

                gameState.gameContainer = UI.createGameContainer();
                document.body.appendChild(gameState.gameContainer);

                this.showRound();
                GameEvents.setupOutsideClickListener();
            },

            showRound() {
                gameState.roundStartTime = Date.now();
                const roundData = GameLogic.generateRoundData(gameState.roundNumber);
                const { gridContainer, tiles } = UI.createTileGrid(
                    roundData.colors, roundData.gridSize, roundData.oddColor
                );

                gameState.gameContainer.innerHTML = '';
                gameState.gameContainer.appendChild(gridContainer);

                const lbBtn = document.createElement('button');
                lbBtn.id = 'ck-view-leaderboard-btn';
                lbBtn.textContent = 'View Leaderboard';
                Object.assign(lbBtn.style, {
                    margin: '20px auto 0',
                    display: 'block',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#000',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                });
                lbBtn.addEventListener('mouseenter', () => {
                    lbBtn.style.transform = 'translateY(-2px)';
                    lbBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });
                lbBtn.addEventListener('mouseleave', () => {
                    lbBtn.style.transform = 'translateY(0)';
                    lbBtn.style.boxShadow = 'none';
                });
                lbBtn.addEventListener('mousedown', () => {
                    lbBtn.style.transform = 'translateY(1px)';
                });
                lbBtn.addEventListener('mouseup', () => {
                    lbBtn.style.transform = 'translateY(-2px)';
                });

                lbBtn.addEventListener('click', () => UI.showLeaderboardModal());
                gameState.gameContainer.appendChild(lbBtn);

                gameState.tiles = tiles;
                gameState.roundComplete = false;
                gameState.isGameOver = false;
                gameState.oddTileIndex = roundData.colors.indexOf(roundData.oddColor);
            },

            endGame() {
                const oldLb = document.getElementById('ck-view-leaderboard-btn');
                if (oldLb) oldLb.remove();
                const { overlay, modal } = UI.createGameOverModal(gameState.score, gameState.roundNumber);

                overlay.addEventListener('click', e => {
                    if (e.target === overlay) {
                        overlay.remove();
                        this.resetGame();
                    }
                });

                modal.querySelector('.replay-btn').addEventListener('click', () => {
                    overlay.remove();
                    this.resetGame();
                    setTimeout(() => this.startGame(), 0);
                });

                const viewBoardBtn = document.createElement('button');
                viewBoardBtn.textContent = 'View Board';
                Object.assign(viewBoardBtn.style, {
                    display: 'block',
                    margin: '24px auto 8px',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#000',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                });
                viewBoardBtn.addEventListener('mouseenter', () => {
                    viewBoardBtn.style.transform = 'translateY(-2px)';
                    viewBoardBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });
                viewBoardBtn.addEventListener('mouseleave', () => {
                    viewBoardBtn.style.transform = 'translateY(0)';
                    viewBoardBtn.style.boxShadow = 'none';
                });

                viewBoardBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    overlay.remove();

                    const viewResultsBtn = document.createElement('button');
                    viewResultsBtn.textContent = 'View Results';
                    Object.assign(viewResultsBtn.style, {
                        margin: '20px auto 0',
                        display: 'block',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#fff',
                        color: '#000',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                    });
                    viewResultsBtn.addEventListener('mouseenter', () => {
                        viewResultsBtn.style.transform = 'translateY(-2px)';
                        viewResultsBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    });
                    viewResultsBtn.addEventListener('mouseleave', () => {
                        viewResultsBtn.style.transform = 'translateY(0)';
                        viewResultsBtn.style.boxShadow = 'none';
                    });
                    viewResultsBtn.addEventListener('click', e => {
                        e.stopPropagation();
                        document.body.appendChild(overlay);
                        viewResultsBtn.remove();
                    });

                    gameState.gameContainer.appendChild(viewResultsBtn);
                });

                modal.appendChild(viewBoardBtn);
                document.body.appendChild(overlay);

                Database.submitScore(gameState.score, gameState.roundNumber)
                    .then(() => Database.fetchTopScores())
                    .then(scores => UI.updateLeaderboard(modal, scores))
                    .catch(err => console.error('[Games] Failed to load leaderboard:', err));
            },

            resetGame() {
                GameEvents.removeOutsideClickListener();

                if (gameState.gameContainer) {
                    gameState.gameContainer.remove();
                    gameState.gameContainer = null;
                }

                gameState.gameActive = false;
            }
        };

        const Database = {
            submitScore(score, round) {
                return new Promise((resolve, reject) => {
                    whenFirebaseReady(db => {
                        if (!db) {
                            console.warn('[Games] ⚠️ Firebase not available, score not saved');
                            resolve();
                            return;
                        }

                        db.collection('ChromaKey_scores').add({
                            name: gameState.playerName,
                            score,
                            round,
                            timestamp: new Date().toISOString()
                        })
                        .then(resolve)
                        .catch(reject);
                    });
                });
            },

            fetchTopScores(limit = 5) {
                return new Promise(resolve => {
                    whenFirebaseReady(async db => {
                        if (!db) {
                            console.warn('[Games] ⚠️ Firebase not available, using mock leaderboard');
                            resolve([
                                { name: 'Demo Player', score: 500, round: 10 },
                                { name: 'Test User', score: 300, round: 7 },
                                { name: 'Sample', score: 200, round: 5 }
                            ]);
                            return;
                        }

                        try {
                            const snap = await db.collection('ChromaKey_scores')
                            .orderBy('score','desc')
                            .limit(limit)
                            .get();
                            resolve(snap.docs.map(d => d.data()));
                        } catch (err) {
                            console.warn('[Games] ⚠️ Failed to fetch scores:', err);
                            resolve([]);
                        }
                    });
                });
            }
        };

        window.startGame = GameFlow.startGame.bind(GameFlow);
    })();

    // ================================
    // === ATTACH LAUNCHER TO NAME ===
    // ================================
    attachNameClick();

})();
