import { createClient, RedisClientType } from "redis";
import { REDIS_QUEUE_NAME } from "../utils/constants";
import { MarketRegistry } from "./MarketRegistry";

export class RedisWorkerManager {
    private static instance: RedisWorkerManager | null = null;
    private subscribeClient: RedisClientType | null = null;
    private publishClient: RedisClientType | null = null;

    marketRegistry: MarketRegistry | null = null;

    constructor() {
        this.marketRegistry = MarketRegistry.getInstance();
        this.marketRegistry.createMarket("btc", "usd");
        console.log("Starting Redis Worker Manager ...");
    }

    private async subscribeClients() {
        this.subscribeClient = createClient();
        this.publishClient = createClient();
        await this.subscribeClient.connect();
        await this.publishClient.connect();
    }

    static async getInstance() {
        if (!RedisWorkerManager.instance) {
            const manager = new RedisWorkerManager();
            RedisWorkerManager.instance = manager;
        }
        await RedisWorkerManager.instance.subscribeClients();
        return this.instance;
    }

    async startWorker() {
        while (true) {
            const data = await this.subscribeClient?.brPop(REDIS_QUEUE_NAME, 0);
            try {
                if (!data) continue;
                const parsed = JSON.parse(data.element);
                const res = this.marketRegistry
                    ?.getBook("btc_usd")
                    .addOrder(parsed.data);
                this.publishClient?.publish(parsed.id, JSON.stringify(res));
            } catch (err) {
                console.error("err : ", err);
            }
        }
    }
}
