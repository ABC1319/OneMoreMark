import ReactDOM from "react-dom/client";
import { useEffect, useMemo, useState } from "react";

import "../../index.css";
import { PopupPage } from "../../components/popup/popup-page";
import { useAppState } from "../../hooks/use-app-state";
import { I18nProvider } from "../../lib/i18n";
import { syncDocumentTheme } from "../../lib/theme";
import {
  closeTabs,
  getActiveTabInfo,
  getSavableCurrentWindowTabs,
  openTabCardTab,
  type TabInfo
} from "../../services/tabs";

requestAnimationFrame(() => {
  document.documentElement.classList.add("app-ready");
});

function PopupApp() {
  const {
    state,
    filteredCategories,
    addCategory,
    saveBookmarkToCategory,
    saveTabsToTemporaryCategory,
    removeBookmarkByUrl
  } = useAppState();
  const [currentTab, setCurrentTab] = useState<TabInfo | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    void getActiveTabInfo()
      .then(setCurrentTab)
      .catch(() => {
        setCurrentTab(null);
      });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.surface = "popup";
    document.body.dataset.surface = "popup";

    return () => {
      delete document.documentElement.dataset.surface;
      delete document.body.dataset.surface;
    };
  }, []);

  useEffect(() => {
    return syncDocumentTheme(state.themeMode);
  }, [state.themeMode]);

  const categories = useMemo(
    () => [...filteredCategories].sort((a, b) => a.order - b.order),
    [filteredCategories]
  );

  const savedCategoryId = useMemo(() => {
    if (!currentTab) {
      return null;
    }

    return state.bookmarks.find((bookmark) => bookmark.url === currentTab.url)?.categoryId ?? null;
  }, [currentTab, state.bookmarks]);

  function handleAddCategory() {
    setDraftName("");
    setIsCreatingCategory(true);
  }

  function handleCommitCategoryName() {
    const value = draftName.trim();
    if (!value) {
      setIsCreatingCategory(false);
      setDraftName("");
      return;
    }

    addCategory(value);
    setIsCreatingCategory(false);
    setDraftName("");
  }

  function handleCancelCategoryEditing() {
    setIsCreatingCategory(false);
    setDraftName("");
  }

  async function handleSaveAllTabsAndClose() {
    const savableTabs = await getSavableCurrentWindowTabs();
    if (savableTabs.length === 0) {
      return;
    }

    saveTabsToTemporaryCategory(
      savableTabs.map((tab) => ({
        title: tab.title,
        url: tab.url,
        icon: tab.icon
      }))
    );

    await openTabCardTab();
    await closeTabs(savableTabs.map((tab) => tab.id));
  }

  return (
    <I18nProvider localeMode={state.localeMode}>
      <PopupPage
        categories={categories}
        currentTab={currentTab}
        savedCategoryId={savedCategoryId}
        isCreatingCategory={isCreatingCategory}
        draftName={draftName}
        onAddCategory={handleAddCategory}
        onDraftNameChange={setDraftName}
        onCommitCategoryName={handleCommitCategoryName}
        onCancelCategoryEditing={handleCancelCategoryEditing}
        onSaveAllTabsAndClose={handleSaveAllTabsAndClose}
        onSaveToCategory={(categoryId) => {
          if (!currentTab) {
            return;
          }

          if (savedCategoryId === categoryId) {
            removeBookmarkByUrl(currentTab.url);
            return;
          }

          saveBookmarkToCategory({
            title: currentTab.title,
            url: currentTab.url,
            icon: currentTab.icon,
            categoryId
          });
        }}
      />
    </I18nProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<PopupApp />);
