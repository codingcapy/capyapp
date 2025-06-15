import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { client, ExtractData } from "./client";
import { ImageMessage } from "../../../../schemas/images";

type UploadResponse =
  | {
      success: true;
      cloudFrontUrl: string;
    }
  | {
      success: false;
      error: string;
    };

type SerializeImage = ExtractData<
  Awaited<ReturnType<typeof client.api.v0.images.$get>>
>["images"][number];

export function mapSerializedImageToSchema(
  SerializedImage: SerializeImage
): ImageMessage {
  return {
    ...SerializedImage,
    createdAt: new Date(SerializedImage.createdAt),
  };
}

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

async function getImagesByChatId(chatId: string) {
  const res = await client.api.v0.images[":chatId"].$get({
    param: { chatId: chatId.toString() },
  });
  if (!res.ok) {
    throw new Error("Error getting images by chatId");
  }
  const { images } = await res.json();
  return images.map(mapSerializedImageToSchema);
}

export const getImagesByChatIdQueryOptions = (args: string) =>
  queryOptions({
    queryKey: ["images", args],
    queryFn: () => getImagesByChatId(args),
  });
