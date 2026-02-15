"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { LogoIcon } from "@/components/navigation/TongueKeeperLogo";
import { SponsorFooter } from "@/components/dashboard/sponsor-footer";
import { fetchLanguages } from "@/lib/api";
import { Search, BookOpen, GitMerge, ChevronDown } from "lucide-react";

// ── Animation Variants ───────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const logoReveal = {
  hidden: { opacity: 0, scale: 0.4 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 120, damping: 14 },
  },
};

// ── Animated Counter ─────────────────────────────────────────────────────

function AnimatedCount({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    if (!inView || target === 0) return;
    const duration = 1800;
    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ── Features ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Search,
    title: "Discover",
    description:
      "Autonomous agents scour the web for dictionaries, grammars, recordings, and academic papers in endangered languages.",
    color: "#1E40AF",
  },
  {
    icon: BookOpen,
    title: "Extract",
    description:
      "AI-powered extraction pulls vocabulary, grammar patterns, and audio from diverse sources into structured archives.",
    color: "#047857",
  },
  {
    icon: GitMerge,
    title: "Cross-Reference",
    description:
      "Intelligent verification links entries across sources, validating accuracy and building comprehensive language records.",
    color: "#6D28D9",
  },
];

// ── Page ─────────────────────────────────────────────────────────────────

export default function SplashPage() {
  const [stats, setStats] = useState({
    totalEndangered: 0,
    criticallyEndangered: 0,
    preserved: 0,
  });

  useEffect(() => {
    fetchLanguages({ limit: 1 }).then((data) => {
      setStats({
        totalEndangered: data.stats.total_endangered,
        criticallyEndangered: data.stats.critically_endangered,
        preserved: data.stats.with_preservation_data,
      });
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
        style={{ backgroundColor: "#1A1714" }}
      >
        {/* Ambient glow — warm radiance emanating from center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 42%, rgba(163, 71, 10, 0.12), transparent)",
          }}
        />

        {/* Grain texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Hero content */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-8 max-w-2xl text-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {/* Logo with glow halo */}
          <motion.div variants={logoReveal} className="relative">
            <div
              className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
              style={{
                background: "rgba(163, 71, 10, 0.2)",
                transform: "scale(3)",
              }}
            />
            <LogoIcon size={80} className="relative text-[#A3470A]" />
          </motion.div>

          {/* Wordmark */}
          <motion.h1
            variants={fadeUp}
            className="font-serif text-5xl md:text-6xl lg:text-7xl tracking-tight"
            style={{ color: "#FFFCF7" }}
          >
            Tongue<span style={{ color: "#A3470A" }}>Keeper</span>
          </motion.h1>

          {/* Tagline */}
          <motion.div variants={fadeUp} className="space-y-1.5">
            <p
              className="text-lg md:text-xl leading-relaxed"
              style={{ color: "rgba(255, 252, 247, 0.65)" }}
            >
              Every language is a universe of thought.
            </p>
            <p
              className="text-lg md:text-xl leading-relaxed font-serif italic"
              style={{ color: "rgba(255, 252, 247, 0.4)" }}
            >
              We keep them alive.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center gap-3 mt-2"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-[#A3470A] px-7 py-3 text-sm font-medium text-[#FFFCF7] shadow-lg shadow-[#A3470A]/20 hover:bg-[#B85210] hover:shadow-xl hover:shadow-[#A3470A]/30 transition-all duration-200"
            >
              Start Preserving
            </Link>
            <Link
              href="/languages"
              className="inline-flex items-center gap-2 rounded-lg border border-[#FFFCF7]/15 px-7 py-3 text-sm font-medium text-[#FFFCF7]/60 hover:border-[#FFFCF7]/30 hover:text-[#FFFCF7] transition-all duration-200"
            >
              Browse Languages
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.8 }}
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <ChevronDown
              className="h-5 w-5"
              style={{ color: "rgba(255, 252, 247, 0.15)" }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="bg-background">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
            {[
              {
                value: stats.totalEndangered,
                suffix: "+",
                label: "Languages at Risk",
              },
              {
                value: stats.criticallyEndangered,
                suffix: "",
                label: "Critically Endangered",
              },
              {
                value: stats.preserved,
                suffix: "",
                label: "Languages Preserved",
              },
              { value: 100, suffix: "%", label: "Fully Automated" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1.5"
              >
                <span className="font-serif text-3xl md:text-4xl tabular-nums text-foreground">
                  <AnimatedCount
                    target={stat.value}
                    suffix={stat.suffix}
                  />
                </span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="bg-background pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Editorial section heading */}
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px bg-border/30" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 shrink-0 select-none">
              How it works
            </p>
            <div className="flex-1 h-px bg-border/30" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="group relative rounded-lg border border-border/40 bg-card/50 p-6 transition-all duration-200 hover:border-border hover:shadow-sm"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                {/* Agent color accent line */}
                <div
                  className="absolute top-0 left-6 right-6 h-px"
                  style={{
                    backgroundColor: feature.color,
                    opacity: 0.35,
                  }}
                />

                <div
                  className="flex h-9 w-9 items-center justify-center rounded-md mb-4"
                  style={{ backgroundColor: `${feature.color}10` }}
                >
                  <feature.icon
                    className="h-4 w-4"
                    style={{ color: feature.color }}
                  />
                </div>

                <h3 className="font-serif text-base tracking-tight text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <SponsorFooter />
    </div>
  );
}
