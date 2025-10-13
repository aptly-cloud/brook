/**
 * TypeScript definitions for the Channel class.
 */

import type { Connection } from './connection.js';

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
export type UnsubscribeFunction = () => void;

export interface ChannelStats {
  /** Channel name */
  name: string;
  /** Number of stream handlers */
  streamHandlers: number;
  /** Connection state */
  connectionState: string;
}

/**
 * Channel class for pub/sub messaging with stream management.
 * Provides stream subscription, publishing, and message history functionality.
 */
export declare class Channel {
  /** Channel name/topic */
  readonly name: string;

  /** WebSocket connection manager */
  readonly connection: Connection;

  /**
   * Create a new Channel instance
   * @param name Channel name/topic
   * @param connection WebSocket connection manager
   */
  constructor(name: string, connection: Connection);

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
   * @returns Promise resolving when message is published
   */
  publish(message: any): Promise<void>;

  /**
   * Alias for publish() method for backward compatibility
   * @param message Message payload to send
   * @returns Promise resolving when message is sent
   */
  send(message: any): Promise<void>;

  /**
   * Unsubscribe from the channel and stop receiving messages
   */
  close(): void;

  /**
   * Re-subscribe to the channel after reconnection
   */
  resubscribe(): void;

  /**
   * Get channel statistics for debugging
   * @returns Channel statistics and state information
   */
  getStats(): ChannelStats;
}

export default Channel;