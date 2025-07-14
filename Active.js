// ==UserScript==
// @name         Active
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Force-trigger lazy-loaded content by faking IntersectionObserver
// @match        https://madame.ynap.biz/*
// @exclude      https://madame.ynap.biz/shooting-validation
// @grant        none
// @run-at       document-start
// ==/UserScript==
(function () {
    'use strict';
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
