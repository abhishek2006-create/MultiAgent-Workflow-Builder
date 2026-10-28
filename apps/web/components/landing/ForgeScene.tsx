"use client";

import { useEffect, useRef } from "react";

/** Procedural original scene; the CSS fallback remains when WebGL is unavailable. */
export default function ForgeScene({ motion }: { motion: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef(motion);
  const syncMotion = useRef<(() => void) | undefined>(undefined);
  useEffect(() => { motionRef.current = motion; syncMotion.current?.(); }, [motion]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("three").then((T) => {
      if (disposed) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
      catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x05080b, 0);
      host.appendChild(renderer.domElement);
      const scene = new T.Scene();
      scene.fog = new T.FogExp2(0x06090e, 0.023);
      const camera = new T.PerspectiveCamera(52, 1, 0.1, 160);
      camera.position.set(0, 4.8, 18);
      camera.lookAt(0, 2.7, -15);
      scene.add(new T.AmbientLight(0x8296b2, 1.6));
      const orangeLight = new T.PointLight(0xff7a24, 160, 70);
      orangeLight.position.set(0, 4, -9); scene.add(orangeLight);
      const blueLight = new T.DirectionalLight(0x778da9, 3);
      blueLight.position.set(-6, 12, 2); scene.add(blueLight);
      const geometry = new T.BoxGeometry(1, 1, 1);
      const dark = new T.MeshStandardMaterial({ color: 0x1b222b, metalness: 0.8, roughness: 0.48 });
      const edgeMaterial = new T.LineBasicMaterial({ color: 0x718491, transparent: true, opacity: 0.2 });
      const edgeGeometry = new T.EdgesGeometry(geometry);
      const teal = new T.MeshBasicMaterial({ color: 0x75c4be });
      const amber = new T.MeshBasicMaterial({ color: 0xff8b35 });
      const road = new T.Mesh(geometry, dark); road.scale.set(210, 0.3, 190); road.position.set(0, -3, -65); scene.add(road);
      const grid = new T.GridHelper(180, 72, 0x4b645b, 0x1c3033); grid.position.set(0, -2.82, -60); scene.add(grid);
      for (let i = 0; i < 44; i++) {
        const side = i % 2 ? 1 : -1;
        const z = -Math.floor(i / 2) * 6;
        const height = 7 + ((i * 17) % 14);
        const width = 3 + ((i * 7) % 4);
        const x = side * (9 + (i % 3) * 3.5);
        const building = new T.Mesh(geometry, dark);
        building.position.set(x, height / 2 - 3, z); building.scale.set(width, height, 4.5); scene.add(building);
        const outline = new T.LineSegments(edgeGeometry, edgeMaterial); outline.position.copy(building.position); outline.scale.copy(building.scale); scene.add(outline);
        for (let floor = 1; floor < height; floor += 2.4) {
          const strip = new T.Mesh(geometry, i % 7 === 0 ? amber : teal);
          strip.position.set(x - side * (width / 2 + 0.01), floor - 2, z + 0.8);
          strip.scale.set(0.035, 0.06, 1.8); scene.add(strip);
        }
      }
      for (let i = 0; i < 32; i++) {
        for (const side of [-1, 1]) {
          const panel = new T.Mesh(geometry, dark); panel.position.set(side * 5.9, -1.9, -i * 4); panel.scale.set(2.3, 1.3, 2.5); scene.add(panel);
          const light = new T.Mesh(geometry, i % 4 === 0 ? amber : teal); light.position.set(side * 5.7, -1.15, -i * 4); light.scale.set(1.3, 0.035, 0.2); scene.add(light);
        }
        const rail = new T.Mesh(geometry, i % 5 === 0 ? amber : dark); rail.position.set(0, -2.73, -i * 4); rail.scale.set(3.4, 0.1, 0.07); scene.add(rail);
      }
      const core = new T.Group(); core.position.set(0, 10.8, -18); scene.add(core);
      const orb = new T.Mesh(new T.IcosahedronGeometry(2.7, 1), new T.MeshStandardMaterial({ color: 0x536265, metalness: 1, roughness: 0.12, wireframe: true, emissive: 0x7c6417, emissiveIntensity: 0.7 })); core.add(orb);
      for (let i = 0; i < 3; i++) {
        const ring = new T.Mesh(new T.TorusGeometry(3.1 + i * 0.35, 0.013, 6, 110), amber);
        ring.rotation.set(1.1 + i * 0.4, 0.3 + i, i * 0.7); core.add(ring);
      }
      const points = new Float32Array(180 * 3);
      for (let i = 0; i < 180; i++) { points[i * 3] = Math.sin(i * 12.32) * 48; points[i * 3 + 1] = 2 + ((i * 13) % 22); points[i * 3 + 2] = -((i * 7) % 100); }
      const particlesGeometry = new T.BufferGeometry(); particlesGeometry.setAttribute("position", new T.BufferAttribute(points, 3));
      const particles = new T.Points(particlesGeometry, new T.PointsMaterial({ color: 0xc0c5b5, size: 0.04, transparent: true, opacity: 0.65 })); scene.add(particles);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      let frame = 0; let visible = true; let pointerX = 0; let pointerY = 0;
      const draw = (time: number) => {
        frame = 0;
        if (disposed || !visible || document.hidden) return;
        if (motionRef.current && !reduced.matches) {
          core.rotation.y = time * 0.00016;
          core.position.y = 10.8 + Math.sin(time * 0.0006) * 0.3;
          camera.position.x += (pointerX * 0.85 - camera.position.x) * 0.025;
          camera.position.y += (4.8 + pointerY * 0.4 - camera.position.y) * 0.025;
          camera.lookAt(0, 2.7, -15);
          particles.rotation.y = Math.sin(time * 0.00004) * 0.04;
        }
        renderer.render(scene, camera);
        if (motionRef.current && !reduced.matches) frame = requestAnimationFrame(draw);
      };
      const updateMotion = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        draw(performance.now());
      };
      syncMotion.current = updateMotion;
      const resume = () => { if (!frame && visible && !document.hidden) draw(performance.now()); };
      const resize = () => { const { width, height } = host.getBoundingClientRect(); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); renderer.setSize(width, height); resume(); };
      const observer = new ResizeObserver(resize); observer.observe(host);
      const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; } else resume(); }); visibility.observe(host);
      const onPointer = (event: PointerEvent) => { pointerX = (event.clientX / window.innerWidth - 0.5) * 2; pointerY = (event.clientY / window.innerHeight - 0.5) * 2; };
      const onVisibility = () => { if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; } else resume(); };
      window.addEventListener("pointermove", onPointer, { passive: true }); document.addEventListener("visibilitychange", onVisibility); reduced.addEventListener("change", updateMotion);
      resize();
      cleanup = () => {
        cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect();
        window.removeEventListener("pointermove", onPointer); document.removeEventListener("visibilitychange", onVisibility); reduced.removeEventListener("change", updateMotion);
        syncMotion.current = undefined;
        const geometries = new Set<InstanceType<typeof T.BufferGeometry>>();
        const materials = new Set<InstanceType<typeof T.Material>>();
        scene.traverse((object) => { if (object instanceof T.Mesh || object instanceof T.LineSegments || object instanceof T.Points) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material)); } });
        geometries.forEach((item) => item.dispose()); materials.forEach((item) => item.dispose());
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => { /* The CSS scene remains usable without WebGL. */ });
    return () => { disposed = true; cleanup?.(); };
  }, []);

  return <div ref={hostRef} className="forge-scene" aria-hidden="true"><div className="forge-fallback"><div className="forge-fallback-orb" /><div className="forge-fallback-grid" /></div></div>;
}
