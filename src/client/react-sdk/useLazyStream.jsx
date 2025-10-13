import { useEffect, useState, useRef } from 'react';
import { useBrookContext } from './BrookProvider.jsx';
import { useConnection } from './useConnection.jsx';
import Timer from './utils/Timer.js';

export function useLazyStream(topic) {
	const ctx = useBrookContext();

	const unsubscribeRef = useRef(null);
	const topicRef = useRef(topic);

	const { status } = useConnection();

	const [data, setData] = useState({});
	const [streaming, setStreaming] = useState(false);

	function subscribe() {
		if (status !== 'connected') {
			ctx?.log?.info('Not connected to the server. Aborting action.');
			return;
		}

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
				setData({ message, metadata });
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

	useEffect(() => unsubscribe, []);

	return {
		message: data.message,
		metadata: data.metadata,
		streaming,
		subscribe,
		unsubscribe,
	};
}
