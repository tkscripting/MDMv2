// ==UserScript==
// @name         Active
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Force-trigger lazy-loaded content by faking IntersectionObserver
// @match        https://madame.ynap.biz/*

// @grant        none
// @run-at       document-start
// ==/UserScript==
(function () {
    'use strict';
    
    // Exit early if we're on the shooting-validation page
    if (window.location.pathname === '/shooting-validation') {
        console.log('Active userscript: Skipped on shooting-validation page');
        return;
    }
    
    console.log('Active userscript: Running IntersectionObserver override');
    
    const observed = new WeakSet();
    window.IntersectionObserver = class {
        constructor(callback) {
            this.callback = callback;
        }
        observe(target) {
            if (!observed.has(target)) {
                observed.add(target);
                this.callback([{ isIntersecting: true, target }]);
            }
        }
        unobserve() {}
        disconnect() {}
    };
})();
