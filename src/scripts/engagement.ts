/** Anonymous interactions. This module stays inert until public config is enabled. */
type TurnstileOptions = {
  sitekey: string;
  action: "like" | "comment";
  theme: "light" | "dark";
  size: "flexible" | "compact";
  language: "zh-tw";
  "response-field": boolean;
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
};

type TurnstileApi = {
  ready: (callback: () => void) => void;
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
};

type JsonObject = Record<string, unknown>;
type PublicComment = {
  id: string;
  nickname: string;
  body: string;
  createdAt: string | number;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRESENCE_KEY = "bradlog:engagement:presence:v1";
const REACTION_KEY = "bradlog:engagement:reaction:v1";
const numberFormat = new Intl.NumberFormat("zh-TW");
const dateFormat = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Taipei",
});

let memorySession: { day: string; id: string } | undefined;
let memoryReaction: string | undefined;
let turnstilePromise: Promise<TurnstileApi> | undefined;
let cleanUpPage: (() => void) | undefined;
let initializedRoot: HTMLElement | undefined;
// Preserve server-requested cooldowns across Astro navigation.
const cooldowns = new Map<string, { until: number; status: number }>();
// BFCache retains the actual form node. Keep uncertain submissions tied to it,
// without storing drafts or their contents in localStorage.
const formSubmissions = new WeakMap<
  HTMLFormElement,
  { mutationId: string; fingerprint: string; unconfirmed: boolean }
>();

function getTurnstile(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

function storageRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageWrite(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage restrictions do not prevent participation within this tab.
  }
}

function sessionId(): string {
  const day = new Date().toISOString().slice(0, 10);
  try {
    const saved: unknown = JSON.parse(storageRead(PRESENCE_KEY) ?? "null");
    if (
      isObject(saved) &&
      saved.day === day &&
      typeof saved.id === "string" &&
      UUID.test(saved.id)
    ) {
      memorySession = { day, id: saved.id };
      return saved.id;
    }
  } catch {
    // Replace malformed or expired identifiers without retaining history.
  }
  if (memorySession?.day !== day)
    memorySession = { day, id: crypto.randomUUID() };
  storageWrite(PRESENCE_KEY, JSON.stringify(memorySession));
  return memorySession.id;
}

function reactionId(persist = false): string {
  const saved = storageRead(REACTION_KEY);
  if (saved && UUID.test(saved)) memoryReaction = saved;
  memoryReaction ??= crypto.randomUUID();
  // An enduring reaction identifier is created only on an explicit like action.
  if (persist) storageWrite(REACTION_KEY, memoryReaction);
  return memoryReaction;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function privacySignal(): boolean {
  return (
    navigator.doNotTrack === "1" ||
    navigator.doNotTrack === "yes" ||
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly retryAt = 0
  ) {
    super("Interaction request failed");
  }
}

function assertAvailable(path: string): void {
  const cooldown = cooldowns.get(path);
  if (cooldown && cooldown.until > Date.now())
    throw new ApiError(cooldown.status, cooldown.until);
  cooldowns.delete(path);
}

function retryAt(response: Response): number {
  const header = response.headers.get("Retry-After");
  const seconds = header === null ? Number.NaN : Number(header);
  const date = header === null ? Number.NaN : Date.parse(header);
  const delay =
    Number.isFinite(seconds) && seconds >= 0
      ? seconds * 1000
      : Number.isFinite(date)
        ? Math.max(0, date - Date.now())
        : response.status === 503
          ? 300_000
          : 60_000;
  return Date.now() + delay;
}

function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "操作較頻繁，請稍候再試。";
    if (error.status === 403) return "驗證未通過，請重新驗證後再試。";
    if (error.status === 413) return "內容太長，請縮短後再試。";
    if (error.status === 503)
      return "互動服務暫時無法使用，文章仍可正常閱讀。請稍後再試。";
  }
  return fallback;
}

