import axios from "axios";
import { jwtDecode } from "jwt-decode";

export function setSession(token: any) {
  if (token) {
    localStorage.setItem("jwt_access_token", token);
    axios.defaults.headers.common["Authorization"] = "Bearer " + token;
  } else {
    localStorage.removeItem("jwt_access_token");
    delete axios.defaults.headers.common["Authorization"];
  }
}

export function getAccessToken() {
  return window.localStorage.getItem("jwt_access_token");
}

export function getUserIdFromToken() {
  const token = getAccessToken();
  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      //@ts-ignore
      return decodedToken.id;
    } catch (err) {
      console.log("Error decoding token: ", err);
      return null;
    }
  } else {
    return null;
  }
}
