// ==UserScript==
// @name         PID to VID
// @namespace    https://madame.ynap.biz/
// @version      1.1
// @description  Auto-converts pasted PIDs to VIDs using
// @author       Tyler
// @match        https://madame.ynap.biz/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    function simulateReactInput(element, value) {
        const prototype = element instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        if (!descriptor?.set) return;

        descriptor.set.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function extractPIDsOnly(text) {
        const pids = text.match(/\b\d{6,7}\b/g);
        return pids?.length ? pids : null;
    }

    function productStringConvert(pidArray) {
        return "[" + pidArray.map(p => `"${p}"`).join(",") + "]";
    }

    async function matchmakerTranslate(pids, matchmakerSearch) {
        console.log(`[PID->VID] Sending ${pids.length} PIDs to matchmaker:`, pids);
        try {
            const response = await fetch(`https://matchmaker-api.product.ynapgroup.com/${matchmakerSearch}`, {
                credentials: "omit",
                headers: {
                    accept: "application/json, text/plain, */*",
                    clientid: "pidConverter",
                    "content-type": "application/json;charset=UTF-8"
                },
                referrerPolicy: "no-referrer",
                body: productStringConvert(pids),
                method: "POST",
                mode: "cors"
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            const matches = json.matches ?? [];
            console.log(`[PID->VID] Matchmaker returned ${matches.length} matches.`);
            return matches;
        } catch (err) {
            console.error("[PID->VID] Matchmaker fetch error:", err);
            return [];
        }
    }

    document.addEventListener('paste', async (e) => {
        const text = (e.clipboardData || window.clipboardData).getData('text').trim();
        const pids = extractPIDsOnly(text);

        if (!pids) return;

        console.log(`[PID->VID] Pasted text detected with PIDs:`, pids);

        const matches = await matchmakerTranslate(pids, "pids");

        if (matches.length > 0) {
            const translated = matches.map(m => m.translatedId).join(' ');
            console.log(`[PID->VID] Successfully converted to VIDs:`, translated);

            e.preventDefault();
            simulateReactInput(e.target, translated);
        } else {
            console.warn("[PID->VID] No VID matches found for pasted PIDs.");
            alert("No VID matches found for pasted PIDs. Please double-check at https://matchmaker.product.ynapgroup.com/");
        }
    }, true);
})();
