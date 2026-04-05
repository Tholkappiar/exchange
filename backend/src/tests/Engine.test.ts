import "dotenv/config";
import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";

// Mock DB calls
vi.mock("../DB/transactions", () => ({
    DbOrderCreation: vi.fn().mockResolvedValue(undefined),
    DbOrderCancel: vi.fn().mockResolvedValue(undefined),
}));

import request from "supertest";
import { app } from "..";

const TEST_JWT = process.env.TEST_USER_TOKEN;

let capturedOrderId4: string;
let TEST_USER_ID: string;

beforeAll(async () => {
    TEST_USER_ID = "test_user_01";

    // Seed balances
    const btc = await post("/balances", { asset: "BTC", amount: 10 });
    const usdt = await post("/balances", { asset: "USDT", amount: 100_000 });

    if (btc.status !== 200 || usdt.status !== 200) {
        throw new Error(
            `Balance seeding failed: ${JSON.stringify({ btc: btc.body, usdt: usdt.body })}`,
        );
    }
    console.log("✅ Balances seeded");
});

afterAll(() => {});

async function post(path: string, body: any) {
    const res = await request(app)
        .post(path)
        .set({
            "Content-Type": "application/json",
            Authorization: `Bearer ${TEST_JWT}`,
        })
        .send(body);

    const json = res.body;
    if (!json.success && path !== "/balances") {
        console.error(`❌ POST ${path} failed:`, JSON.stringify(json));
    }
    return { status: res.status, body: json };
}

async function get(path: string) {
    const res = await request(app)
        .get(path)
        .set({ Authorization: `Bearer ${TEST_JWT}` });

    return { status: res.status, body: res.body };
}

describe("Full Trading Session via HTTP Endpoints (BTC_USDT)", () => {
    it("1. Limit BID 1 BTC @ 30000 → OPEN", async () => {
        const { status, body } = await post("/order", {
            type: "CREATE_ORDER",
            data: {
                orderType: "Limit",
                side: "BID",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                price: 30000,
                quantity: 1,
                userID: TEST_USER_ID,
            },
        });

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.status).toBe("OPEN");
        expect(body.data.remainingQuantity).toBe(1);
        expect(body.data.fills).toHaveLength(0);
        expect(body.data.orderID).toBeDefined();
    });

    it("2. Limit ASK 1 BTC @ 30000 → FILLED", async () => {
        const { status, body } = await post("/order", {
            type: "CREATE_ORDER",
            data: {
                orderType: "Limit",
                side: "ASK",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                price: 30000,
                quantity: 1,
                userID: TEST_USER_ID,
            },
        });

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.status).toBe("FILLED");
        expect(body.data.fills).toHaveLength(1);
        expect(body.data.fills[0].executedQuantity).toBe(1);
        expect(body.data.fills[0].price).toBe(30000);
        expect(body.data.remainingQuantity).toBe(0);
    });

    it("3. Limit BID 2 BTC @ 29500 → OPEN", async () => {
        const { status, body } = await post("/order", {
            type: "CREATE_ORDER",
            data: {
                orderType: "Limit",
                side: "BID",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                price: 29500,
                quantity: 2,
                userID: TEST_USER_ID,
            },
        });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.status).toBe("OPEN");
        expect(body.data.remainingQuantity).toBe(2);
    });

    it("4. Limit BID 1 BTC @ 29000 → OPEN (captures orderID)", async () => {
        const { status, body } = await post("/order", {
            type: "CREATE_ORDER",
            data: {
                orderType: "Limit",
                side: "BID",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                price: 29000,
                quantity: 1,
                userID: TEST_USER_ID,
            },
        });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.status).toBe("OPEN");
        capturedOrderId4 = body.data.orderID;
        expect(capturedOrderId4).toBeDefined();
    });

    it("5. Market ASK 2 BTC → FILLED at 29500", async () => {
        const { status, body } = await post("/order", {
            type: "CREATE_ORDER",
            data: {
                orderType: "Market",
                side: "ASK",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                quantity: 2,
                price: 1,
                userID: TEST_USER_ID,
            },
        });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.status).toBe("FILLED");
        expect(body.data.totalExecutedQuantity).toBe(2);
        expect(body.data.fills[0].price).toBe(29500);
    });

    it("6. GET_OPEN_ORDERS → only 29000 bid remains", async () => {
        const { status, body } = await post("/order", {
            type: "GET_OPEN_ORDERS",
            data: {
                ticker: "BTC_USDT",
                userID: TEST_USER_ID,
            },
        });

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.openBids).toHaveLength(1);
        expect(body.data.openBids[0].price).toBe(29000);
        expect(body.data.openAsks).toHaveLength(0);
    });

    it("7. Limit ASK 1 BTC @ 31000 → OPEN", async () => {
        const { status, body } = await post("/order", {
            type: "CREATE_ORDER",
            data: {
                orderType: "Limit",
                side: "ASK",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                price: 31000,
                quantity: 1,
                userID: TEST_USER_ID,
            },
        });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.status).toBe("OPEN");
    });

    it("8. GET_DEPTH → bid @29000 | ask @31000", async () => {
        const { status, body } = await post("/order", {
            type: "GET_DEPTH",
            data: { ticker: "BTC_USDT", limit: 10 },
        });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        const { bids, asks } = body.data;
        expect(bids).toHaveLength(1);
        expect(bids[0][0]).toBe("29000");
        expect(bids[0][1]).toBe("1");
        expect(asks).toHaveLength(1);
        expect(asks[0][0]).toBe("31000");
        expect(asks[0][1]).toBe("1");
    });

    it("9. CANCEL_ORDER the 29000 bid", async () => {
        const { status, body } = await post("/order", {
            type: "CANCEL_ORDER",
            data: {
                orderID: capturedOrderId4,
                side: "BID",
                ticker: "BTC_USDT",
                userID: TEST_USER_ID,
            },
        });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.cancelledQuantity).toBeGreaterThan(0);
    });

    it("10. Market BID 1 BTC → FILLED at 31000", async () => {
        const { status, body } = await post("/order", {
            type: "CREATE_ORDER",
            data: {
                orderType: "Market",
                side: "BID",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                quantity: 1,
                price: 1,
                userID: TEST_USER_ID,
            },
        });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.status).toBe("FILLED");
        expect(body.data.fills[0].price).toBe(31000);
    });

    it("11. GET /tickers → updated data", async () => {
        const { status, body } = await get("/tickers");
        expect(status).toBe(200);
        expect(body).toBeDefined();
    });

    it("12. GET /tickers/BTC_USDT → lastPrice > 0", async () => {
        const { status, body } = await get("/tickers/BTC_USDT");
        expect(status).toBe(200);
        expect(body.ticker.lastPrice).toBeGreaterThan(0);
    });

    it("13. GET /balances?asset=USDT → final balance", async () => {
        const { status, body } = await get("/balances?asset=USDT");
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.free).toBeDefined();
    });

    it("14. Market BID on empty book → REJECTED", async () => {
        const { status, body } = await post("/order", {
            type: "CREATE_ORDER",
            data: {
                orderType: "Market",
                side: "BID",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                quantity: 1,
                price: 1,
                userID: TEST_USER_ID,
            },
        });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.status).toBe("REJECTED");
        expect(body.data.reason).toBe("NO_LIQUIDITY");
    });
});
