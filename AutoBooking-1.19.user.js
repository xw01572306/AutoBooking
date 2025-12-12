// ==UserScript==
// @name         AutoBooking
// @namespace    http://tampermonkey.net/
// @version      1.19
// @match        https://book.everyoneactive.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const times = ["15:00", "14:00", "16:00"];
    const JUST_REFRESHED = sessionStorage.getItem("just_refreshed") === "1";

    function log(x){ console.log("[AutoBooking] " + x); }
    function ding(){ try{ new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play(); }catch(e){} }

    function findGreenButton(time){
        const btns = document.querySelectorAll(
            "input.btn.btn-custom-success, input.removeUnderLineAvailable.btn.btn-custom-success"
        );
        for (let b of btns){
            if (b.value && b.value.trim() === time) return b;
        }
        return null;
    }

    function findConfirmButton(){
        return document.querySelector("input#ctl00_MainContent_btnBook");
    }

    function spamClick(getter, label){
        let last = 0;
        setInterval(()=>{
            const el = getter();
            if (el){
                el.click();
                const now = Date.now();
                if (now - last > 800){
                    log("Clicking " + label);
                    ding();
                    last = now;
                }
            }
        },150);
    }

    function midnightRefresh(){
        const now = new Date();
        const next = new Date();
        next.setHours(0,0,0,0);
        if (next <= now) next.setDate(next.getDate()+1);
        const ms = next - now;

        let left = Math.floor(ms/1000);
        const timer = setInterval(()=>{
            left--;
            if (left <= 60) log("Refresh in " + left + "s");
            if (left <= 0){
                clearInterval(timer);
                sessionStorage.setItem("just_refreshed","1");
                location.reload();
            }
        },1000);
    }

    function detectMode(){
        const now = new Date();
        const h = now.getHours();
        if (h >= 0 && h < 3){
            log("Detect mode ON");
            detectLoop();
        }
    }

    function detectLoop(){
        let t = Math.floor(Math.random()*11);
        log("No slot. Next refresh in " + t + "s");

        setTimeout(()=>{
            let target = null;

            for (let time of times){
                const btn = findGreenButton(time);
                if (btn){
                    target = btn;
                    break;
                }
            }

            if (target){
                log("Sniped target slot");
                ding();
                target.click();
            }

            detectLoop();
        }, t*1000);
    }

    function keepAlive(){
        setInterval(()=>{
            log("Keep-alive.");
        }, 600000);
    }

    log("Script active.");

    keepAlive();
    midnightRefresh();
    detectMode();

    if (JUST_REFRESHED){
        sessionStorage.removeItem("just_refreshed");
        log("Page refreshed. Starting booking.");
        let idx = 0;
        spamClick(()=>{
            while(idx < times.length){
                const btn = findGreenButton(times[idx]);
                if (btn) return btn;
                idx++;
            }
            return null;
        },"slot");

        spamClick(findConfirmButton,"confirm");
    } else {
        spamClick(findConfirmButton,"confirm");
    }

})();
