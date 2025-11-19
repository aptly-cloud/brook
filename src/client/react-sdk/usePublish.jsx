import { useEffect, useRef } from 'react';
import { useBrookContext } from './BrookProvider';

export function usePublish(topic) {
	const ctx = useBrookContext();

	const channelRef = useRef(null);

	useEffect(() => {
		if (topic) {
			ctx?.client?.log?.info('[usePublish]: subscribing to topic', topic);
			channelRef.current = ctx.client.realtime.channel(topic);
		}
	}, [topic]);

	useOnUpdate(() => {
		ctx?.client?.log?.info('[usePublish]: ctx changed');
		channelRef.current = ctx.client.realtime.channel(topic);
	}, [ctx]);

	function publish(message) {
		if (!channelRef?.current) {
			ctx?.client?.log?.warn(
				'[usePublish]: Publish to a channel that is not yet properly initialized. Aborting action.'
			);
			return;
		}

		channelRef?.current?.publish(message);
	}

	return publish;
}

function useOnUpdate(callback, dependencies) {
	const ref = useRef(false);

	useEffect(() => {
		if (ref.current == false) {
			ref.current = true;
		} else {
			callback();
		}
	}, dependencies);
}
