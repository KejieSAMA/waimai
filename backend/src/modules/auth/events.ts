import { EventEmitter } from "node:events";
export const sessionEvents = new EventEmitter();
sessionEvents.setMaxListeners(200);
export const sessionChanged = (userId: string) => sessionEvents.emit(userId);
