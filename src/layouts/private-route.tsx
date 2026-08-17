import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import {
  makePublicCampaignPageUrl,
  matchCampaignUrl,
} from "@/utils/urls/campaign-url";
import { setAuthIntent } from "@/lib/redirection/auth-intent";

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { authenticated, hasAuthVerdict, isLoading, isError } = useAuth();
  const location = useLocation();

  const campaignMatch = matchCampaignUrl(location.pathname + location.search);

  // While probing /me (or before we have a verdict), don't redirect yet.
  if (isLoading || !hasAuthVerdict) {
    return <Loader2 className="h-6 w-6 animate-spin" />;
  }

  // Once settled, if error or unauthenticated → go to login
  if (isError || !authenticated) {
    setAuthIntent(location.pathname, location.search);
    if (campaignMatch.ok) {
      const url = makePublicCampaignPageUrl(campaignMatch.campaignId);
      return <Navigate to={url} state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
