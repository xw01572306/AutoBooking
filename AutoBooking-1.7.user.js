// ==UserScript==
// @name         AutoBooking
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Auto booking with countdown, confirmation，refresh, sniping, and keep-alive.
// @match        https://book.everyoneactive.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const TIME_LIST = ["18:00", "17:00", "20:00"];
    let currentIndex = 0;
    const JUST_REFRESHED = sessionStorage.getItem("just_refreshed") === "1";

    function log(s) { console.log(`[AutoBooking] ${s}`); }

    log("Script active.");

    function countdown() {
        const now = new Date();
        const next = new Date();
        next.setHours(0, 0, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);

        let timeLeft = next - now;
        let started = false;

        const timer = setInterval(() => {
            timeLeft -= 1000;

            if (!started && timeLeft <= 60000) {
                started = true;
                log("Countdown started.");
            }

            if (started) log(`Refresh in ${Math.floor(timeLeft / 1000)}s`);

            if (timeLeft <= 0) {
                clearInterval(timer);
                sessionStorage.setItem("just_refreshed", "1");
                log("Refreshing.");
                location.reload();
            }
        }, 1000);
    }

    countdown();

    let lastClick = 0;

    function spam(findFunc, label) {
        setInterval(() => {
            const el = findFunc();
            const now = Date.now();
            if (el) {
                el.click();
                if (now - lastClick > 1000) {
                    log(`Clicking ${label}`);
                    lastClick = now;
                }
            }
        }, 200);
    }

    function findTimeButton() {
        const rows = document.querySelectorAll("tr");
        for (const r of rows) {
            if (r.innerText.includes(TIME_LIST[currentIndex])) {
                return r.querySelector("button, a, input, div");
            }
        }
        return null;
    }

    function nextTime() {
        if (currentIndex < TIME_LIST.length - 1) {
            currentIndex++;
            log(`Next target ${TIME_LIST[currentIndex]}`);
        }
    }

    function findConfirmButton() {
        const els = document.querySelectorAll("button, input, div, span, a");
        for (const el of els) {
            const t = (el.innerText || el.value || "").trim();
            if (
                t.includes("Book") ||
                t.includes("Checkout") ||
                t.includes("Add") ||
                t.includes("Next") ||
                t.includes("Continue") ||
                t.includes("Confirm")
            ) return el;
        }
        return null;
    }

    if (JUST_REFRESHED) {
        sessionStorage.removeItem("just_refreshed");
        log("Page refreshed. Starting booking.");
        log(`Initial target ${TIME_LIST[currentIndex]}`);

        spam(() => {
            const btn = findTimeButton();
            if (!btn) nextTime();
            return btn;
        }, "slot");

        spam(findConfirmButton, "confirm");
    }

    function isSnipingTime() {
        const h = new Date().getHours();
        return h >= 0 && h < 3;
    }

    function randomInterval(a, b) {
        return Math.floor(Math.random() * (b - a + 1)) + a;
    }

    function detectSlot() {
        const btn = findTimeButton();
        if (btn) {
            log(`Detected available slot: ${TIME_LIST[currentIndex]}`);
            btn.click();
            return true;
        }
        return false;
    }

    function startSniping() {
        if (!isSnipingTime()) return;

        log("Sniping enabled (00-03).");

        function cycle() {
            if (detectSlot()) return;

            nextTime();
            const delay = randomInterval(10000, 30000);
            log(`Next check in ${Math.floor(delay / 1000)}s`);

            setTimeout(() => {
                location.reload();
            }, delay);
        }

        cycle();
    }

    startSniping();

    function keepAlive() {
        const delay = randomInterval(240000, 480000);
        fetch("https://book.everyoneactive.com/Connect/MemberHome.aspx", { credentials: "include" });
        log(`Keep-alive. Next ping in ${Math.floor(delay / 60000)} min`);
        setTimeout(keepAlive, delay);
    }

    keepAlive();

})();
