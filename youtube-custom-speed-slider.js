// ==UserScript==
// @name         Youtube Custom Speed Slider
// @namespace    https://github.com/codeaditya/browser-userscripts
// @downloadURL  https://cdn.jsdelivr.net/gh/codeaditya/browser-userscripts@main/youtube-custom-speed-slider.js
// @updateURL    https://cdn.jsdelivr.net/gh/codeaditya/browser-userscripts@main/youtube-custom-speed-slider.js
// @version      2025.01.31
// @description  Creates a custom speed slider at the top of the page for Youtube with 0.1x-6x range.
// @author       Aditya <code.aditya at gmail>
// @match        https://www.youtube.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  "use strict";

  // Configuration constants
  const CONFIG = {
    defaultSpeedKey: "youtube-custom-speed-default",
    speed: {
      min: 0.1,
      max: 6,
      step: 0.1,
      shortcutStep: 0.1,
    },
    shortcuts: {
      increaseSpeed: "+",
      decreaseSpeed: "-",
    },
    selectors: {
      topBar: [
        "header#masthead",
        "#masthead.ytd-app",
        "ytd-masthead",
        "#masthead",
        "header",
      ],
      logoParent: [
        "#start",
        "#start.ytd-masthead",
        ".ytd-masthead #start",
        "ytd-topbar-logo-renderer",
      ],
      video: "video",
      shortsVideo: "ytd-reel-video-renderer video",
    },
    styles: {
      container: `
        display: flex;
        align-items: center;
        margin-left: 20px;
        z-index: 1000;
      `,
      slider: `
        width: 200px;
        margin-right: 10px;
      `,
      label: `
        color: var(--yt-spec-text-primary);
        font-size: 14px;
        margin-left: 5px;
      `,
    },
  };

  // State management
  const state = {
    defaultSpeed: parseFloat(GM_getValue(CONFIG.defaultSpeedKey, 1)),
    observers: {
      video: null,
      body: null,
      url: null,
    },
  };

  // Add cleanup function
  const cleanup = () => {
    // Disconnect all observers
    Object.values(state.observers).forEach((observer) => {
      if (observer) {
        observer.disconnect();
      }
    });

    // Reset state
    state.observers.video = null;
    state.observers.body = null;
    state.observers.url = null;
  };

  // Utility functions
  const setPlaybackSpeed = (speed, videoElement) => {
    if (videoElement) {
      videoElement.playbackRate = speed;
    }
  };

  const createSliderElements = () => {
    const container = document.createElement("div");
    const slider = document.createElement("input");
    const label = document.createElement("label");

    container.classList.add("custom-speed-slider");
    container.style.cssText = CONFIG.styles.container;

    Object.assign(slider, {
      type: "range",
      min: CONFIG.speed.min,
      max: CONFIG.speed.max,
      step: CONFIG.speed.step,
      value: state.defaultSpeed,
    });
    slider.style.cssText = CONFIG.styles.slider;

    label.style.cssText = CONFIG.styles.label;
    label.textContent = `Speed: ${state.defaultSpeed.toFixed(2)}x`;

    return { container, slider, label };
  };

  const createSlider = () => {
    const { container, slider, label } = createSliderElements();

    const updateSpeed = (newSpeed) => {
      document
        .querySelectorAll(CONFIG.selectors.video)
        .forEach((video) => setPlaybackSpeed(newSpeed, video));

      label.textContent = `Speed: ${newSpeed.toFixed(2)}x`;

      if (newSpeed !== state.defaultSpeed) {
        state.defaultSpeed = newSpeed;
        GM_setValue(CONFIG.defaultSpeedKey, newSpeed);
      }
    };

    // Event handlers
    slider.addEventListener("input", () =>
      updateSpeed(parseFloat(slider.value))
    );

    const handleKeyboardShortcut = (event) => {
      if (event.target.matches("input, textarea")) {
        // Ignore if focused on input or textarea
        return;
      }

      const currentSpeed = parseFloat(slider.value);
      let newSpeed;

      if (event.key === CONFIG.shortcuts.increaseSpeed) {
        newSpeed = Math.min(
          currentSpeed + CONFIG.speed.shortcutStep,
          CONFIG.speed.max
        );
      } else if (event.key === CONFIG.shortcuts.decreaseSpeed) {
        newSpeed = Math.max(
          currentSpeed - CONFIG.speed.shortcutStep,
          CONFIG.speed.min
        );
      } else {
        // Ignore other keys
        return;
      }

      slider.value = newSpeed;
      updateSpeed(newSpeed);
      event.preventDefault();
    };

    document.addEventListener("keydown", handleKeyboardShortcut);

    container.append(slider, label);
    return container;
  };

  // Video handling functions
  const handleVideoChange = (selector = CONFIG.selectors.video) => {
    const video = document.querySelector(selector);
    if (video) {
      setPlaybackSpeed(state.defaultSpeed, video);
    }
  };

  // Main initialization
  const init = () => {
    // Clean up any existing observers before initializing
    cleanup();

    const addSliderToTopBar = () => {
      const topBar = document.querySelector(CONFIG.selectors.topBar.join(","));
      if (!topBar) {
        // Retry until the top bar is found
        requestAnimationFrame(addSliderToTopBar);
        return;
      }

      if (!document.querySelector(".custom-speed-slider")) {
        const logoParent = topBar.querySelector(
          CONFIG.selectors.logoParent.join(",")
        );
        if (logoParent) {
          logoParent.appendChild(createSlider());
        } else {
          console.error("Could not find the logo parent element.");
        }
      }
    };

    addSliderToTopBar();
    handleVideoChange();

    // Setup observers
    state.observers.video = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "src"
        ) {
          setTimeout(handleVideoChange, 500);
        }
      });
    });

    // Start observing the video element for attribute changes
    const videoElement = document.querySelector(CONFIG.selectors.video);
    if (videoElement) {
      state.observers.video.observe(videoElement, { attributes: true });
    }

    // Observe mutations to detect if a new video is loaded
    state.observers.body = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === "VIDEO") {
              // Use a timeout to allow the player to be built
              setTimeout(() => {
                if (state.observers.video) {
                  state.observers.video.disconnect();
                  state.observers.video.observe(node, { attributes: true });
                }
                handleVideoChange();
              }, 1500);
            }
          });
        }
      });
    });

    state.observers.body.observe(document.body, {
      childList: true,
      subtree: true,
    });

    state.observers.url = new MutationObserver(() => {
      if (window.location.href.includes("/shorts/")) {
        setTimeout(() => handleVideoChange(CONFIG.selectors.shortsVideo), 500);
      } else {
        setTimeout(handleVideoChange, 500);
      }
    });

    state.observers.url.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  if (document.readyState !== "loading") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }

  // Clean up when the script is destroyed or page is unloaded
  window.addEventListener("unload", cleanup);
})();
