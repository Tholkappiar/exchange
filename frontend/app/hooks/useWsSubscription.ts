import { useEffect } from "react";
import { WebsocketManager } from "../websocket/WebsocketManager";

type WsChannel = "ticker" | "kline" | "depth" | "trade";

interface WsSubscription<T> {
    channel: WsChannel;
    symbol: string | null;
    onMessage: (data: T) => void;
    onCleanup: () => void;
}

export function useWsSubscription<T>({
    channel,
    symbol,
    onMessage,
    onCleanup,
}: WsSubscription<T>) {
    useEffect(() => {
        if (!symbol || !channel) return;

        const ws = WebsocketManager.getInstance();
        ws.registerCallBack(channel, onMessage);
        if (channel === "kline") {
            ws.sendMessage({
                method: "SUBSCRIBE",
                params: [`${channel}.1m.${symbol}`],
            });
        } else if (channel === "depth") {
            ws.sendMessage({
                method: "SUBSCRIBE",
                params: [`${channel}.1000ms.${symbol}`],
            });
        } else {
            ws.sendMessage({
                method: "SUBSCRIBE",
                params: [`${channel}.${symbol}`],
            });
        }

        return () => {
            if (channel === "kline") {
                ws.sendMessage({
                    method: "UNSUBSCRIBE",
                    params: [`${channel}.1m.${symbol}`],
                });
            } else if (channel === "depth") {
                ws.sendMessage({
                    method: "UNSUBSCRIBE",
                    params: [`${channel}.1000ms.${symbol}`],
                });
            } else {
                ws.sendMessage({
                    method: "UNSUBSCRIBE",
                    params: [`${channel}.${symbol}`],
                });
            }
            ws.unregister(channel);
            onCleanup();
        };
    }, [symbol, channel]);
}
