import { Sidebar } from "@/components/navigation/Sidebar";
import { AgentEventsProvider } from "@/lib/websocket";
import { ActiveLanguageProvider } from "@/lib/active-language";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AgentEventsProvider>
      <ActiveLanguageProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </ActiveLanguageProvider>
    </AgentEventsProvider>
  );
}
