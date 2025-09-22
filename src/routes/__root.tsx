import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import Header from "../components/Header";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "description",
        content:
          "Convert PDF pages to high-quality PNG, JPEG, or WEBP images directly in your browser. Private, secure, and no file uploads required.",
      },
      {
        name: "keywords",
        content:
          "pdf to image converter, pdf to png, pdf to jpeg, pdf to webp, convert pdf online, pdf converter, image converter",
      },
      // Open Graph tags
      {
        property: "og:title",
        content: "PDF to Image Converter - Convert PDFs to High-Quality Images",
      },
      {
        property: "og:description",
        content:
          "Convert PDF pages to PNG, JPEG, or WEBP images directly in your browser. Private, secure, and no file uploads required.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: typeof window !== "undefined" ? window.location.href : "/",
      },
      // Twitter Card tags
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "PDF to Image Converter - Convert PDFs to High-Quality Images",
      },
      {
        name: "twitter:description",
        content:
          "Convert PDF pages to PNG, JPEG, or WEBP images directly in your browser. Private, secure, and no file uploads required.",
      },
      {
        title: "PDF to Image Converter - Convert PDFs to High-Quality Images",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "canonical",
        href: typeof window !== "undefined" ? window.location.href : "/",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "PDF to Image Converter",
          description:
            "Convert PDF pages to high-quality PNG, JPEG, or WEBP images directly in your browser",
          url: typeof window !== "undefined" ? window.location.href : "/",
          applicationCategory: "Utility",
          operatingSystem: "Web Browser",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          featureList: [
            "Convert PDF to PNG",
            "Convert PDF to JPEG",
            "Convert PDF to WEBP",
            "High-quality scaling",
            "Private processing",
            "No file uploads",
          ],
        }),
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <Scripts />
      </body>
    </html>
  );
}
