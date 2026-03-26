import { WebSocketServer, WebSocket } from "ws";
import { RedisManager } from "../redis/RedisManager";

export class WebsocketManager {
    private static instance: WebsocketManager;
    private static wss: WebSocketServer;

    private users: UserType[] = [];

    private constructor() {
        console.log("[WebsocketManager] started");
    }

    static getInstance(): WebsocketManager {
        if (!WebsocketManager.instance) {
            WebsocketManager.instance = new WebsocketManager();
            WebsocketManager.wss = new WebSocketServer({ port: 8080 });
        }
        return WebsocketManager.instance;
    }

    startWorker() {
        WebsocketManager.wss.on("connection", (ws: WebSocket) => {
            ws.on("error", console.error);

            ws.on("message", async (data: Buffer) => {
                console.log("data : ", data);

                let parsed: UserRequestType;

                try {
                    parsed = JSON.parse(data.toString());
                    console.log("parsed : ", parsed);
                } catch (err) {
                    console.error("Invalid JSON:", err);
                    return;
                }

                if (
                    !parsed.userID ||
                    !parsed.method ||
                    !parsed.params?.length
                ) {
                    console.log("Invalid payload structure");
                    return;
                }

                const user: UserType = { ...parsed, ws };
                this.users.push(user);

                const channel = parsed.params[0];

                const redis = await RedisManager.getInstance();
                redis.subscribeMessage(channel, (message) => {
                    this.users.forEach((u) => {
                        if (
                            u.params[0] === channel &&
                            u.ws.readyState === WebSocket.OPEN
                        ) {
                            u.ws.send(message);
                        }
                    });
                });
            });

            ws.on("close", () => {
                this.users = this.users.filter((u) => u.ws !== ws);
                console.log("Client disconnected");
            });
        });
    }
}

type UserRequestType = {
    method: methodTypes;
    userID: string;
    params: string[];
};

type UserType = {
    method: methodTypes;
    userID: string;
    params: string[];
    ws: WebSocket;
};

type methodTypes = "SUBSCRIBE" | "UNSUBSCRIBE";
