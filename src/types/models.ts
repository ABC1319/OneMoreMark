export type Category = {
  id: string;
  name: string;
  order: number;
};

export type Bookmark = {
  id: string;
  title: string;
  url: string;
  icon: string;
  categoryId: string;
  order: number;
};

export type AppState = {
  sidebarCollapsed: boolean;
  categories: Category[];
  bookmarks: Bookmark[];
};
