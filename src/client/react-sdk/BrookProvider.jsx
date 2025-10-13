/**
 * BrookProvider component that provides Brook client context to React components.
 * Manages the client instance and connection state across the component tree.
 */

import React, { createContext, useContext, useEffect } from 'react';

const BrookContext = createContext(null);

/**
 * BrookProvider component that wraps the application with Brook client context.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.config - Brook client instance.
 * @param {React.ReactNode} props.children - Child components to wrap.
 * @returns {React.ReactElement} Provider component.
 */
export function BrookProvider({ config, children }) {
	if (!config) {
		throw new Error(
			'BrookProvider requires a config prop with Brook client instance'
		);
	}

	useEffect(() => {
		config.connect();
	}, [config]);

	const contextValue = {
		client: config,
	};

	return (
		<BrookContext.Provider value={contextValue}>
			{children}
		</BrookContext.Provider>
	);
}

export default BrookProvider;

/**
 * Hook to access the Brook context.
 *
 * @returns {Object} Brook context containing client and connection state.
 * @throws {Error} If used outside of BrookProvider.
 */
export const useBrookContext = () => {
	const context = useContext(BrookContext);

	if (!context) {
		throw new Error('Hook must be used within a BrookProvider');
	}

	return context;
};
