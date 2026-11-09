/** Public connection settings only. Never put a secret or admin token here. */
export const engagementConfig = {
  enabled: false,
  apiBase: "",
  turnstileSiteKey: "",
};

/** Keep the public site inert until every required service has been configured. */
export function isEngagementEnabled(): boolean {
  if (!engagementConfig.enabled || !engagementConfig.turnstileSiteKey.trim())
    return false;
  try {
    const endpoint = new URL(engagementConfig.apiBase);
    return (
      endpoint.protocol === "https:" &&
      !endpoint.username &&
      !endpoint.password &&
      !endpoint.search &&
      !endpoint.hash
    );
  } catch {
    return false;
  }
}
