"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

/** Site-wide visual shell: aurora backdrop, pointer glow and route entrance motion. */
export default function SiteMotion({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    const page = shell?.querySelector<HTMLElement>("#app");
    if (!shell || !cursor || !dot || !page) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animatePage = (elements: Element[]) => {
      if (reducedMotion || elements.length === 0) return;
      gsap.fromTo(
        elements,
        { autoAlpha: 0, y: 18, filter: "blur(5px)" },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.66, stagger: 0.08, ease: "power3.out", clearProps: "all" },
      );
    };

    const initialContext = gsap.context(() => {
      if (!reducedMotion) {
        gsap.fromTo(".top", { y: -14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, ease: "power3.out", clearProps: "all" });
      }
      animatePage(Array.from(page.children));
    }, shell);

    const observer = new MutationObserver((records) => {
      const added = records.flatMap((record) => Array.from(record.addedNodes))
        .filter((node): node is Element => node instanceof Element && node.parentElement === page);
      if (added.length) requestAnimationFrame(() => animatePage(added));
    });
    observer.observe(page, { childList: true });

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!reducedMotion && finePointer) {
      const x = gsap.quickTo(cursor, "x", { duration: 0.22, ease: "power3.out" });
      const y = gsap.quickTo(cursor, "y", { duration: 0.22, ease: "power3.out" });
      const dotX = gsap.quickTo(dot, "x", { duration: 0.07, ease: "power2.out" });
      const dotY = gsap.quickTo(dot, "y", { duration: 0.07, ease: "power2.out" });
      const onMove = (event: PointerEvent) => {
        x(event.clientX);
        y(event.clientY);
        dotX(event.clientX);
        dotY(event.clientY);
        cursor.classList.add("is-visible");
        dot.classList.add("is-visible");
        const interactive = (event.target as HTMLElement | null)?.closest("button, a, input, textarea, select, [role=button]");
        gsap.to(cursor, { scale: interactive ? 1.45 : 1, duration: 0.2, overwrite: true });
      };
      const onLeave = () => {
        cursor.classList.remove("is-visible");
        dot.classList.remove("is-visible");
      };
      shell.addEventListener("pointermove", onMove);
      shell.addEventListener("pointerleave", onLeave);
      return () => {
        observer.disconnect();
        shell.removeEventListener("pointermove", onMove);
        shell.removeEventListener("pointerleave", onLeave);
        initialContext.revert();
      };
    }

    return () => {
      observer.disconnect();
      initialContext.revert();
    };
  }, []);

  return (
    <div ref={shellRef} className="site-shell">
      <div className="site-aurora-backdrop" aria-hidden="true" />
      <div ref={cursorRef} className="site-cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="site-cursor-dot" aria-hidden="true" />
      {children}
    </div>
  );
}
