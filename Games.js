// ==UserScript==
// @name         Games
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Unlimited games, but no games
// @match        https://madame.ynap.biz/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- SHARED FIREBASE SETUP ---
    const firebaseScripts = [
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'
    ];
    const firebaseConfig = {
        apiKey: "AIzaSyAXRJJZrRZVyrQzjGT_kXoMDJ23julYkIQ",
        authDomain: "ooog-5c3c1.firebaseapp.com",
        projectId: "ooog-5c3c1",
        storageBucket: "ooog-5c3c1.firebasestorage.app",
        messagingSenderId: "857590797309",
        appId: "1:857590797309:web:4de7faebc9882641427f94",
        measurementId: "G-5S5283GD9C"
    };

    let db;
    let firebaseReady = false;
    const firebaseCallbacks = [];

    function loadScripts(scripts, cb) {
        let loaded = 0;
        scripts.forEach(src => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => {
                if (++loaded === scripts.length) cb();
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

    loadScripts(firebaseScripts, () => {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        firebaseReady = true;
        firebaseCallbacks.forEach(cb => cb(db));
        firebaseCallbacks.length = 0;
    });

    // --- HELPER: name-click menu launcher (ROBUST SELECTOR) ---
    function attachNameClick() {
        // Try multiple possible selectors in order of preference
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
        // 1) read the name element you clicked
        const full = e.currentTarget.textContent.trim();
        const parts = full.split(' ');
        // build "First L"
        const formatted = parts.length > 1
            ? `${parts[0]} ${parts[1][0]}`
            : parts[0];

        window.playerName = formatted;
        window.playerNameOO = formatted;

        // 2) build the overlay/menu
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
        `;
        panel.innerHTML = `
            <button
                id="encrpt-btn"
                style="
                    padding: 10px 16px;
                    border: none;
                    border-radius: 8px;
                    background: linear-gradient(to right, #2b5876, #4e4376);
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    transition: transform 0.15s;
                "
            >
                ENCRPT
            </button>

            <button
                id="oddone-btn"
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
                OddOneOut
            </button>
        `;
        overlay.appendChild(panel);

        overlay.addEventListener('click', ev => {
            if (ev.target === overlay) overlay.remove();
        });

        document.getElementById('encrpt-btn').onclick = () => {
            overlay.remove();
            attemptStart();
        };
        document.getElementById('oddone-btn').onclick = () => {
            overlay.remove();
            startGame();
        };
    }

    // ========================
    // === ENCRPT GAME CODE ===
    // ========================
    (function() {
        'use strict';
        let playerName = '';

        // --- ENTRY POINT ---
        async function attemptStart() {
            playerName = window.playerName;
            console.log(`[Games] - [ENCRPT] - Starting game for player: ${playerName}`);

            const D = new Date();
            const dateStr = `${D.getFullYear()}-${String(D.getMonth()+1).padStart(2,'0')}-${String(D.getDate()).padStart(2,'0')}`;

            whenFirebaseReady(async (database) => {
                try {
                    const snap = await database.collection('encrpt_daily_scores')
                        .where('date','==', dateStr)
                        .where('name','==', playerName)
                        .limit(1)
                        .get();

                    if (snap.empty) {
                        console.log(`[Games] - [ENCRPT] - No existing score found, starting new game`);
                        initGame();
                    } else {
                        console.log(`[Games] - [ENCRPT] - Player already completed today, showing leaderboard`);
                        showLeaderboardOnly();
                    }
                } catch (error) {
                    console.error(`[Games] - [ENCRPT] - Firebase error:`, error);
                    console.log(`[Games] - [ENCRPT] - Falling back to game without score check`);
                    initGame();
                }
            });
        }
        window.attemptStart = attemptStart;

        // --- CACHED CONSTANTS ---
        const TODAY = new Date();
        const TODAY_MONTH = TODAY.getMonth() + 1;
        const TODAY_DATE = TODAY.getDate();
        const TODAY_YEAR = TODAY.getFullYear();
        const TODAY_HOUR = TODAY.getHours();
        const TODAY_WEEKDAY = TODAY.getDay();

        const TODAY_DATE_STR = `${String(TODAY_MONTH).padStart(2,'0')}/${String(TODAY_DATE).padStart(2,'0')}/${TODAY_YEAR}`;
        const TODAY_HOUR_STR = String(TODAY_HOUR).padStart(2,'0');
        const TODAY_WEEKDAY_NAME = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][TODAY_WEEKDAY];

        const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        const TWO_DIGIT_PRIMES = ['11','13','17','19','23','29','31','37','41','43','47','53','59','61','67','71','73','79','83','89','97'];
        const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
        const SPONSORS = ['tacobell','chilis','mcdonalds'];

        // --- PRECOMPILED REGEX ---
        const REGEX = {
            digit: /\d/g,
            singleDigit: /\d/,
            uppercase: /[A-Z]/,
            special: /[!@#$%^&*(),.?":{}|<>]/g,
            singleSpecial: /[!@#$%^&*(),.?":{}|<>]/,
            roman: /[IVXLCDM]/g,
            singleRoman: /[IVXLCDM]/,
            romanChunks: /([IVXLCDM]+)/g,
            lowercase: /[a-z]/,
            letter: /[a-zA-Z]/g,
            mathEquation: /(\d)([+\-*/])(\d)=(\d)/,
            startLetterEndDigit: /^[A-Za-z].*\d$/,
            consecutiveRepeated: /(.)\1/,
            threeConsecutive: /(.)\1{2,}/,
            ascendingDigits: /(012|123|234|345|456|567|678|789)/,
            palindrome: /(.)(.)\1/,
            primeDigitsTail: /[2357]{2}$/,
            evenDigitCount: /\d/g
        };

        // --- STATE & RULES ---
        let todaysRules = [], activeRules = [], revealIndex = 0, gameStartTime = 0;
        let gameEnded = false;
        let gameContainer, gameContent, passwordField, charCount, rulesContainer, styleEl;
        let currentPassword = '';

        // --- DAILY-ROTATION CONSTANTS ---
        const minLengthCycle = [5, 6, 7, 8];
        const digitSumCycle = [10, 15, 19, 21, 23, 25];
        const romanProductCycle = [6, 10, 12, 15, 18, 20, 24, 30, 35];

        function dailyIndex() {
            return Math.floor(Date.now() / 86400000);
        }

        // --- CACHED DAILY VALUES ---
        const MIN_LEN = minLengthCycle[dailyIndex() % minLengthCycle.length];
        const rawTarget = digitSumCycle[dailyIndex() % digitSumCycle.length];

        // Pre-calculate forced digit sum
        const forcedDigitSum = sumDigits(TODAY_DATE_STR) + sumDigits(TODAY_HOUR_STR) + sumDigits('11');
        const DIGIT_SUM = Math.max(rawTarget, forcedDigitSum);
        const ROMAN_PROD = romanProductCycle[dailyIndex() % romanProductCycle.length];

        // --- OPTIMIZED UTILITY FUNCTIONS ---
        function sumDigits(str) {
            let sum = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                if (char >= '0' && char <= '9') {
                    sum += parseInt(char, 10);
                }
            }
            return sum;
        }

        function productOfRomans(str) {
            const chunks = str.match(REGEX.romanChunks);
            if (!chunks || chunks.length === 0) return 0;

            let product = 1;
            for (const chunk of chunks) {
                product *= parseRoman(chunk);
            }
            return product;
        }

        // --- MEMOIZED ROMAN PARSING ---
        const romanCache = new Map();
        function parseRoman(s) {
            if (romanCache.has(s)) return romanCache.get(s);

            const M = {I:1,IV:4,V:5,IX:9,X:10,XL:40,L:50,XC:90,C:100,CD:400,D:500,CM:900,M:1000};
            let i = 0, v = 0;

            while (i < s.length) {
                if (i + 1 < s.length && M[s.substr(i, 2)]) {
                    v += M[s.substr(i, 2)];
                    i += 2;
                } else {
                    v += M[s[i]];
                    i++;
                }
            }

            romanCache.set(s, v);
            return v;
        }

        // --- OPTIMIZED RULES DEFINITION ---
        const fullRules = [
            {
                id: 1,
                text: `At least ${MIN_LEN} characters`,
                check: p => p.length >= MIN_LEN,
                highlight: _ => []
            },
            {
                id: 2,
                text: "Include a number",
                check: p => REGEX.singleDigit.test(p),
                highlight: p => [...p].map((c,i) => REGEX.singleDigit.test(c) ? i : null).filter(i => i !== null)
            },
            {
                id: 3,
                text: "Include an uppercase letter",
                check: p => REGEX.uppercase.test(p),
                highlight: p => [...p].map((c,i) => REGEX.uppercase.test(c) ? i : null).filter(i => i !== null)
            },
            {
                id: 4,
                text: "Include at least one special character",
                check: p => REGEX.singleSpecial.test(p),
                highlight: p => [...p].map((c,i) => REGEX.singleSpecial.test(c) ? i : null).filter(i => i !== null)
            },
            {
                id: 5,
                text: `Digits sum to ${DIGIT_SUM}`,
                check: p => {
                    const digits = p.match(REGEX.digit);
                    if (!digits) return false;
                    let sum = 0;
                    for (const d of digits) sum += parseInt(d, 10);
                    return sum === DIGIT_SUM;
                },
                highlight: p => [...p].map((c,i) => REGEX.singleDigit.test(c) ? i : null).filter(i => i !== null)
            },
            {
                id: 6,
                text: "Include a month of the year",
                check: p => {
                    const lower = p.toLowerCase();
                    for (const month of MONTHS) {
                        if (lower.includes(month)) return true;
                    }
                    return false;
                },
                highlight: p => {
                    const lower = p.toLowerCase();
                    for (const month of MONTHS) {
                        const idx = lower.indexOf(month);
                        if (idx !== -1) {
                            return Array.from({length: month.length}, (_, k) => idx + k);
                        }
                    }
                    return [];
                }
            },
            {
                id: 7,
                text: "Include a Roman numeral",
                check: p => REGEX.singleRoman.test(p),
                highlight: p => [...p].map((c,i) => REGEX.singleRoman.test(c) ? i : null).filter(i => i !== null)
            },
            {
                id: 8,
                text: "Include sponsor: TacoBell, Chilis, or McDonalds",
                check: p => {
                    const lower = p.toLowerCase();
                    for (const sponsor of SPONSORS) {
                        if (lower.includes(sponsor)) return true;
                    }
                    return false;
                },
                highlight: p => {
                    const lower = p.toLowerCase();
                    for (const sponsor of SPONSORS) {
                        const idx = lower.indexOf(sponsor);
                        if (idx !== -1) {
                            return Array.from({length: sponsor.length}, (_, k) => idx + k);
                        }
                    }
                    return [];
                }
            },
            {
                id: 9,
                text: `Roman numerals multiply to ${ROMAN_PROD}`,
                check: p => {
                    const chunks = p.match(REGEX.romanChunks);
                    if (!chunks || chunks.length === 0) return false;
                    let product = 1;
                    for (const chunk of chunks) {
                        product *= parseRoman(chunk);
                    }
                    return product === ROMAN_PROD;
                },
                highlight: p => {
                    const indices = [];
                    const re = /([IVXLCDM]+)/g;
                    let match;
                    while ((match = re.exec(p))) {
                        for (let k = 0; k < match[1].length; k++) {
                            indices.push(match.index + k);
                        }
                    }
                    return indices;
                }
            },
            {
                id: 10,
                text: "Include its length",
                check: p => p.includes(p.length.toString()),
                highlight: p => {
                    const lengthStr = p.length.toString();
                    const idx = p.indexOf(lengthStr);
                    return idx !== -1 ? Array.from({length: lengthStr.length}, (_, k) => idx + k) : [];
                }
            },
            {
                id: 11,
                text: "Include today's date (MM/DD/YYYY)",
                check: p => p.includes(TODAY_DATE_STR),
                highlight: p => {
                    const idx = p.indexOf(TODAY_DATE_STR);
                    return idx !== -1 ? Array.from({length: TODAY_DATE_STR.length}, (_, k) => idx + k) : [];
                }
            },
            {
                id: 12,
                text: "Start with a letter and end with a digit",
                check: p => REGEX.startLetterEndDigit.test(p),
                highlight: p => p.length ? [0, p.length - 1] : []
            },
            {
                id: 13,
                text: "Use a single character at least three times",
                check: p => {
                    const counts = {};
                    for (const ch of p) {
                        counts[ch] = (counts[ch] || 0) + 1;
                    }
                    for (const count of Object.values(counts)) {
                        if (count >= 3) return true;
                    }
                    return false;
                },
                highlight: p => {
                    const counts = {};
                    for (const ch of p) {
                        counts[ch] = (counts[ch] || 0) + 1;
                    }

                    // Find character with 3+ occurrences
                    for (const [ch, count] of Object.entries(counts)) {
                        if (count >= 3) {
                            return [...p].map((c, i) => c === ch ? i : null).filter(i => i !== null);
                        }
                    }

                    // Fallback: show character closest to 3
                    let target = null;
                    let bestDiff = Infinity;
                    for (const [ch, count] of Object.entries(counts)) {
                        const diff = Math.abs(count - 3);
                        if (diff < bestDiff) {
                            target = ch;
                            bestDiff = diff;
                        }
                    }

                    return target ? [...p].map((c, i) => c === target ? i : null).filter(i => i !== null) : [];
                }
            },
            {
                id: 14,
                text: "At least two special characters",
                check: p => {
                    const matches = p.match(REGEX.special);
                    return matches && matches.length >= 2;
                },
                highlight: p => [...p].map((c,i) => REGEX.singleSpecial.test(c) ? i : null).filter(i => i !== null)
            },
            {
                id: 15,
                text: "Include a two-digit prime (11–97)",
                check: p => {
                    for (const prime of TWO_DIGIT_PRIMES) {
                        if (p.includes(prime)) return true;
                    }
                    return false;
                },
                highlight: p => {
                    const indices = [];
                    for (const prime of TWO_DIGIT_PRIMES) {
                        let idx = p.indexOf(prime);
                        while (idx !== -1) {
                            indices.push(idx, idx + 1);
                            idx = p.indexOf(prime, idx + 1);
                        }
                    }
                    return indices;
                }
            },
            {
                id: 16,
                text: "At least two digits",
                check: p => {
                    const digits = p.match(REGEX.digit);
                    return digits && digits.length >= 2;
                },
                highlight: p => [...p].map((c,i) => REGEX.singleDigit.test(c) ? i : null).filter(i => i !== null)
            },
            {
                id: 17,
                text: "Include current hour (00–23)",
                check: p => p.includes(TODAY_HOUR_STR),
                highlight: p => {
                    const idx = p.indexOf(TODAY_HOUR_STR);
                    return idx !== -1 ? [idx, idx + 1] : [];
                }
            },
            {
                id: 18,
                text: "No more than two consecutive identical characters",
                check: p => !/(.)\1{2,}/.test(p),
                highlight: p => {
                    const match = p.match(/(.)\1{2,}/);
                    if (!match) return [];
                    const start = match.index;
                    const length = match[0].length;
                    return Array.from({length}, (_, i) => start + i);
                }
            },
            {
                id: 19,
                text: "At least one lowercase AND one uppercase letter",
                check: p => REGEX.lowercase.test(p) && REGEX.uppercase.test(p),
                highlight: p => [...p].map((c,i) => REGEX.letter.test(c) ? i : null).filter(i => i !== null)
            },
            {
                id: 20,
                text: "Include a correct 1-digit math equation (3+4=7)",
                check: p => {
                    const match = p.match(REGEX.mathEquation);
                    if (!match) return false;
                    const [, a, op, b, result] = match;
                    const expected = eval(`${a}${op}${b}`);
                    return expected == result;
                },
                highlight: p => {
                    const match = p.match(REGEX.mathEquation);
                    if (!match) return [];
                    const idx = p.indexOf(match[0]);
                    return Array.from({length: match[0].length}, (_, k) => idx + k);
                }
            },
            {
                id: 21,
                text: "Include a US state abbreviation (e.g. NY, CA)",
                check: p => {
                    const upper = p.toUpperCase();
                    for (const state of US_STATES) {
                        if (upper.includes(state)) return true;
                    }
                    return false;
                },
                highlight: p => {
                    const upper = p.toUpperCase();
                    for (const state of US_STATES) {
                        const idx = upper.indexOf(state);
                        if (idx !== -1) {
                            return [idx, idx + 1];
                        }
                    }
                    return [];
                }
            },
            {
                id: 22,
                text: "Include today's weekday name",
                check: p => p.toLowerCase().includes(TODAY_WEEKDAY_NAME),
                highlight: p => {
                    const lower = p.toLowerCase();
                    const idx = lower.indexOf(TODAY_WEEKDAY_NAME);
                    return idx !== -1 ? Array.from({length: TODAY_WEEKDAY_NAME.length}, (_, k) => idx + k) : [];
                }
            },
            {
                id: 23,
                text: "Include three consecutive ascending digits (e.g. 123, 456)",
                check: p => REGEX.ascendingDigits.test(p),
                highlight: p => {
                    const match = p.match(REGEX.ascendingDigits);
                    if (!match) return [];
                    const idx = p.indexOf(match[0]);
                    return [idx, idx + 1, idx + 2];
                }
            },
            {
                id: 24,
                text: "Include a three-character palindrome (ABA, 121)",
                check: p => REGEX.palindrome.test(p),
                highlight: p => {
                    const match = p.match(REGEX.palindrome);
                    if (!match) return [];
                    const idx = p.indexOf(match[0]);
                    return [idx, idx + 1, idx + 2];
                }
            },
            {
                id: 25,
                text: "End with two consecutive prime digits (2,3,5,7)",
                check: p => REGEX.primeDigitsTail.test(p),
                highlight: p => p.length >= 2 ? [p.length - 2, p.length - 1] : []
            }
        ];

        // --- SIMPLE RULE GENERATION ---
        function getDailyRules() {
            console.log(`[Games] - [ENCRPT] - Generating guaranteed rule set`);

            const guaranteedRules = [
                fullRules.find(r => r.id === 1), // At least N characters
                fullRules.find(r => r.id === 2), // Include a number
                fullRules.find(r => r.id === 3), // Include uppercase
                fullRules.find(r => r.id === 4), // Include special char
                fullRules.find(r => r.id === 6), // Include month
                fullRules.find(r => r.id === 7), // Include Roman numeral
                fullRules.find(r => r.id === 8), // Include sponsor
                fullRules.find(r => r.id === 10), // Include its length
                fullRules.find(r => r.id === 11), // Include today's date
                fullRules.find(r => r.id === 12), // Start letter, end digit
                fullRules.find(r => r.id === 15), // Two-digit prime
                fullRules.find(r => r.id === 16), // At least two digits
                fullRules.find(r => r.id === 17), // Current hour
                fullRules.find(r => r.id === 19), // Lower + upper case
                fullRules.find(r => r.id === 21), // US state abbreviation
            ].filter(Boolean);

            console.log(`[Games] - [ENCRPT] - Successfully generated ${guaranteedRules.length} rules`);
            return guaranteedRules;
        }

        // --- GAME INITIALIZATION ---
        function initGame() {
            console.log(`[Games] - [ENCRPT] - Initializing game`);
            gameEnded = false;

            // Generate today's rules instantly
            todaysRules = getDailyRules();

            activeRules = [];
            revealIndex = 0;
            setupUI();
            addNextRule();
            gameStartTime = Date.now();

            console.log(`[Games] - [ENCRPT] - Game ready, first rule added`);
        }

        // --- UI SETUP ---
        function setupUI() {
            if (gameContainer) gameContainer.remove();
            if (styleEl) styleEl.remove();

            styleEl = document.createElement('style');
            styleEl.textContent = `
                .glass-panel {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(12px);
                    border-radius: 16px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: #111;
                }
                #rules-container::-webkit-scrollbar { display: none; }
                .btn {
                    padding: 10px 16px;
                    display: inline-block;
                    margin: 0 8px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: transform .1s ease;
                }
                .btn:active { transform: scale(0.97); }
                .btn-primary {
                    background: rgba(30, 144, 255, 0.9);
                    color: #fff;
                }
                #password-input {
                    background: rgba(255, 255, 255, 0.4);
                    border: 1px solid rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                    padding: 12px;
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 16px;
                    color: #111;
                    min-height: 28px;
                    outline: none;
                    margin-bottom: 6px;
                }
                #password-input:empty:before {
                    content: attr(placeholder);
                    color: rgba(0, 0, 0, 0.5);
                }
                #char-count { color: rgba(0, 0, 0, 0.6); }
                .rule-card {
                    margin: 6px 0;
                    padding: 12px;
                    border-radius: 12px;
                    font-size: 14px;
                    color: #111;
                }
                .rule-valid { background: rgba(40,167,69,0.25); }
                .rule-invalid { background: rgba(231,76,60,0.25); }
                .char-highlight { background: rgba(255,255,0,0.5); }
            `;
            document.head.appendChild(styleEl);

            gameContainer = document.createElement('div');
            Object.assign(gameContainer.style, {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '9999'
            });

            gameContent = document.createElement('div');
            gameContent.className = 'glass-panel';
            Object.assign(gameContent.style, {
                width: '90%',
                maxWidth: '480px',
                display: 'flex',
                flexDirection: 'column',
            });
            gameContainer.appendChild(gameContent);
            document.body.appendChild(gameContainer);
            document.body.style.overflow = 'hidden';

            gameContent.innerHTML = `
                <div style="padding:16px;">
                    <div id="password-input" contenteditable placeholder="Type your password…"></div>
                    <div style="text-align:right; margin-bottom:12px;">
                        <span id="char-count">0</span>
                    </div>
                    <div style="display:flex; justify-content:center; gap:8px; margin-bottom:12px;">
                        <button id="how-to-play-btn" class="btn btn-primary">How to Play</button>
                        <button id="submit-score-btn" class="btn btn-primary">Give Up</button>
                    </div>
                    <div id="rules-container" style="padding:0 16px 16px; text-align:left;"></div>
                </div>
            `;

            passwordField = document.getElementById('password-input');
            charCount = document.getElementById('char-count');
            rulesContainer = document.getElementById('rules-container');

            // Event listeners
            passwordField.addEventListener('keydown', e => {
                if (e.key === ' ') e.preventDefault();
            });

            passwordField.addEventListener('input', () => {
                const noSpaces = passwordField.textContent.replace(/\s+/g, '');
                if (passwordField.textContent !== noSpaces) {
                    passwordField.textContent = noSpaces;
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(passwordField);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            });

            passwordField.addEventListener('input', onInput);
            passwordField.addEventListener('paste', onPaste);
            document.getElementById('submit-score-btn').addEventListener('click', () => showEndScreen(false));
            document.getElementById('how-to-play-btn').addEventListener('click', showHowToPlayModal);

            function showHowToPlayModal() {
                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'fixed',
                    top: 0, left: 0, width: '100%', height: '100%',
                    background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: '10002'
                });

                const modal = document.createElement('div');
                modal.className = 'glass-panel';
                Object.assign(modal.style, {
                    display: 'inline-block',
                    padding: '24px',
                    textAlign: 'left',
                    maxWidth: '90vw',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    color: '#111',
                    fontFamily: 'Segoe UI, sans-serif'
                });

                modal.innerHTML = `
                    <h2 style="text-align:center; margin:0 0 16px;">How to Play ENCRPT</h2>
                    <ul style="padding-left:20px; margin:0 0 16px;">
                        <li>Type a password that fulfills the rules</li>
                        <li>As new rules appear, earlier ones may become invalid—adjust your password until all rules are satisfied</li>
                        <li>Hover over any rule to see exactly which characters in your password it's checking</li>
                        <li>Watch the live counters (length, digit‐sum, roman product) next to the rules for real-time feedback</li>
                        <li>Pasting is disabled—please type your password manually</li>
                        <li>No spaces are allowed in your password</li>
                    </ul>
                    <h3 style="text-align:center; margin:0 0 8px;">Examples</h3>
                    <ul style="padding-left:20px; margin:0 0 16px;">
                        <li><strong>Include its length:</strong> <code>password9</code> (9 characters total)</li>
                        <li><strong>Include today's date:</strong> <code>${TODAY_DATE_STR}</code></li>
                        <li><strong>Roman numerals multiply to 15:</strong> <code>V…III</code> (e.g. <code>VabcIII</code>, 5 × 3 = 15)</li>
                        <li><strong>At least two digits:</strong> <code>abc1234</code> (4 digits)</li>
                        <li><strong>Include a correct 1-digit math equation:</strong> <code>3+4=7</code></li>
                        <li><strong>Digits sum to 10:</strong> <code>19</code> (1 + 9 = 10)</li>
                    </ul>
                    <button id="close-htp" class="btn btn-primary" style="display:block; margin:0 auto;">OK</button>
                `;

                overlay.appendChild(modal);
                document.body.appendChild(overlay);
                modal.querySelector('#close-htp').addEventListener('click', () => overlay.remove());
            }

            document.addEventListener('keydown', e => { if(e.key === 'Escape') closeGame(); });
            gameContainer.addEventListener('click', e => { if(e.target === gameContainer) closeGame(); });
            passwordField.focus();
        }

        // --- OPTIMIZED RULE ADDITION ---
        function addNextRule() {
            if (revealIndex >= todaysRules.length) return;

            const rule = todaysRules[revealIndex++];
            activeRules.push(rule);

            const ruleElement = document.createElement('div');
            ruleElement.id = `rule-${rule.id}`;
            ruleElement.className = rule.check(currentPassword) ? 'rule-card rule-valid' : 'rule-card rule-invalid';

            const label = document.createElement('span');
            label.textContent = rule.text;
            ruleElement.appendChild(label);

            // Live counters for specific rules
            if (rule.id === 5) {
                const counter = document.createElement('span');
                counter.className = 'digit-sum-live';
                counter.style.cssText = 'float:right;opacity:.7;font-weight:bold;';
                counter.textContent = `(${sumDigits(currentPassword)})`;
                ruleElement.appendChild(counter);
            } else if (rule.id === 9) {
                const counter = document.createElement('span');
                counter.className = 'roman-prod-live';
                counter.style.cssText = 'float:right;opacity:.7;font-weight:bold;';
                counter.textContent = `(${productOfRomans(currentPassword)})`;
                ruleElement.appendChild(counter);
            }

            // Tooltip for two-digit primes
            if (rule.id === 15) {
                ruleElement.title = TWO_DIGIT_PRIMES.join(', ');
            }

            // Hover highlighting
            ruleElement.addEventListener('mouseenter', () => renderInput(rule));
            ruleElement.addEventListener('mouseleave', () => renderInput());

            rulesContainer.prepend(ruleElement);
            updateStatuses();
            renderInput();

            // Use requestAnimationFrame for smoother UI updates
            requestAnimationFrame(() => checkProgress());
        }

        // --- INPUT HANDLING ---
        function onInput() {
            currentPassword = passwordField.textContent;
            charCount.textContent = currentPassword.length;
            updateStatuses();
            renderInput();

            // Debounced progress check
            clearTimeout(onInput.timeout);
            onInput.timeout = setTimeout(checkProgress, 200);
        }

        function onPaste(e) {
            e.preventDefault();
            alert("🚨 Pasting is disabled — please type your password!");
        }

        // --- OPTIMIZED STATUS UPDATES ---
        function updateStatuses() {
            for (const rule of activeRules) {
                const element = document.getElementById(`rule-${rule.id}`);
                if (!element) continue;

                const isValid = rule.check(currentPassword);
                element.className = `rule-card ${isValid ? 'rule-valid' : 'rule-invalid'}`;

                // Update live counters
                if (rule.id === 5) {
                    const counter = element.querySelector('.digit-sum-live');
                    if (counter) counter.textContent = `(${sumDigits(currentPassword)})`;
                } else if (rule.id === 9) {
                    const counter = element.querySelector('.roman-prod-live');
                    if (counter) counter.textContent = `(${productOfRomans(currentPassword)})`;
                }
            }
        }

        // --- OPTIMIZED RENDERING ---
        function renderInput(hoverRule = null) {
            const caretPos = getCaretOffset(passwordField);
            const invalidRules = activeRules.filter(rule => !rule.check(currentPassword));

            let highlightIndices = [];
            if (hoverRule) {
                highlightIndices = hoverRule.highlight(currentPassword);
            } else if (invalidRules.length === 1) {
                highlightIndices = invalidRules[0].highlight(currentPassword);
            }

            if (highlightIndices.length === 0) {
                passwordField.textContent = currentPassword;
            } else {
                const chars = [...currentPassword];
                const highlightSet = new Set(highlightIndices);
                passwordField.innerHTML = chars.map((char, index) =>
                    highlightSet.has(index) ? `<span class="char-highlight">${char}</span>` : char
                ).join('');
            }

            setCaretOffset(passwordField, caretPos);
        }

        // --- PROGRESS CHECK ---
        function checkProgress() {
            if (activeRules.every(rule => rule.check(currentPassword))) {
                if (revealIndex < todaysRules.length) {
                    addNextRule();
                } else {
                    showEndScreen(true);
                }
            }
        }

        // --- CARET UTILITIES ---
        function getCaretOffset(element) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return 0;

            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            return preCaretRange.toString().length;
        }

        function setCaretOffset(element, offset) {
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let currentOffset = 0;
            let node;

            while (node = walker.nextNode()) {
                const nodeLength = node.textContent.length;
                if (currentOffset + nodeLength >= offset) {
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.setStart(node, offset - currentOffset);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    return;
                }
                currentOffset += nodeLength;
            }

            // Fallback: place caret at end
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(element);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        // --- END SCREEN ---
        function showEndScreen(win) {
            if (gameEnded) return;
            gameEnded = true;

            const rulesCompleted = activeRules.length;
            const timeTaken = Math.floor((Date.now() - gameStartTime) / 1000);
            const password = currentPassword;

            console.log(`[Games] - [ENCRPT] - Game ended: ${win ? 'Won' : 'Lost'} | Rules: ${rulesCompleted}/15 | Time: ${timeTaken}s`);

            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '10001',
                background: 'transparent'
            });

            overlay.addEventListener('click', e => {
                if (e.target === overlay) {
                    overlay.remove();
                    closeGame();
                }
            });

            const modal = document.createElement('div');
            modal.style.cssText = 'background:linear-gradient(to bottom right,#222,#333);color:#f0f0f0;padding:32px;border-radius:24px;box-shadow:0 12px 24px rgba(0,0,0,0.25);text-align:center;max-width:90vw;font-family:Segoe UI,sans-serif;';
            modal.innerHTML = `
                <h2 style="margin-bottom:10px;">${win ? "🎉 You Won!" : "Game Over"}</h2>
                <p style="margin:4px 0;">Rules completed: ${rulesCompleted}</p>
                <p style="margin:4px 0 16px;">Time: ${timeTaken}s</p>
                <p style="margin:4px 0 16px;">Password: <code>${password}</code></p>
                <h3 style="margin-bottom:10px;">Today's Leaderboard</h3>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Submit score and fetch leaderboard
            submitDailyScore(rulesCompleted, timeTaken, password);
            fetchDailyLeaderboard().then(scores => {
                scores.forEach((score, index) => {
                    const entry = document.createElement('p');
                    entry.style.margin = '2px 0';
                    entry.textContent = `#${index + 1}: ${score.name} - ${score.rulesCompleted} rules - ${score.time}s - ${score.password}`;
                    modal.appendChild(entry);
                });
            }).catch(error => {
                console.error(`[Games] - [ENCRPT] - Error fetching leaderboard:`, error);
                const errorMsg = document.createElement('p');
                errorMsg.textContent = 'Could not load leaderboard';
                errorMsg.style.margin = '10px 0';
                modal.appendChild(errorMsg);
            });
        }

        // --- LEADERBOARD ONLY ---
        function showLeaderboardOnly() {
            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '10001',
                background: 'transparent'
            });

            overlay.addEventListener('click', e => {
                if (e.target === overlay) overlay.remove();
            });

            const modal = document.createElement('div');
            modal.style.cssText = 'background:linear-gradient(to bottom right,#222,#333);color:#f0f0f0;padding:32px;border-radius:24px;box-shadow:0 12px 24px rgba(0,0,0,0.25);text-align:center;max-width:90vw;font-family:Segoe UI,sans-serif;';
            modal.innerHTML = '<h2 style="margin-bottom:10px;">Today\'s Leaderboard</h2>';

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            fetchDailyLeaderboard().then(scores => {
                scores.forEach((score, index) => {
                    const entry = document.createElement('p');
                    entry.style.margin = '2px 0';
                    entry.textContent = `#${index + 1}: ${score.name} - ${score.rulesCompleted} rules - ${score.time}s - ${score.password}`;
                    modal.appendChild(entry);
                });
            }).catch(error => {
                console.error('Error fetching leaderboard:', error);
                const errorMsg = document.createElement('p');
                errorMsg.textContent = 'Could not load leaderboard';
                errorMsg.style.margin = '10px 0';
                modal.appendChild(errorMsg);
            });
        }

        // --- DATABASE OPERATIONS ---
        function submitDailyScore(rulesCompleted, time, password) {
            const dateStr = `${TODAY_YEAR}-${String(TODAY_MONTH).padStart(2,'0')}-${String(TODAY_DATE).padStart(2,'0')}`;

            whenFirebaseReady((database) => {
                console.log(`[Games] - [ENCRPT] - Submitting score: ${rulesCompleted} rules in ${time}s`);
                database.collection('encrpt_daily_scores')
                    .add({
                        name: playerName,
                        rulesCompleted,
                        time,
                        password,
                        date: dateStr,
                        timestamp: new Date().toISOString()
                    })
                    .then(() => {
                        console.log(`[Games] - [ENCRPT] - Score submitted successfully`);
                    })
                    .catch(error => {
                        console.error(`[Games] - [ENCRPT] - Error submitting score:`, error);
                    });
            });
        }

        async function fetchDailyLeaderboard() {
            const dateStr = `${TODAY_YEAR}-${String(TODAY_MONTH).padStart(2,'0')}-${String(TODAY_DATE).padStart(2,'0')}`;

            return new Promise((resolve) => {
                whenFirebaseReady(async (database) => {
                    try {
                        const snapshot = await database.collection('encrpt_daily_scores')
                            .where('date', '==', dateStr)
                            .get();

                        const scores = snapshot.docs.map(doc => doc.data());
                        scores.sort((a, b) =>
                            b.rulesCompleted !== a.rulesCompleted
                                ? b.rulesCompleted - a.rulesCompleted
                                : a.time - b.time
                        );

                        resolve(scores.slice(0, 5));
                    } catch (error) {
                        console.error('Error fetching leaderboard:', error);
                        resolve([]);
                    }
                });
            });
        }

        // --- CLEANUP ---
        function closeGame() {
            if (gameContainer) gameContainer.remove();
            if (styleEl) styleEl.remove();
            document.body.style.overflow = '';
        }

    })();

    // ==================================
    // === IMPROVED ODDONEOUT GAME CODE ===
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
            MAX_VARIANCE: 65,      // Higher starting variance for easier beginning
            MIN_VARIANCE: 8,       // Higher minimum for gentler difficulty
            VARIANCE_REDUCTION: 1.8, // Much slower difficulty ramp
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
            // Optimized HSL parsing with caching
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

            // Improved random color generation with better distribution
            generateRandomColor() {
                const { COLOR_RANGES } = CONFIG;
                const h = Math.floor(Math.random() * COLOR_RANGES.HUE.max);
                const s = Math.floor(Math.random() * (COLOR_RANGES.SATURATION.max - COLOR_RANGES.SATURATION.min) + COLOR_RANGES.SATURATION.min);
                const l = Math.floor(Math.random() * (COLOR_RANGES.LIGHTNESS.max - COLOR_RANGES.LIGHTNESS.min) + COLOR_RANGES.LIGHTNESS.min);
                return `hsl(${h}, ${s}%, ${l}%)`;
            },

            // Gentler color variation algorithm with slower progression
            generateVariantColor(baseColor, difficulty) {
                const hsl = this.parseHSL(baseColor);
                const variance = Math.max(CONFIG.MIN_VARIANCE, CONFIG.MAX_VARIANCE - difficulty * CONFIG.VARIANCE_REDUCTION);

                // Use different strategies for color variation based on difficulty
                let h, s, l;

                if (difficulty <= 4) {
                    // Early rounds: very obvious differences
                    h = (hsl.h + (Math.random() * variance * 1.6 - variance * 0.8) + 360) % 360;
                    s = Math.max(20, Math.min(100, hsl.s + (Math.random() * variance * 0.9 - variance * 0.45)));
                    l = Math.max(20, Math.min(80, hsl.l + (Math.random() * variance * 0.9 - variance * 0.45)));
                } else if (difficulty <= 10) {
                    // Extended early-mid phase: still quite noticeable differences
                    h = (hsl.h + (Math.random() * variance * 1.3 - variance * 0.65) + 360) % 360;
                    s = Math.max(25, Math.min(100, hsl.s + (Math.random() * variance * 0.8 - variance * 0.4)));
                    l = Math.max(25, Math.min(80, hsl.l + (Math.random() * variance * 0.8 - variance * 0.4)));
                } else if (difficulty <= 18) {
                    // Mid rounds: moderate differences
                    h = (hsl.h + (Math.random() * variance - variance * 0.5) + 360) % 360;
                    s = Math.max(30, Math.min(95, hsl.s + (Math.random() * variance * 0.7 - variance * 0.35)));
                    l = Math.max(30, Math.min(75, hsl.l + (Math.random() * variance * 0.7 - variance * 0.35)));
                } else {
                    // Later rounds: subtle but still reasonable differences
                    h = (hsl.h + (Math.random() * variance * 0.6 - variance * 0.3) + 360) % 360;
                    const satVariance = variance * 0.7;
                    const lightVariance = variance * 0.8;
                    s = Math.max(35, Math.min(90, hsl.s + (Math.random() * satVariance - satVariance/2)));
                    l = Math.max(35, Math.min(70, hsl.l + (Math.random() * lightVariance - lightVariance/2)));
                }

                return `hsl(${h}, ${s}%, ${l}%)`;
            },

            // Fisher-Yates shuffle (in-place)
            shuffleArray(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            },

            // Optimized responsive tile sizing with better screen space management
            calculateOptimalTileSize(gridSize) {
                // Account for container padding, margins, and potential UI elements
                const containerPadding = 56; // 28px * 2 for top/bottom padding
                const availableWidth = window.innerWidth - (CONFIG.GRID_PADDING * 2 * CONFIG.TILE_MARGIN);
                const availableHeight = window.innerHeight - containerPadding - (CONFIG.GRID_PADDING * 2 * CONFIG.TILE_MARGIN);

                const maxTileWidth = Math.floor((availableWidth - (gridSize - 1) * CONFIG.TILE_GAP) / gridSize);
                const maxTileHeight = Math.floor((availableHeight - (gridSize - 1) * CONFIG.TILE_GAP) / gridSize);

                // More conservative size limits to prevent overflow
                const maxSize = Math.min(maxTileWidth, maxTileHeight);
                return Math.max(40, Math.min(maxSize, 100)); // Min 40px, max 100px (reduced from 120px)
            },

            // Debounced function utility
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
                // Faster grid size progression for more variety
                if (round <= 2) return 2;      // 2x2 for first 2 rounds only
                if (round <= 4) return 3;      // 3x3 for rounds 3-4
                if (round <= 7) return 4;      // 4x4 for rounds 5-7
                if (round <= 11) return 5;     // 5x5 for rounds 8-11
                return Math.min(6, CONFIG.MAX_GRID_SIZE); // 6x6 for rounds 12+
            },

            generateRoundData(round) {
                const gridSize = this.calculateGridSize(round);
                const tileCount = gridSize * gridSize;

                const baseColor = Utils.generateRandomColor();
                const oddColor = Utils.generateVariantColor(baseColor, round);

                // Create array with one odd color and rest base colors
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
                container.className = 'oddoneout-game-container';

                // Improved container styling to prevent overflow
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
                tile.className = 'oddoneout-tile';
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

                // Use event delegation for better performance
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

                // Visual feedback
                const tile = gameState.tiles[index];
                tile.style.border = '4px solid white';
                tile.style.transform = 'scale(1.1)';

                // Proceed to next round
                setTimeout(() => {
                    if (!gameState.isGameOver) {
                        gameState.roundNumber++;
                        GameFlow.showRound();
                    }
                }, CONFIG.ANIMATION_DURATION);
            },

            handleIncorrectChoice() {
                gameState.isGameOver = true;

                // Highlight the correct tile
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

        // --- GAME FLOW ---
        const GameFlow = {
            startGame() {
                gameState.playerName = window.playerNameOO || 'Player';

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
                    roundData.colors,
                    roundData.gridSize,
                    roundData.oddColor
                );

                // Clear previous round
                gameState.gameContainer.innerHTML = '';
                gameState.gameContainer.appendChild(gridContainer);

                // Update state
                gameState.tiles = tiles;
                gameState.roundComplete = false;
                gameState.isGameOver = false;
                gameState.oddTileIndex = roundData.colors.indexOf(roundData.oddColor);
            },

            endGame() {
                const { overlay, modal } = UI.createGameOverModal(gameState.score, gameState.roundNumber);

                // Event listeners
                overlay.addEventListener('click', (e) => {
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

                document.body.appendChild(overlay);

                // Submit score and load leaderboard
                Database.submitScore(gameState.score, gameState.roundNumber)
                    .then(() => Database.fetchTopScores())
                    .then(scores => UI.updateLeaderboard(modal, scores))
                    .catch(error => console.error('Failed to load leaderboard:', error));
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

        // --- DATABASE OPERATIONS ---
        const Database = {
            submitScore(score, round) {
                return new Promise((resolve, reject) => {
                    whenFirebaseReady((database) => {
                        database.collection('OOO_scores')
                            .add({
                                name: gameState.playerName,
                                score: score,
                                round: round,
                                timestamp: new Date().toISOString()
                            })
                            .then(resolve)
                            .catch(reject);
                    });
                });
            },

            fetchTopScores(limit = 5) {
                return new Promise((resolve) => {
                    whenFirebaseReady(async (database) => {
                        try {
                            const snapshot = await database.collection('OOO_scores')
                                .orderBy('score', 'desc')
                                .limit(limit)
                                .get();

                            const scores = snapshot.docs.map(doc => doc.data());
                            resolve(scores);
                        } catch (error) {
                            console.error('Error fetching scores:', error);
                            resolve([]);
                        }
                    });
                });
            }
        };

        // --- EXPOSE API ---
        window.startGame = GameFlow.startGame.bind(GameFlow);

    })();

    // ================================
    // === ATTACH LAUNCHER TO NAME ===
    // ================================
    attachNameClick();

})();
