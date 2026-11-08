"use client";

import { useSyncExternalStore } from "react";

/** ¿El navegador puede leer en voz alta? (La web anterior usaba lo mismo: no hay grabaciones.) */
export function hasSpeech(): boolean {
  try {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  } catch {
    return false;
  }
}

function spanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => /^es[-_]ES/i.test(v.lang)) ?? voices.find((v) => /^es\b/i.test(v.lang));
}

/** Lee un texto en español (es-ES, un poco más despacio). Nunca lanza. */
export function speak(text: string): boolean {
  try {
    if (!hasSpeech()) return false;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES";
    u.rate = 0.85;
    const voice = spanishVoice();
    if (voice) u.voice = voice;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

const noop = () => () => {};

/**
 * true en el navegador si hay voz; false en el servidor y en el primer render
 * (así no hay controles que no funcionan ni diferencias de hidratación).
 */
export function useSpeech(): boolean {
  return useSyncExternalStore(noop, hasSpeech, () => false);
}
