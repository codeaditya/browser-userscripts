// ==UserScript==
// @name         MCX Bhavcopy Datatables
// @namespace    https://github.com/codeaditya/browser-userscripts
// @downloadURL  https://cdn.jsdelivr.net/gh/codeaditya/browser-userscripts@main/mcx-bhavcopy-datatables.js
// @updateURL    https://cdn.jsdelivr.net/gh/codeaditya/browser-userscripts@main/mcx-bhavcopy-datatables.js
// @version      2025.02.16
// @description  Use Datatables to show MCX Bhavcopy data
// @author       Aditya <code.aditya at gmail>
// @match        https://www.mcxindia.com/market-data/bhavcopy
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        unsafeWindow
// @resource     datatablesCSS https://cdn.datatables.net/2.2.2/css/dataTables.dataTables.min.css
// @require      https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require      https://cdn.datatables.net/2.2.2/js/dataTables.min.js
// ==/UserScript==

// https://eslint.org/docs/latest/use/configure/language-options#specifying-globals
/* global jQuery, $, DataTable */

(function () {
  "use strict";

  GM_addStyle(GM_getResourceText("datatablesCSS"));

  let myDataTable;
  let pollingInterval;
  let pollingTimeout;
  let lastPolledJSON = "";
  const pollingIntervalDuration = 500;
  const pollingTimeoutDuration = 30_000;

  const renderInt = DataTable.render.number(",", ".", 0);
  const renderFloat = DataTable.render.number(",", ".", 2);

  const bhavCopyColumns = [
    { data: "Date", title: "Raw Date" },
    { data: "InstrumentName", title: "Instrument" },
    { data: "Symbol", title: "Symbol" },
    { data: "ExpiryDate", title: "Expiry" },
    { data: "OptionType", title: "Option Type" },
    { data: "StrikePrice", title: "Strike Price", render: renderFloat },
    { data: "Open", title: "Open", render: renderFloat },
    { data: "High", title: "High", render: renderFloat },
    { data: "Low", title: "Low", render: renderFloat },
    { data: "Close", title: "Close", render: renderFloat },
    { data: "PreviousClose", title: "Prev Close", render: renderFloat },
    { data: "Volume", title: "Volume (Lots)", render: renderInt },
    { data: "VolumeInThousands", title: "Volume (K)", className: "dt-right" },
    { data: "Value", title: "Value (Lacs)", render: renderFloat },
    { data: "OpenInterest", title: "OI (Lots)", render: renderInt },
  ];

  const myEnhancedTableElement = document.createElement("table");
  myEnhancedTableElement.id = "my-enhanced-table";
  myEnhancedTableElement.className = "display";

  (document.querySelector(".contents.bhavcopy") || document.body).appendChild(
    myEnhancedTableElement
  );

  const initializeDataTable = (data) => {
    myDataTable?.destroy();
    myDataTable = new DataTable(myEnhancedTableElement, {
      data: data,
      columns: bhavCopyColumns,
      pageLength: 10,
      ordering: true,
      searching: true,
      deferRender: true,
      processing: true,
    });
    console.debug("DataTable updated.");
  };

  // varName can be vBC or vBCCW
  const checkDataUpdate = (varName) => {
    console.debug(`Polling for ${varName} change.`);
    const currentData = unsafeWindow[varName];
    if (!currentData) {
      console.info(`${varName} is undefined or null in polling check.`);
      return;
    }
    const currentJSON = JSON.stringify(currentData);
    if (currentJSON !== lastPolledJSON) {
      console.debug(`${varName} content changed! Updating DataTable.`);
      lastPolledJSON = currentJSON;
      initializeDataTable(currentData);
      clearInterval(pollingInterval); // Stop polling after update
      clearTimeout(pollingTimeout); // Clear the timeout as well
      pollingInterval = null;
      pollingTimeout = null;
      console.debug(`Polling stopped for ${varName} change.`);
    }
  };

  const handleButtonClick = (e, varName) => {
    e.preventDefault();

    // Clear any existing polling interval and timeout
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      console.debug("Previous polling interval cleared.");
    }
    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
      pollingTimeout = null;
      console.debug("Previous polling timeout cleared.");
    }

    // Begin polling for changes
    lastPolledJSON = JSON.stringify(unsafeWindow[varName] ?? "");
    pollingInterval = setInterval(() => {
      checkDataUpdate(varName);
    }, pollingIntervalDuration);

    // Set timeout to stop polling after a duration
    pollingTimeout = setTimeout(() => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        pollingTimeout = null;
        console.warn(`Polling timed out for ${varName} change.`);
      }
    }, pollingTimeoutDuration);
  };

  document
    .getElementById("btnShowDatewise")
    .addEventListener("click", (e) => handleButtonClick(e, "vBC"));
  document
    .getElementById("btnShowCommoditywise")
    .addEventListener("click", (e) => handleButtonClick(e, "vBCCW"));

  const originalDateWiseTableContainer = $("#cont-1");
  const originalCommodityWiseTableContainer = $("#cont-2");

  const toggleElement = document.querySelector(".maToggle");
  toggleElement.addEventListener("click", (e) => {
    e.preventDefault();
    originalDateWiseTableContainer.toggle();
    originalCommodityWiseTableContainer.toggle();
    if (toggleElement.classList.contains("active")) {
      initializeDataTable(unsafeWindow.vBC ?? []);
    } else {
      initializeDataTable(unsafeWindow.vBCCW ?? []);
    }
  });

  if (unsafeWindow.vBC) {
    originalDateWiseTableContainer.toggle();
    initializeDataTable(unsafeWindow.vBC);
  } else {
    console.info("vBC data not found on the page.");
  }
})();
