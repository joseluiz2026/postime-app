"use client";

import { useState } from "react";

export function HeroVideoTabs({ videos }: { videos: { id: string; label: string; url: string }[] }) {
  const [active, setActive] = useState(0);

  return (
    <>
      <video
        key={videos[active]?.id}
        src={videos[active]?.url}
        className="absolute inset-0 w-full h-full object-cover object-[center_25%] max-[640px]:object-[83%_25%]"
        autoPlay
        muted
        loop
        playsInline
      />
      {videos.length > 1 && (
        <div className="absolute bottom-5 left-8 z-[2] flex gap-2 flex-wrap max-w-[80%]">
          {videos.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm transition-colors ${
                i === active
                  ? "bg-[var(--gold)] text-[#0B1220]"
                  : "bg-black/40 text-[var(--text-2)] hover:bg-black/60 border-[0.5px] border-[var(--line)]"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
