// Middleware handles: unauthenticated → /login, authenticated → /dashboard
// This page is never reached in normal flow.
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const error = searchParams.get("error");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const nodes: Array<{
      x: number; y: number; vx: number; vy: number;
      r: number; alpha: number; color: string;
    }> = [];

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initNodes();
    }

    function initNodes() {
      if (!canvas) return;
      nodes.length = 0;
      for (let i = 0; i < 45; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 2 + 1,
          alpha: Math.random() * 0.4 + 0.1,
          color: Math.random() > 0.5 ? "#FFB020" : "#3DD68C",
        });
      }
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.15,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.8
      );
      grad.addColorStop(0, "rgba(30,35,56,0)");
      grad.addColorStop(1, "rgba(10,12,24,0.65)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(139,155,192,${0.07 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        const alpha = Math.round(n.alpha * 255).toString(16).padStart(2, "0");
        ctx.fillStyle = n.color + alpha;
        ctx.fill();

        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-ground">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      />

      <div className="relative z-10 w-[420px] bg-ground-2 border border-[rgba(139,155,192,0.22)] rounded-2xl p-12 text-center animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 bg-[#FFB020] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="6" width="8" height="2" rx="1" fill="#0F0A00" />
              <rect x="2" y="10" width="12" height="2" rx="1" fill="#0F0A00" />
              <rect x="2" y="14" width="6" height="2" rx="1" fill="#0F0A00" />
              <circle cx="16" cy="7" r="3" fill="#0F0A00" opacity="0.55" />
              <path
                d="M14.5 7l1 1 2-2"
                stroke="#FFB020"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-display text-[20px] font-semibold tracking-tight text-[#EEF0FF]">
            Wrike<span className="text-[#8B9BC0] font-normal">View</span>
          </span>
        </div>

        <h1 className="text-display text-[28px] font-bold leading-tight tracking-tight mb-2.5">
          Your work,
          <br />
          one screen.
        </h1>
        <p className="text-[14px] text-[#8B9BC0] leading-relaxed mb-9">
          Consolidated dashboard for Wrike teams.
          <br />
          Sign in with your Wrike account to continue.
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-[#3D1010] border border-[rgba(255,107,107,0.3)] text-[#FF6B6B] text-[13px]">
            {error === "OAuthCallback"
              ? "Sign-in failed. Check your Wrike app credentials and try again."
              : "Something went wrong. Please try again."}
          </div>
        )}

        <button
          onClick={() => { window.location.href = "/api/connections/wrike/start"; }}
          className="flex items-center justify-center gap-3 w-full px-6 py-3.5 bg-[#FFB020] hover:bg-[#FFC040] text-[#0F0A00] rounded-[10px] font-display text-[15px] font-semibold transition-all duration-150 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(255,176,32,0.35)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB020] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252B44]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
          Continue with Wrike
        </button>

        <p className="mt-5 text-[12px] text-[#5A6A94] leading-relaxed">
          Access is scoped to your Wrike permissions.
          <br />
          No data is stored beyond your session.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
