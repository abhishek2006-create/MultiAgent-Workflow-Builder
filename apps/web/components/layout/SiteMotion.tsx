"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { usePathname } from "next/navigation";

/** Shared visual shell. Every animation is owned by a context and cleaned up. */
export default function SiteMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shellRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reveal = revealRef.current;
    if (!reveal) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      // App Router can hydrate a streamed page after this persistent layout.
      // Animate only this component's own decoration, never page descendants.
      const context = gsap.context(() => {
        gsap.fromTo(reveal, { opacity: 0.18 }, {
          opacity: 0, duration: 0.55, ease: "power3.out", clearProps: "opacity",
        });
      });
      return () => context.revert();
    });
    return () => media.revert();
  }, [pathname]);

  useEffect(() => {
    const shell = shellRef.current;
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    if (!shell || !cursor || !dot) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
      const x = gsap.quickTo(cursor, "x", { duration: 0.22, ease: "power3.out" });
      const y = gsap.quickTo(cursor, "y", { duration: 0.22, ease: "power3.out" });
      const dotX = gsap.quickTo(dot, "x", { duration: 0.07, ease: "power2.out" });
      const dotY = gsap.quickTo(dot, "y", { duration: 0.07, ease: "power2.out" });
      const onMove = (event: PointerEvent) => {
        x(event.clientX); y(event.clientY); dotX(event.clientX); dotY(event.clientY);
        cursor.classList.add("is-visible"); dot.classList.add("is-visible");
        const interactive = (event.target as HTMLElement | null)?.closest("button, a, input, textarea, select, summary, [role=button]");
        gsap.to(cursor, { scale: interactive ? 1.45 : 1, duration: 0.2, overwrite: "auto" });
      };
      const onLeave = () => { cursor.classList.remove("is-visible"); dot.classList.remove("is-visible"); };
      shell.addEventListener("pointermove", onMove, { passive: true });
      shell.addEventListener("pointerleave", onLeave);
      return () => {
        shell.removeEventListener("pointermove", onMove); shell.removeEventListener("pointerleave", onLeave);
        gsap.killTweensOf([cursor, dot]); onLeave();
      };
    });
    return () => media.revert();
  }, []);

  return <div ref={shellRef} className="site-shell" data-page={pathname === "/" ? "landing" : pathname.split("/")[1]}>
    <a className="skip-content" href="#app">Skip to content</a>
    <div className="site-aurora-backdrop" aria-hidden="true" />
    <div ref={revealRef} className="site-route-reveal" aria-hidden="true" />
    <div ref={cursorRef} className="site-cursor-ring" aria-hidden="true" />
    <div ref={dotRef} className="site-cursor-dot" aria-hidden="true" />
    {children}
  </div>;
}
