import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

let socket = null;

export function connectSocket(token) {
  if (!token) return null;
  if (socket && socket.auth?.token === token) return socket;

  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    transports: ["websocket", "polling"],
  });

  socket.on("connect_error", (err) => {
    console.error(`[socket] connection failed (${SOCKET_URL}):`, err.message);
  });
  socket.on("connect", () => {
    console.log(`[socket] connected to ${SOCKET_URL}`);
  });

  return socket;
}

export function getOrConnectSocket() {
  const token = localStorage.getItem("hp_token");
  return connectSocket(token);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function onSocketStatusChange(callback) {
  const s = getOrConnectSocket();
  if (!s) {
    callback("unavailable");
    return () => {};
  }
  const onConnect = () => callback("connected");
  const onDisconnect = () => callback("disconnected");
  const onError = () => callback("error");
  s.on("connect", onConnect);
  s.on("disconnect", onDisconnect);
  s.on("connect_error", onError);
  callback(s.connected ? "connected" : "connecting");
  return () => {
    s.off("connect", onConnect);
    s.off("disconnect", onDisconnect);
    s.off("connect_error", onError);
  };
}
