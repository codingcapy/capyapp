import { create } from "zustand";
import { Friend } from "../lib/api/friend";

const useParticipantStore = create<{
  participants: Friend[] | undefined;
  setParticipants: (args: Friend[] | undefined) => void;
}>((set, get) => ({
  participants: [],
  setParticipants: (args) => set({ participants: args }),
}));

export default useParticipantStore;
