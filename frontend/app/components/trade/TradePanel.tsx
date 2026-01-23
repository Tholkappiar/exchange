import { BuyOrSellTradeOption, priceAtom, TradeOption } from "@/app/stores/tradingPanel"
import { useAtom } from "jotai"
import { ChangeEvent, memo } from "react"


const BaseTradingPanel = () => {
    const [buyOrSell, setBuyOrSell] = useAtom(BuyOrSellTradeOption)
    const [panelData, setPanelData] = useAtom(priceAtom)

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        try {
            const cleaned = value
                .replace(/[^0-9.]/g, "")
                .replace(/(\..*)\./g, "$1");
            setPanelData((prev) => (
                {
                    ...prev,
                    [name]: cleaned
                }
            ))
        } catch (err) {
            console.error('err : ', err)
        }
    }


    return (
        <div className='h-full px-4 py-8'>
            <div className="flex h-12 w-full overflow-hidden rounded-xl">
                <button className={`w-full overflow-hidden rounded-xl text-sm font-semibold ${buyOrSell === TradeOption.BUY ? "bg-green-100 text-green-600" : "bg-gray-900"}`} onClick={() => setBuyOrSell(TradeOption.BUY)}>Buy / Long</button>
                <button className={`w-full rounded-xl text-sm font-semibold text-low-emphasis ${buyOrSell === TradeOption.SELL ? "bg-red-100 text-red-600" : "bg-gray-900"}`} onClick={() => setBuyOrSell(TradeOption.SELL)}>Sell / Short</button>
            </div>

            <div className='flex flex-col gap-2 my-4'>
                <div>
                    <p className='my-2 text-sm'>Price</p>
                    <input type="text" inputMode='numeric' pattern='[0-9]*'
                        onChange={onChange}
                        value={panelData?.price ?? ""}
                        name='price'
                        placeholder='$' className='border p-2 bg-gray-900 w-full rounded-lg text-lg font-mono outline-none' />
                </div>
                <div>
                    <p className='my-2 text-sm'>Quantity</p>
                    <input type="text" inputMode='numeric' pattern='[0-9]*'
                        name='quantity'
                        value={panelData.quantity ?? ""}
                        onChange={onChange}
                        placeholder='0' className='border p-2 bg-gray-900 w-full rounded-lg text-lg font-mono outline-none' />
                </div>
                <div>
                    <p className='my-2 text-sm'>Total</p>
                    <input type="text" inputMode='numeric' pattern='[0-9]*'
                        name='total'
                        onChange={onChange}
                        value={panelData.total ?? ""}
                        placeholder='0' className='border p-2 bg-gray-900 w-full rounded-lg text-lg font-mono outline-none' />
                </div>
                <EasySplit />
                <div className='flex'>
                    {
                        buyOrSell === TradeOption.BUY ?
                            <button className={`p-2 flex-1 text-md rounded-lg bg-green-100 text-green-600`} onClick={() => setBuyOrSell(TradeOption.BUY)}>Buy</button> :
                            <button className={`p-2 flex-1 text-md rounded-lg bg-red-100 text-red-600`} onClick={() => setBuyOrSell(TradeOption.SELL)}>Sell</button>
                    }
                </div>
            </div>
        </div>
    )
}

export const TradingPanel = memo(BaseTradingPanel)

const EasySplit = () => {
    const EasySplitVolume = [25, 50, 75, 100]
    return (
        <div className='flex gap-4 my-4'>
            {
                EasySplitVolume.map(value => (
                    <p key={value} className='bg-gray-800 p-2 rounded-xl text-xs'>{value}%</p>
                ))
            }
        </div>
    )
}
