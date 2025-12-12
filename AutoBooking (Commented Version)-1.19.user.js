/*
============================================================
 AutoBooking 自动抢场脚本（注释版）
 功能包含：
 1. 零点自动刷新
 2. 刷新后自动疯狂抢指定时间段（按优先级）
 3. 凌晨 00:00–03:00 自动检测别人放出的场地（捡漏）
 4. 自动点击第二页的确认按钮 Add Additional Booking
 5. KeepAlive 防掉线机制
============================================================
*/

 // ==UserScript==
 // @name         AutoBooking (Commented Version)
 // @namespace    http://tampermonkey.net/
 // @version      1.19
 // @match        https://book.everyoneactive.com/*
 // @grant        none
 // ==/UserScript==

(function() {
    'use strict';

    /*
     * 需要抢的场地时间（按顺序优先级）
     * 顺序 = 优先级，例如：
     * ["15:00", "14:00", "16:00"]
     * 会依序找 15 → 14 → 16 的绿色按钮
     */
    const times = ["15:00", "14:00", "16:00"];

    /*
     * 用于判断页面是否是“刚被脚本自动刷新”
     * JUST_REFRESHED = true → 执行抢场逻辑
     */
    const JUST_REFRESHED = sessionStorage.getItem("just_refreshed") === "1";

    /* 打印日志 */
    function log(x){ console.log("[AutoBooking] " + x); }

    /* 播放提示音（用于抢到或点击） */
    function ding(){
        try{
            new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play();
        }catch(e){}
    }

    /*
     * 查找绿色可点击的时间按钮
     * 网站绿色按钮 class = btn-custom-success
     * 输入: time = "15:00"
     * 输出: 对应绿色按钮 element or null
     */
    function findGreenButton(time){
        const btns = document.querySelectorAll(
            "input.btn.btn-custom-success, input.removeUnderLineAvailable.btn.btn-custom-success"
        );
        for (let b of btns){
            if (b.value && b.value.trim() === time) return b;
        }
        return null;
    }

    /*
     * 查找第二页确认按钮（Add Additional Booking）
     * id 是固定的：ctl00_MainContent_btnBook
     */
    function findConfirmButton(){
        return document.querySelector("input#ctl00_MainContent_btnBook");
    }

    /*
     * 高频点击器
     * 每 150ms 尝试点击 1 次（约 6.7 次/秒）
     * getter = 查找按钮的函数
     * label  = 日志名称
     */
    function spamClick(getter, label){
        let last = 0;
        setInterval(()=>{
            const el = getter();
            if (el){
                el.click();
                const now = Date.now();

                // 控制日志频率（每 800ms 打印一次）
                if (now - last > 800){
                    log("Clicking " + label);
                    ding();
                    last = now;
                }
            }
        },150);
    }

    /*
     * 每天零点自动刷新页面
     * 刷新后 JUST_REFRESHED = true
     * 页面重载后才开始执行抢场
     */
    function midnightRefresh(){
        const now = new Date();
        const next = new Date();

        next.setHours(0,0,0,0);
        if (next <= now) next.setDate(next.getDate()+1);

        const ms = next - now;
        let left = Math.floor(ms/1000);

        const timer = setInterval(()=>{
            left--;

            // 零点前最后 60 秒提示倒计时
            if (left <= 60) log("Refresh in " + left + "s");

            if (left <= 0){
                clearInterval(timer);
                sessionStorage.setItem("just_refreshed","1");
                location.reload();  // 关键动作
            }
        },1000);
    }

    /*
     * 凌晨捡漏模式（00:00–03:00）
     * 每 0–10 秒随机检查一次是否出现绿色按钮
     */
    function detectMode(){
        const now = new Date();
        const h = now.getHours();

        if (h >= 0 && h < 3){
            log("Detect mode ON");
            detectLoop();
        }
    }

    /*
     * 捡漏循环：
     * 1. 等待随机 0–10 秒
     * 2. 按优先级找绿色按钮
     * 3. 找到立即点击并提示音
     * 4. 不断循环
     */
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

    /*
     * 定期 KeepAlive，防止登录被踢掉
     * 每 10 分钟打印一次心跳日志
     */
    function keepAlive(){
        setInterval(()=>{
            log("Keep-alive.");
        }, 600000);
    }

    /* —— 脚本启动 —— */

    log("Script active.");

    keepAlive();      // 防掉线
    midnightRefresh(); // 等待零点刷新
    detectMode();      // 捡漏模式（如果在凌晨）

    /*
     * 刷新后执行正式抢场逻辑
     */
    if (JUST_REFRESHED){

        sessionStorage.removeItem("just_refreshed");
        log("Page refreshed. Starting booking.");

        let idx = 0;

        // 自动依序点击绿色的 15:00 → 14:00 → 16:00
        spamClick(()=>{
            while(idx < times.length){
                const btn = findGreenButton(times[idx]);
                if (btn) return btn;
                idx++;
            }
            return null;
        },"slot");

        // 自动点击确认按钮
        spamClick(findConfirmButton,"confirm");

    } else {

        // 如果用户手动进入确认页，也会继续帮忙点
        spamClick(findConfirmButton,"confirm");
    }

})();