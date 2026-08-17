import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import apiInstance, { BASE_URL } from "../api/queryClient";

export const useApiQuery = (
  route: string,
  options?: UseQueryOptions<any, any>
) => {
  return useQuery({
    queryKey: [route],
    queryFn: async () => {
      const response = await apiInstance.get(`${BASE_URL}${route}`);
      return response;
    },
    ...options,
  });
};
