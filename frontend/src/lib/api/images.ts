import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ArgumentTypes, client, ExtractData } from "./client";
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

type DeleteImageArgs = ArgumentTypes<
  typeof client.api.v0.images.delete.$post
>[0]["json"];

type UpdateImageArgs = ArgumentTypes<
  typeof client.api.v0.images.update.$post
>[0]["json"];

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
    mutationFn: async ({
      userId,
      file,
      messageId,
      chatId,
    }: {
      userId: string;
      file: File;
      messageId: string;
      chatId: string;
    }) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await client.api.v0.images.upload.$post({
        form: { userId, file, messageId, chatId },
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

async function deleteImage(args: DeleteImageArgs) {
  const res = await client.api.v0.images.delete.$post({
    json: args,
  });
  if (!res.ok) {
    throw new Error("Error deleting image.");
  }
  const { newImage } = await res.json();
  console.log(newImage);
  return newImage;
}

export const useDeleteImageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteImage,
    onSettled: (newImage) => {
      if (!newImage) return;
      queryClient.invalidateQueries({
        queryKey: ["images", newImage.chatId],
      });
      queryClient.invalidateQueries({
        queryKey: ["images"],
      });
    },
  });
};

async function updateImage(args: UpdateImageArgs) {
  const res = await client.api.v0.images.update.$post({
    json: args,
  });
  if (!res.ok) {
    throw new Error("Error updating image.");
  }
  const { newImage } = await res.json();
  console.log(newImage);
  return mapSerializedImageToSchema(newImage);
}

export const useUpdateImageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateImage,
    onSettled: (newImage) => {
      if (!newImage) return;
      queryClient.invalidateQueries({
        queryKey: ["images", newImage.chatId],
      });
      queryClient.invalidateQueries({
        queryKey: ["images"],
      });
    },
  });
};
