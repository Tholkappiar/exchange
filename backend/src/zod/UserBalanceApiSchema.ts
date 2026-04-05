import * as z from "zod";

export const getBalanceSchema = z.object({
    asset: z.string().min(3),
});

export const setBalanceSchema = z.object({
    asset: z.string().min(3),
    amount: z.number().positive().gte(1).lte(1000000),
});
