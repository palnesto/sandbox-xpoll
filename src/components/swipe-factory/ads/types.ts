export type AdItem = {
  _id: string;
  kind: "ad";
  title?: string;
  text: string;
  imageUrl?: string | null;
  ctaLabel?: string;
  ctaUrl?: string;
  // optional metadata for analytics later
  meta?: Record<string, unknown>;
};

/** Union wrapper you can reuse across ALL decks */
export type DeckItem<T extends { _id: string }> =
  | (T & { kind?: "poll" | "trial" | "item" }) // keep your existing item type intact
  | AdItem;

export function isAd<T extends { _id: string }>(
  item: DeckItem<T> | null | undefined,
): item is AdItem {
  return !!item && (item as any).kind === "ad";
}

export function isContent<T extends { _id: string }>(
  item: DeckItem<T> | null | undefined,
): item is T {
  return !!item && !isAd(item);
}
