"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export default function SignupPage() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const okRef = useRef<HTMLDivElement | null>(null);
  const packetRef = useRef<SVGGElement | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [strength, setStrength] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tos, setTos] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.globalTimeline.timeScale(30);
      }

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      tl.from(".bi", {
        y: 26,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
      })
        .from(
          ".card",
          {
            y: 40,
            opacity: 0,
            scale: 0.96,
            duration: 0.8,
          },
          0.15,
        )
        .from(
          ".fi",
          {
            y: 16,
            opacity: 0,
            duration: 0.45,
            stagger: 0.06,
          },
          0.5,
        )
        .from(
          ".nd",
          {
            scale: 0.6,
            opacity: 0,
            transformOrigin: "50% 50%",
            duration: 0.5,
            stagger: 0.1,
            ease: "back.out(1.6)",
          },
          0.7,
        );

      const paths = Array.from(
        document.querySelectorAll<SVGPathElement>(".ep"),
      );

      paths.forEach((path, i) => {
        const length = path.getTotalLength();

        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });

        tl.to(
          path,
          {
            strokeDashoffset: 0,
            duration: 0.6,
            ease: "power2.inOut",
          },
          0.9 + i * 0.12,
        );
      });

      const packetTweens: gsap.core.Tween[] = [];

      tl.add(() => {
        const packetData: [string, number][] = [
          ["p1", 0],
          ["p2", 0.9],
          ["p3", 0.9],
          ["p4", 1.8],
          ["p5", 1.8],
        ];

        packetData.forEach(([id, delay], i) => {
          const path = document.querySelector<SVGPathElement>(`#${id}`);
          const packetGroup = packetRef.current;

          if (!path || !packetGroup) return;

          const length = path.getTotalLength();

          const circle = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle",
          );

          circle.setAttribute("r", "3.6");
          circle.setAttribute("fill", i % 2 ? "#8b5cf6" : "#7be3f5");
          circle.style.filter = "drop-shadow(0 0 5px #22d3ee)";
          packetGroup.appendChild(circle);

          const obj = { t: 0 };

          const tween = gsap.to(obj, {
            t: 1,
            duration: 0.9,
            delay,
            repeat: -1,
            repeatDelay: 1.8,
            ease: "power1.inOut",
            onUpdate: () => {
              const point = path.getPointAtLength(obj.t * length);
              circle.setAttribute("cx", String(point.x));
              circle.setAttribute("cy", String(point.y));
            },
          });

          packetTweens.push(tween);
        });
      }, 1.4);

      const orb1 = gsap.to(".o1", {
        x: 80,
        y: 60,
        duration: 9,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });

      const orb2 = gsap.to(".o2", {
        x: -90,
        y: -50,
        duration: 11,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });

      const orb3 = gsap.to(".o3", {
        x: -60,
        y: 40,
        duration: 8,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });

      const handlePointerMove = (event: PointerEvent) => {
        document.body.style.setProperty("--mx", `${event.clientX}px`);
        document.body.style.setProperty("--my", `${event.clientY}px`);

        const rect = card.getBoundingClientRect();

        card.style.setProperty("--px", `${event.clientX - rect.left}px`);
        card.style.setProperty("--py", `${event.clientY - rect.top}px`);

        if (window.innerWidth > 900 && !loadingRef.current) {
          const dx =
            (event.clientX - (rect.left + rect.width / 2)) / window.innerWidth;

          const dy =
            (event.clientY - (rect.top + rect.height / 2)) / window.innerHeight;

          gsap.to(card, {
            rotationY: dx * 5,
            rotationX: -dy * 5,
            transformPerspective: 1200,
            duration: 0.6,
            ease: "power2.out",
            overwrite: "auto",
          });
        }
      };

      const handlePointerUp = () => {
        gsap.to("#go", {
          scale: 1,
          duration: 0.25,
        });
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);

      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);

        orb1.kill();
        orb2.kill();
        orb3.kill();

        packetTweens.forEach((tween) => tween.kill());
        tl.kill();
      };
    }, card);

    return () => ctx.revert();
  }, [loading]);

  useEffect(() => {
    const score = password
      ? Number(password.length >= 8) +
        Number(/[A-Z]/.test(password)) +
        Number(/[0-9]/.test(password)) +
        Number(/[^A-Za-z0-9]/.test(password))
      : 0;

    setStrength(score);

    document.querySelectorAll<HTMLElement>(".str b").forEach((bar, i) => {
      gsap.to(bar, {
        scaleX: i < score ? 1 : 0,
        background: ["#ef4444", "#f59e0b", "#22d3ee", "#10b981"][
          Math.max(score - 1, 0)
        ],
        duration: 0.35,
        delay: i * 0.04,
        ease: "power2.out",
      });
    });
  }, [password]);

  const clearError = (key: string) => {
    setErrors((current) => {
      if (!current[key]) return current;

      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (name.trim().length < 2) {
      nextErrors.name = "Enter your full name.";
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (password.length < 8) {
      nextErrors.pw = "Use at least 8 characters.";
    }

    if (!tos) {
      nextErrors.tos = "Please accept the Terms of Service and Privacy Policy.";
    }

    setErrors(nextErrors);

    Object.entries(nextErrors).forEach(([key, message]) => {
      const field = document.querySelector(
        `[data-k="${key}"]`,
      ) as HTMLElement | null;

      if (!field) return;

      field.classList.add("bad");

      const errorElement = field.querySelector(".er") as HTMLElement | null;

      if (errorElement) {
        errorElement.textContent = message;

        gsap.fromTo(
          errorElement,
          { opacity: 0, y: -5, height: 0 },
          {
            opacity: 1,
            y: 0,
            height: "auto",
            duration: 0.3,
          },
        );
      }

      gsap.fromTo(
        field,
        { x: 0 },
        {
          keyframes: {
            x: [-9, 8, -6, 4, 0],
          },
          duration: 0.45,
          ease: "power1.inOut",
        },
      );
    });

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading || submitted) return;
    if (!validate()) return;

    setFirstName(name.trim().split(" ")[0] || name.trim());
    setLoading(true);
    loadingRef.current = true;

    const card = cardRef.current;

    if (card) {
      gsap.to(card, {
        rotationX: 0,
        rotationY: 0,
        duration: 0.4,
      });
    }

    gsap.set("#sp", {
      display: "block",
    });

    gsap.to("#sp", {
      rotation: 360,
      duration: 0.8,
      repeat: -1,
      ease: "none",
    });

    window.setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
      loadingRef.current = false;

      const form = formRef.current;
      const success = okRef.current;

      if (!form || !success) return;

      const timeline = gsap.timeline();

      timeline
        .to(form, {
          opacity: 0,
          y: -16,
          duration: 0.35,
          ease: "power2.in",
        })
        .set(form, {
          display: "none",
        })
        .set(success, {
          display: "flex",
          opacity: 1,
        })
        .from(".ring", {
          scale: 0,
          rotation: -90,
          duration: 0.7,
          ease: "back.out(1.7)",
        })
        .fromTo(
          "#ck",
          {
            strokeDasharray: 40,
            strokeDashoffset: 40,
          },
          {
            strokeDashoffset: 0,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=.2",
        )
        .from(
          "#ok h2,#ok .sub,#ok .btn",
          {
            y: 14,
            opacity: 0,
            duration: 0.45,
            stagger: 0.1,
          },
          "-=.2",
        );

      const colors = ["#2f7bff", "#22d3ee", "#8b5cf6", "#10b981"];

      for (let i = 0; i < 30; i++) {
        const confetti = document.createElement("i");

        confetti.className = "cf";
        confetti.style.background = colors[i % colors.length];
        success.appendChild(confetti);

        const angle = Math.random() * Math.PI * 2;
        const radius = 90 + Math.random() * 130;

        gsap.fromTo(
          confetti,
          {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            rotation: 0,
          },
          {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius + 40,
            rotation: Math.random() * 540,
            opacity: 0,
            scale: 0.4,
            duration: 1.4 + Math.random() * 0.6,
            delay: 0.75,
            ease: "power3.out",
            onComplete: () => confetti.remove(),
          },
        );
      }
    }, 1500);
  };

  const passwordLabel = ["—", "WEAK", "FAIR", "GOOD", "STRONG"][strength];

  return (
    <>
      <style jsx global>{`
        :root {
          --bg: #05070b;
          --blue: #2f7bff;
          --vio: #8b5cf6;
          --cy: #22d3ee;
          --ok: #10b981;
          --warn: #f59e0b;
          --err: #ef4444;
          --tx: #e6ebf5;
          --mut: #8691a8;
          --bd: rgba(255, 255, 255, 0.1);
          --bd2: rgba(255, 255, 255, 0.16);
          --d: "Orbitron", sans-serif;
          --r: "Rajdhani", sans-serif;
          --b: "Space Grotesk", system-ui, sans-serif;
          --m: "JetBrains Mono", monospace;
          color-scheme: dark;
          box-sizing: border-box;
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        html {
          scroll-padding-top: env(safe-area-inset-top, 0px);
        }
        * {
          box-sizing: border-box;
          margin: 0;
        }
        html,
        body {
          min-height: 100%;
        }
        body {
          background: var(--bg);
          color: var(--tx);
          font: 14px/1.5 var(--b);
          overflow-x: hidden;
        }
        .bgl {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              520px circle at var(--mx, 70%) var(--my, 30%),
              rgba(47, 123, 255, 0.14),
              transparent 60%
            ),
            linear-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px) 0
              0/48px 48px,
            linear-gradient(
                90deg,
                rgba(255, 255, 255, 0.028) 1px,
                transparent 1px
              )
              0 0/48px 48px;
          animation: gm 50s linear infinite;
        }
        @keyframes gm {
          to {
            background-position:
              0 0,
              48px 96px,
              96px 48px;
          }
        }
        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
          opacity: 0.5;
        }
        .o1 {
          width: 420px;
          height: 420px;
          left: -120px;
          top: -100px;
          background: rgba(47, 123, 255, 0.35);
        }
        .o2 {
          width: 380px;
          height: 380px;
          right: -100px;
          bottom: -120px;
          background: rgba(139, 92, 246, 0.3);
        }
        .o3 {
          width: 220px;
          height: 220px;
          left: 42%;
          top: 55%;
          background: rgba(34, 211, 238, 0.18);
        }
        .wrap {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 56px;
          align-items: center;
          max-width: 1240px;
          margin: 0 auto;
          padding: 40px 32px;
        }
        .logo {
          font: 900 15px var(--d);
          letter-spacing: 0.2em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo i {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: conic-gradient(
            from 200deg,
            var(--blue),
            var(--vio),
            var(--cy),
            var(--blue)
          );
          box-shadow: 0 0 18px rgba(47, 123, 255, 0.6);
        }
        .brand h1 {
          font: 900 clamp(32px, 4.4vw, 58px)/1.02 var(--d);
          margin: 34px 0 16px;
          background: linear-gradient(
            100deg,
            #fff 25%,
            #9bbcff 50%,
            #c4b2ff 65%,
            #fff
          );
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: holo 6s ease-in-out infinite alternate;
        }
        @keyframes holo {
          to {
            background-position: 100% 0;
          }
        }
        .brand p {
          color: var(--mut);
          max-width: 440px;
          font-size: 15.5px;
          line-height: 1.65;
        }
        .tag {
          display: inline-block;
          margin-top: 34px;
          font: 600 12px var(--r);
          letter-spacing: 0.28em;
          color: var(--cy);
          border: 1px solid rgba(34, 211, 238, 0.35);
          background: rgba(34, 211, 238, 0.07);
          padding: 4px 12px;
          border-radius: 99px;
        }
        .net {
          margin-top: 26px;
          max-width: 460px;
          border: 1px solid var(--bd);
          border-radius: 16px;
          padding: 12px;
          background: linear-gradient(
            155deg,
            rgba(24, 32, 50, 0.5),
            rgba(9, 13, 21, 0.55)
          );
          backdrop-filter: blur(14px);
          box-shadow: 0 30px 70px -14px rgba(47, 123, 255, 0.25);
        }
        .net svg {
          width: 100%;
          display: block;
        }
        .nr {
          fill: rgba(14, 20, 32, 0.95);
          stroke: rgba(255, 255, 255, 0.18);
        }
        .nl {
          fill: #dfe6f5;
          font: 700 10.5px var(--r);
          letter-spacing: 0.14em;
          text-anchor: middle;
        }
        .ep {
          fill: none;
          stroke: rgba(34, 211, 238, 0.45);
          stroke-width: 1.4;
        }
        .card {
          position: relative;
          padding: 36px 34px 30px;
          border-radius: 20px;
          background: linear-gradient(
            155deg,
            rgba(24, 32, 50, 0.66),
            rgba(9, 13, 21, 0.72)
          );
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--bd);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 2px 6px rgba(0, 0, 0, 0.3),
            0 40px 90px -10px rgba(0, 0, 0, 0.6),
            0 0 80px -20px rgba(47, 123, 255, 0.3);
          transform-style: preserve-3d;
          will-change: transform;
        }
        .card:before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background:
            radial-gradient(
              360px circle at var(--px, 50%) var(--py, 0%),
              rgba(110, 160, 255, 0.12),
              transparent 62%
            ),
            linear-gradient(125deg, rgba(255, 255, 255, 0.07), transparent 25%);
        }
        .card h2 {
          font: 700 22px var(--d);
          letter-spacing: 0.1em;
        }
        .sub {
          color: var(--mut);
          margin: 6px 0 24px;
        }
        .soc {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 18px;
        }
        .btn {
          font: 600 14px var(--r);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--tx);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--bd2);
          border-radius: 11px;
          padding: 11px 14px;
          cursor: pointer;
          transition:
            background 0.2s,
            border-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
        }
        .btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.28);
        }
        .btn:focus-visible,
        input:focus-visible,
        .tg:focus-visible {
          outline: 2px solid var(--cy);
          outline-offset: 2px;
        }
        .btn.pri {
          position: relative;
          overflow: hidden;
          margin-top: 6px;
          padding: 14px;
          font-size: 16px;
          background: linear-gradient(
            135deg,
            rgba(47, 123, 255, 0.55),
            rgba(139, 92, 246, 0.42)
          );
          border-color: rgba(120, 170, 255, 0.8);
          box-shadow:
            0 0 28px rgba(47, 123, 255, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            inset 0 0 16px rgba(47, 123, 255, 0.2);
        }
        .btn.pri:hover {
          box-shadow:
            0 0 44px rgba(47, 123, 255, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }
        .btn.pri:after {
          content: "";
          position: absolute;
          top: 0;
          left: -70%;
          width: 45%;
          height: 100%;
          background: linear-gradient(
            100deg,
            transparent,
            rgba(255, 255, 255, 0.25),
            transparent
          );
          transform: skewX(-20deg);
          transition: left 0.7s;
        }
        .btn.pri:hover:after {
          left: 130%;
        }
        .or {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--mut);
          font: 11px var(--m);
          letter-spacing: 0.2em;
          margin-bottom: 18px;
        }
        .or:before,
        .or:after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--bd);
        }
        .fl {
          margin-bottom: 16px;
        }
        .fl label {
          display: block;
          font: 600 13px var(--r);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--mut);
          margin-bottom: 6px;
          transition: color 0.2s;
        }
        .fl.foc label {
          color: var(--cy);
        }
        .in {
          position: relative;
          border: 1px solid var(--bd);
          border-radius: 11px;
          background: rgba(0, 0, 0, 0.38);
          transition: border-color 0.2s;
        }
        .in:hover {
          border-color: var(--bd2);
        }
        .fl.bad .in {
          border-color: rgba(239, 68, 68, 0.7);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
        }
        .in input {
          width: 100%;
          background: none;
          border: 0;
          color: var(--tx);
          font: 15px var(--b);
          padding: 12px 44px 12px 14px;
        }
        .in input:focus {
          outline: none;
        }
        .in .ul {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: -1px;
          height: 2px;
          border-radius: 2px;
          background: linear-gradient(
            90deg,
            var(--blue),
            var(--cy),
            var(--vio)
          );
          transform: scaleX(0);
          box-shadow: 0 0 12px var(--cy);
        }
        .eye {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: 0;
          color: var(--mut);
          font: 11px var(--m);
          cursor: pointer;
          padding: 6px;
        }
        .eye:hover {
          color: var(--tx);
        }
        .er {
          display: block;
          color: #ff8d8d;
          font-size: 12px;
          min-height: 0;
          margin-top: 4px;
        }
        .str {
          display: flex;
          gap: 5px;
          margin-top: 8px;
          align-items: center;
        }
        .str i {
          flex: 1;
          height: 4px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }
        .str i b {
          display: block;
          height: 100%;
          width: 100%;
          transform: scaleX(0);
          transform-origin: left;
          border-radius: 4px;
        }
        .str span {
          font: 10.5px var(--m);
          letter-spacing: 0.12em;
          color: var(--mut);
          min-width: 54px;
          text-align: right;
        }
        .chk {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 13px;
          color: var(--mut);
          margin: 4px 0 14px;
          cursor: pointer;
        }
        .chk input {
          position: absolute;
          opacity: 0;
        }
        .bx {
          flex: none;
          width: 18px;
          height: 18px;
          border-radius: 6px;
          border: 1px solid var(--bd2);
          background: rgba(0, 0, 0, 0.35);
          display: grid;
          place-items: center;
          margin-top: 1px;
          transition: 0.2s;
        }
        .bx svg {
          width: 11px;
          height: 11px;
          stroke: #fff;
          fill: none;
          stroke-width: 3;
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
        }
        .chk input:checked + .bx {
          background: linear-gradient(135deg, var(--blue), var(--vio));
          border-color: transparent;
          box-shadow: 0 0 14px rgba(47, 123, 255, 0.6);
        }
        .chk input:checked + .bx svg {
          stroke-dashoffset: 0;
          transition: stroke-dashoffset 0.3s;
        }
        .chk input:focus-visible + .bx {
          outline: 2px solid var(--cy);
          outline-offset: 2px;
        }
        .chk.bad .bx {
          border-color: var(--err);
        }
        .sw {
          display: block;
          width: 100%;
          margin: 18px 0 0;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 0;
          box-shadow: none;

          text-align: center;
          color: #7f8da6;
          font-family: "Space Grotesk", sans-serif;
          font-size: 13px;
          line-height: 20px;
          white-space: nowrap;
        }

        .sw a {
          display: inline;
          margin-left: 5px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 0;
          box-shadow: none;

          color: #22d3ee;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .sw a:hover {
          color: #8b5cf6;
          text-decoration: underline;
        }

        .spin {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          display: none;
        }
        #ok {
          display: none;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 30px 0 10px;
          position: relative;
        }
        .ring {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          border: 1.5px solid rgba(16, 185, 129, 0.7);
          display: grid;
          place-items: center;
          box-shadow:
            0 0 50px rgba(16, 185, 129, 0.4),
            inset 0 0 30px rgba(16, 185, 129, 0.2);
          margin-bottom: 22px;
        }
        .ring svg {
          width: 46px;
          height: 46px;
          stroke: var(--ok);
          fill: none;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 0 8px var(--ok));
        }
        #ok h2 {
          color: var(--ok);
          text-shadow: 0 0 24px rgba(16, 185, 129, 0.6);
        }
        #ok .sub {
          margin-bottom: 22px;
        }
        .cf {
          position: absolute;
          left: 50%;
          top: 78px;
          width: 7px;
          height: 7px;
          border-radius: 2px;
          pointer-events: none;
        }
        .mono {
          font-family: var(--m);
        }
        @media (max-width: 900px) {
          .wrap {
            grid-template-columns: 1fr;
            gap: 28px;
            padding: 24px 16px;
          }
          .brand h1 {
            margin: 20px 0 10px;
          }
          .net,
          .tag {
            display: none;
          }
          .brand p {
            font-size: 14px;
          }
          .card {
            padding: 28px 22px 24px;
          }
        }

        /* Signup is a standalone auth screen: do not stack the app navbar above it. */
        body:has(.auth-page) > header,
        body:has(.auth-page) > nav,
        body:has(.auth-page) .site-header,
        body:has(.auth-page) .site-navbar,
        body:has(.auth-page) [data-site-navbar] {
          display: none !important;
        }

        .auth-page {
          position: relative;
          min-height: 100svh;
        }

        @media (max-width: 900px) {
          .auth-page .wrap {
            min-height: 100svh;
          }
        }
      `}</style>
      <div className="auth-page">
        <div className="bgl" />
        <div className="orb o1" />
        <div className="orb o2" />
        <div className="orb o3" />

        <main className="wrap">
          <section className="brand">
            <div className="logo bi">
              <i />
              FLOWFORGE AI
            </div>

            <h1 className="bi">
              FORGE YOUR
              <br />
              FIRST AGENT.
            </h1>

            <p className="bi">
              Create a workspace and start wiring agents, tools and knowledge
              into workflows you can actually see.
            </p>

            <span className="tag bi">AI CORE ACTIVE · FREE TO START</span>

            <div className="net bi">
              <svg viewBox="0 0 420 270" aria-label="Animated workflow preview">
                <path className="ep" id="p1" d="M210 44V78" />
                <path
                  className="ep"
                  id="p2"
                  d="M210 118C210 140 105 130 105 160"
                />
                <path
                  className="ep"
                  id="p3"
                  d="M210 118C210 140 315 130 315 160"
                />
                <path
                  className="ep"
                  id="p4"
                  d="M105 200C105 225 210 215 210 232"
                />
                <path
                  className="ep"
                  id="p5"
                  d="M315 200C315 225 210 215 210 232"
                />

                <g className="nd">
                  <rect
                    className="nr"
                    x="160"
                    y="14"
                    width="100"
                    height="30"
                    rx="9"
                  />
                  <text className="nl" x="210" y="33">
                    INPUT
                  </text>
                </g>

                <g className="nd">
                  <rect
                    className="nr"
                    x="150"
                    y="78"
                    width="120"
                    height="40"
                    rx="10"
                    style={{ stroke: "#2f7bff" }}
                  />
                  <text className="nl" x="210" y="102">
                    PLANNER
                  </text>
                </g>

                <g className="nd">
                  <rect
                    className="nr"
                    x="45"
                    y="160"
                    width="120"
                    height="40"
                    rx="10"
                    style={{ stroke: "#8b5cf6" }}
                  />
                  <text className="nl" x="105" y="184">
                    RESEARCH
                  </text>
                </g>

                <g className="nd">
                  <rect
                    className="nr"
                    x="255"
                    y="160"
                    width="120"
                    height="40"
                    rx="10"
                    style={{ stroke: "#8b5cf6" }}
                  />
                  <text className="nl" x="315" y="184">
                    CODING
                  </text>
                </g>

                <g className="nd">
                  <rect
                    className="nr"
                    x="150"
                    y="232"
                    width="120"
                    height="30"
                    rx="9"
                    style={{ stroke: "#10b981" }}
                  />
                  <text className="nl" x="210" y="251">
                    OUTPUT
                  </text>
                </g>

                <g ref={packetRef} id="pk" />
              </svg>
            </div>
          </section>

          <section className="card" id="card" ref={cardRef}>
            <div id="form" ref={formRef}>
              <h2 className="fi">SIGN IN</h2>

              <p className="sub fi">
                Welcome ! Your workflows kept running while you were away.
              </p>

              <div className="soc fi">
                <button className="btn" type="button">
                  GitHub
                </button>
                <button className="btn" type="button">
                  Google
                </button>
              </div>

              <div className="or fi">OR WITH EMAIL</div>

              <form id="f" noValidate onSubmit={handleSubmit}>
                <div
                  className={`fl fi ${errors.name ? "bad" : ""}`}
                  data-k="name"
                >
                  <label htmlFor="name">Full name</label>

                  <div className="in">
                    <input
                      id="name"
                      autoComplete="name"
                      placeholder="Adi Pi"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        clearError("name");
                      }}
                    />
                    <span className="ul" />
                  </div>

                  <small className="er">{errors.name ?? ""}</small>
                </div>

                <div
                  className={`fl fi ${errors.email ? "bad" : ""}`}
                  data-k="email"
                >
                  <label htmlFor="email">Work email</label>

                  <div className="in">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="AdiJain.com"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        clearError("email");
                      }}
                    />
                    <span className="ul" />
                  </div>

                  <small className="er">{errors.email ?? ""}</small>
                </div>

                <div className={`fl fi ${errors.pw ? "bad" : ""}`} data-k="pw">
                  <label htmlFor="pw">Password</label>

                  <div className="in">
                    <input
                      id="pw"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        clearError("pw");
                      }}
                    />

                    <button
                      className="eye"
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? "HIDE" : "SHOW"}
                    </button>

                    <span className="ul" />
                  </div>

                  <div className="str">
                    <i>
                      <b />
                    </i>
                    <i>
                      <b />
                    </i>
                    <i>
                      <b />
                    </i>
                    <i>
                      <b />
                    </i>

                    <span
                      id="sl"
                      style={{
                        color:
                          strength > 0
                            ? ["#ef4444", "#f59e0b", "#22d3ee", "#10b981"][
                                strength - 1
                              ]
                            : undefined,
                      }}
                    >
                      {passwordLabel}
                    </span>
                  </div>

                  <small className="er">{errors.pw ?? ""}</small>
                </div>

                <label
                  className={`chk fi ${errors.tos ? "bad" : ""}`}
                  data-k="tos"
                >
                  <input
                    type="checkbox"
                    id="tos"
                    checked={tos}
                    onChange={(event) => {
                      setTos(event.target.checked);
                      clearError("tos");
                    }}
                  />

                  <span className="bx">
                    <svg viewBox="0 0 12 12">
                      <path d="M2 6.5l2.6 2.6L10 3.5" />
                    </svg>
                  </span>

                  <span>
                    I agree to the Terms of Service and Privacy Policy.
                  </span>
                </label>

                {errors.tos && (
                  <small
                    style={{
                      display: "block",
                      marginTop: "-17px",
                      marginBottom: "17px",
                      color: "#fb7185",
                      fontSize: "11px",
                    }}
                  >
                    {errors.tos}
                  </small>
                )}

                <button
                  className="btn pri fi"
                  id="go"
                  type="submit"
                  disabled={loading}
                >
                  <span className="spin" id="sp" />
                  <span id="gl">
                    {loading ? "FORGING…" : "▶ CREATE WORKSPACE"}
                  </span>
                </button>
              </form>

              <p className="sw fi">
                Already have an account? <a href="/login">Log in</a>
              </p>
            </div>

            <div
              id="ok"
              ref={okRef}
              style={{
                display: submitted ? "flex" : "none",
              }}
            >
              <div className="ring">
                <svg viewBox="0 0 48 48">
                  <path id="ck" d="M12 25l8 8 16-18" />
                </svg>
              </div>

              <h2>WORKSPACE READY</h2>

              <p className="sub">
                Welcome aboard,{" "}
                <b style={{ color: "var(--tx)" }}>{firstName}</b>. Your first
                workflow is waiting.
              </p>

              <button
                className="btn pri"
                type="button"
                style={{ maxWidth: 260 }}
              >
                ▶ LAUNCH BUILDER
              </button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
