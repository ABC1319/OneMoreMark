import type { AppState } from "../types/models";

export const mockState: AppState = {
  sidebarCollapsed: false,
  categories: [
    { id: "c1", name: "设计灵感", order: 0 },
    { id: "c2", name: "开发工具", order: 1 },
    { id: "c3", name: "素材资源", order: 2 }
  ],
  bookmarks: [
    {
      id: "b1",
      title: "Dribbble",
      url: "https://dribbble.com",
      icon: "https://dribbble.com/favicon.ico",
      categoryId: "c1",
      order: 0
    },
    {
      id: "b2",
      title: "Mobbin",
      url: "https://mobbin.com",
      icon: "https://mobbin.com/favicon.ico",
      categoryId: "c1",
      order: 1
    },
    {
      id: "b3",
      title: "Vite",
      url: "https://vite.dev",
      icon: "https://vite.dev/favicon.ico",
      categoryId: "c2",
      order: 0
    },
    {
      id: "b4",
      title: "Shadcn UI",
      url: "https://ui.shadcn.com",
      icon: "https://ui.shadcn.com/favicon.ico",
      categoryId: "c2",
      order: 1
    }
  ]
};
