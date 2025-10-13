/**
 * TypeScript definitions for the realtime pub/sub SDK client.
 */

export interface ClientConfig {
	/** API key for authentication */
	apiKey: string;
}

/**
 * Logger interface for Brook SDK
 */
export interface Logger {
	/** Log info messages */
	info(...args: any[]): void;
	/** Log error messages */
	error(...args: any[]): void;
	/** Log warning messages */
	warn(...args: any[]): void;
	/** Log debug messages */
	debug(...args: any[]): void;
}

export interface MessageMetadata {
	/** Message offset in the channel */
	offset?: number;
	/** Message timestamp */
	timestamp?: number;
	/** Whether this is a replayed message */
	replay?: boolean;
	/** Channel name */
	channel: string;
}

export type MessageHandler = (data: any, metadata: MessageMetadata) => void;
export type ConnectivityCallback = (status: string) => void;
export type UnsubscribeFunction = () => void;

export interface ChannelStats {
	/** Channel name */
	name: string;
	/** Number of stream handlers */
	streamHandlers: number;
	/** Connection state */
	connectionState: string;
}

export interface ConnectionStats {
	/** Connection state */
	state: string;
	/** Client ID */
	clientId: string;
	/** Authentication status */
	isAuthenticated: boolean;
	/** Number of reconnection attempts */
	reconnectAttempts: number;
	/** Number of queued messages */
	queuedMessages: number;
	/** Last pong timestamp */
	lastPongTime?: number;
	/** Backoff status */
	backoffStatus: any;
}

export interface PackageStats {
	/** Connection statistics */
	connection: ConnectionStats;
	/** Channel statistics by name */
	channels: Record<string, ChannelStats>;
	/** Number of active channels */
	activeChannels: number;
}

export interface ConnectivitySubscriber {
	/** Subscribe to connectivity status changes */
	subscribe(callback: ConnectivityCallback): void;
}

/**
 * Stream class for handling individual streams within channels
 */
export declare class Stream {
	constructor(options: { channelName: string; connection: any });

	/** Start streaming with the provided handler */
	start(handler: MessageHandler): void;

	/** Stop the stream */
	stop(): void;

	/** Get the current stream status */
	getStatus(): string;
}

/**
 * Channel class for pub/sub messaging with stream management
 */
export declare class Channel {
	/** Channel name */
	readonly name: string;

	/**
	 * Subscribe to messages on this channel
	 * @param callback Function to handle incoming messages
	 * @returns Unsubscribe function
	 */
	stream(callback: MessageHandler): UnsubscribeFunction;

	/**
	 * Unsubscribe a specific callback from the channel
	 * @param callback The callback to unsubscribe
	 */
	unstream(callback: MessageHandler): void;

	/**
	 * Publish a message to the channel via WebSocket
	 * @param message Message payload to publish
	 */
	publish(message: any): Promise<void>;

	/**
	 * Alias for publish() method for backward compatibility
	 * @param message Message payload to send
	 */
	send(message: any): Promise<void>;

	/**
	 * Close the channel and stop receiving messages
	 */
	close(): void;

	/**
	 * Get channel statistics
	 */
	getStats(): ChannelStats;
}

/**
 * Realtime interface for creating channels
 */
export interface RealtimeInterface {
	/** Create or retrieve a channel */
	channel(name: string): Channel;
}

/**
 * Fault tolerant realtime SDK
 */
export declare class Package {
	/** Configuration object */
	readonly config: ClientConfig;

	/** Realtime interface for channel management */
	readonly realtime: RealtimeInterface;

	/** Connectivity subscriber interface */
	readonly connectivity: ConnectivitySubscriber;

	/** Logger instance */
	readonly log: Logger;

	/**
	 * Create a new Package instance
	 * @param config Client configuration
	 */
	constructor(config: ClientConfig);

	/**
	 * Connect to the WebSocket server
	 * @returns Promise resolving to connection success status
	 */
	connect(): Promise<boolean>;

	/**
	 * Disconnect from the server and clean up resources
	 */
	disconnect(): void;

	/**
	 * Create or retrieve a channel instance
	 * @param name Channel name/topic
	 * @returns Channel instance
	 */
	createChannel(name: string): Channel;

	/**
	 * Get current connection status
	 */
	getConnectionStatus(): string;

	/**
	 * Check if connection is authenticated
	 */
	isAuthenticated(): boolean;

	/**
	 * Get the client ID for this connection
	 */
	getClientId(): string;

	/**
	 * Get all active channel names
	 */
	getActiveChannels(): string[];

	/**
	 * Get statistics for all channels and connection
	 */
	getStats(): PackageStats;

	/**
	 * Publish a message via HTTP API (fallback method)
	 * @param channel Channel name to publish to
	 * @param message Message payload to publish
	 */
	publishHttp(channel: string, message: any): Promise<any>;

	/**
	 * Check if client is currently connected
	 */
	isConnected(): boolean;

	/**
	 * Subscribe to connectivity status changes
	 * @param callback Callback function for connectivity changes
	 */
	subscribeToConnectivity(callback: ConnectivityCallback): void;

	/**
	 * Clean up all resources
	 */
	cleanup(): void;
}

export default Package;
