import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://bradcocox.github.io",
    title: "Brad.log",
    description: "Brad 的工程筆記：記錄技術學習、實作與排錯，讓每一步都有跡可循。",
    author: "Brad",
    profile: "https://github.com/bradcocox",
    ogImage: "brad-log-og.png",
    lang: "zh-TW",
    timezone: "Asia/Taipei",
    dir: "ltr",
  },
  posts: {
    perPage: 8,
    perIndex: 4,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/bradcocox/brad-log/blob/main/",
    },
    search: "pagefind",
    toc: true,
  },
  socials: [
    { name: "github", url: "https://github.com/bradcocox/brad-log", linkTitle: "Brad.log 的公開原始碼" },
  ],
  shareLinks: [],
});
