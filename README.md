# Brook SDK

A realtime fault-tolerant pub/sub SDK for JavaScript and React applications.

## Features

- ✅ Fault-tolerant real-time messaging
- ✅ Automatic reconnection with exponential backoff
- ✅ Message replay for missed messages
- ✅ React hooks for seamless integration
- ✅ Full TypeScript support
- ✅ Lightweight and performant

## Getting Started

### Get Your API Key

Before using the Brook SDK, you'll need to get your API key from the [Console](https://console.aptly.cloud/brook)

## Demo

👾 [Live Demo](https://demo.aptly.cloud) – play around and see it in action.

## Installation

```bash
npm install @aptly-sdk/brook
# or
pnpm add @aptly-sdk/brook
# or
yarn add @aptly-sdk/brook
```

## Quick Start

### JavaScript

```javascript
import Brook from '@aptly-sdk/brook';

const client = new Brook({ apiKey: 'your-api-key' });
await client.connect();

const channel = client.realtime.channel('my-topic');

channel.stream((message) => {
	console.log('Incoming message', message);
});
```

### React

```jsx
import Brook from '@aptly-sdk/brook';
import { BrookProvider, useStream, usePublish } from '@aptly-sdk/brook/react';

// 1. Initialize the client
const client = new Brook({ apiKey: 'your-api-key' });

// 2. Wrap your app with the BrookProvider
function App() {
	return (
		<BrookProvider config={client}>
			<Component1 />
			<Component2 />
		</BrookProvider>
	);
}

function Component1() {
	// 3. Subscribe to the topic
	useStream('my-topic', (message, metadata) => {
		console.log(message, metadata);
	});

	// ... rest of your component
}

function Component2() {
	const publish = usePublish('my-topic');

	useEffect(() => {
		// 4. Publish to the topic (Optional)
		publish({
			message: 'Hello from React SDK',
		});
	}, []);
}
```

## React Setup Guide

### 1. Initialize the Client

```jsx
import Brook from '@aptly-sdk/brook';

const client = new Brook({ apiKey: 'your-api-key' });
```

### 2. Setup the Provider

```jsx
import { BrookProvider } from '@aptly-sdk/brook/react';

function App() {
	return (
		<BrookProvider config={client}>
			<Component1 />
			<Component2 />
		</BrookProvider>
	);
}
```

#### Provider Props

| Prop     | Type    | Required | Description           |
| -------- | ------- | -------- | --------------------- |
| `config` | `Brook` | ✓        | Brook client instance |

### 3. Subscribe to Topics

```jsx
import { useStream } from '@aptly-sdk/brook/react';

function Component1() {
	// Automatically subscribes on mount and unsubscribes on unmount
	useStream('my-topic', (message, metadata) => {
		console.log('Received:', message);
		console.log('Metadata:', metadata);
	});
}
```

> **Note:** `useStream` automatically subscribes on component mount and unsubscribes on unmount. You typically don't need to use the `subscribe` and `unsubscribe` functions from the returned object.

#### useStream Hook

##### Parameters

| Parameter  | Type       | Required | Description                                       |
| ---------- | ---------- | -------- | ------------------------------------------------- |
| `topic`    | `string`   | ✓        | The topic/channel name to subscribe to            |
| `callback` | `function` | ✓        | Callback function called when messages are received |

**Callback signature:** `(message, metadata) => void`

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `message` | `any`    | The message data received     |
| `metadata` | `object` | Message metadata              |
| `metadata.offset` | `number` | Message sequence number |
| `metadata.timestamp` | `string` | ISO timestamp when message was sent |
| `metadata.replay` | `boolean` | True if this is a replayed (missed) message |
| `metadata.channel` | `string` | Channel name |

##### Returns

| Property      | Type       | Description                              |
| ------------- | ---------- | ---------------------------------------- |
| `streaming`   | `boolean`  | Whether actively streaming               |
| `subscribe`   | `() => void` | *(Optional)* Function to manually subscribe - rarely needed |
| `unsubscribe` | `() => void` | *(Optional)* Function to manually unsubscribe - rarely needed |

### 4. Publish to Topics

```jsx
import { usePublish } from '@aptly-sdk/brook/react';

function Component2() {
	const publish = usePublish('my-topic');

	useEffect(() => {
		publish({
			message: 'Hello from React SDK',
		});
	}, []);
}
```

#### usePublish Hook

##### Parameters

| Parameter | Type     | Required | Description                          |
| --------- | -------- | -------- | ------------------------------------ |
| `topic`   | `string` | ✓        | The topic/channel name to publish to |

##### Returns

| Property  | Type                                    | Description                                 |
| --------- | --------------------------------------- | ------------------------------------------- |
| `publish` | `(data: any) => Promise<PublishResult>` | Function to publish messages to the channel |

##### publish() Method

**Parameters**

| Parameter | Type  | Required | Description                                         |
| --------- | ----- | -------- | --------------------------------------------------- |
| `data`    | `any` | ✓        | Serializable value that will be sent to the channel |

**Returns** `Promise<PublishResult>`

| Property  | Type             | Description                   |
| --------- | ---------------- | ----------------------------- |
| `error`   | `string \| null` | Error message (if any)        |
| `success` | `boolean`        | Success indicator             |
| `offset`  | `number`         | Message offset in the channel |

## Additional React Hooks

### useConnection

Monitor the connection status.

```jsx
import { useConnection } from '@aptly-sdk/brook/react';

function Component3() {
	const { status } = useConnection();

	console.log('Connection status', status);
}
```

##### Returns

| Property | Type     | Description           |
| -------- | -------- | --------------------- |
| `status` | `string` | Current connection status: `'disconnected'`, `'connecting'`, `'unauthorized'`, `'authenticating'`, `'connected'`, `'reconnecting'`, or `'failed'` |

## TypeScript Support

This package includes comprehensive TypeScript declarations. All hooks and client methods are fully typed for an optimal development experience.
