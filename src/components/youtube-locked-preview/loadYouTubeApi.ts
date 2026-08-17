let ytApiPromise: Promise<typeof YT> | null = null;

export function loadYouTubeIframeAPI(): Promise<typeof YT> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is undefined (SSR)."));
  }
  // Already loaded
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);

  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    // Reuse existing script if present
    const already = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!already) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };

    // Fallback in case onYouTubeIframeAPIReady fired earlier
    const check = () => {
      if (window.YT && window.YT.Player) resolve(window.YT);
      else setTimeout(check, 50);
    };
    check();
  });

  return ytApiPromise;
}
