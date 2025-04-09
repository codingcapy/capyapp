import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ArgumentTypes, client, ExtractData } from "./client";
import { Chat } from "../../../../schemas/chats";
import { mapSerializedFriendToSchema } from "./friend";

type CreateChatArgs = ArgumentTypes<
  typeof client.api.v0.chats.$post
>[0]["json"];

type InviteFriendArgs = ArgumentTypes<
  typeof client.api.v0.chats.add.$post
>[0]["json"];

type SerializeChat = ExtractData<
  Awaited<ReturnType<typeof client.api.v0.chats.$get>>
>["chats"][number];

export function mapSerializedChatToSchema(SerializedChat: SerializeChat): Chat {
  return {
    ...SerializedChat,
    createdAt: new Date(SerializedChat.createdAt),
  };
}

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
  return result;
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
    throw new Error("Error getting chats by userId");
  }
  const { chats } = await res.json();
  return chats.map(mapSerializedChatToSchema);
}

export const getChatsByUserIdQueryOptions = (args: string) =>
  queryOptions({
    queryKey: ["chats", args],
    queryFn: () => getChatsByUserId(args),
  });

async function inviteFriend(args: InviteFriendArgs) {
  const res = await client.api.v0.chats.add.$post({ json: args });
  if (!res.ok) {
    let errorMessage =
      "There was an issue inviting your friend :( We'll look into it ASAP!";
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
  return result;
}

export const useInviteFriendMutation = (
  onError?: (message: string) => void
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inviteFriend,
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

async function getParticipantsByChatId(id: string) {
  const res = await client.api.v0.chats.participants[":chatId"].$get({
    param: { chatId: id.toString() },
  });

  if (!res.ok) {
    throw new Error("Error getting friends by userEmail");
  }
  const { participants } = await res.json();
  return participants.map((participant) =>
    mapSerializedFriendToSchema(participant)
  );
}

export const getParticipantsByChatIdQueryOptions = (args: string) =>
  queryOptions({
    queryKey: ["participants", args],
    queryFn: () => getParticipantsByChatId(args),
  });
