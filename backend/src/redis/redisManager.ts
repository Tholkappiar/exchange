import { createClient, RedisClientType } from "redis";
import { REDIS_QUEUE_NAME } from "../utils/constants";
import { EngineRequestSchema } from "../zod/EngineSchema";

export class RedisManager {
    private static instance: RedisManager;

    private publishClient: RedisClientType | null = null;
    private subscribeClient: RedisClientType | null = null;

    private constructor() {
        console.log("Starting REDIS Manager ...");
    }

    public static async getInstance(): Promise<RedisManager> {
        if (!RedisManager.instance) {
            const manager = new RedisManager();
            await manager.createClients();
            RedisManager.instance = manager;
        }
        return RedisManager.instance;
    }

    private async createClients() {
        this.publishClient = createClient();
        this.subscribeClient = createClient();

        await this.publishClient.connect();
        await this.subscribeClient.connect();
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
