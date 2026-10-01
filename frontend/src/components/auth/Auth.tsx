import { useEffect } from "react";
import useAuthStore from "../../store/AuthStore";

//@ts-ignore
export default function Auth({ children }) {
  const { refreshSession, tokenLoading } = useAuthStore((state) => state);

  useEffect(() => {
    refreshSession();
  }, []);

  return <div>{tokenLoading ? "" : children}</div>;
}
