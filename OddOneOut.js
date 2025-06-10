// ==UserScript==
// @name         OddOneOut
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Color game with refined difficulty, adaptive scoring, and Firebase leaderboard on madame.ynap.biz
// @author       You
// @match        https://madame.ynap.biz/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const firebaseScripts = [
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'
    ];

    function loadScripts(scripts, callback) {
        let loaded = 0;
        scripts.forEach(src => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => {
                loaded++;
                if (loaded === scripts.length) callback();
            };
            document.head.appendChild(s);
        });
    }

    loadScripts(firebaseScripts, () => {
        const firebaseConfig = {
            apiKey: "AIzaSyAXRJJZrRZVyrQzjGT_kXoMDJ23julYkIQ",
            authDomain: "ooog-5c3c1.firebaseapp.com",
            projectId: "ooog-5c3c1",
            storageBucket: "ooog-5c3c1.firebasestorage.app",
            messagingSenderId: "857590797309",
            appId: "1:857590797309:web:4de7faebc9882641427f94",
            measurementId: "G-5S5283GD9C"
        };

        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

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
        let playerName = 'Anonymous';

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

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resetGame();
                }
            });

            const modal = document.createElement('div');
       modal.style = `
    background: linear-gradient(to bottom right, #222 0%, #333 100%);
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
    margin-bottom: 20px;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(to right, #fdfbfb, #ebedee);
    color: #111;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s, transform 0.2s;
"
onmouseover="this.style.transform='scale(1.05)'"
onmouseout="this.style.transform='scale(1)'"
>
REPLAY
</button>

                <h3 style="margin-bottom:10px;">Leaderboard</h3>
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
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    padding: 28px;
    border-radius: 24px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
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

        async function submitScore(score, round) {
            try {
                await db.collection('OOO_scores').add({ name: playerName, score, round, timestamp: new Date().toISOString() });
            } catch (e) {
                console.error('Score submit failed:', e);
            }
        }

        async function fetchTopScores() {
            const snap = await db.collection('OOO_scores').orderBy('score', 'desc').limit(5).get();
            return snap.docs.map(doc => doc.data());
        }

        function waitForTrigger() {
            const selector = '.MuiTypography-root.MuiTypography-subtitle1.MuiTypography-noWrap.css-aj6ovs';
            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    playerName = el.textContent.trim().split(' ')[0] || 'Anonymous';
                    el.addEventListener('click', () => {
                        startGame();
                        observer.disconnect();
                    });
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        window.addEventListener('load', waitForTrigger);
    });
})();
