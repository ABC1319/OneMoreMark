export type TabInfo = {
  title: string;
  url: string;
  icon: string;
};

export type SavableTabInfo = TabInfo & {
  id: number;
};

export function isBookmarkableUrl(url: string) {
  return /^(https?:)\/\//i.test(url.trim());
}

export async function getActiveTabInfo(): Promise<TabInfo | null> {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    return null;
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.url || !isBookmarkableUrl(tab.url)) {
    return null;
  }

  return {
    title: tab.title?.trim() || tab.url,
    url: tab.url,
    icon: tab.favIconUrl ?? ""
  };
}

export async function getSavableCurrentWindowTabs(): Promise<SavableTabInfo[]> {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    return [];
  }

  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs
    .filter(
      (tab): tab is chrome.tabs.Tab & { id: number; url: string } =>
        typeof tab.id === "number" &&
        typeof tab.url === "string" &&
        isBookmarkableUrl(tab.url)
    )
    .map((tab) => ({
      id: tab.id,
      title: tab.title?.trim() || tab.url,
      url: tab.url,
      icon: tab.favIconUrl ?? ""
    }));
}

export async function closeTabs(tabIds: number[]) {
  if (typeof chrome === "undefined" || !chrome.tabs?.remove || tabIds.length === 0) {
    return;
  }

  await chrome.tabs.remove(tabIds);
}

export async function openOneMoreMarkTab() {
  if (typeof chrome === "undefined" || !chrome.tabs?.create) {
    return null;
  }

  return chrome.tabs.create({
    url: "chrome://newtab/",
    active: true
  });
}
