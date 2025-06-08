import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "./client";

type UploadResponse =
  | {
      success: true;
      cloudFrontUrl: string;
    }
  | {
      success: false;
      error: string;
    };

export function useUploadImageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await client.api.v0.images.upload.$post({
        form: { userId, file },
      });

      const data = (await res.json()) as UploadResponse;
      if (!data.success) throw new Error(data.error);
      return { cloudFrontUrl: data.cloudFrontUrl, userId };
    },
    onSettled: (args) => {
      if (!args) return console.log(args, "create args, returning");
      queryClient.invalidateQueries({ queryKey: ["images"], args });
    },
  });
}
