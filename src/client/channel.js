import Stream from './stream.js';

/**
 * Channel class for pub/sub messaging with offset tracking and message replay.
 * Provides stream subscription, publishing, and message history functionality.
 */

/**
 * Represents a pub/sub channel with real-time messaging capabilities.
 */
class Channel {
	/**
	 * Creates a new Channel instance.
	 *
	 * @param {string} name - Channel name/topic.
	 * @param {Connection} connection - WebSocket connection manager.
	 */
	constructor(name, connection, log) {
		if (!name || typeof name !== 'string') {
			throw new Error('Channel name is required and must be a string');
		}

		this.name = name;
		this.connection = connection;
		this.log = log;

		// Stream management
		this.streamHandlers = new Set();
		this.messageHandler = this.handleMessage.bind(this);
		this.streams = new Map();

		// Subscribe to connection messages
		this.connection.addMessageHandler(this.messageHandler);

		this.offset = 0;
		this.localStorage;

		if (globalThis.window && window.localStorage) {
			this.localStorage = window.localStorage;

			const storedOffset = this.localStorage.getItem(`${this.name}_offset`);

			if (storedOffset) {
				this.offset = Number(storedOffset);
			}
		}
	}

	stream(callback) {
		if (typeof callback !== 'function') {
			throw new Error('Stream callback must be a function');
		}

		const previousSize = this.streams.size;

		const stream = new Stream({
			channelName: this.name,
			connection: this.connection,
			offset: this.offset,
			log: this.log,
		});

		this.streams.set(callback, stream);

		if (this.streams.size > previousSize) {
			this.log.info('Streaming next success!', this.streams.size, this.offset);
		}

		stream.start(callback);

		return () => {
			this.unstream(callback);
		};
	}

	unstream(callback) {
		const stream = this.streams.get(callback);

		if (stream) {
			const previousSize = this.streams.size;

			stream.stop();
			this.streams.delete(callback);

			if (previousSize > this.streams.size) {
				this.log.info('Unstreaming next success!', this.streams.size);
			}
		}

		if (this.streams.size === 0) {
			this.log.info('No streams left, closing the channel.');

			// sends unsubscribe message to the ws connection but this will not close the ws connection.
			// the ws will just stop receiving message for this channel/topic.
			// channel will be automatically reopened when new stream is created.
			this.close();
		}
	}

	/**
	 * Publishes a message to the channel via WebSocket.
	 *
	 * @param {*} message - Message payload to publish.
	 * @returns {Promise<void>} Promise resolving when message is published.
	 */
	async publish(message) {
		if (!this.connection.isConnected()) {
			throw new Error('Connection is not established');
		}

		return new Promise((resolve, reject) => {
			const publishMessage = {
				type: 'publish',
				channel: this.name,
				message,
				timestamp: Date.now(),
			};

			try {
				this.connection.send(publishMessage);

				// Note: We don't wait for confirmation in this implementation
				// In production, you might want to wait for a 'published' response
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Alias for publish() method for backward compatibility.
	 *
	 * @param {*} message - Message payload to publish.
	 * @returns {Promise<void>} Promise resolving when message is published.
	 */
	async send(message) {
		return this.publish(message);
	}

	/**
	 * Unsubscribes from the channel and stops receiving messages.
	 *
	 * @returns {void}
	 */
	close() {
		// unsubscribe to the ws connection
		const unsubscribeMessage = {
			type: 'unsubscribe',
			channel: this.name,
			timestamp: Date.now(),
		};

		this.connection.send(unsubscribeMessage);
	}

	/**
	 * Handles incoming WebSocket messages for this channel.
	 *
	 * @param {Object} message - WebSocket message object.
	 * @returns {void}
	 * @private
	 */
	handleMessage(message) {
		// if no streams are active, do not process the message
		if (this.streams.size === 0) {
			this.log.info('No streams active, skipping message:', message);
			return;
		}

		// Handle subscription confirmation
		if (message.type === 'subscribed' && message.channel === this.name) {
			this.log.info(`Subscribed to channel: ${this.name}`);
			return;
		}

		// Handle unsubscription confirmation
		if (message.type === 'unsubscribed' && message.channel === this.name) {
			this.log.info(`Unsubscribed from channel: ${this.name}`);
			return;
		}

		// Handle incoming messages - check if message has channel field or assume it's for this channel
		if (message.type === 'message') {
			if (!message.channel || message.channel === this.name) {
				// Add channel to message if missing
				if (!message.channel) {
					message.channel = this.name;
				}
				this.processIncomingMessage(message);
				return;
			}
		}

		// Handle publish confirmation
		if (message.type === 'published' && message.channel === this.name) {
			this.log.info('Message published to channel');
		}
	}

	/**
	 * Processes an incoming message and forwards it to stream handlers.
	 *
	 * @param {Object} message - Incoming message object.
	 * @returns {void}
	 * @private
	 */
	processIncomingMessage(message) {
		// Create metadata object for the callback
		const metadata = {
			offset: message.offset,
			timestamp: message.timestamp,
			replay: message.replay || false,
			channel: message.channel,
		};

		if (message.offset) {
			if (message.offset > this.offset) {
				this.setOffset(message.offset);
			}
		}

		// Forward to all stream handlers (process all messages)
		this.streams.forEach((stream) => {
			try {
				stream.handler(message.data, metadata);
			} catch (error) {
				this.log.error('Stream handler error:', error);
			}
		});
	}

	/**
	 * Re-subscribes to the channel after reconnection.
	 * Called automatically when connection is re-established.
	 *
	 * @returns {void}
	 */
	resubscribe() {
		if (this.streams.size > 0) {
			// todo: revisit implementation
		}
	}

	/**
	 * Gets channel statistics for debugging.
	 *
	 * @returns {Object} Channel statistics and state information.
	 */
	getStats() {
		return {
			name: this.name,
			streamHandlers: this.streamHandlers.size,
			connectionState: this.connection.getState(),
		};
	}

	setOffset(offset) {
		this.offset = offset;

		if (this.localStorage) {
			this.localStorage.setItem(`${this.name}_offset`, this.offset);
		}
	}
}

export default Channel;