/** Load the third-party script only after an explicit interaction. */
function loadTurnstile(): Promise<TurnstileApi> {
  const loaded = getTurnstile();
  if (loaded) return Promise.resolve(loaded);
  if (turnstilePromise) return turnstilePromise;
  turnstilePromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    let finished = false;
    const finish = (api?: TurnstileApi) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (api) resolve(api);
      else {
        script.remove();
        turnstilePromise = undefined;
        reject(new Error("Verification unavailable"));
      }
    };
    const timeout = window.setTimeout(() => finish(), 15_000);
    script.addEventListener("load", () => {
      const api = getTurnstile();
      if (!api) finish();
      else api.ready(() => finish(api));
    });
    script.addEventListener("error", () => finish());
    document.head.append(script);
  });
  return turnstilePromise;
}

function initEngagement(): void {
  const root = document.querySelector<HTMLElement>("[data-engagement-config]");
  if (root && root === initializedRoot) return;
  cleanUpPage?.();
  cleanUpPage = undefined;
  initializedRoot = root ?? undefined;
  if (!root) return;

  const apiBase = root.dataset.apiBase ?? "";
  const siteKey = root.dataset.siteKey ?? "";
  const pageId = root.dataset.pageId ?? "";
  if (!apiBase || !siteKey || !pageId || /\/404(?:\.html)?\/?$/.test(pageId))
    return;

  const page = new AbortController();
  const alive = () => !page.signal.aborted && root.isConnected;
  const statGroups = Array.from(
    document.querySelectorAll<HTMLElement>("[data-stats-group]")
  );
  for (const group of statGroups) {
    group.setAttribute("aria-busy", "true");
    group.querySelectorAll<HTMLElement>("[data-stat]").forEach(element => {
      element.textContent = "—";
    });
    const status = group.querySelector<HTMLElement>("[data-stats-status]");
    if (status) status.textContent = "正在讀取統計";
  }
  const widgets = new Set<string>();
  const cleanupTasks: Array<() => void> = [];
  let pulseBusy = false;
  let nextPulseAt = 0;
  let viewRecorded = false;
  const viewId = crypto.randomUUID();

  async function request(
    path: string,
    options: {
      method?: "GET" | "POST" | "PUT";
      body?: JsonObject;
      query?: Record<string, string>;
    } = {}
  ): Promise<JsonObject> {
    assertAvailable(path);
    const url = new URL(apiBase + path);
    for (const [key, value] of Object.entries(options.query ?? {}))
      url.searchParams.set(key, value);
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (page.signal.aborted) controller.abort();
    else page.signal.addEventListener("abort", abort, { once: true });
    const timeout = window.setTimeout(abort, 10_000);
    try {
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers: options.body
          ? { Accept: "application/json", "Content-Type": "application/json" }
          : { Accept: "application/json" },
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        const until =
          response.status === 429 || response.status === 503
            ? retryAt(response)
            : 0;
        if (until) cooldowns.set(path, { until, status: response.status });
        throw new ApiError(response.status, until);
      }
      const data: unknown = await response.json();
      if (!isObject(data)) throw new Error("Invalid response");
      cooldowns.delete(path);
      return data;
    } finally {
      clearTimeout(timeout);
      page.signal.removeEventListener("abort", abort);
    }
  }

  function setStats(data?: JsonObject): void {
    for (const group of statGroups) {
      group.setAttribute("aria-busy", "false");
      group.querySelectorAll<HTMLElement>("[data-stat]").forEach(element => {
        const count = data?.[element.dataset.stat ?? ""];
        element.textContent = validCount(count)
          ? numberFormat.format(count)
          : "—";
      });
      const note = group.querySelector<HTMLElement>("[data-stats-status]");
      if (note) {
        if (!data) note.textContent = "統計暫時無法取得";
        else {
          const date =
            typeof data.asOf === "string" || typeof data.asOf === "number"
              ? new Date(data.asOf)
              : null;
          const updated =
            date && !Number.isNaN(date.getTime())
              ? `更新於 ${dateFormat.format(date)}`
              : "活躍數為短期匿名連線估計";
          note.textContent = privacySignal()
            ? `${updated}；已依瀏覽器隱私偏好停止自動回報。`
            : updated;
        }
      }
    }
  }

  async function refreshStats(): Promise<void> {
    if (!alive()) return;
    try {
      const data = await request("/v1/stats", { query: { pageId } });
      for (const key of [
        "pageVisits",
        "siteVisits",
        "pageActive",
        "siteActive",
      ])
        if (data[key] !== null && !validCount(data[key]))
          throw new Error("Invalid statistics response");
      if (alive()) setStats(data);
    } catch (error) {
      if (error instanceof ApiError && error.retryAt)
        nextPulseAt = Math.max(nextPulseAt, error.retryAt);
      if (alive()) setStats();
    }
  }

  async function pulseAndRefresh(): Promise<void> {
    if (
      !alive() ||
      pulseBusy ||
      document.visibilityState !== "visible" ||
      Date.now() < nextPulseAt
    )
      return;
    pulseBusy = true;
    nextPulseAt = Date.now() + 60_000;
    try {
      if (!privacySignal()) {
        try {
          await request("/v1/pulse", {
            method: "POST",
            body: {
              pageId,
              sessionId: sessionId(),
              ...(viewRecorded ? {} : { viewId }),
              visible: true,
            },
          });
          viewRecorded = true;
        } catch (error) {
          // A failed pulse never blocks reading statistics or the article.
          if (error instanceof ApiError && error.retryAt)
            nextPulseAt = Math.max(nextPulseAt, error.retryAt);
        }
      }
      await refreshStats();
    } finally {
      pulseBusy = false;
    }
  }

  /** One challenge instance per action. Fresh tokens are required after each use. */
  function challenge(action: "like" | "comment", container: HTMLElement) {
    let widgetId: string | undefined;
    let generation = 0;
    let cancelPending: (() => void) | undefined;
    function clear(): void {
      generation++;
      cancelPending?.();
      cancelPending = undefined;
      if (widgetId) {
        try {
          getTurnstile()?.remove(widgetId);
        } catch {
          /* Already removed. */
        }
        widgets.delete(widgetId);
        widgetId = undefined;
      }
      container.replaceChildren();
      container.hidden = true;
    }
    cleanupTasks.push(clear);
    async function verify(onExpire?: () => void): Promise<string> {
      clear();
      const current = generation;
      container.hidden = false;
      const api = await loadTurnstile();
      if (!alive() || current !== generation)
        throw new Error("Verification cancelled");
      return new Promise<string>((resolve, reject) => {
        let settled = false;
        const finish = (token?: string) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          cancelPending = undefined;
          if (token && alive() && generation === current) resolve(token);
          else reject(new Error("Verification incomplete"));
        };
        const timeout = window.setTimeout(() => finish(), 180_000);
        cancelPending = () => finish();
        try {
          widgetId = api.render(container, {
            sitekey: siteKey,
            action,
            theme:
              document.documentElement.dataset.theme === "dark"
                ? "dark"
                : "light",
            size: container.clientWidth < 300 ? "compact" : "flexible",
            language: "zh-tw",
            "response-field": false,
            callback: token => finish(token),
            "error-callback": () => finish(),
            "timeout-callback": () => finish(),
            "expired-callback": () => {
              if (alive() && generation === current) onExpire?.();
              finish();
            },
          });
          widgets.add(widgetId);
        } catch {
          finish();
        }
      });
    }
    return { verify, clear };
  }

  const article = document.querySelector<HTMLElement>(
    "[data-article-engagement]"
  );
  const articleId = article?.dataset.articleId;
  if (article && articleId) {
    const likeButton =
      article.querySelector<HTMLButtonElement>("[data-like-button]")!;
    const likeLabel = article.querySelector<HTMLElement>("[data-like-label]")!;
    const likeCount = article.querySelector<HTMLElement>("[data-like-count]")!;
    const likeStatus =
      article.querySelector<HTMLElement>("[data-like-status]")!;
    const likeRetry =
      article.querySelector<HTMLButtonElement>("[data-like-retry]")!;
    const likeChallenge = challenge(
      "like",
      article.querySelector<HTMLElement>("[data-like-challenge]")!
    );
    let liked = false;
    let likeBusy = false;
    likeChallenge.clear();
    likeButton.disabled = true;
    likeButton.setAttribute("aria-busy", "false");
    likeButton.setAttribute("aria-pressed", "false");
    likeLabel.textContent = "對我有幫助";
    likeCount.textContent = "—";
    likeStatus.textContent = "正在讀取回應…";
    likeRetry.disabled = false;
    likeRetry.hidden = true;

    function showReaction(data: JsonObject): void {
      if (!validCount(data.likes) || typeof data.liked !== "boolean")
        throw new Error("Invalid reaction response");
      liked = data.liked;
      likeCount.textContent = numberFormat.format(data.likes);
      likeButton.setAttribute("aria-pressed", String(liked));
      likeLabel.textContent = liked ? "已覺得有幫助" : "對我有幫助";
      likeButton.disabled = false;
      likeRetry.hidden = true;
    }
    async function loadReaction(): Promise<void> {
      if (likeBusy || !alive()) return;
      likeBusy = true;
      likeButton.disabled = true;
      likeRetry.disabled = true;
      try {
        const data = await request("/v1/reaction", {
          query: { articleId: articleId!, visitorToken: reactionId() },
        });
        if (!alive()) return;
        showReaction(data);
        likeStatus.textContent = "";
      } catch (error) {
        if (alive()) {
          likeStatus.textContent = friendlyError(
            error,
            "回應暫時無法讀取，請稍後再試。"
          );
          likeRetry.hidden = false;
        }
      } finally {
        likeBusy = false;
        if (alive()) likeRetry.disabled = false;
      }
    }
    likeRetry.addEventListener("click", () => void loadReaction(), {
      signal: page.signal,
    });
    likeButton.addEventListener(
      "click",
      async () => {
        if (likeBusy) return;
        likeBusy = true;
        likeButton.disabled = true;
        likeButton.setAttribute("aria-busy", "true");
        likeStatus.textContent = "正在驗證，完成後會送出你的回應。";
        try {
          assertAvailable("/v1/reaction");
          const turnstileToken = await likeChallenge.verify();
          if (!alive()) return;
          likeStatus.textContent = "正在送出回應…";
          const data = await request("/v1/reaction", {
            method: "PUT",
            body: {
              articleId,
              visitorToken: reactionId(true),
              liked: !liked,
              turnstileToken,
            },
          });
          if (!alive()) return;
          showReaction(data);
          likeStatus.textContent = liked
            ? "已記下你的回應，謝謝！"
            : "已取消回應。";
        } catch (error) {
          if (alive())
            likeStatus.textContent = friendlyError(
              error,
              "未能完成驗證或送出回應，請再按一次重試。"
            );
        } finally {
          likeBusy = false;
          if (alive()) {
            likeChallenge.clear();
            likeButton.disabled = false;
            likeButton.setAttribute("aria-busy", "false");
          }
        }
      },
      { signal: page.signal }
    );

    const commentsRegion = article.querySelector<HTMLElement>(
      "[data-comments-region]"
    )!;
    const commentsList = article.querySelector<HTMLOListElement>(
      "[data-comments-list]"
    )!;
    const commentsStatus = article.querySelector<HTMLElement>(
      "[data-comments-status]"
    )!;
    const commentsMore = article.querySelector<HTMLButtonElement>(
      "[data-comments-more]"
    )!;
    const commentsRetry = article.querySelector<HTMLButtonElement>(
      "[data-comments-retry]"
    )!;
    const seenComments = new Set<string>();
    let nextCursor: string | undefined;
    let commentsBusy = false;
    // A BFCache restore reuses this DOM. Replace the old snapshot before a fresh
    // first-page fetch so duplicates and subsequently removed comments disappear.
    commentsList.replaceChildren();
    commentsRegion.setAttribute("aria-busy", "true");
    commentsStatus.textContent = "正在讀取留言";
    commentsMore.hidden = true;
    commentsMore.disabled = false;
    commentsRetry.hidden = true;
    commentsRetry.disabled = false;

    function appendComment(comment: PublicComment): void {
      if (seenComments.has(comment.id)) return;
      seenComments.add(comment.id);
      const item = document.createElement("li");
      item.className = "engagement-comment";
      const heading = document.createElement("div");
      heading.className = "engagement-comment-heading";
      const nickname = document.createElement("h3");
      nickname.textContent = comment.nickname || "訪客";
      const time = document.createElement("time");
      const date = new Date(
        typeof comment.createdAt === "number" && comment.createdAt < 1e12
          ? comment.createdAt * 1000
          : comment.createdAt
      );
      if (!Number.isNaN(date.getTime())) {
        time.dateTime = date.toISOString();
        time.textContent = dateFormat.format(date);
      } else time.textContent = "發佈時間暫缺";
      const body = document.createElement("p");
      body.className = "engagement-comment-body";
      body.textContent = comment.body;
      heading.append(nickname, time);
      item.append(heading, body);
      commentsList.append(item);
    }
    async function loadComments(): Promise<void> {
      if (commentsBusy || !alive()) return;
      commentsBusy = true;
      commentsRegion.setAttribute("aria-busy", "true");
      commentsMore.disabled = true;
      commentsRetry.disabled = true;
      try {
        const data = await request("/v1/comments", {
          query: {
            articleId: articleId!,
            ...(nextCursor ? { cursor: nextCursor } : {}),
          },
        });
        if (!alive()) return;
        if (!Array.isArray(data.comments) || data.comments.length > 100)
          throw new Error("Invalid comments response");
        for (const comment of data.comments) {
          if (
            !isObject(comment) ||
            typeof comment.id !== "string" ||
            typeof comment.nickname !== "string" ||
            typeof comment.body !== "string" ||
            !(
              typeof comment.createdAt === "string" ||
              typeof comment.createdAt === "number"
            )
          )
            throw new Error("Invalid comment");
          appendComment(comment as PublicComment);
        }
        nextCursor =
          typeof data.nextCursor === "string" && data.nextCursor
            ? data.nextCursor
            : undefined;
        commentsMore.hidden = !nextCursor;
        commentsRetry.hidden = true;
        commentsStatus.textContent =
          seenComments.size === 0
            ? "還沒有公開留言。歡迎分享你的第一個想法。"
            : "已審核的留言";
      } catch (error) {
        if (alive()) {
          commentsStatus.textContent = friendlyError(
            error,
            seenComments.size
              ? "其他留言暫時無法載入，已顯示的留言仍可閱讀。"
              : "留言暫時無法載入。"
          );
          commentsRetry.hidden = false;
        }
      } finally {
        commentsBusy = false;
        if (alive()) {
          commentsRegion.setAttribute("aria-busy", "false");
          commentsMore.disabled = false;
          commentsRetry.disabled = false;
        }
      }
    }
    commentsMore.addEventListener("click", () => void loadComments(), {
      signal: page.signal,
    });
    commentsRetry.addEventListener("click", () => void loadComments(), {
      signal: page.signal,
    });

    const openButton = article.querySelector<HTMLButtonElement>(
      "[data-comment-open]"
    )!;
    const form = article.querySelector<HTMLFormElement>("[data-comment-form]")!;
    const nicknameInput = form.elements.namedItem(
      "nickname"
    ) as HTMLInputElement;
    const bodyInput = form.elements.namedItem("body") as HTMLTextAreaElement;
    const websiteInput = form.elements.namedItem("website") as HTMLInputElement;
    const length = form.querySelector<HTMLElement>("[data-comment-length]")!;
    const submitButton = form.querySelector<HTMLButtonElement>(
      "[data-comment-submit]"
    )!;
    const submitStatus = article.querySelector<HTMLElement>(
      "[data-comment-status]"
    )!;
    const verificationStatus = form.querySelector<HTMLElement>(
      "[data-verification-status]"
    )!;
    const verifyRetry = form.querySelector<HTMLButtonElement>(
      "[data-comment-verify-retry]"
    )!;
    const commentChallenge = challenge(
      "comment",
      form.querySelector<HTMLElement>("[data-comment-challenge]")!
    );
    let commentToken = "";
    let commentBusy = false;
    let verifying = false;
    let verificationGeneration = 0;
    const submission = formSubmissions.get(form) ?? {
      mutationId: crypto.randomUUID(),
      fingerprint: "",
      unconfirmed: false,
    };
    formSubmissions.set(form, submission);
    // Reset transient controls after pagehide/BFCache while preserving the
    // visitor's in-memory draft and the idempotency key of an uncertain POST.
    commentChallenge.clear();
    form.setAttribute("aria-busy", "false");
    nicknameInput.disabled = false;
    bodyInput.disabled = false;
    websiteInput.disabled = false;
    bodyInput.setCustomValidity("");
    submitButton.disabled = true;
    verifyRetry.disabled = false;
    verifyRetry.hidden = form.hidden;
    length.textContent = `${numberFormat.format(bodyInput.value.length)} / 2,000 字`;
    verificationStatus.textContent = form.hidden
      ? ""
      : "請重新完成驗證後再送出留言。";
    submitStatus.textContent = submission.unconfirmed
      ? "上次送出結果尚未確認。請先確認保留的內容，重新驗證後再試。"
      : "";
    openButton.setAttribute("aria-expanded", String(!form.hidden));
    openButton.textContent = form.hidden ? "寫下留言" : "收起表單";

    async function verifyComment(): Promise<void> {
      if (verifying || commentBusy || form.hidden || !alive()) return;
      const currentVerification = ++verificationGeneration;
      verifying = true;
      commentToken = "";
      submitButton.disabled = true;
      verifyRetry.hidden = true;
      verificationStatus.textContent = "正在載入防垃圾留言驗證…";
      try {
        assertAvailable("/v1/comments");
        const token = await commentChallenge.verify(() => {
          if (currentVerification !== verificationGeneration) return;
          commentToken = "";
          submitButton.disabled = true;
          verifyRetry.hidden = false;
          verificationStatus.textContent = "驗證已過期，請重新驗證。";
        });
        if (
          !alive() ||
          form.hidden ||
          currentVerification !== verificationGeneration
        )
          return;
        commentToken = token;
        submitButton.disabled = false;
        verificationStatus.textContent = "驗證完成，可以送出留言。";
      } catch (error) {
        if (
          alive() &&
          !form.hidden &&
          currentVerification === verificationGeneration
        ) {
          verificationStatus.textContent = friendlyError(
            error,
            "驗證暫時無法完成，請重試。"
          );
          verifyRetry.hidden = false;
        }
      } finally {
        if (currentVerification === verificationGeneration) verifying = false;
      }
    }

    function invalidateCommentVerification(message = ""): void {
      verificationGeneration++;
      verifying = false;
      commentToken = "";
      submitButton.disabled = true;
      commentChallenge.clear();
      if (!form.hidden && message) {
        verificationStatus.textContent = message;
        verifyRetry.hidden = false;
      }
    }

    let currentTheme = document.documentElement.dataset.theme;
    const themeObserver = new MutationObserver(() => {
      const nextTheme = document.documentElement.dataset.theme;
      if (nextTheme === currentTheme) return;
      currentTheme = nextTheme;
      if (!form.hidden && !commentBusy)
        invalidateCommentVerification("顯示模式已切換，請重新完成驗證。");
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    cleanupTasks.push(() => themeObserver.disconnect());

    openButton.disabled = false;
    openButton.addEventListener(
      "click",
      () => {
        if (commentBusy) return;
        form.hidden = !form.hidden;
        openButton.setAttribute("aria-expanded", String(!form.hidden));
        openButton.textContent = form.hidden ? "寫下留言" : "收起表單";
        if (form.hidden) {
          invalidateCommentVerification();
        } else {
          nicknameInput.focus();
          void verifyComment();
        }
      },
      { signal: page.signal }
    );
    verifyRetry.addEventListener("click", () => void verifyComment(), {
      signal: page.signal,
    });
    bodyInput.addEventListener(
      "input",
      () => {
        length.textContent = `${numberFormat.format(bodyInput.value.length)} / 2,000 字`;
        bodyInput.setCustomValidity("");
      },
      { signal: page.signal }
    );

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();
        if (commentBusy || !form.reportValidity()) return;
        const nickname = nicknameInput.value.trim();
        const body = bodyInput.value.trim();
        if (body.length < 2 || body.length > 2000) {
          bodyInput.setCustomValidity("請輸入 2 到 2,000 字的留言內容。");
          bodyInput.reportValidity();
          return;
        }
        if (nickname.length > 32) return;
        if (!commentToken) {
          void verifyComment();
          return;
        }
        const fingerprint = JSON.stringify({ articleId, nickname, body });
        if (fingerprint !== submission.fingerprint)
          submission.mutationId = crypto.randomUUID();
        submission.fingerprint = fingerprint;
        submission.unconfirmed = true;
        const turnstileToken = commentToken;
        commentToken = "";
        commentChallenge.clear();
        commentBusy = true;
        submitButton.disabled = true;
        openButton.disabled = true;
        nicknameInput.disabled = true;
        bodyInput.disabled = true;
        form.setAttribute("aria-busy", "true");
        submitStatus.textContent = "正在送出留言…";
        verificationStatus.textContent = "";
        try {
          const data = await request("/v1/comments", {
            method: "POST",
            body: {
              articleId,
              clientMutationId: submission.mutationId,
              nickname,
              body,
              turnstileToken,
              website: websiteInput.value,
            },
          });
          if (!alive()) return;
          if (data.status !== "pending")
            throw new Error("Unexpected submission status");
          form.reset();
          length.textContent = "0 / 2,000 字";
          form.hidden = true;
          openButton.setAttribute("aria-expanded", "false");
          openButton.textContent = "再寫一則留言";
          submission.mutationId = crypto.randomUUID();
          submission.fingerprint = "";
          submission.unconfirmed = false;
          submitStatus.textContent =
            "已收到你的留言！由 Brad 審核通過後，會出現在這裡。";
        } catch (error) {
          if (alive()) {
            submitStatus.textContent = friendlyError(
              error,
              "尚未確認送出結果，內容已保留。請重新驗證後再試。"
            );
            verifyRetry.hidden = false;
            verificationStatus.textContent = "重新送出前，請再完成一次驗證。";
          }
        } finally {
          commentBusy = false;
          if (alive()) {
            openButton.disabled = false;
            nicknameInput.disabled = false;
            bodyInput.disabled = false;
            form.setAttribute("aria-busy", "false");
            if (form.hidden) openButton.focus();
          }
        }
      },
      { signal: page.signal }
    );

    void loadReaction();
    void loadComments();
  }

  const timer = window.setInterval(() => void pulseAndRefresh(), 60_000);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "visible") void pulseAndRefresh();
    },
    { signal: page.signal }
  );
  if (document.visibilityState === "visible") void pulseAndRefresh();
  else void refreshStats();

  cleanUpPage = () => {
    page.abort();
    clearInterval(timer);
    for (const cleanup of cleanupTasks) cleanup();
    for (const widget of widgets) {
      try {
        getTurnstile()?.remove(widget);
      } catch {
        /* Already removed. */
      }
    }
    widgets.clear();
    initializedRoot = undefined;
  };
}

initEngagement();
document.addEventListener("astro:page-load", initEngagement);
document.addEventListener("astro:before-swap", () => {
  cleanUpPage?.();
  cleanUpPage = undefined;
});
window.addEventListener("pagehide", () => {
  cleanUpPage?.();
  cleanUpPage = undefined;
});
window.addEventListener("pageshow", event => {
  if (event.persisted) initEngagement();
});
