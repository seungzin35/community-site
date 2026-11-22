import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** 검색엔진에게 어디를 읽어 가도 되는지 알려 줍니다. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/auth", "/login", "/signup", "/*/write", "/*/edit"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
