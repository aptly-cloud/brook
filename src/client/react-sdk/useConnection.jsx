import { useEffect, useState } from 'react';
import { useBrookContext } from './BrookProvider';

export function useConnection() {
	const ctx = useBrookContext();

	const [status, setStatus] = useState('disconnected');

	useEffect(() => {
		const client = ctx.client;

		if (client) {
			setStatus(client.getConnectionStatus());
		}

		if (client?.onConnectivityChange) {
			const unsubscribe = client.onConnectivityChange((status) => {
				setStatus(status);
			});

			return () => unsubscribe?.();
		}
	}, [ctx]);

	return {
		status,
	};
}
