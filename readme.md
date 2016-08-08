# Crude webpack-enabled runner for AVA

## Installation

```
npm install ava-webpack --save-dev
```

## Usage example (almost as crude as the implementation)

*webpack.config-test.js* (using [awesome-typescript-loader](https://github.com/s-panferov/awesome-typescript-loader))

```
var path = require('path');

module.exports = {
	resolve: {
		root: [
			path.resolve(__dirname, 'apps'),
			path.resolve(__dirname, 'common')
		],
		extensions: ['', '.ts', '.tsx', '.js']
	},
	devtool: 'eval',
	module: {
		loaders: [
			{
				test: /\.tsx?$/,
				loader: 'awesome-typescript-loader'
			}
		]
	}
};

```

*package.json*

```
{
	"dependencies": {
		"babel-polyfill": "^6.9.1",
	},
	"devDependencies": {
		"@types/enzyme": "^2.4.30",
		"ava": "^0.16.0",
		"ava-webpack": "^1.0.6",
		"awesome-typescript-loader": "2.0.2",
		"babel-core": "^6.10.4",
		"babel-preset-es2015": "^6.9.0",
		"babel-preset-react": "^6.11.1",
		"enzyme": "^2.4.1",
		"rimraf": "^2.5.3",
		"tap-teamcity": "^1.2.0",
		"typescript": "^2.0.0",
		"webpack": "2.1.0-beta.20"
	},
	"scripts": {
		"test": "ava-webpack --webpack-config ./webpack.config-test.js --polyfill babel-polyfill --clean",
		"test-ci": "ava-webpack --webpack-config ./webpack.config-test.js --polyfill babel-polyfill --clean --tap | tap-teamcity"
	},
	"ava": {
		"concurrency": 5,
		"require": [
			"babel-register"
		],
		"babel": "inherit"
	}
}

```