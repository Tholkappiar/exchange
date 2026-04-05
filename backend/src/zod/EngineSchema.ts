import { z } from "zod";
import { ORDER_TYPES } from "../utils/constants";

// ─── shared primitives ───────────────────────────────────────────────────────

const OrderSideSchema = z.enum(["BID", "ASK"]);
const OrderTypeSchema = z.enum(["Market", "Limit"]);

// ─── order (base shape used by CREATE_ORDER) ─────────────────────────────────

export const OrderSchema = z.object({
    orderType: OrderTypeSchema,
    side: OrderSideSchema,
    baseAsset: z.string().min(1),
    quoteAsset: z.string().min(1),
    userID: z.string(),
    price: z.number().positive(),
    quantity: z.number().positive(),
    // remaining: z.number().positive(),
});

// ─── individual payload schemas ──────────────────────────────────────────────

export const CreateOrderPayloadSchema = OrderSchema;

export const CancelOrderPayloadSchema = z.object({
    orderID: z.uuid(),
    userID: z.string().min(1),
    side: OrderSideSchema,
    ticker: z.string().min(1),
});

export const GetOpenOrdersPayloadSchema = z.object({
    userID: z.string().min(1),
    ticker: z.string().min(1),
});

export const GetDepthPayloadSchema = z.object({
    ticker: z.string().min(1),
    limit: z.number().int().positive().optional(),
});

export const ResetBookPayloadSchema = z.object({
    baseAsset: z.string().min(1),
    quoteAsset: z.string().min(1),
});

// ─── full discriminated union

export const EngineRequestSchema = z.discriminatedUnion("type", [
    z.object({
        id: z.string().min(1),
        type: z.literal(ORDER_TYPES.CREATE_ORDER),
        data: CreateOrderPayloadSchema,
    }),
    z.object({
        id: z.string().min(1),
        type: z.literal(ORDER_TYPES.CANCEL_ORDER),
        data: CancelOrderPayloadSchema,
    }),
    z.object({
        id: z.string().min(1),
        type: z.literal(ORDER_TYPES.GET_OPEN_ORDERS),
        data: GetOpenOrdersPayloadSchema,
    }),
    z.object({
        id: z.string().min(1),
        type: z.literal(ORDER_TYPES.GET_DEPTH),
        data: GetDepthPayloadSchema,
    }),
    z.object({
        id: z.string().min(1),
        type: z.literal(ORDER_TYPES.RESET_BOOK),
        data: ResetBookPayloadSchema,
    }),
]);

// ─── inferred types

export type EngineRequestInput = z.infer<typeof EngineRequestSchema>;
