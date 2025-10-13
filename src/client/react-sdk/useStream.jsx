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
		if (topicRef.current !== topic) {
			// unsubscribe from the previous topic
			if (unsubscribeRef.current) {
				unsubscribeRef.current();
				unsubscribeRef.current = null;
				setStreaming(false);
			}
		}

		if (unsubscribeRef.current) {
			ctx?.log?.info('Already subscribed to channel. Aborting action.');
			return;
		}

		if (!topic) {
			ctx?.log?.warn('No topic to subscribe to.');
			return;
		}

		const channel = ctx.client.realtime.channel(topic);

		ctx?.log?.info(`Subscribing to channel: ${topic} from useStream hook`);
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
			ctx?.log?.info('Unsubscribing.');
			unsubscribeRef.current();
			unsubscribeRef.current = null;
			ctx?.log?.info('Unsubscribed.');
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
