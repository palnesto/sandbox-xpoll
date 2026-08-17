import { useMemo } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { ArrowRight } from "lucide-react";

type LinkedEntityType = "blog" | "campaign" | "trial" | "poll";
type ForwardLinkItem = {
  _id: string;
  to?: {
    type?: LinkedEntityType;
    id?: string;
    entity?: {
      data?: {
        title?: string;
        name?: string;
        imageUrls?: string[];
        imageLinks?: string[];
        resourceAssets?: Array<{ type: string; value: string }>;
      };
    };
  };
  image?: string;
  thumbnail?: string;
  coverImage?: string;
  title?: string;
  name?: string;
  entityType?: LinkedEntityType;
  toEntityType?: LinkedEntityType;
  entityId?: string;
  toEntityId?: string;
};

const pick = (...vals: Array<string | undefined | null>) =>
  vals.find((v) => typeof v === "string" && v.trim().length > 0)?.trim() || "";

const BLOG_BASE = "https://xpoll.io";
const APP_BASE = "https://app.xpoll.io";

const ROUTES: Record<LinkedEntityType, (id: string) => string> = {
  blog: (id) => `${BLOG_BASE}/blogs/${id}`,
  campaign: (id) => `${APP_BASE}/campaigns/all-campaigns/${id}`,
  trial: (id) => `${APP_BASE}/trial/${id}`,
  poll: (id) => `${APP_BASE}/feed/polls/${id}`,
};

function buildEntityUrl(type: LinkedEntityType, id: string) {
  return ROUTES[type]?.(id) ?? `${APP_BASE}/${type}/${id}`;
}

function MiniEntityLink({
  item,
  href,
}: {
  item: { type: LinkedEntityType; id: string; title: string; image?: string };
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-[19rem] md:max-w-[33rem] flex items-center gap-2 rounded-lg border border-black/10 bg-blue/10 hover:bg-black/[0.06] px-2 py-1.5 text-left"
    >
      <div className="h-7 w-7 rounded-md border border-black/10 overflow-hidden bg-black/5 shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full" />
        )}
      </div>

      <div className="min-w-0">
        <div className="text-[11px] text-black/50 leading-none capitalize">
          {item.type}
        </div>
        <div className="text-[12px] font-medium truncate">{item.title}</div>
      </div>

      <div className="ml-auto text-black/40 bg-slate-300 rounded-full px-1 py-0.5">
        <ArrowRight className="h-4 w-5" />
      </div>
    </a>
  );
}

export function EntityLinkings({
  entityType,
  entityId,
  label = "More Info :",
}: {
  entityType: LinkedEntityType;
  entityId: string;
  label?: string;
}) {
  const url = useMemo(() => {
    if (!entityType || !entityId) return "";
    return endpoints.linkForward(entityType, entityId);
  }, [entityType, entityId]);

  const { data } = useApiQuery<{
    items?: ForwardLinkItem[];
    data?: ForwardLinkItem[];
    results?: ForwardLinkItem[];
  }>(endpoints.linkForward(entityType, entityId), {
    queryKey: ["entity-link-forward", entityType, entityId],
    url,
    enabled: !!entityType && !!entityId,
  });

  const list = useMemo(() => {
    const raw = data?.data?.data?.entries || ([] as ForwardLinkItem[]);
    return raw
      .map((x) => {
        const type = pick(
          x.to?.type,
          x.toEntityType,
          x.entityType,
        ) as LinkedEntityType as LinkedEntityType;

        const id = pick(x.to?.id, x.toEntityId, x.entityId);
        if (!type || !id) return null;

        const title =
          pick(
            x.to?.entity?.data?.title,
            x.to?.entity?.data?.name,
            x.title,
            x.name,
          ) || `${type} ${id.slice(0, 6)}…`;

        const image = pick(
          x.image,
          x.thumbnail,
          x.coverImage,

          x.to?.entity?.data?.imageUrls?.[0],

          x.to?.entity?.data?.imageLinks?.[0],

          x.to?.entity?.data?.resourceAssets?.find(
            (a: any) => a?.type === "image" && typeof a?.value === "string",
          )?.value,
        );

        return { type, id, title, image };
      })
      .filter(Boolean) as Array<{
      type: LinkedEntityType;
      id: string;
      title: string;
      image?: string;
    }>;
  }, [data]);

  if (!list.length) return null;

  return (
    <div className="mt-3">
      <h1 className="text-[11px] text-black/70 mb-2">{label}</h1>
      <div className="grid gap-1.5">
        {list?.map((it) => {
          const href = buildEntityUrl(it.type, it.id);
          return (
            <MiniEntityLink key={`${it.type}:${it.id}`} item={it} href={href} />
          );
        })}
      </div>
    </div>
  );
}
