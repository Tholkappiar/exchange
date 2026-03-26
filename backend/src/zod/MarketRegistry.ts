import * as z from "zod";

export const getTickerSchema = z.object({
    symbol: z.string(),
});
