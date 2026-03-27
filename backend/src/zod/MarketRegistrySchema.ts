import * as z from "zod";

export const getTickerSchema = z.string().min(3);
