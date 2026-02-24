import type { ImageFormat } from "@/lib/pdf/export";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

type Props = {
  className?: string;
  format: ImageFormat;
  onFormatChange: (f: ImageFormat) => void;
  scale: number; // 1..4
  onScaleChange: (s: number) => void;
  quality: number; // 0.7..1.0
  onQualityChange: (q: number) => void;
};

export default function ControlsPanel({
  className,
  format,
  onFormatChange,
  scale,
  onScaleChange,
  quality,
  onQualityChange,
}: Props) {
  const showQuality = format === "jpeg" || format === "webp";

  return (
    <section className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2 justify-between">
          <label className="text-sm font-medium">Image format</label>
          <Select value={format} onValueChange={onFormatChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jpeg">JPEG</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="webp">WEBP</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            WEBP falls back automatically if unsupported.
          </p>
        </div>

        <div className="flex flex-col gap-2  justify-between">
          <label className="text-sm font-medium">
            Scale: <span className="tabular-nums">{scale.toFixed(1)}x</span>
          </label>
          <Slider
            value={[scale]}
            onValueChange={(vals) => onScaleChange(vals[0])}
            min={1}
            max={4}
            step={0.5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Controls output resolution (multiplied by device pixel ratio).
          </p>
        </div>

        <div
          className={cn(
            "flex flex-col gap-2 justify-between",
            showQuality ? "" : "opacity-50 pointer-events-none",
          )}
        >
          <label className="text-sm font-medium">
            Quality: <span className="tabular-nums">{(quality * 100).toFixed(0)}%</span>
          </label>
          <Slider
            value={[quality]}
            onValueChange={(vals) => onQualityChange(vals[0])}
            min={0.7}
            max={1}
            step={0.01}
            className="w-full"
            disabled={!showQuality}
          />
          <p className="text-xs text-muted-foreground">Applies to JPEG and WEBP only.</p>
        </div>
      </div>
    </section>
  );
}
