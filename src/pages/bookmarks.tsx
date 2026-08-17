import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { CampaignCard } from "@/components/commons/campaign-card-variants";
import { CampaignCardModel } from "@/types/campaigns";

type BookmarkEntry = {
  _id: string;
  name: string;
  goal?: string;
  status?: string;
  description?: string;
  externalAuthor?: {
    username?: string;
    avatar?: { imageUrl?: string };
  };
  imageLinks?: string[];
  trailsCompleted?: number;
  trailsTotal?: number;
};

export default function BookmarksPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const pageSize = 20;

  /**
   * ✅ GET bookmarks
   */
  const bookmarksRoute = `${endpoints.campaigns.getBookmarks}?page=${page}&pageSize=${pageSize}`;

  const { data, isLoading, isError } = useApiQuery(bookmarksRoute);

  /**
   * ✅ Optimistic removal map
   */
  const [optimisticRemoved, setOptimisticRemoved] = useState<
    Record<string, boolean>
  >({});

  /**
   * ✅ Pending toggle (route must live in hook config)
   */
  const [pending, setPending] = useState<{
    id: string;
    enabled: boolean;
  } | null>(null);

  const bookmarkRouteForMutation = pending
    ? endpoints.campaigns.createBookmark(pending.id)
    : endpoints.campaigns.createBookmark("noop");

  const { mutate: toggleBookmark, isPending } = useApiMutation({
    method: "POST",
    route: bookmarkRouteForMutation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [endpoints.campaigns.getBookmarks] });
    },
    onSettled: () => {
      setPending(null);
    },
  } as any) as any;

  /**
   * Fire mutation when pending changes
   */
  useEffect(() => {
    if (!pending) return;
    toggleBookmark({ enabled: pending.enabled });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id, pending?.enabled]);

  /**
   * ✅ Debounce per campaign
   */
  const timersRef = useRef<Record<string, number | undefined>>({});

  const onToggleSave = (id: string, next: boolean) => {
    // optimistic remove (hide card instantly)
    setOptimisticRemoved((prev) => ({ ...prev, [id]: true }));

    const existing = timersRef.current[id];
    if (existing) window.clearTimeout(existing);

    timersRef.current[id] = window.setTimeout(() => {
      setPending({ id, enabled: next });
    }, 250);
  };

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => {
        if (t) window.clearTimeout(t);
      });
    };
  }, []);

  /**
   * Map API → cards
   */
  const { cards, totalPages } = useMemo(() => {
    const root = data?.data?.data ?? {};
    const entries: BookmarkEntry[] = Array.isArray(root.entries)
      ? root.entries
      : [];

    const mapped: CampaignCardModel[] = entries
      .filter((e) => !optimisticRemoved[e._id]) // ✅ hide instantly
      .map((e) => ({
        _id: e._id,
        name: e.name,
        goal: e.goal ?? "",
        status: (e.status ?? "live") as any,
        description: e.description ?? "",
        username: e.externalAuthor?.username ?? "",
        avatarUrl: e.externalAuthor?.avatar?.imageUrl ?? "",
        imageLinks: e.imageLinks ?? [],
        earningPotential: [],
        trailsCompleted: (e as any).trailsCompleted ?? null,
        trailsTotal: (e as any).trailsTotal ?? null,
        isSaved: true, // always true in bookmarks page
        locked: false,
      }));

    return {
      cards: mapped,
      totalPages: Number(root.totalPages ?? 1),
    };
  }, [data, optimisticRemoved]);

  return (
    <main className="p-4 md:p-6">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="px-2 border-white border-r-2 border-l-2 rounded-xl bg-[#dbdcdf30] hover:bg-black/5"
        >
          <ArrowLeft />
        </button>
        <h1 className="text-lg xl:text-2xl font-semibold">Bookmarks</h1>
      </header>

      <section className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-black/60">Loading bookmarks…</div>
        ) : isError ? (
          <div className="text-sm text-black/60">Failed to load bookmarks.</div>
        ) : cards.length === 0 ? (
          <div className="text-sm text-black/60">No bookmarked campaigns.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((c) => (
              <CampaignCard
                key={c._id}
                campaign={c}
                variant="lg"
                onClick={() => navigate(`/campaigns/all-campaigns/${c._id}`)}
                onToggleSave={(id) => {
                  if (isPending) return;
                  // ✅ unbookmark
                  onToggleSave(id, false);
                }}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-sm font-medium disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-xs text-black/60">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-sm font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
