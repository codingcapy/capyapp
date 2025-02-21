import { User } from "../../../../schema/users";
import { ArgumentTypes, client, ExtractData } from "./client";

type CreateUserArgs = ArgumentTypes<
  typeof client.api.v0.users.$post
>[0]["json"];

type SerializeUser = ExtractData<
  Awaited<ReturnType<typeof client.api.v0.users.$get>>
>["users"][number];

function mapSerializedBookingToSchema(SerializedBooking: SerializeUser): User {
  return {
    ...SerializedBooking,
    createdAt: new Date(SerializedBooking.createdAt),
  };
}

async function createUser(args: CreateUserArgs) {
  const res = await client.api.v0.users.$post({ json: args });
  if (!res.ok) {
    console.log("Error creating user");
    throw new Error("Error creating user");
  }
  const result = await res.json();
  console.log("Parsed API Response:", result);
  return mapSerializedBookingToSchema(result.user);
}
