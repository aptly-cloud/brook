/**
 * TypeScript definitions for Brook React SDK.
 * Provides React hooks and components for integrating Brook real-time messaging.
 */

import React from 'react';

// Re-export types from main SDK
export type {
	MessageMetadata,
	MessageHandler,
	ConnectivityCallback,
	UnsubscribeFunction,
	ChannelStats,
	ConnectionStats,
	PackageStats,
	Channel,
	Package,
	Logger,
} from '../index';

import type { Package, Logger } from '../index';

/**
 * Brook context value containing the client instance
 */
export interface BrookContextValue {
	/** The Brook client instance */
	client: Package;
	/** Optional logger instance (alias for client.log) */
	log?: Logger;
}

/**
 * Return value from useStream hook
 */
export interface UseStreamReturn {
	/** Whether currently streaming */
	streaming: boolean;
	/** Function to unsubscribe */
	unsubscribe: () => void;
	subscribe: () => void;
}

/**
 * Return value from useLazyStream hook
 */
export interface UseLazyStreamReturn {
	/** The latest message received */
	message: any;
	/** Metadata for the latest message */
	metadata: any;
	/** Whether currently streaming */
	streaming: boolean;
	/** Function to manually subscribe */
	subscribe: () => void;
	/** Function to unsubscribe */
	unsubscribe: () => void;
}

/**
 * Return value from useConnection hook
 */
export interface UseConnectionReturn {
	/** Current connection status */
	status: string;
}

/**
 * Props for BrookProvider component
 */
export interface BrookProviderProps {
	/** Brook client configuration/instance */
	config: Package;
	/** Child components to wrap */
	children: React.ReactNode;
}

/**
 * BrookProvider component that provides Brook client context to React components.
 * Manages the client instance and connection state across the component tree.
 */
export declare const BrookProvider: React.FC<BrookProviderProps>;

/**
 * Hook to access the Brook context.
 *
 * @returns Brook context containing client and connection state
 * @throws Error if used outside of BrookProvider
 */
export declare function useBrookContext(): BrookContextValue;

/**
 * Hook for subscribing to a Brook stream/channel.
 * Automatically subscribes when connected and topic is provided.
 *
 * @param topic - The channel/topic name to subscribe to
 * @param callback - Callback function invoked when messages are received
 * @returns Object containing streaming state and unsubscribe function
 */
export declare function useStream(
	topic: string,
	callback: (message: any, metadata: any) => void
): UseStreamReturn;

/**
 * Hook for lazy subscribing to a Brook stream/channel.
 * Requires manual subscription via the returned subscribe function.
 *
 * @param topic - The channel/topic name to subscribe to
 * @returns Object containing message data, streaming state, and control functions
 */
export declare function useLazyStream(topic: string): UseLazyStreamReturn;

/**
 * Hook for publishing messages to a Brook channel.
 *
 * @param topic - The channel/topic name to publish to
 * @returns Function to publish messages to the specified topic
 */
export declare function usePublish(topic: string): (message: any) => void;

/**
 * Hook for monitoring Brook connection status.
 *
 * @returns Object containing the current connection status
 */
export declare function useConnection(): UseConnectionReturn;

/**
 * Timer class for sequential timeout execution using linked list
 */
export declare class Timer {
	/**
	 * Creates a new Timer instance
	 */
	constructor();

	/**
	 * Adds a timeout to the execution queue
	 * @param callback - Function to execute when timer fires
	 * @param delay - Delay in milliseconds before execution
	 * @returns The created timer node for potential cancellation
	 */
	setTimeout(callback: () => void, delay: number): TimerNode;

	/**
	 * Clears all pending timers in the queue
	 */
	clear(): void;

	/**
	 * Checks if the timer queue is currently executing
	 * @returns True if executing, false otherwise
	 */
	isRunning(): boolean;

	/**
	 * Gets the number of pending timers in the queue
	 * @returns Number of pending timers
	 */
	getPendingCount(): number;
}

/**
 * Timer node for linked list implementation
 */
export declare class TimerNode {
	/**
	 * Creates a new timer node
	 * @param callback - Function to execute when timer fires
	 * @param delay - Delay in milliseconds before execution
	 */
	constructor(callback: () => void, delay: number);

	/**
	 * Sets the next node in the queue
	 * @param next - The next timer node
	 */
	setNext(next: TimerNode): void;

	/**
	 * Executes this timer node and schedules the next one
	 * @param onComplete - Callback when this node completes
	 */
	execute(onComplete: (next: TimerNode | null) => void): void;

	/**
	 * Cancels the timeout if it hasn't executed yet
	 */
	cancel(): void;
}

export default BrookProvider;
