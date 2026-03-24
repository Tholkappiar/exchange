import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Engine } from "../trade/Engine";
import { BalanceManager } from "../trade/BalanceManager";
import { MarketRegistry } from "../trade/MarketRegistry";

// ─── shared state (persists across all tests) ────────────────────────────────

const engine = Engine.getInstance();
const balanceManager = BalanceManager.getInstance();
const marketRegistry = MarketRegistry.getInstance();

describe("Engine – real trading session (BTC_USDT)", () => {
    beforeAll(() => {
        marketRegistry.createMarket("BTC", "USDT");

        balanceManager.addUserBalance("alice", "BTC", 10);
        balanceManager.addUserBalance("alice", "USDT", 100_000);
        balanceManager.addUserBalance("bob", "BTC", 10);
        balanceManager.addUserBalance("bob", "USDT", 100_000);
    });

    afterAll(() => {
        marketRegistry.resetMarket("BTC", "USDT");
    });

    // ── 1. Alice places a limit bid at 30 000 – no asks yet, should rest OPEN
    it("1. alice places limit BID 1 BTC @ 30 000 → OPEN", async () => {
        const response = await engine.process({
            id: "req-1",
            type: "CREATE_ORDER",
            data: {
                orderID: "order-1",
                orderType: "Limit",
                side: "BID",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                userID: "alice",
                price: 30_000,
                quantity: 1,
                remaining: 1,
                createdAt: Date.now(),
            },
        });

        expect(response.success).toBe(true);
        const data = (response as any).data;
        expect(data.status).toBe("OPEN");
        expect(data.fills).toHaveLength(0);
        expect(data.remainingQuantity).toBe(1);
        expect(data.totalExecutedQuantity).toBe(0);
    });

    // ── 2. Bob places a limit ask at 30 000 – should fully fill against order-1
    it("2. bob places limit ASK 1 BTC @ 30 000 → FILLED against alice's bid", async () => {
        const response = await engine.process({
            id: "req-2",
            type: "CREATE_ORDER",
            data: {
                orderID: "order-2",
                orderType: "Limit",
                side: "ASK",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                userID: "bob",
                price: 30_000,
                quantity: 1,
                remaining: 1,
                createdAt: Date.now(),
            },
        });

        expect(response.success).toBe(true);
        const data = (response as any).data;
        // order-1 was 1 BTC @ 30 000 → this ask fully fills it
        expect(data.status).toBe("FILLED");
        expect(data.fills).toHaveLength(1);
        expect(data.fills[0].executedQuantity).toBe(1);
        expect(data.fills[0].price).toBe(30_000);
        expect(data.fills[0].oppositeUserId).toBe("alice");
        expect(data.remainingQuantity).toBe(0);
    });

    // ── 3. Book is now empty – alice places two resting limit bids
    it("3. alice places limit BID 2 BTC @ 29 500 → OPEN (book was cleared)", async () => {
        const response = await engine.process({
            id: "req-3",
            type: "CREATE_ORDER",
            data: {
                orderID: "order-3",
                orderType: "Limit",
                side: "BID",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                userID: "alice",
                price: 29_500,
                quantity: 2,
                remaining: 2,
                createdAt: Date.now(),
            },
        });

        expect(response.success).toBe(true);
        const data = (response as any).data;
        expect(data.status).toBe("OPEN");
        expect(data.remainingQuantity).toBe(2);
    });

    it("4. alice places limit BID 1 BTC @ 29 000 → OPEN", async () => {
        const response = await engine.process({
            id: "req-4",
            type: "CREATE_ORDER",
            data: {
                orderID: "order-4",
                orderType: "Limit",
                side: "BID",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                userID: "alice",
                price: 29_000,
                quantity: 1,
                remaining: 1,
                createdAt: Date.now(),
            },
        });

        expect(response.success).toBe(true);
        expect((response as any).data.status).toBe("OPEN");
    });

    // ── 5. Bob sends a market ASK for 2 BTC – should eat order-3 entirely
    it("5. bob places market ASK 2 BTC → FILLED at 29 500 (hits order-3)", async () => {
        const response = await engine.process({
            id: "req-5",
            type: "CREATE_ORDER",
            data: {
                orderID: "order-5",
                orderType: "Market",
                side: "ASK",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                userID: "bob",
                price: undefined,
                quantity: 2,
                remaining: 2,
                createdAt: Date.now(),
            },
        });

        expect(response.success).toBe(true);
        const data = (response as any).data;
        // order-3 had 2 BTC @ 29 500 – market ask of 2 fills it completely
        expect(data.status).toBe("FILLED");
        expect(data.fills).toHaveLength(1);
        expect(data.fills[0].executedQuantity).toBe(2);
        expect(data.fills[0].price).toBe(29_500);
        expect(data.totalExecutedQuantity).toBe(2);
        expect(data.remainingQuantity).toBe(0);
    });

    // ── 6. Order-4 (1 BTC @ 29 000) still rests – verify via GET_OPEN_ORDERS
    it("6. GET_OPEN_ORDERS for alice → only order-4 remains", async () => {
        const response = await engine.process({
            id: "req-6",
            type: "GET_OPEN_ORDERS",
            data: { userID: "alice", ticker: "BTC_USDT" },
        });

        expect(response.success).toBe(true);
        const data = (response as any).data;
        expect(data.openBids).toHaveLength(1);
        expect(data.openBids[0].orderID).toBe("order-4");
        expect(data.openBids[0].price).toBe(29_000);
        expect(data.openAsks).toHaveLength(0);
    });

    // ── 7. Bob places a limit ask above order-4 – should rest, not fill
    it("7. bob places limit ASK 1 BTC @ 31 000 → OPEN (price too high for order-4)", async () => {
        const response = await engine.process({
            id: "req-7",
            type: "CREATE_ORDER",
            data: {
                orderID: "order-6",
                orderType: "Limit",
                side: "ASK",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                userID: "bob",
                price: 31_000,
                quantity: 1,
                remaining: 1,
                createdAt: Date.now(),
            },
        });

        expect(response.success).toBe(true);
        expect((response as any).data.status).toBe("OPEN");
        expect((response as any).data.fills).toHaveLength(0);
    });

    // ── 8. GET_DEPTH should show both resting orders
    it("8. GET_DEPTH → bid @ 29 000 and ask @ 31 000", async () => {
        const response = await engine.process({
            id: "req-8",
            type: "GET_DEPTH",
            data: { ticker: "BTC_USDT" },
        });

        expect(response.success).toBe(true);
        const { bids, asks } = (response as any).data;

        expect(bids).toHaveLength(1);
        expect(bids[0][0]).toBe("29000");
        expect(bids[0][1]).toBe("1");

        expect(asks).toHaveLength(1);
        expect(asks[0][0]).toBe("31000");
        expect(asks[0][1]).toBe("1");
    });

    // ── 9. Alice cancels her resting order-4
    it("9. alice cancels order-4 (1 BTC @ 29 000) → cancelledQuantity = 1", async () => {
        const response = await engine.process({
            id: "req-9",
            type: "CANCEL_ORDER",
            data: {
                orderID: "order-4",
                userID: "alice",
                side: "BID",
                ticker: "BTC_USDT",
            },
        });

        expect(response.success).toBe(true);
        expect((response as any).data.cancelledQuantity).toBe(1);
    });

    // ── 10. After cancel, depth bids should be empty
    it("10. GET_DEPTH after cancel → bids empty, ask @ 31 000 still there", async () => {
        const response = await engine.process({
            id: "req-10",
            type: "GET_DEPTH",
            data: { ticker: "BTC_USDT" },
        });

        expect(response.success).toBe(true);
        const { bids, asks } = (response as any).data;
        expect(bids).toHaveLength(0);
        expect(asks).toHaveLength(1);
        expect(asks[0][0]).toBe("31000");
    });

    // ── 11. Alice places a market BID that hits bob's resting ask @ 31 000
    it("11. alice places market BID qty=1 → FILLED at 31 000 (hits order-6)", async () => {
        const response = await engine.process({
            id: "req-11",
            type: "CREATE_ORDER",
            data: {
                orderID: "order-7",
                orderType: "Market",
                side: "BID",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                userID: "alice",
                price: undefined,
                quantity: 1,
                remaining: 1,
                createdAt: Date.now(),
            },
        });

        expect(response.success).toBe(true);
        const data = (response as any).data;
        expect(data.status).toBe("FILLED");
        expect(data.fills[0].price).toBe(31_000);
        expect(data.fills[0].executedQuantity).toBe(1);
        expect(data.fills[0].oppositeUserId).toBe("bob");
    });

    // ── 12. Book is completely empty now – market order should be REJECTED
    it("12. market BID on empty book → REJECTED with NO_LIQUIDITY", async () => {
        const response = await engine.process({
            id: "req-12",
            type: "CREATE_ORDER",
            data: {
                orderID: "order-8",
                orderType: "Market",
                side: "BID",
                baseAsset: "BTC",
                quoteAsset: "USDT",
                userID: "alice",
                quantity: 1,
                remaining: 1,
                createdAt: Date.now(),
            },
        });

        expect(response.success).toBe(true);
        const data = (response as any).data;
        expect(data.status).toBe("REJECTED");
        expect(data.reason).toBe("NO_LIQUIDITY");
    });
});
