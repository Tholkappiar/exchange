import { WEBSOCKET_URL } from "../utils/constant";

interface messageType {
    method: "SUBSCRIBE" | "UNSUBSCRIBE";
    params: string[];
}

type CallBackType = { [key: string]: ((parsed: any) => void)[] };

export class WebsocketManager {
    private ws: WebSocket;
    public static instance: WebsocketManager;
    private callbacks: CallBackType = {};
    private bufferedMessages: messageType[] = [];
    private isWebsocketOpen: boolean = false;
    private id: number;

    public registerCallBack(key: string, callBack: (parsed: any) => void) {
        if (!this.callbacks[key]) {
            this.callbacks[key] = [];
        }
        this.callbacks[key].push(callBack);
    }

    public unregister(key: string) {
        if (this.callbacks[key]) delete this.callbacks[key];
    }

    public sendMessage(payload: messageType) {
        const payloadToSend = {
            ...payload,
            id: this.id++,
        };
        if (!this.isWebsocketOpen) {
            this.bufferedMessages.push(payloadToSend);
            return;
        }
        this.ws.send(JSON.stringify(payloadToSend));
    }

    public static getInstance() {
        if (!WebsocketManager.instance) {
            WebsocketManager.instance = new WebsocketManager();
        }
        return WebsocketManager.instance;
    }

    private constructor() {
        this.ws = new WebSocket(WEBSOCKET_URL);
        this.id = 1;
        this.init();
    }

    private init() {
        this.ws.onopen = () => {
            this.isWebsocketOpen = true;
            this.bufferedMessages.forEach((message) =>
                this.ws.send(JSON.stringify(message)),
            );
            this.bufferedMessages = [];
        };

        this.ws.onmessage = (event) => {
            const parsed = JSON.parse(event.data);
            // console.log("parxed : ", parsed);
            this.compare(parsed);
        };
    }

    private compare(parsed: any) {
        const type = parsed?.data?.e;
        const callbacks = this.callbacks[type];
        // console.log("t : ", type);
        // console.log("call : ", callbacks);

        if (!callbacks) return;

        callbacks.forEach((callback) => {
            callback(parsed);
        });
    }
}
