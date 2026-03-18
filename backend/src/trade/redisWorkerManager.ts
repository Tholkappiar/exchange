import { createClient, RedisClientType } from "redis";
import { REDIS_QUEUE_NAME } from "../utils/constants";
import { MarketRegistry } from "./MarketRegistry";
import { Engine, EngineRequest } from "./Engine";

export class RedisWorkerManager {
    private static instance: RedisWorkerManager | null = null;
    private subscribeClient: RedisClientType | null = null;
    private publishClient: RedisClientType | null = null;

    private engine: Engine;
    private marketRegistry: MarketRegistry;

    private constructor() {
        this.engine = Engine.getInstance();
        this.marketRegistry = MarketRegistry.getInstance();

        this.marketRegistry.createMarket("BTC", "USDT");
        this.marketRegistry.createMarket("ETH", "USDT");

        console.log("[RedisWorkerManager] Initialized");
    }

    private async connectClients() {
        this.subscribeClient = createClient();
        this.publishClient = createClient();
        await this.subscribeClient.connect();
        await this.publishClient.connect();
        console.log("[RedisWorkerManager] Redis clients connected");
    }

    static async getInstance(): Promise<RedisWorkerManager> {
        if (!RedisWorkerManager.instance) {
            RedisWorkerManager.instance = new RedisWorkerManager();
        }
        await RedisWorkerManager.instance.connectClients();
        return RedisWorkerManager.instance;
    }

    async startWorker() {
        console.log(
            "[RedisWorkerManager] Worker started, waiting for messages...",
        );

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
                console.error(
                    "[RedisWorkerManager] Error processing message:",
                    err,
                );
            }
        }
    }
}
