import ReactDOM from "react-dom/client";

import "../../index.css";
import { PopupPage } from "../../components/popup/popup-page";
import { useAppState } from "../../hooks/use-app-state";

function PopupApp() {
  const { state, filteredCategories, addCategory } = useAppState();

  if (!state) {
    return null;
  }

  const categories = [...filteredCategories].sort((a, b) => b.order - a.order);

  return <PopupPage categories={categories} onAddCategory={addCategory} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<PopupApp />);
