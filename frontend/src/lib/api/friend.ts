import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ArgumentTypes, client } from "./client";
import { User } from "../../../../schemas/users";
import { UserFriend } from "../../../../schemas/userfriends";

type CreateFriendArgs = ArgumentTypes<
  typeof client.api.v0.friends.$post
>[0]["json"];

type BlockUserArgs = ArgumentTypes<
  typeof client.api.v0.friends.block.$post
>[0]["json"];

type UnblockUserArgs = ArgumentTypes<
  typeof client.api.v0.friends.unblock.$post
>[0]["json"];

export type Friend = Omit<User, "password">;

type SerializeFriend = {
  userId: string;
  username: string;
  email: string;
  profilePic: string | null;
  createdAt: string;
};

type SerializeUserFriend = {
  userFriendId: number;
  userEmail: string;
  friendEmail: string;
  blocked: boolean | null;
  muted: boolean | null;
  createdAt: string;
};

export function mapSerializedFriendToSchema(
  SerializedFriend: SerializeFriend
): Friend {
  return {
    ...SerializedFriend,
    createdAt: new Date(SerializedFriend.createdAt),
  };
}

export function mapSerializedUserFriendToSchema(
  SerializedUserFriend: SerializeUserFriend
): UserFriend {
  return {
    ...SerializedUserFriend,
    createdAt: new Date(SerializedUserFriend.createdAt),
  };
}

async function createFriend(args: CreateFriendArgs) {
  const res = await client.api.v0.friends.$post({ json: args });
  if (!res.ok) {
    let errorMessage =
      "There was an issue creating your friendship :( We'll look into it ASAP!";
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
  return result.user.userEmail;
}

export const useCreateFriendMutation = (
  onError?: (message: string) => void
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFriend,
    onSettled: (args) => {
      if (!args) return console.log(args, "create args, returning");
      queryClient.invalidateQueries({ queryKey: ["friends"], args });
    },
    onError: (error) => {
      if (onError) {
        onError(error.message);
      }
    },
  });
};

async function getFriendsByEmail(email: string) {
  const res = await client.api.v0.friends[":userEmail"].$get({
    param: { userEmail: email.toString() },
  });

  if (!res.ok) {
    throw new Error("Error getting friends by userEmail");
  }
  const { friends } = await res.json();
  return friends.map((friend) => mapSerializedFriendToSchema(friend));
}

export const getFriendsByEmailQueryOptions = (args: string) =>
  queryOptions({
    queryKey: ["friends", args],
    queryFn: () => getFriendsByEmail(args),
  });

async function blockUser(args: BlockUserArgs) {
  const res = await client.api.v0.friends.block.$post({
    json: args,
  });
  if (!res.ok) {
    throw new Error("Error updating user.");
  }
  const { newUser } = await res.json();
  console.log(newUser);
  return mapSerializedUserFriendToSchema(newUser);
}

export const useBlockUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockUser,
    onSettled: (newUserFriend) => {
      if (!newUserFriend) return;
      queryClient.invalidateQueries({
        queryKey: ["userfriends", newUserFriend.userEmail],
      });
    },
  });
};

async function unblockUser(args: BlockUserArgs) {
  const res = await client.api.v0.friends.unblock.$post({
    json: args,
  });
  if (!res.ok) {
    throw new Error("Error updating user.");
  }
  const { newUser } = await res.json();
  console.log(newUser);
  return mapSerializedUserFriendToSchema(newUser);
}

export const useUnblockUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unblockUser,
    onSettled: (newUserFriend) => {
      if (!newUserFriend) return;
      queryClient.invalidateQueries({
        queryKey: ["userfriends", newUserFriend.userEmail],
      });
    },
  });
};

async function getUserFriendsByEmail(email: string) {
  const res = await client.api.v0.friends.userfriends[":userEmail"].$get({
    param: { userEmail: email.toString() },
  });

  if (!res.ok) {
    throw new Error("Error getting friends by userEmail");
  }
  const { userFriends } = await res.json();
  return userFriends.map((userFriend) =>
    mapSerializedUserFriendToSchema(userFriend)
  );
}

export const getUserFriendsByEmailQueryOptions = (args: string) =>
  queryOptions({
    queryKey: ["userfriends", args],
    queryFn: () => getUserFriendsByEmail(args),
  });
