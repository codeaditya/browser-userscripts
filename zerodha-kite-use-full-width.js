// ==UserScript==
// @name         Zerodha Kite Use Full Width
// @namespace    https://github.com/codeaditya/browser-userscripts
// @downloadURL  https://cdn.jsdelivr.net/gh/codeaditya/browser-userscripts@main/zerodha-kite-use-full-width.js
// @updateURL    https://cdn.jsdelivr.net/gh/codeaditya/browser-userscripts@main/zerodha-kite-use-full-width.js
// @version      2025.01.31
// @description  Make Zerodha Kite use full width of the screen.
// @author       Aditya <code.aditya at gmail>
// @match        https://kite.zerodha.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  GM_addStyle(`
    .app .wrapper {
        max-width: initial;
    }

    .container {
        max-width: initial;
    }

    .app .container .container-right {
        max-width: initial;
    }
  `);
})();
