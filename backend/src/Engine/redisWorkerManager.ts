import { createClient, RedisClientType } from "redis";
import { REDIS_QUEUE_NAME } from "../utils/constants";

export class RedisWorkerManager {
    private static instance: RedisWorkerManager | null = null;
    private subscribeClient: RedisClientType | null = null;
    private publishClient: RedisClientType | null = null;

    constructor() {
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
                console.log("parsed : ", parsed);
                this.publishClient?.publish(parsed.id, JSON.stringify(parsed));
            } catch (err) {
                console.error("err : ", err);
            }
        }
    }
}
