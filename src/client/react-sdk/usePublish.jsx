import { useEffect, useRef } from 'react';
import { useBrookContext } from './BrookProvider';

export function usePublish(topic) {
	const ctx = useBrookContext();

	const channelRef = useRef(null);

	useEffect(() => {
		if (topic) {
			channelRef.current = ctx.client.realtime.channel(topic);
		}
	}, [topic]);

	function publish(message) {
		if (!channelRef?.current) {
			ctx?.log?.warn(
				'Publish to a channel that is not yet properly initialized. Aborting action.'
			);
			return;
		}

		channelRef?.current?.publish(message);
	}

	return publish;
}
