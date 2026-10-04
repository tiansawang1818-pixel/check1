import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** Decorative motion only: never intercepts navigation or simulates runtime state. */
export function ColorExperience() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    document.body.classList.add("color-explosion");
    return () => document.body.classList.remove("color-explosion");
  }, []);
  useEffect(() => {
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        entry.target.classList.toggle("art-in-view", entry.isIntersecting);
        if (entry.isIntersecting) entry.target.classList.add("art-revealed");
      }
    }, { threshold: .08 });
    const scan = () => document.querySelectorAll(".studio-hero, .metric, .getting-started, .bot-card, .color-playground").forEach(element => {
      if (!seen.has(element)) { seen.add(element); element.classList.add("art-observed"); observer.observe(element); }
    });
    scan();
    const changes = new MutationObserver(scan);
    changes.observe(document.getElementById("root")!, { childList: true, subtree: true });
    return () => { observer.disconnect(); changes.disconnect(); };
  }, []);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      document.documentElement.style.setProperty("--page-progress", String(max > 0 ? scrollY / max : 0));
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); document.documentElement.style.removeProperty("--page-progress"); };
  }, []);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(pointer: fine)");
    const surface = canvas.current;
    const ctx = surface?.getContext("2d");
    if (!surface || !ctx) return;
    let frame = 0, width = 0, height = 0, last = 0;
    let pointer = { x: -100, y: -100 };
    let card: HTMLElement | null = null, button: HTMLElement | null = null;
    const particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
    const colors = ["#00f5ff", "#ff2bd6", "#b6ff00", "#ffe600"];
    const reset = () => {
      card?.style.removeProperty("transform");
      button?.style.removeProperty("translate");
      card = null; button = null;
    };
    const resize = () => {
      width = innerWidth; height = innerHeight;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      surface.width = width * ratio; surface.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const enabled = () => !paused && !reduced.matches && !document.hidden;
    const move = (event: PointerEvent) => {
      if (!enabled() || !fine.matches || event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      const target = event.target as HTMLElement;
      const nextCard = target.closest<HTMLElement>(".hero-workflow, .metric, .bot-card");
      const nextButton = target.closest<HTMLElement>(".primary:not(:disabled)");
      if (card !== nextCard) card?.style.removeProperty("transform");
      if (button !== nextButton) button?.style.removeProperty("translate");
      card = nextCard; button = nextButton;
      const hero = target.closest<HTMLElement>(".studio-hero");
      if (hero) {
        const bounds = hero.getBoundingClientRect();
        hero.style.setProperty("--spot-x", `${(pointer.x - bounds.left) / bounds.width * 100}%`);
        hero.style.setProperty("--spot-y", `${(pointer.y - bounds.top) / bounds.height * 100}%`);
      }
      start();
    };
    const click = (event: MouseEvent) => {
      if (!enabled() || !(event.target as HTMLElement).closest(".primary:not(:disabled), [data-color-burst]")) return;
      const burst = !!(event.target as HTMLElement).closest("[data-color-burst]");
      const count = burst ? 48 : 18;
      const bounds = (event.target as Element).closest("button, a")?.getBoundingClientRect();
      const originX = event.detail === 0 && bounds ? bounds.left + bounds.width / 2 : event.clientX;
      const originY = event.detail === 0 && bounds ? bounds.top + bounds.height / 2 : event.clientY;
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2;
        particles.push({ x: originX, y: originY, vx: Math.cos(angle) * (burst ? 7 : 3.8), vy: Math.sin(angle) * (burst ? 7 : 3.8), life: 1, color: colors[i % colors.length] });
      }
      if (particles.length > 72) particles.splice(0, particles.length - 72);
      start();
    };
    const draw = (time: number) => {
      frame = 0;
      if (!enabled()) return;
      const delta = Math.min((time - last) / 16.67 || 1, 2); last = time;
      ctx.clearRect(0, 0, width, height);
      if (card) {
        const box = card.getBoundingClientRect();
        const x = (pointer.x - box.left) / box.width - .5, y = (pointer.y - box.top) / box.height - .5;
        card.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
        card.style.setProperty("--light-x", `${(x + .5) * 100}%`);
        card.style.setProperty("--light-y", `${(y + .5) * 100}%`);
      }
      if (button) {
        const box = button.getBoundingClientRect();
        button.style.translate = `${(pointer.x - box.left - box.width / 2) * .045}px ${(pointer.y - box.top - box.height / 2) * .07}px`;
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life -= .038 * delta;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * delta; p.y += p.vy * delta;
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (particles.length) start();
    };
    function start() { if (!frame && enabled()) frame = requestAnimationFrame(draw); }
    const leave = () => reset();
    const sync = () => {
      document.body.classList.toggle("motion-paused", paused || reduced.matches || document.hidden);
      if (!enabled()) { cancelAnimationFrame(frame); frame = 0; particles.length = 0; ctx.clearRect(0, 0, width, height); leave(); }
    };
    resize(); sync();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("click", click);
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame); reset();
      window.removeEventListener("resize", resize); window.removeEventListener("pointermove", move); window.removeEventListener("click", click);
      document.removeEventListener("pointerleave", leave); document.removeEventListener("visibilitychange", sync); reduced.removeEventListener("change", sync);
      document.body.classList.remove("motion-paused");
    };
  }, [paused]);
  return <>
    <div className="reading-progress" aria-hidden="true" />
    <div className="color-atmosphere" aria-hidden="true"><i /><i /><i /><div className="art-grid" /><div className="aurora-ribbon ribbon-one" /><div className="aurora-ribbon ribbon-two" /></div>
    <canvas ref={canvas} className="color-particles" aria-hidden="true" />
    <button type="button" className="motion-control" aria-pressed={paused} onClick={() => setPaused(!paused)} title={paused ? "เปิดเอฟเฟกต์เคลื่อนไหว" : "หยุดเอฟเฟกต์เคลื่อนไหว"}>
      {paused ? <Play size={13} /> : <Pause size={13} />}<span>{paused ? "เปิดเอฟเฟกต์" : "หยุดเอฟเฟกต์"}</span>
    </button>
  </>;
}
