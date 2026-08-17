import { endpoints } from "@/api/endpoints";
import { useApiMutation } from "./useApiMutation";
import { queryClient } from "@/api/queryClient";

export const useUpdateMe = (onSuccess?: () => void) => {
  return useApiMutation({
    route: endpoints.profile.meUpdate,
    method: "PATCH",
    onSuccess: ({ data }) => {
      // invalidate or update the me-query here if needed…
      onSuccess?.();
      queryClient.invalidateQueries(endpoints.profile.me);
    },
  });
};
