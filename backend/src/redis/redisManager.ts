import { createClient, RedisClientType } from "redis";
import { REDIS_QUEUE_NAME } from "../utils/constants";
import { MarketRegistry } from "../trade/MarketRegistry";
import { Engine, EngineRequest } from "../trade/Engine";
import { EngineRequestSchema } from "../zod/EngineSchema";

export class RedisManager {
    private static instance: RedisManager | null = null;
    private subscribeClient: RedisClientType | null = null;
    private publishClient: RedisClientType | null = null;

    private engine: Engine;
    private marketRegistry: MarketRegistry;

    private constructor() {
        this.engine = Engine.getInstance();
        this.marketRegistry = MarketRegistry.getInstance();

        this.marketRegistry.createMarket("BTC", "USDT");
        this.marketRegistry.createMarket("ETH", "USDT");

        console.log("[RedisManager] Initialized");
    }

    private async connectClients() {
        this.subscribeClient = createClient();
        this.publishClient = createClient();
        await this.subscribeClient.connect();
        await this.publishClient.connect();
        console.log("[RedisManager] Redis clients connected");
    }

    static async getInstance(): Promise<RedisManager> {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        await RedisManager.instance.connectClients();
        return RedisManager.instance;
    }

    async startWorker() {
        console.log("[RedisManager] Worker started, waiting for messages...");

        while (true) {
            try {
                const data = await this.subscribeClient?.brPop(
                    REDIS_QUEUE_NAME,
                    0,
                );
                if (!data) continue;

                const request: EngineRequest = JSON.parse(data.element);
                const response = this.engine.process(request);
                await this.publishClient?.publish(
                    request.id,
                    JSON.stringify(response),
                );
            } catch (err) {
                console.error("[RedisManager] Error processing message:", err);
            }
        }
    }

    sendAndAwait(data: unknown) {
        const id = this.getRandomClientID();
        const payload = { ...(data as object), id };

        const result = EngineRequestSchema.safeParse(payload);
        if (!result.success) {
            return Promise.resolve({
                success: false,
                error: result.error,
            });
        }

        return new Promise((res) => {
            this.subscribeClient?.subscribe(id, (message) => {
                this.subscribeClient?.unsubscribe(id);
                res(JSON.parse(message));
            });

            this.publishClient?.lPush(
                REDIS_QUEUE_NAME,
                JSON.stringify(result.data),
            );
        });
    }

    private getRandomClientID() {
        return (
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
        );
    }
}
