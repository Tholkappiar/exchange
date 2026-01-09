import express from 'express'
import { ROUTES } from './constants/route'
import type { order_type } from './types/trade_book'
import { OrderBook } from './calculations/order_book'

const app = express()
const order_book = new OrderBook()

app.use(express.json())

app.post(ROUTES.ORDER_ROUTE, (req,res) => {
    const data: order_type  = req.body
    const response = order_book.process_order(data)
    res.send(response ? "Done": "Failed")
})

app.get('/trade_book', (req,res)=> {
    res.send(order_book.get_order_book())
})


app.listen(3000, ()=>console.log('Server started on PORT 3000'))