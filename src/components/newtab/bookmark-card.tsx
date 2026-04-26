import { Globe } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getBookmarkIconSources } from "../../lib/favicon";
import type { Bookmark } from "../../types/models";
import { EditDeleteMenu } from "./edit-delete-menu";
import { PanelCardShell } from "./panel-card-shell";

type BookmarkCardProps = {
  bookmark: Bookmark;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  dragging?: boolean;
  placeholder?: boolean;
};

export function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  onOpen,
  dragging = false,
  placeholder = false
}: BookmarkCardProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { customIcon, autoIcon } = useMemo(
    () => getBookmarkIconSources(bookmark),
    [bookmark]
  );
  const [currentIcon, setCurrentIcon] = useState<string | null>(customIcon || autoIcon || null);
  const [iconLoaded, setIconLoaded] = useState(false);
  const [triedAutoIcon, setTriedAutoIcon] = useState(!customIcon);
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => {
    setCurrentIcon(customIcon || autoIcon || null);
    setIconLoaded(false);
    setTriedAutoIcon(!customIcon);
    setIconFailed(false);
  }, [autoIcon, customIcon, bookmark.id, bookmark.icon, bookmark.url]);

  useEffect(() => {
    const image = imageRef.current;
    if (!currentIcon || !image) {
      return;
    }

    if (image.complete && image.naturalWidth > 0) {
      setIconLoaded(true);
      setIconFailed(false);
    }
  }, [currentIcon, bookmark.order, bookmark.categoryId]);

  const shouldShowFallbackIcon = !placeholder && iconFailed && !currentIcon;

  return (
    <PanelCardShell
      className="gap-3 py-0"
      placeholder={placeholder}
      dragging={dragging}
      onClick={onOpen}
    >
      <div
        className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
          placeholder ? "opacity-0" : ""
        }`}
      >
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-md bg-muted text-muted-foreground transition-opacity ${
            shouldShowFallbackIcon ? "opacity-100" : "opacity-0"
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
        </div>
        {currentIcon ? (
          <img
            ref={imageRef}
            key={currentIcon}
            src={currentIcon}
            alt=""
            className={`relative z-10 h-6 w-6 rounded-md bg-card transition-opacity ${
              iconLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => {
              setIconLoaded(true);
              setIconFailed(false);
            }}
            onError={() => {
              if (!triedAutoIcon && autoIcon) {
                setCurrentIcon(autoIcon);
                setTriedAutoIcon(true);
                setIconLoaded(false);
                return;
              }

              setCurrentIcon(null);
              setIconLoaded(false);
              setIconFailed(true);
            }}
          />
        ) : null}
      </div>
      <div className={`flex h-9 min-w-0 flex-1 items-center ${placeholder ? "opacity-0" : ""}`}>
        <div className="truncate text-sm font-medium leading-none">{bookmark.title}</div>
      </div>
      <EditDeleteMenu
        hidden={placeholder}
        onTriggerPointerDown={(event) => event.stopPropagation()}
        onTriggerClick={(event) => event.stopPropagation()}
        onContentClick={(event) => event.stopPropagation()}
        onEdit={() => onEdit()}
        onDelete={() => onDelete()}
      />
    </PanelCardShell>
  );
}
