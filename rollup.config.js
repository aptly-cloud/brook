import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
	input: {
		index: './src/client/index.js',
		react: './src/client/react-sdk/index.js',
	},
	output: [
		{
			dir: 'dist',
			format: 'esm', // or 'cjs' if you want CommonJS
		},
	],
	plugins: [
		resolve({
			extensions: ['.js', '.jsx'],
		}),
		commonjs(),
		babel({
			babelHelpers: 'bundled',
			extensions: ['.js', '.jsx'], // handle both
		}),
		copy({
			targets: [
				{
					src: 'src/client/index.d.ts',
					dest: 'dist',
					rename: 'index.d.ts',
				},
				{
					src: 'src/react/index.d.ts',
					dest: 'dist',
					rename: 'react.d.ts',
				},
			],
		}),
	],
	external: ['react', 'react-dom'], // don't bundle react
};
