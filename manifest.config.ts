import { defineManifest } from "@crxjs/vite-plugin";

function getFeaturedLinkConfigHostPermission() {
  const configUrl = process.env.VITE_FEATURED_LINK_CONFIG_URL;
  if (!configUrl) {
    return [];
  }

  try {
    return [`${new URL(configUrl).origin}/*`];
  } catch {
    return [];
  }
}

export default defineManifest(({ command }) => ({
  manifest_version: 3,
  name: "OneMoreMark - New Tab Bookmark Manager",
  version: "0.2.1",
  description:
    "Turn your new tab into a clean visual bookmark dashboard with categories, cards, import/export, and Chrome sync.",
  icons: {
    16: "src/assets/icons/icon-16.png",
    32: "src/assets/icons/icon-32.png",
    48: "src/assets/icons/icon-48.png",
    128: "src/assets/icons/icon-128.png"
  },
  action: {
    default_icon: {
      16: "src/assets/icons/icon-16.png",
      32: "src/assets/icons/icon-32.png"
    },
    default_title: "OneMoreMark",
    default_popup: "src/entries/popup/index.html"
  },
  chrome_url_overrides: {
    newtab: "src/entries/newtab/index.html"
  },
  permissions: ["storage", "tabs", "activeTab", "favicon"],
  host_permissions: [
    ...getFeaturedLinkConfigHostPermission(),
    "https://*.pages.dev/*",
    ...(command === "serve" ? ["http://localhost/*", "http://127.0.0.1/*"] : [])
  ]
}));
