/**
 * TypeScript definitions for the Connection class and related utilities.
 */

export interface ConnectionConfig {
  /** WebSocket server endpoint */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Initial reconnection delay in milliseconds */
  reconnectTimeout?: number;
  /** Custom client ID */
  clientId?: string;
}

export interface BackoffConfig {
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Multiplier for exponential backoff */
  multiplier: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Maximum number of attempts */
  maxAttempts: number;
}

export interface BackoffStatus {
  /** Current attempt number */
  attempts: number;
  /** Current delay in milliseconds */
  currentDelay: number;
  /** Whether max attempts reached */
  maxAttemptsReached: boolean;
}

/**
 * Connection states for status tracking
 */
export declare const CONNECTION_STATES: {
  readonly DISCONNECTED: 'disconnected';
  readonly CONNECTING: 'connecting';
  readonly AUTHENTICATING: 'authenticating';
  readonly CONNECTED: 'connected';
  readonly RECONNECTING: 'reconnecting';
  readonly FAILED: 'failed';
};

export type ConnectionState = typeof CONNECTION_STATES[keyof typeof CONNECTION_STATES];

export interface ConnectionStats {
  /** Current connection state */
  state: ConnectionState;
  /** Unique client identifier */
  clientId: string;
  /** Whether client is authenticated */
  isAuthenticated: boolean;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Number of messages in queue */
  queuedMessages: number;
  /** Timestamp of last pong received */
  lastPongTime?: number;
  /** Backoff algorithm status */
  backoffStatus: BackoffStatus;
}

export type MessageHandler = (message: any) => void;

/**
 * WebSocket connection manager with automatic reconnection
 */
export declare class Connection {
  /** Connection configuration */
  readonly config: ConnectionConfig;

  /** Current connection state */
  readonly state: ConnectionState;

  /** Unique client identifier */
  readonly clientId: string;

  /** Whether client is authenticated */
  readonly isAuthenticated: boolean;

  /**
   * Create a new Connection instance
   * @param config Connection configuration
   * @param connectivity Event target for connectivity events
   */
  constructor(config: ConnectionConfig, connectivity: EventTarget);

  /**
   * Establish WebSocket connection with retry logic
   * @returns Promise resolving to connection success status
   */
  connect(): Promise<boolean>;

  /**
   * Close WebSocket connection and stop reconnection attempts
   */
  disconnect(): void;

  /**
   * Send a message through the WebSocket connection
   * @param message Message object to send
   */
  send(message: any): void;

  /**
   * Add a message handler for incoming WebSocket messages
   * @param handler Message handler function
   */
  addMessageHandler(handler: MessageHandler): void;

  /**
   * Remove a message handler
   * @param handler Message handler function to remove
   */
  removeMessageHandler(handler: MessageHandler): void;

  /**
   * Get the current connection state
   */
  getState(): ConnectionState;

  /**
   * Check if connection is established and authenticated
   */
  isConnected(): boolean;

  /**
   * Get the client ID for this connection
   */
  getClientId(): string;

  /**
   * Get connection statistics for debugging
   */
  getStats(): ConnectionStats;
}

export default Connection;