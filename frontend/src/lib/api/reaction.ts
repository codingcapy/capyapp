import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Reaction } from "../../../../schemas/reactions";
import { ArgumentTypes, client, ExtractData } from "./client";

type CreateReactionArgs = ArgumentTypes<
  typeof client.api.v0.reactions.$post
>[0]["json"];

type DeleteReactionArgs = ArgumentTypes<
  typeof client.api.v0.reactions.$delete
>[0]["json"];

type SerializeReaction = ExtractData<
  Awaited<ReturnType<typeof client.api.v0.reactions.$get>>
>["reactions"][number];

export function mapSerializedReactionToSchema(
  SerializedMessage: SerializeReaction
): Reaction {
  return {
    ...SerializedMessage,
    createdAt: new Date(SerializedMessage.createdAt),
  };
}

async function createReaction(args: CreateReactionArgs) {
  const res = await client.api.v0.reactions.$post({ json: args });
  if (!res.ok) {
    let errorMessage =
      "There was an issue creating your reaction :( We'll look into it ASAP!";
    try {
      const errorResponse = await res.json();
      if (
        errorResponse &&
        typeof errorResponse === "object" &&
        "message" in errorResponse
      ) {
        errorMessage = String(errorResponse.message);
      }
    } catch (error) {
      console.error("Failed to parse error response:", error);
    }
    throw new Error(errorMessage);
  }
  const result = await res.json();
  if (!result.reaction) {
    throw new Error("Invalid response from server");
  }
  return mapSerializedReactionToSchema(result.reaction);
}

export const useCreateReactionMutation = (
  onError?: (message: string) => void
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReaction,
    onSettled: (args) => {
      if (!args) return console.log(args, "create args, returning");
      queryClient.invalidateQueries({ queryKey: ["reactions", args.chatId] });
    },
    onError: (error) => {
      if (onError) {
        onError(error.message);
      }
    },
  });
};

async function getReactionsByChatId(chatId: string) {
  const res = await client.api.v0.reactions[":chatId"].$get({
    param: { chatId: chatId.toString() },
  });
  if (!res.ok) {
    throw new Error("Error getting reactions by chatId");
  }
  const { chats } = await res.json();
  return chats.map(mapSerializedReactionToSchema);
}

export const getReactionsByChatIdQueryOptions = (args: string) =>
  queryOptions({
    queryKey: ["reactions", args],
    queryFn: () => getReactionsByChatId(args),
  });

async function deleteReaction(args: DeleteReactionArgs) {
  const res = await client.api.v0.reactions.$delete({ json: args });
  if (!res.ok) {
    let errorMessage =
      "There was an issue deleting your reaction :( We'll look into it ASAP!";
    try {
      const errorResponse = await res.json();
      if (
        errorResponse &&
        typeof errorResponse === "object" &&
        "message" in errorResponse
      ) {
        errorMessage = String(errorResponse.message);
      }
    } catch (error) {
      console.error("Failed to parse error response:", error);
    }
    throw new Error(errorMessage);
  }
  return args.chatId;
}

export const useDeleteReactionMutation = (
  onError?: (message: string) => void
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReaction,
    onSettled: (args) => {
      if (!args) return console.log(args, "create args, returning");
      queryClient.invalidateQueries({ queryKey: ["reactions"], args });
    },
    onError: (error) => {
      if (onError) {
        onError(error.message);
      }
    },
  });
};
