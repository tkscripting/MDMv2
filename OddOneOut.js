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

    // --- HELPER: name-click menu launcher ---
    function attachNameClick(callback) {
        const selector = '.MuiTypography-root.MuiTypography-subtitle1.MuiTypography-noWrap.css-aj6ovs';
        const bind = el => el.addEventListener('click', showGameMenu);
        const init = () => {
            const el = document.querySelector(selector);
            if (el) return bind(el);
            const mo = new MutationObserver(() => {
                const found = document.querySelector(selector);
                if (found) {
                    bind(found);
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
        // ENCRPT wants "First L"
        // build "First L"
        const formatted = parts.length > 1
        ? `${parts[0]} ${parts[1][0]}`
        : parts[0];

        window.playerName   = formatted;
        window.playerNameOO = formatted;


        // 2) build the same overlay/menu…
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
    background: linear-gradient(to right, #2b5876, #4e4376); /* Cosmic Midnight */
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

    // --- SCRIPT LOADER ---
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

    // ========================
    // === ENCRPT GAME CODE ===
    // ========================
    (function() {
        'use strict';
        let playerName = '';

        // --- FIREBASE SETUP ---
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
            appId:    "1:857590797309:web:4de7faebc9882641427f94",
            measurementId: "G-5S5283GD9C"
        };
        let db;
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
        loadScripts(firebaseScripts, () => {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            // (no longer auto-starting; entry is attemptStart)
        });

        // --- ENTRY POINT (exposed for external launcher) ---
        async function attemptStart() {
            playerName = window.playerName;
            const D = new Date();
            const dateStr = `${D.getFullYear()}-${String(D.getMonth()+1).padStart(2,'0')}-${String(D.getDate()).padStart(2,'0')}`;
            const snap = await db.collection('encrpt_daily_scores')
            .where('date','==', dateStr)
            .where('name','==', playerName)
            .limit(1)
            .get();
            if (snap.empty) {
                initGame();
            } else {
                showLeaderboardOnly();
            }
        }
        window.attemptStart = attemptStart;

        // --- STATE & RULES ---
        let todaysRules = [], activeRules = [], revealIndex = 0, gameStartTime = 0;
        let gameEnded = false;
        let gameContainer, gameContent, passwordField, charCount, rulesContainer, styleEl;
        let currentPassword = '';

        /* ==== DAILY-ROTATION CONSTANTS ==== */
        const minLengthCycle    = [5, 6, 7, 8];                         // “At least N characters”
        const digitSumCycle     = [10, 15, 19, 21, 23, 25];             // “Digits sum to X”
        const romanProductCycle = [6, 10, 12, 15, 18, 20, 24, 30, 35];  // “Roman numerals multiply to Y”

        function dailyIndex() {
            const msPerDay = 86_400_000;                 // 24 × 60 × 60 × 1000
            return Math.floor(Date.now() / msPerDay);    // days since Unix epoch
        }

        /* === helper: digit sum of a string === */
        function sumDigits(str) {
            return str.replace(/\D/g,'')
                .split('')
                .reduce((a, b) => a + +b, 0);
        }

        /* Today’s parameters */
        const MIN_LEN    = minLengthCycle[ dailyIndex() % minLengthCycle.length ];
        const rawTarget   = digitSumCycle[dailyIndex() % digitSumCycle.length];

        /* digits forced by today’s date, current-hour, two-digit prime, etc.
   (Rules may or may not exist today, but this upper-bounds the minimum.) */
        const forcedDigitSum = [
            /* today’s date */
            `${String(new Date().getMonth()+1).padStart(2,'0')}/${String(new Date().getDate()).padStart(2,'0')}/${new Date().getFullYear()}`,
            /* current hour (##) */
            String(new Date().getHours()).padStart(2,'0'),
            /* default two-digit prime seed “11” */
            '11'
        ].reduce((tot, seg) => tot + sumDigits(seg), 0);

        /* final, always-solvable target */
        const DIGIT_SUM = Math.max(rawTarget, forcedDigitSum);
        const ROMAN_PROD = romanProductCycle[ dailyIndex() % romanProductCycle.length ];

        const fullRules = [
            { id: 1,
             text: `At least ${MIN_LEN} characters`,
             check: p => p.length >= MIN_LEN,
             highlight: _ => [] },
            { id:2,  text:"Include a number", check:p=>/\d/.test(p), highlight:p=>[...p].map((c,i)=>/\d/.test(c)?i:null).filter(i=>i!=null) },
            { id:3,  text:"Include an uppercase letter", check:p=>/[A-Z]/.test(p), highlight:p=>[...p].map((c,i)=>/[A-Z]/.test(c)?i:null).filter(i=>i!=null) },
            { id:4,  text:"Include a special character", check:p=>/[!@#$%^&*(),.?":{}|<>]/.test(p), highlight:p=>[...p].map((c,i)=>/[!@#$%^&*(),.?":{}|<>]/.test(c)?i:null).filter(i=>i!=null) },
            { id: 5,
             text: `Digits sum to ${DIGIT_SUM}`,
             check: p => (p.match(/\d/g) || [])
             .map(Number)
             .reduce((a, b) => a + b, 0) === DIGIT_SUM,
             highlight: p => [...p]
             .map((c, i) => /\d/.test(c) ? i : null)
             .filter(i => i != null) },
            { id:6,  text:"Include a month of the year", check:p=>["january","february","march","april","may","june","july","august","september","october","november","december"].some(m=>p.toLowerCase().includes(m)), highlight:p=>{const low=p.toLowerCase(),mons=["january","february","march","april","may","june","july","august","september","october","november","december"],m=mons.find(x=>low.includes(x));if(!m)return[];const i=low.indexOf(m);return Array.from({length:m.length},(_,k)=>i+k);} },
            { id:7,  text:"Include a Roman numeral", check:p=>/[IVXLCDM]/.test(p), highlight:p=>[...p].map((c,i)=>/[IVXLCDM]/.test(c)?i:null).filter(i=>i!=null) },
            { id:8,  text:"Include sponsor: TacoBell, Chilis, or McDonalds", check:p=>["tacobell","chilis","mcdonalds"].some(s=>p.toLowerCase().includes(s)), highlight:p=>{const low=p.toLowerCase(),arr=["pepsi","starbucks","shell"],f=arr.find(x=>low.includes(x));if(!f)return[];const i=low.indexOf(f);return Array.from({length:f.length},(_,k)=>i+k);} },
            { id: 9,
             text: `Roman numerals multiply to ${ROMAN_PROD}`,
             check: p => {
                 const chunks = p.match(/([IVXLCDM]+)/g) || [];
                 if (!chunks.length) return false;
                 return chunks.map(s => parseRoman(s))
                     .reduce((a, b) => a * b, 1) === ROMAN_PROD;
             },
             highlight: p => {
                 const out = [];
                 const re  = /([IVXLCDM]+)/g;
                 let m;
                 while ((m = re.exec(p))) {
                     for (let k = 0; k < m[1].length; k++) out.push(m.index + k);
                 }
                 return out;
             } },
            { id:10, text:"Include its length", check:p=>p.includes(p.length.toString()), highlight:p=>{const t=p.length.toString(),i=p.indexOf(t);return i>-1?Array.from({length:t.length},(_,k)=>i+k):[];} },
            { id:11, text:"Include today's date (MM/DD/YYYY)", check:p=>{const d=new Date(),ds=`${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;return p.includes(ds);}, highlight:p=>{const d=new Date(),ds=`${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`,i=p.indexOf(ds);return i>-1?Array.from({length:ds.length},(_,k)=>i+k):[];} },
            { id: 12,
             text: "Start with a letter and end with a digit",
             check: p => /^[A-Za-z].*\d$/.test(p),
             highlight: p => p.length ? [0, p.length - 1] : [] },
            {
                id: 13,
                text: "Use a single character exactly three times",

                /* still the same validity check … */
                check: p => {
                    const counts = {};
                    for (const ch of p) counts[ch] = (counts[ch] || 0) + 1;
                    return Object.values(counts).some(c => c === 3);
                },

                /* … but a smarter highlighter */
                highlight: p => {
                    // build a frequency table
                    const counts = {};
                    for (const ch of p) counts[ch] = (counts[ch] || 0) + 1;

                    // 1️⃣  If the rule already passes, highlight that exact-three char
                    const ok = Object.keys(counts).find(ch => counts[ch] === 3);
                    if (ok) return [...p].flatMap((c, i) => c === ok ? i : []);

                    /* 2️⃣  Otherwise:
   *     - favour characters that occur **more than** 3 times (the player
   *       needs to delete some)
   *     - if none are >3, fall back to the one that’s closest below 3
   */
                    let target = null;
                    let bestDiff = Infinity;
                    for (const [ch, n] of Object.entries(counts)) {
                        const diff = Math.abs(n - 3);

                        // prefer over-counted chars; break ties by smaller diff, then earliest found
                        if ((n > 3 && (target === null || counts[target] <= 3 || diff < bestDiff)) ||
                            (n < 3 && target !== null && counts[target] < 3 && diff < bestDiff) ||
                            target === null) {
                            target   = ch;
                            bestDiff = diff;
                        }
                    }

                    return target
                        ? [...p].flatMap((c, i) => c === target ? i : [])
                    : [];
                }

            },
            { id:14, text:"Exactly two special characters.", check:p=>((p.match(/[!@#$%^&*(),.?":{}|<>]/g)||[]).length===2), highlight:p=>[...p].map((c,i)=>/[!@#$%^&*(),.?":{}|<>]/.test(c)?i:null).filter(i=>i!=null) },
            { id:15, text:"Include a two-digit prime (11–97)", check:p=>['11','13','17','19','23','29','31','37','41','43','47','53','59','61','67','71','73','79','83','89','97'].some(pr=>p.includes(pr)), highlight:p=>{const primes=['11','13','17','19','23','29','31','37','41','43','47','53','59','61','67','71','73','79','83','89','97'],f=primes.find(x=>p.includes(x));if(!f)return[];const i=p.indexOf(f);return Array.from({length:f.length},(_,k)=>i+k);} },
            { id:16, text:"Digit count must be even", check:p=>((p.match(/\d/g)||[]).length%2===0), highlight:p=>[...p].map((c,i)=>/\d/.test(c)?i:null).filter(i=>i!=null) },
            { id:17, text:"Include current hour (00–23)", check:p=>{const h=String(new Date().getHours()).padStart(2,'0');return p.includes(h);}, highlight:p=>{const h=String(new Date().getHours()).padStart(2,'0'),i=p.indexOf(h);return i>-1?[i,i+1]:[];} },
            { id:18, text:"No consecutive repeated characters", check:p=>!/(.)\1/.test(p), highlight:p=>{const m=p.match(/(.)(\1)/);return m?[m.index,m.index+1]:[];} },
            { id:19, text:"At least one lowercase AND one uppercase letter", check:p=>/[a-z]/.test(p)&&/[A-Z]/.test(p), highlight:p=>[...p].map((c,i)=>/[a-zA-Z]/.test(c)?i:null).filter(i=>i!=null) },
            { id:20, text:"Include a correct 1-digit math equation (3+4=7)", check:p=>{const m=p.match(/(\d)([+\-*/])(\d)=(\d)/);if(!m)return false;return eval(`${m[1]}${m[2]}${m[3]}`)==m[4];}, highlight:p=>{const m=p.match(/(\d)([+\-*/])(\d)=(\d)/);if(!m)return[]; const idx=p.indexOf(m[0]);return Array.from({length:m[0].length},(_,k)=>idx+k);} },
            { id:21, text: "Include a US state abbreviation (e.g. NY, CA)",
             check: p => {
                 const states = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
                                 "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA",
                                 "RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
                 return states.some(ab => p.toUpperCase().includes(ab));
             },
             highlight: p => {
                 const up = p.toUpperCase();
                 const states = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
                                 "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA",
                                 "RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
                 const hit = states.find(ab => up.includes(ab));
                 const i   = hit ? up.indexOf(hit) : -1;
                 return i === -1 ? [] : [i, i + 1];
             } },
            { id:22, text: "Include today’s weekday name",
             check: p => {
                 const wd = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
                 return p.toLowerCase().includes(wd);
             },
             highlight: p => {
                 const wd = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
                 const low = p.toLowerCase();
                 const i = low.indexOf(wd);
                 return i === -1 ? [] : Array.from({length: wd.length}, (_, k) => i + k);
             } },
            { id:23, text: "Include three consecutive ascending digits (e.g. 123, 456)",
             check: p => /(012|123|234|345|456|567|678|789)/.test(p),
             highlight: p => {
                 const m = p.match(/(012|123|234|345|456|567|678|789)/);
                 if (!m) return [];
                 const i = p.indexOf(m[0]);
                 return [i, i + 1, i + 2];
             } },
            { id:24, text: "Include a three-character palindrome (ABA, 121)",
             check: p => /(.)(.)\1/.test(p),
             highlight: p => {
                 const m = p.match(/(.)(.)\1/);
                 if (!m) return [];
                 const i = p.indexOf(m[0]);
                 return [i, i + 1, i + 2];
             } },
            { id:25, text: "End with two consecutive prime digits (2,3,5,7)",
             check: p => /[2357]{2}$/.test(p),
             highlight: p => p.length ? [p.length - 2, p.length - 1] : [] },
        ];
        const incompatiblePairs = [[9,18], [13,18]];
        function isCompatible(rs) {
            const ids = rs.map(r=>r.id);
            return !incompatiblePairs.some(([a,b])=>ids.includes(a)&&ids.includes(b));
        }
        function parseRoman(s) {
            const M={I:1,IV:4,V:5,IX:9,X:10,XL:40,L:50,XC:90,C:100,CD:400,D:500,CM:900,M:1000};
            let i=0,v=0;
            while(i<s.length){
                if(i+1<s.length&&M[s.substr(i,2)]){v+=M[s.substr(i,2)];i+=2;}
                else {v+=M[s[i]];i++;}
            }
            return v;
        }
        function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
        function shuffle(arr,rng){const a=arr.slice();for(let i=a.length-1;i>0;--i){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
        function getDailyRules(count = 15, offset = 0){
            const d     = new Date();
            const seed  = d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate() + offset;
            const pool  = shuffle(fullRules, mulberry32(seed));

            // --- NEW ---
            let pick;
            do {
                pick = pool.slice(0, count);
                pool.push(pool.shift());           // rotate and try a new slice next loop
            } while (!isCompatible(pick));
            // -----------

            return pick;
        }
        function buildBase(rs){
            return rs.map(r => {
                switch (r.id) {
                    case 1:  // minimum length
                        return 'A'.repeat(MIN_LEN);

                    case 5: { // digits sum to DIGIT_SUM
                        let rem = DIGIT_SUM, out = '';
                        while (rem >= 9) { out += '9'; rem -= 9; }
                        if (rem > 0) out += String(rem);
                        return out;
                    }

                    case 9: { // Roman product = ROMAN_PROD
                        // A tiny lookup guarantees we always have a valid combo
                        const romanSeeds = {
                            6:  'VI',        // 6
                            10: 'V II',      // 5 × 2
                            12: 'III IV',    // 3 × 4
                            15: 'V III',     // 5 × 3
                            18: 'IX II',     // 9 × 2
                            20: 'IV V',      // 4 × 5
                            24: 'VI IV',     // 6 × 4
                            30: 'VI V',      // 6 × 5
                            35: 'VII V'      // 7 × 5
                        };
                        return romanSeeds[ROMAN_PROD] || 'VII V';
                    }

                    case 12: return "A";      // starts A, ends with 0
                    case 13: return "~~~";     // three tildes (not reused elsewhere)

                    case 21: return "NY";      // state abbreviation
                    case 22: {                 // weekday name
                        const wd = ["Sunday","Monday","Tuesday","Wednesday",
                                    "Thursday","Friday","Saturday"][new Date().getDay()];
                        return wd;
                    }
                    case 23: return "123";     // ascending digits
                    case 24: return "aba";     // small palindrome
                    case 25: return "23";      // prime-digit pair at end

                        /* keep every other case exactly as-is */
                    default:
                        return '';
                }
            }).join('');
        }

        function isSolvable(rs, tries = 2000) {        // <-- was 200
            const alpha  = 'abcdefghijklmnopqrstuvwxyz',
                  ALPHA  = alpha.toUpperCase(),
                  digits = '0123456789',
                  specs  = '!@#$%^&*(),.?":{}|<>',
                  all    = alpha + ALPHA + digits + specs;

            const base = buildBase(rs);

            /* ---------- keep rule-25 prime pair (‘23’) fixed at the end ---------- */
            let core = base.split('');
            const hasPrimeTail = rs.some(r => r.id === 25);
            let tail = [];
            if (hasPrimeTail) {
                tail = core.splice(-2);        // removes last two chars
            }
            /* -------------------------------------------------------------------- */

            for (let t = 0; t < tries; t++) {
                let pwd = core.sort(() => Math.random() - .5).join('') + tail.join('');

                // add 5-9 random extra characters
                for (let i = 0, extra = 5 + Math.floor(Math.random() * 5); i < extra; i++) {
                    pwd += all.charAt(Math.floor(Math.random() * all.length));
                }
                if (rs.every(r => r.check(pwd))) return true;
            }
            return false;
        }

        // --- INITIALIZE & UI BUILD ---
        function initGame(){
            gameEnded = false;
            const MAX_ATTEMPTS = 100;   // plenty of head-room

            let attempts = 0;
            do {
                todaysRules = getDailyRules(15, attempts);
                attempts++;
            } while (
                attempts < MAX_ATTEMPTS &&
                (!isCompatible(todaysRules) || !isSolvable(todaysRules))
            );
            if (attempts >= MAX_ATTEMPTS) {
                console.warn(`Couldn't find compatible & solvable set after ${MAX_ATTEMPTS} tries`);
            }
            activeRules = [];
            revealIndex = 0;
            setupUI();
            addNextRule();
            gameStartTime = Date.now();
        }

        function setupUI(){
            if (gameContainer) gameContainer.remove();
            if (styleEl) styleEl.remove();

            // inject glassmorphic CSS
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
        display: block;
        margin: 0 auto;
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
        box-shadow: 0 4px 12px rgba(30,144,255,0.6);
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
        <button id="submit-score-btn" class="btn btn-primary">Submit Score</button>
      </div>
      <div id="rules-container" style="padding:0 16px 16px;"></div>
    `;

            passwordField   = document.getElementById('password-input');
            charCount       = document.getElementById('char-count');
            rulesContainer  = document.getElementById('rules-container');

            passwordField.addEventListener('input', onInput);
            passwordField.addEventListener('paste', onPaste);
            document.getElementById('submit-score-btn').addEventListener('click', ()=>showEndScreen(false));
            document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeGame(); });
            gameContainer.addEventListener('click', e=>{ if(e.target===gameContainer) closeGame(); });
            passwordField.focus();
        }

        function addNextRule(){
            if (revealIndex >= todaysRules.length) return;
            const r = todaysRules[revealIndex++];
            activeRules.push(r);
            const w = document.createElement('div');
            w.id = `rule-${r.id}`;
            w.className = r.check(currentPassword) ? 'rule-card rule-valid' : 'rule-card rule-invalid';
            w.textContent = r.text;
            rulesContainer.prepend(w);
            updateStatuses();
            renderInput();
            setTimeout(checkProgress, 100);
        }

        function onInput(){
            currentPassword = passwordField.textContent;
            charCount.textContent = currentPassword.length;
            updateStatuses(); renderInput(); setTimeout(checkProgress, 300);
        }
        function onPaste(e){
            e.preventDefault();
            alert("🚨 Pasting is disabled — please type your password!");
        }
        function updateStatuses(){
            activeRules.forEach(r=>{
                const el = document.getElementById(`rule-${r.id}`);
                if (el) el.className = `rule-card ${r.check(currentPassword)?'rule-valid':'rule-invalid'}`;
            });
        }
        function renderInput(){
            const cp = getCaretOffset(passwordField);
            const wrong = activeRules.filter(r=>!r.check(currentPassword));
            let idxs = wrong.length===1 ? wrong[0].highlight(currentPassword) : [];
            const chars = [...currentPassword];
            passwordField.innerHTML = chars.map((c,i)=> idxs.includes(i) ? `<span class="char-highlight">${c}</span>` : c ).join('');
            setCaretOffset(passwordField, cp);
        }
        function checkProgress(){
            if (activeRules.every(r=>r.check(currentPassword))) {
                if (revealIndex < todaysRules.length) addNextRule();
                else showEndScreen(true);
            }
        }
        function getCaretOffset(el){
            const sel = window.getSelection();
            if (!sel.rangeCount) return 0;
            const r = sel.getRangeAt(0), pr = r.cloneRange();
            pr.selectNodeContents(el);
            pr.setEnd(r.endContainer, r.endOffset);
            return pr.toString().length;
        }
        function setCaretOffset(el,ch){
            let stack=[el], node, off=ch, found=false;
            while(!found && (node=stack.shift())){
                if(node.nodeType===Node.TEXT_NODE){
                    if(node.length>=off){
                        const rng=document.createRange(), s=window.getSelection();
                        rng.setStart(node,off); rng.collapse(true);
                        s.removeAllRanges(); s.addRange(rng);
                        found=true;
                    } else off-=node.length;
                } else stack.unshift(...node.childNodes);
            }
        }

        function showEndScreen(win){
            if (gameEnded) return;
            gameEnded = true;
            const rulesDone = activeRules.length;
            const timeTaken = Math.floor((Date.now()-gameStartTime)/1000);
            const pw = currentPassword;
            const overlay = document.createElement('div');
            overlay.style.position     = 'fixed';
            overlay.style.top          = '0';
            overlay.style.left         = '0';
            overlay.style.width        = '100%';
            overlay.style.height       = '100%';
            overlay.style.display      = 'flex';
            overlay.style.alignItems   = 'center';
            overlay.style.justifyContent= 'center';
            overlay.style.zIndex       = '10001';
            overlay.style.background   = 'transparent';
            overlay.addEventListener('click', e=>{ if(e.target===overlay){ overlay.remove(); closeGame(); } });
            const modal = document.createElement('div');
            modal.style = 'background:linear-gradient(to bottom right,#222,#333);color:#f0f0f0;padding:32px;border-radius:24px;box-shadow:0 12px 24px rgba(0,0,0,0.25);text-align:center;max-width:90vw;font-family:Segoe UI,sans-serif;';
            modal.innerHTML = `
      <h2 style="margin-bottom:10px;">${win?"🎉 You Won!":"Game Over"}</h2>
      <p style="margin:4px 0;">Rules completed: ${rulesDone}</p>
      <p style="margin:4px 0 16px;">Time: ${timeTaken}s</p>
      <p style="margin:4px 0 16px;">Password: <code>${pw}</code></p>
      <h3 style="margin-bottom:10px;">Today's Leaderboard</h3>
    `;
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            submitDailyScore(rulesDone, timeTaken, pw);
            fetchDailyLeaderboard().then(scores=>scores.forEach((s,i)=>{
                const e = document.createElement('p');
                e.style = 'margin:2px 0;';
                e.textContent = `#${i+1}: ${s.name} - ${s.rulesCompleted} rules - ${s.time}s - ${s.password}`;
                modal.appendChild(e);
            }));
        }

        function showLeaderboardOnly(){
            const overlay = document.createElement('div');
            overlay.style.position     = 'fixed';
            overlay.style.top          = '0';
            overlay.style.left         = '0';
            overlay.style.width        = '100%';
            overlay.style.height       = '100%';
            overlay.style.display      = 'flex';
            overlay.style.alignItems   = 'center';
            overlay.style.justifyContent= 'center';
            overlay.style.zIndex       = '10001';
            overlay.style.background   = 'transparent';
            overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
            const modal = document.createElement('div');
            modal.style = 'background:linear-gradient(to bottom right,#222,#333);color:#f0f0f0;padding:32px;border-radius:24px;box-shadow:0 12px 24px rgba(0,0,0,0.25);text-align:center;max-width:90vw;font-family:Segoe UI,sans-serif;';
            modal.innerHTML = `<h2 style="margin-bottom:10px;">Today's Leaderboard</h2>`;
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            fetchDailyLeaderboard().then(scores=>scores.forEach((s,i)=>{
                const e = document.createElement('p');
                e.style = 'margin:2px 0;';
                e.textContent = `#${i+1}: ${s.name} - ${s.rulesCompleted} rules - ${s.time}s - ${s.password}`;
                modal.appendChild(e);
            }));
        }

        function submitDailyScore(rulesCompleted, time, password){
            const D=new Date();
            const dateStr=`${D.getFullYear()}-${String(D.getMonth()+1).padStart(2,'0')}-${String(D.getDate()).padStart(2,'0')}`;
            db.collection('encrpt_daily_scores')
                .add({
                name: window.playerName,    // ← USE THIS
                rulesCompleted,
                time,
                password,
                date: dateStr,
                timestamp: new Date().toISOString()
            })
                .catch(console.error);
        }
        async function fetchDailyLeaderboard(){
            const D=new Date();
            const dateStr=`${D.getFullYear()}-${String(D.getMonth()+1).padStart(2,'0')}-${String(D.getDate()).padStart(2,'0')}`;
            const snap = await db.collection('encrpt_daily_scores').where('date','==',dateStr).get();
            const scores = snap.docs.map(d=>d.data());
            scores.sort((a,b)=> b.rulesCompleted!==a.rulesCompleted ? b.rulesCompleted-a.rulesCompleted : a.time-b.time);
            return scores.slice(0,5);
        }

        function closeGame(){
            if (gameContainer) gameContainer.remove();
        }

    })();


    // ==================================
    // === ODDONEOUT GAME CODE START ===
    // ==================================
    (function () {
        'use strict';
        let playerNameOO = '';

        // --- FIREBASE SETUP ---
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
        let dbOO;
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
        loadScripts(firebaseScripts, () => {
            firebase.initializeApp(firebaseConfig);
            dbOO = firebase.firestore();
            // ← no more automatic start hook here
        });

        // --- GLOBAL STATE ---
        let gameContainer = null;
        let gameActive = false;
        let roundNumber = 1;
        let score = 0;
        let roundStartTime = 0;
        let outsideClickListener = null;
        let tiles = [];
        let roundComplete = false;
        let isGameOver = false;
        let oddTileIndex = -1;

        // --- GAME LOGIC (unchanged) ---
        function getHSLFromColor(color) {
            const match = color.match(/hsl\((\d+), (\d+)%?, (\d+)%?\)/);
            if (!match) return { h: 0, s: 100, l: 50 };
            return { h: +match[1], s: +match[2], l: +match[3] };
        }

        function getRandomColor() {
            const h = Math.floor(Math.random() * 360);
            const s = Math.floor(Math.random() * 40 + 60);
            const l = Math.floor(Math.random() * 40 + 40);
            return `hsl(${h}, ${s}%, ${l}%)`;
        }

        function generateSlightlyDifferentColor(baseColor, round) {
            const hsl = getHSLFromColor(baseColor);
            const maxVariance = 50;
            const variance = Math.max(2, maxVariance - round * 4);
            const h = (hsl.h + (Math.random() * variance * 2 - variance) + 360) % 360;
            const s = Math.min(Math.max(hsl.s + (Math.random() * variance - variance / 2), 0), 100);
            const l = Math.min(Math.max(hsl.l + (Math.random() * variance - variance / 2), 0), 100);
            return `hsl(${h}, ${s}%, ${l}%)`;
        }

        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }

        function generateRound() {
            const gridSize = Math.min(2 + roundNumber, 8);
            const tileCount = gridSize * gridSize;
            const base = getRandomColor();
            const odd = generateSlightlyDifferentColor(base, roundNumber);
            const set = new Array(tileCount - 1).fill(base).concat(odd);
            shuffleArray(set);
            return { colorSet: set, oddColor: odd };
        }

        function calculateRoundScore(timeTaken) {
            const maxScore = 100;
            const baseScore = maxScore - Math.min(timeTaken / 100, maxScore);
            const roundMultiplier = 1 + (roundNumber * 0.3);
            return Math.floor(Math.max(5, baseScore * roundMultiplier));
        }

        function showRound() {
            roundStartTime = Date.now();
            const { colorSet, oddColor } = generateRound();
            const gridSize = Math.sqrt(colorSet.length);
            gameContainer.innerHTML = '';

            const tileSize = Math.min(
                Math.floor(window.innerWidth / (gridSize + 2)),
                Math.floor(window.innerHeight / (gridSize + 4))
            ) - 10;

            const gridContainer = document.createElement('div');
            gridContainer.style.display = 'grid';
            gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, ${tileSize}px)`;
            gridContainer.style.gap = '10px';

            tiles = [];
            colorSet.forEach((color, index) => {
                const tile = document.createElement('div');
                tile.style.width = `${tileSize}px`;
                tile.style.height = `${tileSize}px`;
                tile.style.background = color;
                tile.style.borderRadius = '16px';
                tile.style.cursor = 'pointer';
                tile.style.transition = 'transform 0.3s, box-shadow 0.3s';
                tile.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
                tile.onmouseover = () => tile.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
                tile.onmouseout = () => tile.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
                tile.addEventListener('click', () => handleTileClick(index, color, oddColor));
                tiles.push(tile);
                gridContainer.appendChild(tile);
            });

            gameContainer.appendChild(gridContainer);
            roundComplete = false;
            isGameOver = false;
            oddTileIndex = colorSet.indexOf(oddColor);
        }

        function handleTileClick(index, color, oddColor) {
            if (roundComplete || isGameOver) return;
            if (color === oddColor) {
                score += calculateRoundScore(Date.now() - roundStartTime);
                roundComplete = true;
                tiles[index].style.border = '4px solid white';
                tiles[index].style.transform = 'scale(1.1)';
                setTimeout(() => {
                    if (!isGameOver) {
                        roundNumber++;
                        showRound();
                    }
                }, 300);
            } else {
                gameOver();
            }
        }

        function gameOver() {
            isGameOver = true;
            tiles[oddTileIndex].style.border = '4px solid white';

            const overlay = document.createElement('div');
            overlay.style = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(30, 30, 30, 0.5);
            backdrop-filter: blur(8px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
            overlay.addEventListener('click', e => {
                if (e.target === overlay) {
                    overlay.remove();
                    resetGame();
                }
            });

            const modal = document.createElement('div');
            modal.style = `
            background: linear-gradient(to bottom right, #222, #333);
            color: #f0f0f0;
            padding: 32px;
            border-radius: 24px;
            box-shadow: 0 12px 24px rgba(0,0,0,0.25);
            text-align: center;
            max-width: 90vw;
            font-family: 'Segoe UI', sans-serif;
        `;

            modal.innerHTML = `
            <h2 style="margin-bottom:10px;">Game Over</h2>
            <p style="margin:4px 0;">Round: ${roundNumber}</p>
            <p style="margin:4px 0 16px;">Score: ${score}</p>
            <button style="
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
        `;
            modal.querySelector('button').onclick = () => {
                overlay.remove();
                resetGame();
                setTimeout(startGame, 0);
            };

            fetchTopScores().then(scores => {
                scores.forEach((s, i) => {
                    const entry = document.createElement('p');
                    entry.style.margin = '2px 0';
                    entry.textContent = `#${i + 1}: ${s.name || 'Anon'} - ${s.score} (Round ${s.round})`;
                    modal.appendChild(entry);
                });
            });

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            submitScore(score, roundNumber);
        }

        function resetGame() {
            gameActive = false;
            if (gameContainer) gameContainer.remove();
            document.removeEventListener('click', outsideClickListener);
        }

        function startGame() {
            playerNameOO = window.playerNameOO;
            if (gameActive) return;
            gameActive = true;
            roundNumber = 1;
            score = 0;

            gameContainer = document.createElement('div');
            gameContainer.style = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: radial-gradient(ellipse at center, #1a1a1a, #121212);
            backdrop-filter: blur(12px);
            padding: 28px;
            border-radius: 24px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: #f8f9fa;
            font-family: 'Segoe UI', sans-serif;
            max-width: 95vw;
            max-height: 95vh;
            overflow: auto;
        `;
            document.body.appendChild(gameContainer);

            showRound();

            setTimeout(() => {
                outsideClickListener = function (event) {
                    if (gameContainer && !gameContainer.contains(event.target)) resetGame();
                };
                document.addEventListener('click', outsideClickListener);
            }, 100);
        }

        async function submitScore(scoreVal, roundVal) {
            try {
                await dbOO.collection('OOO_scores').add({
                    name: window.playerNameOO,
                    score: scoreVal,
                    round: roundVal,
                    timestamp: new Date().toISOString()
                });
            } catch (e) {
                console.error('Score submit failed:', e);
            }
        }

        async function fetchTopScores() {
            const snap = await dbOO.collection('OOO_scores')
            .orderBy('score', 'desc')
            .limit(5)
            .get();
            return snap.docs.map(doc => doc.data());
        }

        // --- EXPOSE ENTRY POINT ---
        // External launcher should set `window.playerNameOO` to the desired name,
        // then call `window.startGame()` to kick off OddOneOut.
        window.startGame = startGame;
        window.playerNameOO = playerNameOO;

    })();

    // ================================
    // === ATTACH LAUNCHER TO NAME ===
    // ================================
    attachNameClick();

})();
