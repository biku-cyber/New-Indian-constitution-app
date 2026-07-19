/* ============================================================
   NyaySetu — utils.js
   Small, dependency-free helper functions shared by all modules.
   Exposed on window.Utils so other plain <script> files can use it.
   ============================================================ */

(function () {
  "use strict";

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach((key) => {
      if (key === "class") node.className = attrs[key];
      else if (key === "html") node.innerHTML = attrs[key];
      else if (key.startsWith("on") && typeof attrs[key] === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      } else {
        node.setAttribute(key, attrs[key]);
      }
    });
    (children || []).forEach((child) => {
      if (child == null) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Wraps matches of `query` in <mark> for search-result highlighting.
  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    const safe = escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      const re = new RegExp("(" + escapedQuery + ")", "ig");
      return safe.replace(re, "<mark>$1</mark>");
    } catch (e) {
      return safe;
    }
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Lightweight JSON fetch with in-memory cache, so navigating back and
  // forth between chapters/sections doesn't refetch the same file.
  const jsonCache = new Map();
  async function fetchJSON(path) {
    if (jsonCache.has(path)) return jsonCache.get(path);
    const res = await fetch(path);
    if (!res.ok) throw new Error("Failed to load " + path);
    const data = await res.json();
    jsonCache.set(path, data);
    return data;
  }

  // Same idea as fetchJSON, but for raw SVG icon assets — fetched once,
  // then inlined into the DOM wherever needed (so `currentColor` in the
  // markup can pick up whichever CSS color context it's dropped into).
  const svgCache = new Map();
  async function fetchSVG(path) {
    if (svgCache.has(path)) return svgCache.get(path);
    const res = await fetch(path);
    if (!res.ok) throw new Error("Failed to load " + path);
    const text = await res.text();
    svgCache.set(path, text);
    return text;
  }
  function toast(message, duration) {
    const node = qs("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => node.classList.remove("show"), duration || 2200);
  }

  // Ripple effect for .icon-btn / card taps (Material-style, minimal).
  function attachRipple(node) {
    node.addEventListener("pointerdown", (e) => {
      const rect = node.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
      ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
      node.appendChild(ripple);
      setTimeout(() => ripple.remove(), 480);
    });
  }

  function formatCount(n) {
    return new Intl.NumberFormat("en-IN").format(n);
  }

  window.Utils = {
    qs, qsa, el, escapeHtml, highlight, debounce,
    fetchJSON, fetchSVG, toast, attachRipple, formatCount
  };
})();
