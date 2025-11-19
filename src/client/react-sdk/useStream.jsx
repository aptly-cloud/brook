import { useEffect, useState, useRef } from 'react';
import { useBrookContext } from './BrookProvider.jsx';
import { useConnection } from './useConnection.jsx';
import Timer from './utils/Timer.js';

export function useStream(topic, callback) {
	const ctx = useBrookContext();

	const unsubscribeRef = useRef(null);
	const topicRef = useRef(topic);

	const { status } = useConnection();

	const [streaming, setStreaming] = useState(false);

	function subscribe() {
		ctx?.client?.log?.info('Subscribing to topic:', topic);
		if (topicRef.current !== topic) {
			// unsubscribe from the previous topic
			unsubscribe();
		}

		if (unsubscribeRef.current) {
			ctx?.client?.log?.info('Already subscribed to channel. Aborting action.');
			return;
		}

		if (!topic) {
			ctx?.client?.log?.warn('No topic to subscribe to.');
			return;
		}

		const channel = ctx.client.realtime.channel(topic);

		ctx?.client?.log?.info(
			`Subscribing to channel: ${topic} from useStream hook`
		);
		const timer = new Timer();

		unsubscribeRef.current = channel.stream((message, metadata) => {
			timer.setTimeout(() => {
				callback(message, metadata);
			}, 50);
		});
		setStreaming(true);
	}

	function unsubscribe() {
		if (unsubscribeRef.current) {
			ctx?.client?.log?.info('Unsubscribing.');
			unsubscribeRef.current();
			unsubscribeRef.current = null;
			ctx?.client?.log?.info('Unsubscribed.');
			setStreaming(false);
		}
	}

	useEffect(() => {
		// do nothing
		if (!topic) return;

		// otherwise, automatically subscribe
		if (status === 'connected') {
			subscribe();
		}
	}, [topic, status]);

	useEffect(() => unsubscribe, []);

	return {
		streaming,
		unsubscribe,
		subscribe,
	};
}
