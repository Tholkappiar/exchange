import { atom } from "jotai";

export enum CurrentOrderBookType {
    BOOK = "BOOK",
    TRADES = "TRADES",
}

export const CurrentOrderBookTab = atom<CurrentOrderBookType>(
    CurrentOrderBookType.BOOK
);
