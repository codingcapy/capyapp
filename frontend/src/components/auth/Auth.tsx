import { jwtDecode } from "jwt-decode";
import { useEffect } from "react";
import useAuthStore from "../../store/AuthStore";
import { getAccessToken, setSession } from "../../services/jwt.service";

//@ts-ignore
export default function Auth({ children }) {
  //@ts-ignore
  const { loginWithToken, tokenLoading, logoutService } = useAuthStore(
    (state) => state
  );

  async function handleAuthentication() {
    let token = getAccessToken();
    if (!token) {
      logoutService();
      return;
    }
    if (!isAuthTokenValid(token)) return;
    setSession(token);
    loginWithToken();
  }
  //@ts-ignore
  function isAuthTokenValid(token) {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    //@ts-ignore
    if (decoded.exp < currentTime) {
      console.warn("access token expired");
      logoutService();
      return false;
    } else {
      return true;
    }
  }

  useEffect(() => {
    handleAuthentication();
  }, []);

  return <div>{tokenLoading ? "" : children}</div>;
}
