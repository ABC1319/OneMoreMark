import type { AppState, Bookmark, Category, ResolvedLocale } from "../types/models";

function getImportText(locale: ResolvedLocale) {
  if (locale === "en") {
    return {
      unnamedCategory: "Unnamed Category",
      uncategorized: "Uncategorized",
      invalidFile: "No valid Chrome bookmarks HTML file was detected."
    };
  }

  return {
    unnamedCategory: "未命名分类",
    uncategorized: "未分类",
    invalidFile: "未识别到有效的 Chrome 书签 HTML 文件。"
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeFolderName(name: string, locale: ResolvedLocale) {
  const text = getImportText(locale);
  const value = name.trim();
  return value || text.unnamedCategory;
}

function uniqueByUrl(items: Bookmark[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) {
      return false;
    }
    seen.add(item.url);
    return true;
  });
}

export function exportBookmarksToHtml(state: AppState) {
  const categories = [...state.categories].sort((a, b) => a.order - b.order);
  const bookmarks = [...state.bookmarks].sort((a, b) => a.order - b.order);

  const body = categories
    .map((category) => {
      const items = bookmarks.filter((bookmark) => bookmark.categoryId === category.id);
      const links = items
        .map(
          (bookmark) =>
            `      <DT><A HREF="${escapeHtml(bookmark.url)}">${escapeHtml(bookmark.title)}</A>\n`
        )
        .join("");

      return [
        `    <DT><H3>${escapeHtml(category.name)}</H3>`,
        "    <DL><p>",
        links,
        "    </DL><p>"
      ].join("\n");
    })
    .join("\n");

  return [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
    body,
    "</DL><p>"
  ].join("\n");
}

export function parseBookmarksFromHtml(html: string, locale: ResolvedLocale = "zh-CN") {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const root = doc.querySelector("dl");
  const text = getImportText(locale);

  if (!root) {
    throw new Error(text.invalidFile);
  }

  const categories: Category[] = [];
  const bookmarks: Bookmark[] = [];

  function ensureCategory(name?: string) {
    const categoryName = sanitizeFolderName(name ?? text.uncategorized, locale);
    let category = categories.find((item) => item.name === categoryName);
    if (!category) {
      category = {
        id: crypto.randomUUID(),
        name: categoryName,
        order: categories.length
      };
      categories.push(category);
    }
    return category;
  }

  function findNestedDl(element: Element) {
    const directNested = Array.from(element.children).find((child) => child.tagName === "DL");
    if (directNested) {
      return directNested;
    }

    const nextSibling = element.nextElementSibling;
    if (nextSibling?.tagName === "DL") {
      return nextSibling;
    }

    return null;
  }

  function walkFolder(dl: Element, folderName?: string) {
    const entries = Array.from(dl.children).filter((child) => child.tagName === "DT");

    for (const entry of entries) {
      const heading = Array.from(entry.children).find((child) => child.tagName === "H3");
      const link = Array.from(entry.children).find((child) => child.tagName === "A");

      if (heading) {
        const nextFolderName = sanitizeFolderName(heading.textContent ?? "", locale);
        const nestedDl = findNestedDl(entry);
        if (nestedDl) {
          walkFolder(nestedDl, nextFolderName);
        } else {
          ensureCategory(nextFolderName);
        }
        continue;
      }

      if (link) {
        const url = link.getAttribute("href") ?? "";
        if (!url) {
          continue;
        }

        const category = ensureCategory(folderName);
        const title = (link.textContent ?? "").trim() || url;

        bookmarks.push({
          id: crypto.randomUUID(),
          title,
          url,
          icon: "",
          categoryId: category.id,
          order: bookmarks.filter((item) => item.categoryId === category.id).length
        });
      }
    }
  }

  walkFolder(root);

  const uniqueBookmarks = uniqueByUrl(bookmarks);
  const dedupedBookmarks = uniqueBookmarks.map((bookmark) => ({
    ...bookmark,
    order: uniqueBookmarks
      .filter((item) => item.categoryId === bookmark.categoryId)
      .findIndex((item) => item.id === bookmark.id)
  }));

  return {
    categories,
    bookmarks: dedupedBookmarks
  };
}

export function mergeImportedBookmarks(
  currentState: AppState,
  imported: ReturnType<typeof parseBookmarksFromHtml>,
  locale: ResolvedLocale = "zh-CN"
): AppState {
  const text = getImportText(locale);
  const nextCategories = [...currentState.categories].sort((a, b) => a.order - b.order);
  const nextBookmarks = [...currentState.bookmarks];

  const categoryIdByName = new Map(
    nextCategories.map((category) => [category.name.trim().toLowerCase(), category.id])
  );
  const bookmarkUrls = new Set(nextBookmarks.map((bookmark) => bookmark.url));

  for (const importedCategory of imported.categories) {
    const key = importedCategory.name.trim().toLowerCase();
    if (!categoryIdByName.has(key)) {
      const newCategory: Category = {
        id: crypto.randomUUID(),
        name: importedCategory.name,
        order: nextCategories.length
      };
      nextCategories.push(newCategory);
      categoryIdByName.set(key, newCategory.id);
    }
  }

  for (const importedBookmark of imported.bookmarks) {
    if (bookmarkUrls.has(importedBookmark.url)) {
      continue;
    }

    const categoryName = imported.categories.find(
      (category) => category.id === importedBookmark.categoryId
    )?.name;
    const categoryId =
      categoryIdByName.get(categoryName?.trim().toLowerCase() ?? "") ??
      categoryIdByName.get(text.uncategorized.toLowerCase());

    if (!categoryId) {
      continue;
    }

    nextBookmarks.push({
      ...importedBookmark,
      id: crypto.randomUUID(),
      categoryId,
      order: nextBookmarks.filter((bookmark) => bookmark.categoryId === categoryId).length
    });
    bookmarkUrls.add(importedBookmark.url);
  }

  return {
    ...currentState,
    categories: nextCategories,
    bookmarks: nextBookmarks
  };
}
