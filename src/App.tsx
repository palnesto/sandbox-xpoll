import { ReactNode, Suspense, useMemo } from "react";
import { useRoutes, useLocation } from "react-router-dom";
import routes from "~react-pages";
import DefaultLayout from "./layouts/default-layout";
import { cn } from "./lib/utils";
import PrivateRoute from "./layouts/private-route";
import AssetUploadProgressModal from "./components/media/AssetUploadProgressModal";

/**
 * SANDBOX BUILD.
 *
 * The production app wraps authed routes in AuthedProvidersShell to set up
 * Wagmi / Reown AppKit / Sui providers. This prototype has no wallet or chain
 * integration, so that shell is intentionally absent.
 */

export function App() {
  const location = useLocation();
  const appRoutes = useRoutes(routes);

  const publicPaths = useMemo(() => ["/", "/login"], []);

  const isPublic = publicPaths.includes(location.pathname);
  const isInkdPage = location.pathname.startsWith("/inkd");

  return (
    <div className="font-poppins max-h-[100dvh]">
      <MaxWidthContainer>
        <Suspense fallback={<p className="p-6 text-sm text-black/60">Loading…</p>}>
          {isPublic ? (
            appRoutes
          ) : isInkdPage ? (
            <PrivateRoute>{appRoutes}</PrivateRoute>
          ) : (
            <PrivateRoute>
              <DefaultLayout>{appRoutes}</DefaultLayout>
            </PrivateRoute>
          )}
        </Suspense>
      </MaxWidthContainer>
      <AssetUploadProgressModal />
    </div>
  );
}

const MaxWidthContainer = ({ children }: { children: ReactNode }) => {
  return (
    <div className={cn("w-full flex justify-center max-h-[100dvh]")}>
      <div className={cn("w-full max-w-[4000px]")}>{children}</div>
    </div>
  );
};
