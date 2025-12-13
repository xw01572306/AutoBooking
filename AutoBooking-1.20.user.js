// ==UserScript==
// @name         AutoBooking
// @namespace    http://tampermonkey.net/
// @version      1.20
// @match        https://book.everyoneactive.com/**
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const times = ["18:00", "17:00", "19:00"];
    const JUST_REFRESHED = sessionStorage.getItem("just_refreshed") === "1";

    function log(x) { console.log("[AutoBooking] " + x); }
    function ding() {
        try {
            new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play();
        } catch (e) {}
    }

    function findGreenButton(time) {
        const btns = document.querySelectorAll(
            "input.btn.btn-custom-success, input.removeUnderLineAvailable.btn.btn-custom-success"
        );
        for (let b of btns) {
            if (b.value && b.value.trim() === time) return b;
        }
        return null;
    }

    function findConfirmButton() {
        return document.querySelector("input#ctl00_MainContent_btnBook");
    }

    function spamClick(getter, label) {
        let last = 0;
        setInterval(() => {
            const el = getter();
            if (el) {
                el.click();
                const now = Date.now();
                if (now - last > 800) {
                    log("Clicking " + label);
                    ding();
                    last = now;
                }
            }
        }, 150);
    }

    function midnightRefresh() {
        const now = new Date();
        const next = new Date();
        next.setHours(0, 0, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        const ms = next - now;

        let left = Math.floor(ms / 1000);
        const timer = setInterval(() => {
            left--;
            if (left <= 60) log("Refresh in " + left + "s");
            if (left <= 0) {
                clearInterval(timer);
                sessionStorage.setItem("just_refreshed", "1");
                location.reload();
            }
        }, 1000);
    }

    function waitUntilReady(getBtn, cb) {
        let lastBtn = null;
        let stableCount = 0;

        const timer = setInterval(() => {
            const btn = getBtn();
            if (
                btn &&
                !btn.disabled &&
                btn.offsetParent !== null
            ) {
                if (btn === lastBtn) {
                    stableCount++;
                } else {
                    stableCount = 0;
                    lastBtn = btn;
                }

                if (stableCount >= 2) { 
                    clearInterval(timer);
                    log("Button ready.");
                    cb(btn);
                }
            }
        }, 120);
    }

    function detectMode() {
        const h = new Date().getHours();
        if (h >= 0 && h < 3) {
            log("Detect mode ON");
            detectLoop();
        }
    }

    function detectLoop() {
        let t = Math.floor(Math.random() * 6) + 2;
        setTimeout(() => {
            for (let time of times) {
                const btn = findGreenButton(time);
                if (btn) {
                    log("Detected slot " + time + ", waiting ready...");
                    waitUntilReady(() => findGreenButton(time), () => {
                        log("Sniped target slot " + time);
                        ding();
                        btn.click();
                    });
                    return;
                }
            }
            detectLoop();
        }, t * 1000);
    }

    function backendKeepAlive() {
        setInterval(() => {
            fetch(location.href, {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }).catch(() => {});
        }, 120000);
    }

    log("Script active.");

    backendKeepAlive();
    midnightRefresh();
    detectMode();

    if (JUST_REFRESHED) {
        sessionStorage.removeItem("just_refreshed");
        log("Page refreshed. Starting booking.");

        waitUntilReady(() => {
            for (let t of times) {
                const btn = findGreenButton(t);
                if (btn) return btn;
            }
            return null;
        }, () => {
            spamClick(() => {
                for (let t of times) {
                    const btn = findGreenButton(t);
                    if (btn) return btn;
                }
                return null;
            }, "slot");
        });

        spamClick(findConfirmButton, "confirm");
    } else {
        spamClick(findConfirmButton, "confirm");
    }

})();
