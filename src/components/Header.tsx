import { APP_CONFIG } from "@/lib/config";

const { version, homepage } = APP_CONFIG;

export default function Header() {
  return (
    <header className="w-full bg-[#f8f6f0]">
      <div className="mx-auto max-w-[780px] px-6 py-6 text-center">
        <p className="font-special text-[10px] uppercase tracking-[0.3em] text-[#918c82]">
          Bureau of Document Conversion Services
        </p>
        <h1 className="font-special mt-2 text-2xl uppercase tracking-[0.12em] text-[#2c2a26] sm:text-3xl">
          PDF-to-Image Converter
        </h1>
        <p
          className="font-typewriter mt-1 text-sm leading-none text-[#918c82]"
          aria-hidden="true"
        >
          ========================
        </p>
        <p className="font-typewriter mt-3 text-[11px] text-[#5a5750]">
          Form DCS-7742 &nbsp;|&nbsp; Rev. 02/2026 &nbsp;|&nbsp;
          Classification: UNCLASSIFIED &nbsp;|&nbsp;{" "}
          <a
            href={homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[#918c82] underline-offset-2 hover:text-[#2c2a26]"
          >
            v{version}
          </a>
        </p>
      </div>
    </header>
  );
}
