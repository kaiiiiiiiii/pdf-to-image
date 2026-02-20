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
    <section
      className={cn(
        "border border-[#c5d4e8] bg-transparent",
        className,
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-[#c5d4e8]">
        <div className="flex flex-col gap-2 justify-between p-4">
          <label className="font-special text-[10px] uppercase tracking-widest text-[#918c82]">
            B1. Output Format
          </label>
          <Select value={format} onValueChange={onFormatChange}>
            <SelectTrigger className="w-full rounded-none border-[#918c82] bg-transparent font-mono text-xs uppercase">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[#918c82]">
              <SelectItem value="jpeg">JPEG</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="webp">WEBP</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-[#918c82]">
            WEBP falls back automatically if unsupported.
          </p>
        </div>

        <div className="flex flex-col gap-2 justify-between p-4">
          <label className="font-special text-[10px] uppercase tracking-widest text-[#918c82]">
            B2. Scale:{" "}
            <span className="border-b border-[#2c2a26] tabular-nums text-[#2c2a26]">
              {scale.toFixed(1)}×
            </span>
          </label>
          <Slider
            value={[scale]}
            onValueChange={(vals) => onScaleChange(vals[0])}
            min={1}
            max={4}
            step={0.5}
            className="w-full"
          />
          <p className="text-[10px] text-[#918c82]">
            Controls output resolution (multiplied by device pixel ratio).
          </p>
        </div>

        <div
          className={cn(
            "flex flex-col gap-2 justify-between p-4",
            showQuality ? "" : "opacity-50 pointer-events-none",
          )}
        >
          <label className="font-special text-[10px] uppercase tracking-widest text-[#918c82]">
            B3. Quality:{" "}
            <span className="border-b border-[#2c2a26] tabular-nums text-[#2c2a26]">
              {(quality * 100).toFixed(0)}%
            </span>
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
          <p className="text-[10px] text-[#918c82]">
            Applies to JPEG and WEBP only.
          </p>
        </div>
      </div>
    </section>
  );
}
