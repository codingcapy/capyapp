import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Message } from "../../../../schemas/messages";
import { ArgumentTypes, client, ExtractData } from "./client";

type CreateMessageArgs = ArgumentTypes<
  typeof client.api.v0.messages.$post
>[0]["json"];

type SerializeMessage = ExtractData<
  Awaited<ReturnType<typeof client.api.v0.messages.$get>>
>["messages"][number];

export function mapSerializedMessageToSchema(
  SerializedMessage: SerializeMessage
): Message {
  return {
    ...SerializedMessage,
    createdAt: new Date(SerializedMessage.createdAt),
  };
}

async function createMessage(args: CreateMessageArgs) {
  const res = await client.api.v0.messages.$post({ json: args });
  if (!res.ok) {
    let errorMessage =
      "There was an issue creating your message :( We'll look into it ASAP!";
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
  if (!result.message) {
    throw new Error("Invalid response from server");
  }
  return mapSerializedMessageToSchema(result.message);
}

export const useCreateMessageMutation = (
  onError?: (message: string) => void
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMessage,
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

async function getMessagesByChatId(chatId: string) {
  const res = await client.api.v0.messages[":chatId"].$get({
    param: { chatId: chatId.toString() },
  });

  if (!res.ok) {
    throw new Error("Error getting chats by chatId");
  }
  const { messages } = await res.json();
  return messages.map(mapSerializedMessageToSchema);
}

export const getMessagesByChatIdQueryOptions = (args: string) =>
  queryOptions({
    queryKey: ["messages", args],
    queryFn: () => getMessagesByChatId(args),
  });
