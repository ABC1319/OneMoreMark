import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "TabCard",
  version: "0.1.0",
  description: "Manage bookmarks in your new tab with categories, cards, and sync",
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
    default_title: "TabCard",
    default_popup: "src/entries/popup/index.html"
  },
  chrome_url_overrides: {
    newtab: "src/entries/newtab/index.html"
  },
  permissions: ["storage", "tabs", "activeTab", "favicon"]
});
