/**
 * Main Package class for the realtime pub/sub SDK.
 * Provides WebSocket connectivity, channel management, and real-time messaging.
 */

import Connection from './connection.js';
import Channel from './channel.js';
import Log from './utils/log.js';

/**
 * Main SDK class that provides pub/sub functionality with automatic reconnection.
 */
class Package {
	/**
	 * @param {Object} config - Client configuration.
	 * @param {string} config.apiKey - API key for authentication.
	 */
	constructor(config = {}) {
		if (!config.apiKey) {
			throw new Error('API key is required');
		}

		this.config = config;

		this.config.endpoint = 'wss://connect.aptly.cloud';
		this.config.verbose = config.verbose || false;

		this.log = new Log(config);

		// Create connectivity event target for status monitoring (internal)
		this._connectivity = new EventTarget();

		// Initialize connection manager
		this.connection = new Connection(config, this._connectivity, this.log);

		this._connectivityHandlers = new Set();

		// Channel management
		this.channels = new Map();

		// Set up connection event handlers
		this.setupConnectionHandlers();

		// Create realtime interface
		this.realtime = {
			channel: this.createChannel.bind(this),
		};

		this.log.info('Package initialized');
	}

	/**
	 * Establishes connection to the WebSocket server.
	 *
	 * @returns {Promise<boolean>} Promise resolving to connection success status.
	 */
	async connect() {
		try {
			this.log.info('Connecting to server');
			const connected = await this.connection.connect();
			this.log.info('Connected to server', connected);

			if (connected) {
				// Re-subscribe to existing channels after reconnection
				this.resubscribeChannels();
			}

			return connected;
		} catch (error) {
			this.log.error('Failed to connect:', error);
			throw error;
		}
	}

	/**
	 * Disconnects from the WebSocket server and cleans up resources.
	 *
	 * @returns {void}
	 */
	disconnect() {
		// Close all channels
		this.channels.forEach((channel) => {
			channel.close();
		});
		this.channels.clear();

		// Disconnect the connection
		this.connection.disconnect();
	}

	/**
	 * Creates or retrieves a channel instance for the given channel name.
	 *
	 * @param {string} name - Channel name/topic.
	 * @returns {Channel} Channel instance for the specified name.
	 */
	createChannel(name) {
		if (!name || typeof name !== 'string') {
			throw new Error('Channel name is required and must be a string');
		}

		// Return existing channel if already created
		if (this.channels.has(name)) {
			return this.channels.get(name);
		}

		// Create new channel instance
		const channel = new Channel(name, this.connection, this.log);
		this.channels.set(name, channel);

		return channel;
	}

	/**
	 * Gets the current connection status.
	 *
	 * @returns {string} Current connection status.
	 */
	getConnectionStatus() {
		return this.connection.getState();
	}

	/**
	 * Checks if the connection is authenticated.
	 *
	 * @returns {boolean} True if authenticated.
	 */
	isAuthenticated() {
		return this.connection.isAuthenticated;
	}

	/**
	 * Gets the client ID for this connection.
	 *
	 * @returns {string} Unique client identifier.
	 */
	getClientId() {
		return this.connection.getClientId();
	}

	/**
	 * Gets all active channel names.
	 *
	 * @returns {Array<string>} Array of active channel names.
	 */
	getActiveChannels() {
		return Array.from(this.channels.keys());
	}

	/**
	 * Gets statistics for all channels and the connection.
	 *
	 * @returns {Object} Statistics object with connection and channel information.
	 */
	getStats() {
		const channelStats = {};
		this.channels.forEach((channel, name) => {
			channelStats[name] = channel.getStats();
		});

		return {
			connection: this.connection.getStats(),
			channels: channelStats,
			activeChannels: this.getActiveChannels().length,
		};
	}

	/**
	 * Publishes a message to a channel via HTTP API (fallback method).
	 *
	 * @param {string} channel - Channel name to publish to.
	 * @param {*} message - Message payload to publish.
	 * @returns {Promise<Object>} Promise resolving to publish response.
	 */
	async publishHttp(channel, message) {
		if (!channel || !message) {
			throw new Error('Channel and message are required');
		}

		const httpEndpoint = this.config.endpoint
			.replace('ws://', 'http://')
			.replace('wss://', 'https://');
		const url = new URL('/realtime', httpEndpoint);

		const response = await fetch(url.toString(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.config.apiKey,
			},
			body: JSON.stringify({
				channel,
				message,
			}),
		});

		if (!response.ok) {
			throw new Error(
				`HTTP publish failed: ${response.status} ${response.statusText}`
			);
		}

		return response.json();
	}

	/**
	 * Checks if the client is currently connected to the server.
	 *
	 * @returns {boolean} True if connected.
	 */
	isConnected() {
		return this.connection.isConnected();
	}

	/**
	 * Sets up connection event handlers for automatic channel management.
	 *
	 * @returns {void}
	 * @private
	 */
	setupConnectionHandlers() {
		// Listen for connection state changes
		const handler = (event) => {
			const { status } = event.detail;

			// Re-subscribe channels when connection is re-established
			// todo add conidtion only when previously connected
			if (status === 'connected') {
				this.resubscribeChannels();
			}
		};

		this._connectivity.addEventListener('connectivity', handler);
		this._connectivityHandlers.add(handler);
	}

	/**
	 * Re-subscribes all active channels after reconnection.
	 *
	 * @returns {void}
	 * @private
	 */
	resubscribeChannels() {
		this.channels.forEach((channel) => {
			if (channel.streams && channel.streams.size > 0) {
				channel.resubscribe();
			}
		});
	}

	onConnectivityChange(callback) {
		if (typeof callback !== 'function') {
			throw new Error('Connectivity callback must be a function');
		}

		function handler(event) {
			callback(event.detail.status);
		}

		this._connectivity.addEventListener('connectivity', handler);
		this.log.info('connectivity listener added');

		this._connectivityHandlers.add(handler);

		return () => {
			this._connectivity.removeEventListener('connectivity', handler);
			this.log.info('connectivity listener removed');
			this._connectivityHandlers.delete(handler);
		};
	}

	/**
	 * Removes all event listeners and cleans up resources.
	 * Should be called when the Package instance is no longer needed.
	 *
	 * @returns {void}
	 */
	cleanup() {
		this.disconnect();

		this._connectivityHandlers.forEach((handler) => {
			this._connectivity.removeEventListener('connectivity', handler);
		});
		this._connectivityHandlers.clear();

		// Remove all connectivity listeners
		// Note: EventTarget doesn't have a removeAllListeners method,
		// so we rely on garbage collection when the instance is destroyed
	}
}

// Attach the connectivity subscription method to match the API pattern
Object.defineProperty(Package.prototype, 'connectivity', {
	get() {
		return {
			subscribe: this.subscribeToConnectivity.bind(this),
		};
	},
});

export default Package;
