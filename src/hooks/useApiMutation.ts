import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import apiInstance from "../api/queryClient";

export const useApiMutation = <TData, TResponse>({
  route,
  method = "POST",
  onSuccess,
  onError,
}: {
  route: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE"; // Restrict method to specific HTTP verbs
  options?: UseMutationOptions<TResponse, Error, TData>;
  onSuccess?: (data: TResponse) => void;
  onError?: (error: Error) => void;
}) => {
  return useMutation({
    mutationFn: async (newData) => {
      if (method === "POST") {
        const response = await apiInstance.post(route, newData);
        return response.data;
      } else if (method === "PATCH") {
        const response = await apiInstance.patch(route, newData);
        return response.data;
      } else if (method === "PUT") {
        const response = await apiInstance.put(route, newData);
        return response.data;
      } else if (method === "DELETE") {
        const response = await apiInstance.delete(route, { data: newData }); // Fixed DELETE syntax for sending body
        return response.data;
      }
    },
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (error: any) => {
      // Extract error message
      const errorMessage =
        error?.response?.data?.message || "An unexpected error occurred";
      onError?.(error);
    },
  });
};
