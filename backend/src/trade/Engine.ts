export class Engine {
    private static instance: Engine | null;

    private constructor() {
        Engine.instance = null;
    }

    static getInstance() {
        if (!Engine.instance) {
            Engine.instance = new Engine();
        }
        return Engine.instance;
    }

    // processOrder(request) {
    //     const orderType = request.type;
    //     if(orderType === ORDER_TYPES.CREATE_ORDER) {
    //         this.createOrder(request)
    //     }
    // }

    // createOrder() {

    // }
}
