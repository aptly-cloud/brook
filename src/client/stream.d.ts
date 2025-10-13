/**
 * TypeScript definitions for the Stream class.
 */

import type { Connection } from './connection.js';

export interface StreamOptions {
	/** Current message offset */
	offset: number;
	/** Channel name for the stream */
	channelName: string;
	/** WebSocket connection instance */
	connection: Connection;
}

export type MessageHandler = (data: any, metadata: any) => void;

/**
 * Stream class for handling individual message streams within channels.
 */
export declare class Stream {
	/** Current message offset */
	offset: number;

	/** Stream state */
	state: string;

	/** Channel name this stream belongs to */
	readonly channelName: string;

	/** WebSocket connection instance */
	readonly connection: Connection;

	/** Message handler function */
	handler?: MessageHandler;

	/**
	 * Create a new Stream instance
	 * @param options Stream configuration options
	 */
	constructor(options: StreamOptions);

	/**
	 * Start the stream with a message handler
	 * @param handler Function to handle incoming messages
	 */
	start(handler: MessageHandler): void;

	/**
	 * Stop the stream
	 */
	stop(): void;

	/**
	 * Get the current stream status
	 * @returns Current stream status
	 */
	getStatus(): string;
}

export default Stream;
