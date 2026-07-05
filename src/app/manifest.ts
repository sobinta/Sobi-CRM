import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coreline",
    short_name: "Coreline",
    description: "The operating system for your business.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f4",
    theme_color: "#1f6e75",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
