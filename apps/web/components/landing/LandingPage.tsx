"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ForgeScene from "./ForgeScene";
import { IntegrationMap, ProductIcon } from "../ui/ProductIcon";

const features = [
  { icon: "flow", number: "01", title: "Design the connection.", text: "Bring agents, tools and decisions together on a visual canvas. Build the way you think.", href: "/workflows/demo", action: "Open the builder" },
  { icon: "agent", number: "02", title: "Choose your intelligence.", text: "Give each agent a role. Choose Gemini or GPT for the task and keep your model settings in view.", href: "/settings", action: "Explore connections" },
  { icon: "check", number: "03", title: "Keep the final say.", text: "Follow each step, inspect the output and pause for human approval when the decision matters.", href: "/approvals", action: "Review approvals" },
];

export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState(true);
  useEffect(() => {
    const match = gsap.matchMedia();
    match.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo(".hero-reveal", { y: 32, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.12, duration: 1.1, ease: "power3.out", clearProps: "all" });
      }, root);
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { gsap.fromTo(entry.target, { y: 28, opacity: 0.3 }, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out", clearProps: "all" }); observer.unobserve(entry.target); }
      }), { threshold: 0.1 });
      root.current?.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
      return () => { observer.disconnect(); context.revert(); };
    });
    return () => match.revert();
  }, []);

  return <div ref={root} className="landing-page">
    <section className="landing-hero" aria-labelledby="landing-title">
      <ForgeScene motion={motion} />
      <div className="hero-vignette" aria-hidden="true" />
      <div className="hero-coordinate hero-coordinate-left"><span className="signal-dot" /> THE WORKFLOW STATION <span>EST. 2026 / BUILT FOR WHAT&apos;S NEXT</span></div>
      <div className="hero-coordinate hero-coordinate-right"><span>AGENTS. TOOLS. HUMAN INTENT.</span>CONNECTED BY DESIGN ↗</div>
      <div className="hero-content">
        <p className="hero-kicker hero-reveal">FROM A SINGLE IDEA TO A CONNECTED SYSTEM</p>
        <h1 id="landing-title" className="hero-reveal"><span>FLOWFORGE</span><em>Intelligence, orchestrated.</em></h1>
        <p className="hero-description hero-reveal">Give your ideas a direction.<br />Build AI workflows where every connection has a purpose.</p>
        <div className="hero-reveal hero-cta-row"><Link href="/workflows/demo" className="forge-start"><span className="start-dot" /> START BUILDING <ProductIcon name="arrow" /></Link><Link href="#system" className="hero-secondary">Explore the system <span>↓</span></Link></div>
      </div>
      <div className="hero-bottom"><span>VISUAL AUTOMATION / HUMAN CONTROL</span><button type="button" onClick={() => setMotion((current) => !current)} aria-pressed={!motion}>{motion ? "Ⅱ Pause scene" : "▷ Resume scene"}</button><span>SCROLL TO DISCOVER ↓</span></div>
    </section>

    <div className="capability-strip"><span>YOUR MODELS. YOUR LOGIC. YOUR WORKFLOW.</span><span><ProductIcon name="agent" /> Gemini & GPT</span><span><ProductIcon name="flow" /> Visual workflows</span><span><ProductIcon name="check" /> Human approval</span><span><ProductIcon name="terminal" /> Execution history</span></div>

    <section id="system" className="landing-section system-section" data-reveal>
      <div className="section-heading"><p className="eyebrow">01 / THE CONNECTED SYSTEM</p><h2>Good ideas deserve<br /><em>a working system.</em></h2><p>Go from scattered prompts to a workflow you can see, run and understand. One space for the whole process.</p></div>
      <div className="system-visual"><IntegrationMap /><div className="system-labels"><span>MODELS</span><span>TOOLS</span><span>APPROVALS</span><span>OUTPUTS</span></div></div>
    </section>

    <section className="landing-section feature-section" data-reveal>
      <div className="section-heading"><p className="eyebrow">02 / MADE TO WORK TOGETHER</p><h2>Complex behind the scenes.<br /><em>Clear in front of you.</em></h2></div>
      <div className="feature-grid">{features.map((feature) => <article key={feature.number} className="feature-card"><div className="feature-top"><span className="iso-icon"><ProductIcon name={feature.icon} /></span><span>{feature.number} /</span></div><h3>{feature.title}</h3><p>{feature.text}</p><Link href={feature.href}>{feature.action}<ProductIcon name="arrow" /></Link></article>)}</div>
    </section>

    <section className="landing-section journey-section" data-reveal>
      <div className="section-heading"><p className="eyebrow">03 / FROM INTENT TO OUTPUT</p><h2>A little structure.<br /><em>A lot of possibility.</em></h2><Link className="btn" href="/templates">Find your starting point <ProductIcon name="arrow" /></Link></div>
      <div className="journey-steps">{[["01", "Start with an idea", "Choose a template or connect your own nodes."], ["02", "Set it in motion", "Add your input and follow the real execution path."], ["03", "Make the call", "Review, approve and keep a record of every result."]].map(([number, title, text]) => <div key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><ProductIcon name="arrow" /></div>)}</div>
    </section>

    <section className="landing-section landing-faq" data-reveal><div className="section-heading"><p className="eyebrow">BEFORE YOU CONNECT</p><h2>A few useful answers.</h2></div><div>{[["Can I try it without an AI key?", "Yes. Use the Parse structured JSON template to test the canvas, execution history and dashboard without making an AI provider call."], ["Can I use both Gemini and GPT?", "Yes. Choose a model on each AI node and configure the corresponding provider key in the AI service environment. Model access and quota depend on your provider account."], ["Where do I see the results?", "Each execution has a saved history with node outputs, timing and errors. The dashboard uses real workspace data, and approval nodes let you review a result before continuing."]].map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>

    <section className="landing-final" data-reveal><p className="eyebrow">YOUR NEXT IDEA IS THE STARTING POINT</p><h2>Make the connection.</h2><Link href="/workflows/demo" className="forge-start">BUILD YOUR WORKFLOW <ProductIcon name="arrow" /></Link></section>
    <footer className="landing-footer"><Link className="logo" href="/"><i />FLOWFORGE<span>AI</span></Link><p>Intelligence, with intention.</p><div><Link href="/templates">Templates</Link><Link href="/login">Sign in</Link><Link href="/settings">Connections</Link></div><span>© {new Date().getFullYear()} FLOWFORGE AI</span></footer>
  </div>;
}
