import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ArgumentTypes, client } from "./client";
import { User } from "../../../../schemas/users";

type CreateFriendArgs = ArgumentTypes<
  typeof client.api.v0.friends.$post
>[0]["json"];

export type Friend = Omit<User, "password">;

type SerializeFriend = {
  userId: string;
  username: string;
  email: string;
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

async function getAllFriends() {
  const res = await client.api.v0.friends.$get();
  if (!res.ok) {
    throw new Error("Failed to get all friends");
  }
  const { users } = await res.json();
  return users;
}

export const getAllFriendsQueryOptions = queryOptions({
  queryKey: ["friends"],
  queryFn: getAllFriends,
});

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
