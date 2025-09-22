import { Button } from "./ui/button";
import { APP_CONFIG } from "@/lib/config";
import { GitBranch } from "lucide-react";

const { version, homepage } = APP_CONFIG;

export default function Header() {
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex flex-col">
          <span className="text-base font-semibold tracking-tight">
            PDF to Image
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Local. Private. Fast.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="hover:text-primary transition-colors text-xs font-mono text-muted-foreground"
        >
          <a href={homepage} target="_blank" rel="noopener noreferrer">
            <GitBranch className="w-5 h-5" />v{version}
          </a>
        </Button>
      </div>
    </header>
  );
}
