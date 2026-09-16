import {
  InfiniteData,
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Message } from "@server/schemas/messages";
import { ArgumentTypes, client } from "./client";
import { authHeaders } from "../utils";

type CreateMessageArgs = ArgumentTypes<
  typeof client.api.v0.messages.$post
>[0]["json"];

type DeleteMessageArgs = ArgumentTypes<
  typeof client.api.v0.messages.delete.$post
>[0]["json"];

type UpdateMessageArgs = ArgumentTypes<
  typeof client.api.v0.messages.update.$post
>[0]["json"];

export type SerializedMessage = Omit<Message, "createdAt"> & {
  createdAt: string | Date;
};

export type MessagesPageResponse = {
  messages: Message[];
  prevCursor: string | null;
  nextCursor: string | null;
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
  anchorId: number | null;
};

export function mapSerializedMessageToSchema(
  serializedMessage: SerializedMessage,
): Message {
  return {
    ...serializedMessage,
    createdAt:
      serializedMessage.createdAt instanceof Date
        ? serializedMessage.createdAt
        : new Date(serializedMessage.createdAt),
  };
}

async function createMessage(args: CreateMessageArgs) {
  const res = await client.api.v0.messages.$post({ json: args }, authHeaders());
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
  onError?: (message: string) => void,
) => {
  return useMutation({
    mutationFn: createMessage,
    onError: (error) => {
      if (onError) {
        onError(error.message);
      }
    },
  });
};

export function useMessagesQuery(
  chatId: number,
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery<MessagesPageResponse>({
    queryKey: ["messages", chatId],
    queryFn: async ({ pageParam, direction }) => {
      const query: {
        limit?: string;
        before?: string;
        after?: string;
      } = {
        limit: "30",
      };

      if (pageParam && typeof pageParam === "string") {
        if (direction === "backward") {
          query.before = pageParam;
        } else if (direction === "forward") {
          query.after = pageParam;
        }
      }

      const res = await client.api.v0.messages[":chatId"].$get(
        {
          param: { chatId: chatId.toString() },
          query,
        },
        authHeaders(),
      );

      if (!res.ok) {
        throw new Error("Error getting messages");
      }

      const data = await res.json();
      return {
        ...data,
        messages: data.messages.map((m: any) =>
          mapSerializedMessageToSchema(m),
        ),
      };
    },
    initialPageParam: null as string | null,
    getPreviousPageParam: (firstPage) =>
      firstPage.hasMoreBefore && firstPage.prevCursor
        ? firstPage.prevCursor
        : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMoreAfter && lastPage.nextCursor
        ? lastPage.nextCursor
        : undefined,
    enabled: options?.enabled ?? true,
  });
}

export function appendMessageToChatCache(
  queryClient: QueryClient,
  chatId: number,
  message: Message,
) {
  queryClient.setQueryData<InfiniteData<MessagesPageResponse>>(
    ["messages", chatId],
    (oldData) => {
      if (!oldData || oldData.pages.length === 0) {
        return {
          pages: [
            {
              messages: [message],
              prevCursor: null,
              nextCursor: null,
              hasMoreBefore: false,
              hasMoreAfter: false,
              anchorId: null,
            },
          ],
          pageParams: [null],
        };
      }

      const exists = oldData.pages.some((page) =>
        page.messages.some((m) => m.messageId === message.messageId),
      );
      if (exists) return oldData;

      const newPages = [...oldData.pages];
      const lastPageIndex = newPages.length - 1;
      const lastPage = newPages[lastPageIndex];
      newPages[lastPageIndex] = {
        ...lastPage,
        messages: [...lastPage.messages, message],
      };

      return {
        ...oldData,
        pages: newPages,
      };
    },
  );
}

async function markMessageRead(args: { chatId: number; messageId: number }) {
  const res = await client.api.v0.messages[":chatId"].read.$patch(
    {
      param: { chatId: args.chatId.toString() },
      json: { messageId: args.messageId },
    },
    authHeaders(),
  );
  if (!res.ok) {
    throw new Error("Failed to mark message as read");
  }
  return await res.json();
}

export const useMarkMessageReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markMessageRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["unreadstatus"],
      });
    },
  });
};

async function deleteMessage(args: DeleteMessageArgs) {
  const res = await client.api.v0.messages.delete.$post(
    { json: args },
    authHeaders(),
  );
  if (!res.ok) {
    throw new Error("Error updating user.");
  }
  const { newMessage } = await res.json();
  return mapSerializedMessageToSchema(newMessage);
}

export const useDeleteMessageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMessage,
    onSettled: (newMessage) => {
      if (!newMessage) return;
      queryClient.invalidateQueries({
        queryKey: ["messages", newMessage.chatId],
      });
    },
  });
};

async function updateMessage(args: UpdateMessageArgs) {
  const res = await client.api.v0.messages.update.$post(
    { json: args },
    authHeaders(),
  );
  if (!res.ok) {
    throw new Error("Error updating user.");
  }
  const { newMessage } = await res.json();
  return mapSerializedMessageToSchema(newMessage);
}

export const useUpdateMessageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMessage,
    onSettled: (newMessage) => {
      if (!newMessage) return;
      queryClient.invalidateQueries({
        queryKey: ["messages", newMessage.chatId],
      });
    },
  });
};
