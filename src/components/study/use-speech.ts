"use client";

import { useCallback, useEffect, useState } from "react";

export interface SpeechOptions {
  enabled: boolean;
  rate: number;
  voiceName: string | null;
}

/** Voces alemanas (de-DE primero) disponibles en el navegador. */
export function useGermanVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setReady(true);
      return;
    }
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const german = all
        .filter((v) => v.lang.toLowerCase().startsWith("de"))
        .sort((a, b) => Number(b.lang === "de-DE") - Number(a.lang === "de-DE"));
      setVoices(german);
      if (all.length) setReady(true);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    const t = setTimeout(() => setReady(true), 1500);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      clearTimeout(t);
    };
  }, []);
  return { voices, ready };
}

/** Pronunciación con la API de voz del navegador (lang = "de-DE"). */
export function useSpeech(opts: SpeechOptions) {
  const { voices, ready } = useGermanVoices();
  const available = opts.enabled && voices.length > 0;

  const speak = useCallback(
    (text: string) => {
      if (!available || !text) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "de-DE";
      u.rate = opts.rate;
      const voice = voices.find((v) => v.name === opts.voiceName) ?? voices[0];
      if (voice) u.voice = voice;
      synth.speak(u);
    },
    [available, opts.rate, opts.voiceName, voices],
  );

  return { speak, available, ready, missingGerman: opts.enabled && ready && voices.length === 0 };
}
