// ==UserScript==
// @name         AutoBooking
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Midnight refresh + auto-click booking slot with priority + auto-confirm.
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const TIME_LIST = ["18:00", "17:00", "20:00"];
    let currentIndex = 0;

    const JUST_REFRESHED = sessionStorage.getItem("just_refreshed") === "1";

    function log(msg) {
        console.log(`[AutoBooking] ${msg}`);
    }

    log("Script active. Awaiting midnight refresh.");

    function startCountdownAndRefresh() {
        const now = new Date();
        const next = new Date();
        next.setHours(0, 0, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);

        let timeLeft = next - now;
        let countdownStarted = false;

        const timer = setInterval(() => {
            timeLeft -= 1000;

            if (!countdownStarted && timeLeft <= 60000) {
                countdownStarted = true;
                log("Countdown started (last 60 seconds).");
            }

            if (countdownStarted) {
                log(`Refresh in: ${Math.floor(timeLeft / 1000)}s`);
            }

            if (timeLeft <= 0) {
                clearInterval(timer);
                log("Midnight reached. Refreshing page.");
                sessionStorage.setItem("just_refreshed", "1");
                location.reload();
            }
        }, 1000);
    }

    startCountdownAndRefresh();

    let lastClickLogTime = 0;

    function spam(findFunc, label) {
        setInterval(() => {
            const el = findFunc();
            const now = Date.now();
            if (el) {
                el.click();
                if (now - lastClickLogTime > 1000) {
                    log(`Clicking ${label}…`);
                    lastClickLogTime = now;
                }
            }
        }, 200);
    }

    function findTimeButton() {
        const rows = document.querySelectorAll("tr");
        for (const r of rows) {
            const text = r.innerText;
            if (text.includes(TIME_LIST[currentIndex])) {
                return r.querySelector("button, a, input, div");
            }
        }
        return null;
    }

    function advanceTimePriority() {
        currentIndex++;
        if (currentIndex >= TIME_LIST.length) currentIndex = TIME_LIST.length - 1;
        log(`Switching to next time slot: ${TIME_LIST[currentIndex]}`);
    }

    function findConfirmButton() {
        const elements = document.querySelectorAll("button, input, div, span, a");
        for (const el of elements) {
            const t = (el.innerText || el.value || "").trim();
            if (
                t.includes("Book") ||
                t.includes("Checkout") ||
                t.includes("Add") ||
                t.includes("Next") ||
                t.includes("Continue") ||
                t.includes("Confirm")
            ) {
                return el;
            }
        }
        return null;
    }

    if (JUST_REFRESHED) {
        log("Page refreshed. Starting booking sequence.");
        sessionStorage.removeItem("just_refreshed");

        log(`Initial target: ${TIME_LIST[currentIndex]}`);

        spam(() => {
            const btn = findTimeButton();
            if (!btn) {
                advanceTimePriority();
            }
            return btn;
        }, "booking slot");

        spam(findConfirmButton, "confirmation button");
    }
})();