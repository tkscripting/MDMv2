// ==UserScript==
// @name         Forest Matte Green Background
// @namespace    https://madame.ynap.biz/
// @version      1.0
// @description  Force the page background to a forest‑matte green
// @match        https://madame.ynap.biz/*
// @grant        GM_addStyle
// ==/UserScript==

GM_addStyle(`
  html, body {
    background: #2e3b2e !important; /* forest matte green */
  }
`);
