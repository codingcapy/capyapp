import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ArgumentTypes, client } from "./client";

type CreateChatArgs = ArgumentTypes<
  typeof client.api.v0.chats.$post
>[0]["json"];

async function createChat(args: CreateChatArgs) {
  const res = await client.api.v0.chats.$post({ json: args });
  if (!res.ok) {
    let errorMessage =
      "There was an issue creating your chat :( We'll look into it ASAP!";
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
  console.log("Parsed API Response:", result);
  return result.user.userId;
}

export const useCreateChatMutation = (onError?: (message: string) => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChat,
    onSettled: (args) => {
      if (!args) return console.log(args, "create args, returning");
      queryClient.invalidateQueries({ queryKey: ["chats"], args });
    },
    onError: (error) => {
      if (onError) {
        onError(error.message);
      }
    },
  });
};

async function getChatsByUserId(userId: string) {
  const res = await client.api.v0.chats[":userId"].$get({
    param: { userId: userId.toString() },
  });

  if (!res.ok) {
    throw new Error("Error getting vhats by userId");
  }
  const { chats } = await res.json();
  return chats;
}

export const getChatsByEmailQueryOptions = (args: string) =>
  queryOptions({
    queryKey: ["chats", args],
    queryFn: () => getChatsByUserId(args),
  });
