// import * as log from './utils/logx.js';

export default class Stream {
	constructor({ channelName, connection, offset, log }) {
		this.offset = offset;
		this.state = '';
		this.channelName = channelName;
		this.connection = connection;
		this.handler;
		this.log = log;
	}

	start(handler) {
		if (typeof handler !== 'function') {
			throw new Error('Stream callback must be a function');
		}

		this.handler = handler;

		const subscribeMessage = {
			type: 'subscribe',
			channel: this.channelName,
			fromOffset: this.offset,
		};

		this.connection.send(subscribeMessage);
		this.state = 'streaming';
		this.log.info('Streaming started');
	}

	stop() {
		this.state = 'stopped';
	}

	getStatus() {
		const wsConnectionState = this.connection.getState();
		if (wsConnectionState !== 'connected') return wsConnectionState;
		if (this.state) return this.state || wsConnectionState;
	}
}
