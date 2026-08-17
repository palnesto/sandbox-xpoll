import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { useAuthStore } from "@/stores/useAuth";
import { useEffect, useMemo } from "react";
import { queryClient } from "@/api/queryClient";
import { signOut as sandboxSignOut } from "@/sandbox/session";

export function useAuth() {
  const { user, setUser } = useAuthStore();

  // NOTE: useApiQuery returns the AxiosResponse here (we are NOT changing it)
  const {
    data, // AxiosResponse | undefined
    isLoading, // fetching /me
    isError, // /me failed (401, network, etc.)
    isSuccess, // /me succeeded
    refetch,
  } = useApiQuery(endpoints.profile.me, {
    retry: false,
    // keepPreviousData: true, // optional
  });

  // Because useApiQuery returns AxiosResponse, your API body is at data?.data
  // and your ApiResponse<user> shape is at data?.data?.data
  const serverUser = data?.data?.data ?? null;

  // Keep the store in sync whenever we actually have a server user
  useEffect(() => {
    if (serverUser) setUser(serverUser);
  }, [serverUser, setUser]);

  // We only want to "decide" after the query is settled
  const hasAuthVerdict = useMemo(
    () => !isLoading && (isSuccess || isError),
    [isLoading, isSuccess, isError],
  );

  // Prefer the freshly-fetched serverUser; fall back to store (e.g., post-login)
  const authenticated = useMemo(
    () => Boolean(serverUser || user),
    [serverUser, user],
  );

  const { mutateAsync: logout, isPending: isLogoutPending } = useApiMutation<
    void,
    void
  >({
    route: endpoints.auth.logout,
    method: "POST",
    onSuccess: () => {
      // Sandbox: drop the fake session before clearing cached queries.
      sandboxSignOut();
      queryClient.clear();
      setUser(null);
      window.location.replace("/login");
    },
  });

  return {
    // consumer-friendly fields
    user: serverUser ?? user,
    authenticated,
    hasAuthVerdict, // ← use this in the guard
    // pass-through flags if you need them elsewhere
    isLoading,
    isError,
    isSuccess,
    refetch,
    logout,
    isLogoutPending,
  };
}
