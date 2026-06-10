"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import quotesData from "@/quotes.json";

export default function Loading() {
  const [mounted, setMounted] = useState(false);
  const [quote, setQuote] = useState("");

  useEffect(() => {
    setMounted(true);
    const quotes = quotesData.quotes;
    if (quotes && quotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setQuote(quotes[randomIndex]);
    }
  }, []);

  if (!mounted) {
    // A brief void (dark screen) before the loading UI fades in
    return <div className="fixed inset-0 z-[200] bg-void" />;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-void flex flex-col justify-between select-none overflow-hidden font-body animate-fade-in duration-500">
      {/* Top Black Bar (Cinematic letterbox) */}
      <div className="h-[10vh] bg-void/95 border-b border-bark/30 flex items-center justify-between px-8 md:px-16 z-10 shrink-0">
        <span className="font-display text-sm tracking-[0.3em] text-gold/60 uppercase">
          Mugiwara Voyage
        </span>
        <span className="font-ui text-xs tracking-widest text-fog/40">
          麦わらの道
        </span>
      </div>

      {/* Main content area containing background image & quote */}
      <div className="relative flex-1 flex items-end justify-start px-8 md:px-20 pb-16">
        {/* Background Image with Sekiro-style styling */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="/Loading.jpeg"
            alt="Loading background"
            fill
            priority
            className="object-cover opacity-60 mix-blend-luminosity brightness-[0.70] transition-opacity duration-1000"
          />
          {/* Subtle vignettes and gradients to make text legible and frame the image */}
          <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void opacity-95" />
          <div className="absolute inset-0 bg-gradient-to-r from-void/90 via-void/40 to-transparent" />
          <div className="absolute inset-0 bg-void/10 card-vignette" />
        </div>

        {/* Quote Overlay */}
        <div className="relative z-10 max-w-3xl text-left space-y-4 animate-fade-in duration-700 delay-200">
          {/* Styled header with blood-crimson separator */}
          <div className="flex items-center gap-4">
            <h2 className="font-heading text-lg md:text-xl text-gold tracking-[0.15em] font-semibold uppercase">
              Voyage Knowledge
            </h2>
            <div className="h-[1.5px] flex-1 bg-gradient-to-r from-blood/60 to-transparent" />
          </div>
          
          {/* Quote paragraph */}
          <p className="font-body text-base md:text-lg text-parchment leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {quote}
          </p>
        </div>
      </div>

      {/* Bottom Black Bar (Cinematic letterbox) */}
      <div className="h-[15vh] bg-void/95 border-t border-bark/30 flex flex-col sm:flex-row items-center justify-between px-8 md:px-16 py-6 z-10 shrink-0 gap-4">
        {/* Left Side: Loading status and pulsing Kanji */}
        <div className="flex items-center gap-4">
          <span 
            className="font-kanji text-3xl text-blood animate-pulse duration-1000"
            style={{ textShadow: "0 0 15px rgba(192, 57, 43, 0.8)" }}
          >
            道
          </span>
          <span className="font-meta text-[11px] tracking-[0.25em] text-fog/60 uppercase animate-pulse duration-1000">
            Setting sail...
          </span>
        </div>

        {/* Right Side: Progress Bar */}
        <div className="w-64 flex flex-col gap-2">
          <div className="h-[4px] w-full bg-bark/60 border border-ink/40 rounded-sm overflow-hidden">
            <div className="h-full bg-blood shadow-[0_0_8px_rgba(192, 57, 43, 0.8)] rounded-sm animate-loading-progress" />
          </div>
        </div>
      </div>
    </div>
  );
}
