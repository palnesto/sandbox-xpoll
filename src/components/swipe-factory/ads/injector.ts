import { AdItem, DeckItem } from "./types";

/**
 * Generic ad injector controller.
 * - requestInject(ad): inserts BEFORE the next content item that gets built
 * - getNextAd(): your source (can return null while API is loading -> will skip)
 * - build(): interleave into any item list
 */
export function createAdInjector<T extends { _id: string }>(opts: {
  everyN?: number; // default 3
  getNextAd: () => AdItem | null; // return null => ad not ready => skip
}) {
  const everyN = opts.everyN ?? 3;
  let pending: AdItem | null = null;
  let contentCount = 0;

  return {
    requestInject(ad: AdItem) {
      pending = ad;
    },
    clearPending() {
      pending = null;
    },
    build(items: T[]): DeckItem<T>[] {
      const out: DeckItem<T>[] = [];
      contentCount = 0;

      for (const item of items) {
        // 1) inject-before-next
        if (pending) {
          out.push(pending);
          pending = null;
        }

        out.push(item);
        contentCount++;

        // 2) every N
        if (contentCount % everyN === 0) {
          const ad = opts.getNextAd();
          if (ad) out.push(ad);
        }
      }

      return out;
    },
  };
}
