import apiInstance from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";

const INKD_BLOG_RE = /^\/inkd\/inkd-blog\/([a-fA-F0-9]{24})\/?$/;
const TRIAL_RE = /^\/trial\/([a-fA-F0-9]{24})\/?$/;

function getBrowserLoc() {
  if (typeof window === "undefined") return null;
  const { pathname, search, href } = window.location;
  return { pathname, search, href };
}

function parseInkDBlogShareFromBrowser() {
  const loc = getBrowserLoc();
  if (!loc) return null;

  const match = loc.pathname.match(INKD_BLOG_RE);
  const inkdBlogId = match?.[1] ?? null;
  if (!inkdBlogId) return null;

  const usp = new URLSearchParams(loc.search);
  const inkdRu = usp.get("inkdRu");
  if (!inkdRu) return null;

  return {
    inkdBlogId,
    inkdRu,
    url: loc.href,
    path: loc.pathname + loc.search,
  };
}

function parseInkDTrialShareFromBrowser() {
  const loc = getBrowserLoc();
  if (!loc) return null;

  const match = loc.pathname.match(TRIAL_RE);
  const trialId = match?.[1] ?? null;
  if (!trialId) return null;

  const usp = new URLSearchParams(loc.search);
  const inkdRu = usp.get("inkdRu");
  if (!inkdRu) return null;

  return {
    trialId,
    inkdRu,
    url: loc.href,
    path: loc.pathname + loc.search,
  };
}

export async function logInkDBlogShareFromUrl() {
  const parsed = parseInkDBlogShareFromBrowser();
  if (!parsed) return null;

  const res = await apiInstance.post(endpoints.inkd.shareLog, {
    source: "blog",
    inkdBlogId: parsed.inkdBlogId,
    inkdRu: parsed.inkdRu,
    url: parsed.url,
    path: parsed.path,
  });

  return res.data;
}

export async function logInkDTrialShareFromUrl() {
  const parsed = parseInkDTrialShareFromBrowser();
  if (!parsed) return null;

  const res = await apiInstance.post(endpoints.inkd.shareLog, {
    source: "trial",
    trialId: parsed.trialId,
    inkdRu: parsed.inkdRu,
    url: parsed.url,
    path: parsed.path,
  });

  return res.data;
}
