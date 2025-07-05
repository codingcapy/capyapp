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

type DeleteMessageArgs = ArgumentTypes<
  typeof client.api.v0.messages.delete.$post
>[0]["json"];

type UpdateMessageArgs = ArgumentTypes<
  typeof client.api.v0.messages.update.$post
>[0]["json"];

type CreateMessageReadArgs = ArgumentTypes<
  typeof client.api.v0.messages.unreads.$post
>[0]["json"];

type SerializeMessage = ExtractData<
  Awaited<ReturnType<typeof client.api.v0.messages.$get>>
>["messages"][number];

type SerializeUnread = ExtractData<
  Awaited<ReturnType<typeof client.api.v0.messages.unreads.$get>>
>["messages"][number];

export type Unread = Omit<Message, "replyUserId" | "replyContent">;

export function mapSerializedMessageToSchema(
  SerializedMessage: SerializeMessage
): Message {
  return {
    ...SerializedMessage,
    createdAt: new Date(SerializedMessage.createdAt),
  };
}

export function mapSerializedUnreadToSchema(
  SerializedUnread: SerializeUnread
): Unread {
  return {
    ...SerializedUnread,
    createdAt: new Date(SerializedUnread.createdAt),
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
      queryClient.invalidateQueries({ queryKey: ["messages"], args });
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

async function deleteMessage(args: DeleteMessageArgs) {
  const res = await client.api.v0.messages.delete.$post({
    json: args,
  });
  if (!res.ok) {
    throw new Error("Error updating user.");
  }
  const { newMessage } = await res.json();
  console.log(newMessage);
  return mapSerializedMessageToSchema(newMessage);
}

export const useDeleteMessageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMessage,
    onSettled: (newMessage) => {
      if (!newMessage) return;
      queryClient.invalidateQueries({
        queryKey: ["messages", newMessage.messageId],
      });
      queryClient.invalidateQueries({
        queryKey: ["messages"],
      });
    },
  });
};

async function updateMessage(args: UpdateMessageArgs) {
  const res = await client.api.v0.messages.update.$post({
    json: args,
  });
  if (!res.ok) {
    throw new Error("Error updating user.");
  }
  const { newMessage } = await res.json();
  console.log(newMessage);
  return mapSerializedMessageToSchema(newMessage);
}

export const useUpdateMessageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMessage,
    onSettled: (newMessage) => {
      if (!newMessage) return;
      queryClient.invalidateQueries({
        queryKey: ["messages", newMessage.messageId],
      });
      queryClient.invalidateQueries({
        queryKey: ["messages"],
      });
    },
  });
};

async function createMessageRead(args: CreateMessageReadArgs) {
  const res = await client.api.v0.messages.unreads.$post({ json: args });
  if (!res.ok) {
    let errorMessage =
      "There was an issue creating your message read :( We'll look into it ASAP!";
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
  if (!result.messageRead) {
    throw new Error("Invalid response from server");
  }
  return result.messageRead;
}

export const useCreateMessageReadMutation = (
  onError?: (message: string) => void
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMessageRead,
    onSettled: (args) => {
      if (!args) return console.log(args, "create args, returning");
      queryClient.invalidateQueries({ queryKey: ["unreads", args.userId] });
    },
    onError: (error) => {
      if (onError) {
        onError(error.message);
      }
    },
  });
};

async function getreadMessagesByUserId(userId: string) {
  const res = await client.api.v0.messages.reads[":userId"].$get({
    param: { userId: userId.toString() },
  });
  if (!res.ok) {
    throw new Error("Error getting reads by userId");
  }
  const { reads } = await res.json();
  return reads;
}

export const getreadMessagesByUserIdQueryOptions = (args: string) =>
  queryOptions({
    queryKey: ["reads", args],
    queryFn: () => getreadMessagesByUserId(args),
  });
