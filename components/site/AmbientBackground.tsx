"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const MAX_OFFSET = 80;

export function AmbientBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    function update() {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      const offset = progress * MAX_OFFSET;
      if (ref.current) ref.current.style.transform = `translateY(${offset}px)`;
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 -top-[60px] -bottom-[60px] -z-10 opacity-35 pointer-events-none overflow-hidden">
      <div ref={ref} className="absolute inset-0">
        <Image src="/images/bg-ambient.jpg" alt="" fill priority className="object-cover object-[50%_8%]" />
      </div>
    </div>
  );
}
