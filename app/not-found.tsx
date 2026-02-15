import { Globe, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex flex-col items-center gap-5 max-w-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted border border-border">
          <Globe className="h-8 w-8 text-muted-foreground" />
        </div>

        <div>
          <h2 className="font-serif text-xl tracking-tight text-foreground mb-2">
            Page not found
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
