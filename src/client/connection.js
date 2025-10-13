/**
 * WebSocket connection manager with automatic reconnection and fault tolerance.
 * Provides reliable real-time connectivity with exponential backoff strategy.
 */

import ExponentialBackoff from './utils/backoff.js';

/**
 * Connection states for status tracking.
 */
const CONNECTION_STATES = {
	DISCONNECTED: 'disconnected',
	CONNECTING: 'connecting',
	AUTHENTICATING: 'authenticating',
	CONNECTED: 'connected',
	RECONNECTING: 'reconnecting',
	FAILED: 'failed',
	UNAUTHORIZED: 'unauthorized',
};

/**
 * Manages WebSocket connections with automatic reconnection and state management.
 */
class Connection {
	/**
	 * Creates a new Connection instance.
	 *
	 * @param {Object} config - Connection configuration.
	 * @param {string} config.endpoint - WebSocket server endpoint.
	 * @param {string} config.apiKey - API key for authentication.
	 * @param {number} [config.reconnectTimeout=3000] - Initial reconnection delay.
	 * @param {EventTarget} connectivity - Event target for connectivity events.
	 */
	constructor(config, connectivity, log) {
		this.config = config;
		this.connectivity = connectivity;
		this.ws = null;
		this.state = CONNECTION_STATES.DISCONNECTED;
		this.clientId = this.generateClientId();
		this.log = log;

		// Reconnection management
		this.backoff = new ExponentialBackoff({
			initialDelay: config.reconnectTimeout || 3000,
			multiplier: 1.5,
			maxDelay: 30000,
			maxAttempts: 20,
			log: this.log,
		});

		this.reconnectTimeoutId = null;
		this.shouldReconnect = false;
		this.messageHandlers = new Set();
		this.connectionPromise = null;

		// Message queue for offline messages
		this.messageQueue = [];
		this.maxQueueSize = 10000;

		// Heartbeat management
		this.heartbeatInterval = null;
		this.lastPongTime = null;
		this.heartbeatIntervalMs = 30000; // 30 seconds

		// Authentication management
		this.isAuthenticated = false;
		this.authTimeout = 30000; // 30 seconds to authenticate
		this.authTimeoutId = null;
		this.authPromise = null;
	}

	/**
	 * Establishes WebSocket connection with retry logic.
	 *
	 * @returns {Promise<boolean>} Promise resolving to connection success status.
	 */
	async connect() {
		// If already connecting, return the existing promise
		if (this.connectionPromise) {
			return this.connectionPromise;
		}

		this.shouldReconnect = true;
		this.connectionPromise = this.attemptConnection();

		try {
			const result = await this.connectionPromise;
			this.connectionPromise = null;
			return result;
		} catch (error) {
			this.connectionPromise = null;
			throw error;
		}
	}

