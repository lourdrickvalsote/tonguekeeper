"use client";

import {
  Brain,
  Search,
  Globe,
  Database,
  Sparkles,
  Cpu,
  Shield,
  Video,
  Bot,
  Triangle,
  type LucideIcon,
} from "lucide-react";

const SPONSORS: { name: string; icon: LucideIcon }[] = [
  { name: "Anthropic", icon: Brain },
  { name: "Elastic + JINA", icon: Search },
  { name: "Browserbase", icon: Globe },
  { name: "BrightData", icon: Database },
  { name: "Perplexity", icon: Sparkles },
  { name: "Runpod", icon: Cpu },
  { name: "Cloudflare", icon: Shield },
  { name: "HeyGen", icon: Video },
  { name: "Fetch.ai", icon: Bot },
  { name: "Vercel", icon: Triangle },
];

export function SponsorFooter() {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2.5 border-t border-border/40 bg-background/60 px-4 py-1.5">
      <span className="shrink-0 text-[9px] text-muted-foreground/40 uppercase tracking-wider">
        Built with
      </span>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
        {SPONSORS.map(({ name, icon: Icon }) => (
          <span
            key={name}
            className="flex items-center gap-1 text-[9px] text-muted-foreground/40 transition-colors duration-200 hover:text-muted-foreground"
          >
            <Icon className="h-2.5 w-2.5" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
