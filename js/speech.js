/* ============================================================
   NyaySetu — speech.js
   Thin wrapper over the Web Speech API (speechSynthesis) for the
   "Live Read" reader toolbar action. Degrades gracefully if the
   browser has no TTS voices for Assamese — falls back to default
   voice while keeping the language tag on the utterance.
   ============================================================ */

(function () {
  "use strict";

  const synth = window.speechSynthesis || null;
  let currentUtterance = null;
  let speaking = false;
  let onStateChange = null;

  function isSupported() {
    return !!synth;
  }

  function langTag(code) {
    const map = { as: "bn-IN", en: "en-IN", hi: "hi-IN", bn: "bn-BD" };
    return map[code] || "bn-IN";
  }

  function pickVoice(langCode) {
    if (!synth) return null;
    const voices = synth.getVoices();
    const tag = langTag(langCode);
    return voices.find((v) => v.lang === tag) ||
           voices.find((v) => v.lang.startsWith(tag.split("-")[0])) ||
           null;
  }

  function speak(text, opts) {
    if (!synth) {
      Utils.toast("এই ব্ৰাউজাৰত Live Read সমৰ্থিত নহয়।");
      return;
    }
    stop();
    const settings = Storage.getSettings();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = (opts && opts.rate) || settings.speechRate || 1;
    utter.pitch = (opts && opts.pitch) || settings.speechPitch || 1;
    const langCode = (opts && opts.lang) || settings.speechLang || "as";
    utter.lang = langTag(langCode);
    const voice = pickVoice(langCode);
    if (voice) utter.voice = voice;

    utter.onstart = () => { speaking = true; notify(); };
    utter.onend = () => { speaking = false; currentUtterance = null; notify(); };
    utter.onerror = () => { speaking = false; currentUtterance = null; notify(); };

    currentUtterance = utter;
    synth.speak(utter);
  }

  function pause() {
    if (synth && speaking) { synth.pause(); notify(); }
  }

  function resume() {
    if (synth && synth.paused) { synth.resume(); notify(); }
  }

  function stop() {
    if (synth) synth.cancel();
    speaking = false;
    currentUtterance = null;
    notify();
  }

  function toggle(text) {
    if (speaking && !synth.paused) { pause(); return "paused"; }
    if (synth && synth.paused) { resume(); return "playing"; }
    speak(text);
    return "playing";
  }

  function isSpeaking() { return speaking; }

  function notify() {
    if (typeof onStateChange === "function") onStateChange(speaking);
  }

  function setOnStateChange(fn) { onStateChange = fn; }

  window.Speech = { isSupported, speak, pause, resume, stop, toggle, isSpeaking, setOnStateChange };
})();
