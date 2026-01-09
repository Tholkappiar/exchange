import { atom } from "jotai";

export enum TradeOption {
    BUY = "BUY",
    SELL = "SELL",
}

export const BuyOrSellTradeOption = atom<TradeOption>(TradeOption.BUY);

type Price = {
    price: number | null;
    quantity: number | null;
    total: number | null;
};

export const priceAtom = atom<Price>({
    price: null,
    quantity: null,
    total: null,
});