	/**
	 * Attempts to establish WebSocket connection.
	 *
	 * @returns {Promise<boolean>} Promise resolving to connection success.
	 * @private
	 */
	attemptConnection() {
		return new Promise((resolve, reject) => {
			try {
				this.setState(CONNECTION_STATES.CONNECTING);

				// Create WebSocket connection
				this.ws = new WebSocket(this.config.endpoint);

				// Connection timeout
				const connectionTimeout = setTimeout(() => {
					if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
						this.ws.close();
						reject(new Error('Connection timeout'));
					}
				}, 10000);

				// Connection opened successfully
				this.ws.onopen = () => {
					clearTimeout(connectionTimeout);
					this.setState(CONNECTION_STATES.AUTHENTICATING);
					this.backoff.reset();

					// Start authentication process
					this.startAuthentication()
						.then(() => {
							this.setState(CONNECTION_STATES.CONNECTED);
							this.startHeartbeat();
							this.flushMessageQueue();
							resolve(true);
						})
						.catch((authError) => {
							this.log.error('Authentication failed:', authError);
							this.ws.close(1000, 'Authentication failed');
							this.setState(CONNECTION_STATES.UNAUTHORIZED);
							reject(authError);
						});
				};

				// Handle incoming messages
				this.ws.onmessage = (event) => {
					this.handleMessage(event);
				};

				// Handle connection close
				this.ws.onclose = (event) => {
					clearTimeout(connectionTimeout);
					this.stopHeartbeat();
					this.handleDisconnection(event);

					// If this was during initial connection, reject the promise
					if (this.state === CONNECTION_STATES.CONNECTING) {
						reject(
							new Error(`Connection failed: ${event.code} ${event.reason}`)
						);
					}
				};

				// Handle connection errors
				this.ws.onerror = (error) => {
					clearTimeout(connectionTimeout);

					// If this was during initial connection, reject the promise
					if (this.state === CONNECTION_STATES.CONNECTING) {
						reject(new Error('WebSocket connection error'));
					}
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Closes the WebSocket connection and stops reconnection attempts.
	 *
	 * @returns {void}
	 */
	disconnect() {
		this.shouldReconnect = false;

		if (this.reconnectTimeoutId) {
			clearTimeout(this.reconnectTimeoutId);
			this.reconnectTimeoutId = null;
		}

		// Clear auth timeout
		if (this.authTimeoutId) {
			clearTimeout(this.authTimeoutId);
			this.authTimeoutId = null;
		}

		// Reset authentication state
		this.isAuthenticated = false;
		this.authPromise = null;

		this.stopHeartbeat();

		if (this.ws) {
			try {
				// Detach handlers to avoid side effects during shutdown
				this.ws.onopen = null;
				this.ws.onmessage = null;
				this.ws.onclose = null;
				this.ws.onerror = null;

				// Prefer terminate when available to avoid lingering close timers
				if (typeof this.ws.terminate === 'function') {
					this.ws.terminate();
				} else {
					this.ws.close();
				}
			} catch (e) {
				// Ignore errors during shutdown
			}
			this.ws = null;
		}

		this.setState(CONNECTION_STATES.DISCONNECTED);
	}

	/**
	 * Sends a message through the WebSocket connection.
	 *
	 * @param {Object} message - Message object to send.
	 * @returns {void}
	 */
	send(message) {
		const messageStr = JSON.stringify(message);

		if (this.isConnected()) {
			try {
				this.ws.send(messageStr);
			} catch (error) {
				this.log.error('Failed to send message:', error);
				// Queue the message for retry
				this.queueMessage(message);
			}
		} else {
			// Queue message if not connected
			this.queueMessage(message);
		}
	}

	/**
	 * Adds a message handler for incoming WebSocket messages.
	 *
	 * @param {Function} handler - Message handler function.
	 * @returns {void}
	 */
	addMessageHandler(handler) {
		this.messageHandlers.add(handler);
	}

	/**
	 * Removes a message handler.
	 *
	 * @param {Function} handler - Message handler function to remove.
	 * @returns {void}
	 */
	removeMessageHandler(handler) {
		this.messageHandlers.delete(handler);
	}

	/**
	 * Gets the current connection state.
	 *
	 * @returns {string} Current connection state.
	 */
	getState() {
		return this.state;
	}

	/**
	 * Checks if the connection is currently established and authenticated.
	 *
	 * @returns {boolean} True if connected and authenticated.
	 */
	isConnected() {
		return (
			this.state === CONNECTION_STATES.CONNECTED &&
			this.isAuthenticated &&
			this.ws &&
			this.ws.readyState === WebSocket.OPEN
		);
	}

	/**
	 * Gets the client ID for this connection.
	 *
	 * @returns {string} Unique client identifier.
	 */
	getClientId() {
		return this.clientId;
	}

	/**
	 * Handles incoming WebSocket messages.
	 *
	 * @param {MessageEvent} event - WebSocket message event.
	 * @returns {void}
	 * @private
	 */
	handleMessage(event) {
		try {
			const message = JSON.parse(event.data);

			// Handle authentication messages during auth flow
			if (!this.isAuthenticated) {
				this.handleAuthMessage(message);
				return;
			}

			// Handle heartbeat responses
			if (message.type === 'heartbeat') {
				this.lastPongTime = Date.now();
				return;
			}

			// Forward message to registered handlers
			this.messageHandlers.forEach((handler) => {
				try {
					handler(message);
				} catch (error) {
					this.log.error('Message handler error:', error);
				}
			});
		} catch (error) {
			this.log.error('Failed to parse WebSocket message:', error);
		}
	}

	/**
	 * Starts the post-connection authentication process.
	 *
	 * @returns {Promise<void>} Promise resolving when authentication completes.
	 * @private
	 */
	startAuthentication() {
		return new Promise((resolve, reject) => {
			this.authPromise = { resolve, reject };

			// Set authentication timeout
			this.authTimeoutId = setTimeout(() => {
				const error = new Error('Authentication timeout');
				this.authPromise = null;
				reject(error);
			}, this.authTimeout);

			// Send authentication credentials immediately after connection
			// The server expects immediate authentication, not a request-response flow
			this.sendAuthCredentials();
		});
	}

	/**
	 * Handles authentication-related messages from the server.
	 *
	 * @param {Object} message - Parsed WebSocket message.
	 * @returns {void}
	 * @private
	 */
	handleAuthMessage(message) {
		if (!this.authPromise) {
			return; // No active authentication process
		}

		switch (message.type) {
			case 'auth_required':
				this.sendAuthCredentials();
				break;

			case 'auth_success':
				this.handleAuthSuccess(message);
				break;

			case 'connected':
				this.handleConnected(message);
				break;

			case 'auth_timeout':
			case 'error':
				this.handleAuthError(message);
				break;

			case 'heartbeat':
				// Allow heartbeat during auth
				this.lastPongTime = Date.now();
				break;

			default:
				this.log.warn(
					'Unexpected message during authentication:',
					message.type
				);

				if (message.error === 'Invalid API key') {
					this.setState(CONNECTION_STATES.UNAUTHORIZED);
				}
				break;
		}
	}

	/**
	 * Sends authentication credentials to the server.
	 *
	 * @returns {void}
	 * @private
	 */
	sendAuthCredentials() {
		const authMessage = {
			type: 'auth',
			apiKey: this.config.apiKey,
			timestamp: Date.now(),
		};

		try {
			this.ws.send(JSON.stringify(authMessage));
		} catch (error) {
			this.log.error('Failed to send auth credentials:', error);
			if (this.authPromise) {
				this.authPromise.reject(error);
				this.authPromise = null;
			}
		}
	}

	/**
	 * Handles successful authentication response.
	 *
	 * @param {Object} message - Auth success message.
	 * @returns {void}
	 * @private
	 */
	handleAuthSuccess(message) {
		// Wait for connected message to complete authentication
	}

	/**
	 * Handles connected message after successful authentication.
	 *
	 * @param {Object} message - Connected message.
	 * @returns {void}
	 * @private
	 */
	handleConnected(message) {
		// Clear auth timeout
		if (this.authTimeoutId) {
			clearTimeout(this.authTimeoutId);
			this.authTimeoutId = null;
		}

		// Mark as authenticated
		this.isAuthenticated = true;

		// Resolve authentication promise
		if (this.authPromise) {
			this.authPromise.resolve();
			this.authPromise = null;
		}
	}

	/**
	 * Handles authentication errors.
	 *
	 * @param {Object} message - Error message.
	 * @returns {void}
	 * @private
	 */
	handleAuthError(message) {
		this.log.error('Authentication error:', message);

		// Clear auth timeout
		if (this.authTimeoutId) {
			clearTimeout(this.authTimeoutId);
			this.authTimeoutId = null;
		}

		// Reject authentication promise
		if (this.authPromise) {
			const error = new Error(
				message.error || message.message || 'Authentication failed'
			);
			this.authPromise.reject(error);
			this.authPromise = null;
		}
	}

	/**
	 * Handles WebSocket disconnection and manages reconnection.
	 *
	 * @param {CloseEvent} event - WebSocket close event.
	 * @returns {void}
	 * @private
	 */
	handleDisconnection(event) {
		this.log.info('WebSocket disconnected:', event.code, event.reason);

		// Reset authentication state on disconnection
		this.isAuthenticated = false;
		this.authPromise = null;
		if (this.authTimeoutId) {
			clearTimeout(this.authTimeoutId);
			this.authTimeoutId = null;
		}

		// Don't reconnect if it was a deliberate disconnection
		if (!this.shouldReconnect || event.code === 1000) {
			this.setState(CONNECTION_STATES.DISCONNECTED);
			return;
		}

		// Check if we've exceeded max attempts
		if (this.backoff.isMaxAttemptsReached()) {
			this.setState(CONNECTION_STATES.FAILED);
			return;
		}

		// Start reconnection process
		this.setState(CONNECTION_STATES.RECONNECTING);
		this.scheduleReconnection();
	}

	/**
	 * Schedules the next reconnection attempt with exponential backoff.
	 *
	 * @returns {void}
	 * @private
	 */
	scheduleReconnection() {
		if (this.reconnectTimeoutId) {
			clearTimeout(this.reconnectTimeoutId);
		}

		const delay = this.backoff.getDelay();

		this.reconnectTimeoutId = setTimeout(async () => {
			if (
				this.shouldReconnect &&
				this.state === CONNECTION_STATES.RECONNECTING
			) {
				try {
					await this.attemptConnection();
				} catch (error) {
					this.log.error('Reconnection attempt failed:', error);
					// Schedule next attempt if we haven't exceeded max attempts
					if (!this.backoff.isMaxAttemptsReached()) {
						this.scheduleReconnection();
					} else {
						this.setState(CONNECTION_STATES.FAILED);
					}
				}
			}
		}, delay);
	}

	/**
	 * Sets the connection state and emits connectivity events.
	 *
	 * @param {string} newState - New connection state.
	 * @returns {void}
	 * @private
	 */
	setState(newState) {
		if (this.state !== newState) {
			this.state = newState;

			// Emit connectivity event
			const event = new CustomEvent('connectivity', {
				detail: {
					status: newState,
					timestamp: Date.now(),
					clientId: this.clientId,
				},
			});

			this.connectivity.dispatchEvent(event);
		}
	}

	/**
	 * Queues a message for sending when connection is re-established.
	 *
	 * @param {Object} message - Message to queue.
	 * @returns {void}
	 * @private
	 */
	queueMessage(message) {
		if (this.messageQueue.length >= this.maxQueueSize) {
			this.messageQueue.shift(); // Remove oldest message
		}

		this.messageQueue.push({
			message,
			timestamp: Date.now(),
		});
	}

	/**
	 * Sends all queued messages after reconnection.
	 *
	 * @returns {void}
	 * @private
	 */
	flushMessageQueue() {
		if (this.messageQueue.length === 0) {
			return;
		}

		const messages = [...this.messageQueue];
		this.messageQueue = [];

		messages.forEach(({ message }) => {
			this.send(message);
		});
	}

	/**
	 * Starts heartbeat monitoring to detect connection health.
	 *
	 * @returns {void}
	 * @private
	 */
	startHeartbeat() {
		this.stopHeartbeat();
		this.lastPongTime = Date.now();

		this.heartbeatInterval = setInterval(() => {
			if (this.isConnected()) {
				// Check if we've received a recent pong
				const timeSinceLastPong = Date.now() - this.lastPongTime;
				if (timeSinceLastPong > this.heartbeatIntervalMs * 2) {
					this.log.warn('Heartbeat timeout detected, closing connection');
					this.ws.close();
					return;
				}

				// Send heartbeat
				this.send({ type: 'heartbeat', timestamp: Date.now() });
			}
		}, this.heartbeatIntervalMs);
	}

	/**
	 * Stops heartbeat monitoring.
	 *
	 * @returns {void}
	 * @private
	 */
	stopHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	/**
	 * Generates a unique client ID.
	 *
	 * @returns {string} Unique client identifier.
	 * @private
	 */
	generateClientId() {
		return `client_${Date.now()}_${Math.random()
			.toString(36)
			.substring(2, 11)}`;
	}

	/**
	 * Gets connection statistics for debugging.
	 *
	 * @returns {Object} Connection statistics.
	 */
	getStats() {
		return {
			state: this.state,
			clientId: this.clientId,
			isAuthenticated: this.isAuthenticated,
			reconnectAttempts: this.backoff.getAttempts(),
			queuedMessages: this.messageQueue.length,
			lastPongTime: this.lastPongTime,
			backoffStatus: this.backoff.getStatus(),
		};
	}
}

export { Connection, CONNECTION_STATES };
export default Connection;
