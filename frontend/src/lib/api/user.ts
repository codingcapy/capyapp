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

type UpdatePasswordArgs = ArgumentTypes<
  typeof client.api.v0.users.update.password.$post
>[0]["json"];

type UpdateUsernameArgs = ArgumentTypes<
  typeof client.api.v0.users.update.username.$post
>[0]["json"];

type SendPasswordEmailArgs = ArgumentTypes<
  typeof client.api.v0.users.reset.password.$post
>[0]["json"];

type SerializeUser = ExtractData<
  Awaited<ReturnType<typeof client.api.v0.users.$get>>
>["users"][number];

type UpdateProfilePicArgs = ArgumentTypes<typeof updateFunc>[0]["json"];

const updateFunc = client.api.v0.users.update.profilepic.$post;

export function mapSerializedUserToSchema(SerializedUser: SerializeUser): User {
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

async function updateProfilePic(args: UpdateProfilePicArgs) {
  const res = await client.api.v0.users.update.profilepic.$post({
    json: args,
  });
  if (!res.ok) {
    throw new Error("Error updating user.");
  }
  const { newUser } = await res.json();
  console.log(newUser);
  return mapSerializedUserToSchema(newUser);
}

export const useUpdateProfilePicMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfilePic,
    onSettled: (newUser) => {
      if (!newUser) return;
      queryClient.invalidateQueries({
        queryKey: ["users", newUser.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });
};

async function updatePassword(args: UpdatePasswordArgs) {
  const res = await client.api.v0.users.update.password.$post({
    json: args,
  });
  if (!res.ok) {
    throw new Error("Error updating user.");
  }
  const { newUser } = await res.json();
  console.log(newUser);
  return mapSerializedUserToSchema(newUser);
}

export const useUpdatePasswordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePassword,
    onSettled: (newUser) => {
      if (!newUser) return;
      queryClient.invalidateQueries({
        queryKey: ["users", newUser.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });
};

async function updateUsername(args: UpdateUsernameArgs) {
  const res = await client.api.v0.users.update.username.$post({
    json: args,
  });
  if (!res.ok) {
    throw new Error("Error updating user.");
  }
  const { newUser } = await res.json();
  console.log(newUser);
  return mapSerializedUserToSchema(newUser);
}

export const useUpdateUsernameMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUsername,
    onSettled: (newUser) => {
      if (!newUser) return;
      queryClient.invalidateQueries({
        queryKey: ["users", newUser.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });
};

async function sendPasswordEmail(args: SendPasswordEmailArgs) {
  const res = await client.api.v0.users.reset.password.$post({
    json: args,
  });
  if (!res.ok) {
    throw new Error("Error updating user.");
  }
  const { newUser } = await res.json();
  console.log(newUser);
  return mapSerializedUserToSchema(newUser);
}

export const useSendPasswordEmailMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendPasswordEmail,
    onSettled: (newUser) => {
      if (!newUser) return;
      queryClient.invalidateQueries({
        queryKey: ["users", newUser.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });
};
