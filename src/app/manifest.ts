import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SOBI CRM",
    short_name: "SOBI CRM",
    description: "The operating system for your business.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f4",
    theme_color: "#1f6e75",
    icons: [
      {
        src: "/Favicon.png",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
