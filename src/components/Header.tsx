import { GitBranch, ShieldCheck } from "lucide-react";

import { Button } from "./ui/button";
import { APP_CONFIG } from "@/lib/config";

const { version, homepage } = APP_CONFIG;

export default function Header() {
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <span className="text-base font-semibold tracking-tight">
              PDF to Image Studio
            </span>
            <span className="block text-xs text-muted-foreground">
              Local-only conversions, refreshed design.
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="hover:text-primary transition-colors text-xs font-mono text-muted-foreground"
        >
          <a href={homepage} target="_blank" rel="noopener noreferrer">
            <GitBranch className="h-5 w-5" /> v{version}
          </a>
        </Button>
      </div>
    </header>
  );
}
