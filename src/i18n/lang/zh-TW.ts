import type { UIStrings } from "../types";

export default {
  nav: { home: "首頁", posts: "所有筆記", tags: "技術標籤", about: "關於 Brad", archives: "學習歷程", search: "搜尋" },
  post: {
    publishedAt: "發布於", updatedAt: "更新於", sharePostIntro: "分享這篇筆記：",
    sharePostOn: "分享到 {{platform}}", sharePostViaEmail: "以電子郵件分享",
    tagLabel: "技術標籤", backToTop: "回到頂端", tableOfContents: "本篇目錄",
    goBack: "返回列表", editPage: "查看文章原始碼", previousPost: "較早的筆記", nextPost: "較新的筆記",
  },
  pagination: { prev: "上一頁", next: "下一頁", page: "頁" },
  home: { socialLinks: "公開連結", featured: "從這裡開始", recentPosts: "最新筆記", allPosts: "瀏覽所有筆記" },
  footer: { copyright: "著作權", allRightsReserved: "文章與原創圖文保留權利。" },
  pages: {
    tagTitle: "標籤", tagDesc: "包含這個技術標籤的筆記：",
    tagsTitle: "技術標籤", tagsDesc: "以工具、語言與技術概念，串起不同領域的筆記。",
    postsTitle: "所有筆記", postsDesc: "從短筆記到完整實作，記錄每一步理解與驗證。",
    archivesTitle: "學習歷程", archivesDesc: "依時間回顧已公開的學習紀錄；內容修訂會保留更新日期。",
    searchTitle: "搜尋筆記", searchDesc: "輸入工具、概念或問題，例如 GitHub、部署或安全。",
  },
  a11y: {
    skipToContent: "跳至主要內容", skipTableOfContents: "跳過目錄", openMenu: "開啟選單",
    closeMenu: "關閉選單", toggleTheme: "切換明暗主題", searchPlaceholder: "搜尋筆記…",
    noResults: "目前沒有符合的筆記", goToPreviousPage: "前往上一頁", goToNextPage: "前往下一頁",
  },
  notFound: { title: "404 找不到頁面", message: "這篇筆記還沒出現在這裡。", goHome: "回到首頁" },
} satisfies UIStrings;
