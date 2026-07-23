import type { MetadataRoute } from "next";
import { SITE_CONTENT } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin"] },
    ],
    sitemap: `https://${SITE_CONTENT.domain}/sitemap.xml`,
  };
}
