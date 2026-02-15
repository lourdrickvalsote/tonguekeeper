"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AgentFeed } from "@/components/agent-feed/agent-feed";
import { SearchPanel } from "@/components/search/search-panel";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { SponsorFooter } from "@/components/dashboard/sponsor-footer";
import { useAgentEventsContext } from "@/lib/websocket";
import { useActiveLanguage } from "@/lib/active-language";
import { ResizableLayout } from "@/components/ui/resizable-layout";
import { PreservationDialog } from "@/components/search/PreservationDialog";
import { Button } from "@/components/ui/button";
import { Globe, Zap } from "lucide-react";
import type { LanguageEntry, LanguageMetadata } from "@/lib/types";

function buildMetadata(lang: LanguageEntry): LanguageMetadata {
  return {
    language_name: lang.name,
    language_code: lang.iso_code,
    glottocode: lang.glottocode,
    native_name: lang.alternate_names?.[0],
    alternate_names: lang.alternate_names,
    macroarea: lang.macroarea,
    language_family: lang.language_family,
    countries: lang.countries,
    contact_languages: lang.contact_languages,
    endangerment_status: lang.endangerment_status,
    speaker_count: lang.speaker_count,
  };
}

export default function Home() {
  return <DashboardContent />;
}

function DashboardContent() {
  const { pipelineStatus, startPipeline } = useAgentEventsContext();
  const { activeLanguage, setActiveLanguage } = useActiveLanguage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const autoStarted = useRef(false);

  // Auto-start pipeline when navigated from a language detail page
  useEffect(() => {
    if (autoStarted.current) return;
    const shouldAutoStart = sessionStorage.getItem("tk-auto-start");
    if (shouldAutoStart && activeLanguage) {
      autoStarted.current = true;
      sessionStorage.removeItem("tk-auto-start");
      startPipeline(buildMetadata(activeLanguage));
    }
  }, [activeLanguage, startPipeline]);

  const isArchiveMode = activeLanguage !== null;

  const handleDialogStart = useCallback(
    (selected: LanguageEntry) => {
      setActiveLanguage(selected);
      setDialogOpen(false);
      startPipeline(buildMetadata(selected));
    },
    [setActiveLanguage, startPipeline]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-sm px-5 py-2">
        <h1 className="font-serif text-base tracking-tight text-foreground/80 select-none">
          Preservation Dashboard
        </h1>
        {isArchiveMode && <StatsBar languageCode={activeLanguage?.iso_code} />}
      </header>

      {/* Main content */}
      {isArchiveMode ? (
        <ResizableLayout
          defaultLeftPercent={30}
          minLeftPercent={20}
          maxLeftPercent={50}
          left={<AgentFeed />}
          right={<SearchPanel language={activeLanguage ?? undefined} />}
        />
      ) : (
        <WelcomeView onBeginClick={() => setDialogOpen(true)} />
      )}

      {/* Footer */}
      <SponsorFooter />

      {/* Language selector dialog */}
      <PreservationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onStart={handleDialogStart}
      />
    </div>
  );
}

const heroChildVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function WelcomeView({ onBeginClick }: { onBeginClick: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <motion.div
        className="flex flex-col items-center gap-6 max-w-2xl"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
      >
        {/* Hero icon */}
        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.8 },
            visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 20 } },
          }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
        >
          <Globe className="h-10 w-10 text-primary" />
        </motion.div>

        {/* Heading */}
        <motion.div variants={heroChildVariants}>
          <h2 className="font-serif text-3xl tracking-tight text-foreground mb-3">
            Preserve Endangered Languages with AI
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            TongueKeeper&apos;s autonomous agents discover, extract, and organize
            vocabulary, grammar patterns, and audio recordings from across the
            web&mdash;building comprehensive language archives in minutes.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
          }}
        >
          <Button
            onClick={onBeginClick}
            size="lg"
            className="gap-2 px-8 py-6 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            <Zap className="h-5 w-5" />
            Begin Preservation
          </Button>
        </motion.div>

        {/* Quick stats */}
        <motion.div variants={heroChildVariants} className="flex items-center gap-8 text-sm text-muted-foreground mt-4">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-foreground tabular-nums">3,000+</span>
            <span>Endangered Languages</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-foreground tabular-nums">2-5 min</span>
            <span>Average Preservation</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-foreground tabular-nums">100%</span>
            <span>Automated</span>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p variants={heroChildVariants} className="text-xs text-muted-foreground/50 max-w-md mt-2">
          Built for TreeHacks 2026 &middot; Powered by Anthropic, Elastic, Perplexity, and more
        </motion.p>
      </motion.div>
    </div>
  );
}
