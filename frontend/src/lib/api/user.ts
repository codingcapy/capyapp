import { User } from "../../../../schemas/users";
import { ArgumentTypes, client, ExtractData } from "./client";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

type CreateUserArgs = ArgumentTypes<
  typeof client.api.v0.users.$post
>[0]["json"];

type SerializeUser = ExtractData<
  Awaited<ReturnType<typeof client.api.v0.users.$get>>
>["users"][number];

function mapSerializedUserToSchema(SerializedUser: SerializeUser): User {
  return {
    ...SerializedUser,
    createdAt: new Date(SerializedUser.createdAt),
  };
}

async function createUser(args: CreateUserArgs) {
  const res = await client.api.v0.users.$post({ json: args });
  if (!res.ok) {
    let errorMessage =
      "There was an issue creating your account :( We'll look into it ASAP!";
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
  if (!result.user) {
    throw new Error("Invalid response from server");
  }
  return mapSerializedUserToSchema(result.user);
}

export const useCreateUserMutation = (onError?: (message: string) => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSettled: (args) => {
      if (!args) return console.log(args, "create args, returning");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      if (onError) {
        onError(error.message);
      }
    },
  });
};

async function getAllUsers() {
  const res = await client.api.v0.users.$get();
  if (!res.ok) {
    throw new Error("Failed to get all users");
  }
  const { users } = await res.json();
  return users.map(mapSerializedUserToSchema);
}

export const getAllUsersQueryOptions = queryOptions({
  queryKey: ["users"],
  queryFn: getAllUsers,
});
