import { EventEmitter } from "node:events";
export const orderEvents = new EventEmitter();
orderEvents.setMaxListeners(200);
export function notifyOrder(storeId: string, id: string) {
  orderEvents.emit(storeId, { id });
}
