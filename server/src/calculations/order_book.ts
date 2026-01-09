import { randomUUID } from "crypto";
import { CONSTANTS, filled_book_type, order_type, trade_book_type } from "../types/trade_book";

export class OrderBook {
    order_book: trade_book_type;
    filled_book: filled_book_type;
    constructor() {
        this.order_book = {
            asks: [], 
            bids: []
        }
        this.filled_book = {
            asks: [],
            bids: []
        }
    }


    bid(trade: order_type) {
        this.order_book.asks.sort((a,b) => a.price - b.price)
        let index = 0;
        let temp_trade_quantity = trade.quantity
        while(index < this.order_book.asks.length && temp_trade_quantity > 0) {
            const each_order = this.order_book.asks[index]
            if(trade.price < each_order.price) {
                break;
            }

            const filled_quantity = Math.min(temp_trade_quantity, each_order.quantity);
            temp_trade_quantity -= filled_quantity
            each_order.quantity -= filled_quantity
            this.filled_book.asks.push({
                order_id: randomUUID(),
                quantity: filled_quantity,
                side: "ask"
            })
            this.filled_book.bids.push({
                order_id: randomUUID(),
                quantity: filled_quantity,
                side: 'bid'
            })

            if(each_order.quantity === 0) {
                this.order_book.asks.splice(index, 1)
            } else {
                index++;
            }
        }
        if(temp_trade_quantity > 0) {
            this.order_book.bids.push(trade)
            this.order_book.bids.sort((a,b) => b.price - a.price)
        }
    }

    ask(trade: order_type) {    
        this.order_book.bids.sort((a,b) => b.price - a.price)
        let index = 0;
        let temp_trade_quantity = trade.quantity;
        while(index < this.order_book.bids.length && temp_trade_quantity > 0) {
            const each_order = this.order_book.bids[index]
            if(trade.price > each_order.price) {
                break;
            }

            const filled_quantity = Math.min(temp_trade_quantity, each_order.quantity);
            temp_trade_quantity -= filled_quantity
            each_order.quantity -= filled_quantity
            this.filled_book.asks.push({
                order_id: randomUUID(),
                quantity: filled_quantity,
                side: "ask"
            })
            this.filled_book.bids.push({
                order_id: randomUUID(),
                quantity: filled_quantity,
                side: 'bid'
            })

            if(each_order.quantity === 0) {
                this.order_book.bids.splice(index, 1)
            } else {
                index++;
            }
        }
        if(temp_trade_quantity > 0) {
            this.order_book.asks.push(trade)
            this.order_book.asks.sort((a,b) => a.price - b.price)
        }
    }

    process_order(trade: order_type) {
        const maxFillableQuantity = this.get_fill_amount(trade)
        if(trade.type === "ioc" && maxFillableQuantity < trade.quantity) {
            return false
        }
        if(trade.side === CONSTANTS.ASK) {
            this.ask(trade)
        } else {
            this.bid(trade)
        }
        return true
    }

    get_fill_amount(order: order_type) : number {
        if(order.side === CONSTANTS.ASK) {
            let total_bids = 0;
            this.order_book.bids.forEach(each_order => {
                if(each_order.price >= order.price) {
                    total_bids += each_order.quantity
                }
            })
            return total_bids;
        } else {
            let total_asks = 0;
            this.order_book.asks.forEach(each_order => {
                if(each_order.price <= order.price) {
                    total_asks += each_order.quantity
                }
            })
            return total_asks;
        }
    }

    get_order_book() {
        return this.order_book
    }
}