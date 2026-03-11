// export class Engine {
//     private instance: Engine | null = null;

import { RedisWorkerManager } from "./redisWorkerManager";

//     constructor() {
//         console.log("Staring ENGINE ...");
//     }

//     getInstance() {
//         if (!this.instance) {
//             this.instance = new Engine();
//         }
//         return this.instance;
//     }
// }

async function main() {
    const manager = await RedisWorkerManager.getInstance();
    manager?.startWorker();
}

main();
