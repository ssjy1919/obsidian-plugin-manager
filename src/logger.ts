import { store } from "./store";

const LOG_PREFIX = "[Control Center]";

export function debugLog(...args: unknown[]): void {
	if (store.getState().settings.debugLogs) {
		console.log(LOG_PREFIX, ...args);
	}
}

export function debugError(...args: unknown[]): void {
	if (store.getState().settings.debugLogs) {
		console.error(LOG_PREFIX, ...args);
	}
}
