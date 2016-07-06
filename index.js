const path = require('path');
const webpack = require('webpack');
const glob = require('glob');
const findup = require('findup-sync');
const cuid = require('cuid');
const rimraf = require('rimraf');
const nodeExternals = require('webpack-node-externals');

const { exec } = require('child_process');

function findWebpackConfig() {
	return findup("webpack.config.js");
}

function getFiles(pattern) {
	return glob.sync(pattern, { ignore: ["node_modules/**"] });
}

function getFileNameFromPath(filePath) {
	return filePath
		.replace(/\.\//g, '')
		.replace(/\//g, '.')
		.split('.')
		.slice(0, -1)
		.join('_');
}

function getFileHash(files) {
	return files.reduce((prev, next) => {
		prev[getFileNameFromPath(next)] = "./" + next;
		return prev;
	}, {});
}

function generateRunId() {
	return cuid();
}

function getWebpackConfig(config, fileHash, path) {
	return Object.assign({}, config, {
		entry: fileHash,
		output: {
			filename: '[name].test.js',
			path
		},
		target: 'node',
		externals: [nodeExternals()]
	});
}

function runWebpack(config) {
	return new Promise((resolve, reject) => {
		webpack(config).run((err, stats) => {
			if(err) {
				reject(err);
				return;
			}

			resolve(stats.toJson());
		});
	});
}

function runAva(outDir) {
	return new Promise((resolve, reject) => {
		exec(`ava ${ outDir }/**/*.test.js`, (err, stdout, stderr) => {
			if(err) {
				reject(stderr);
				return;
			}

			resolve(stderr);
		});
	});
}

function complete(output, isError = false, shouldClean) {
	if(shouldClean) {
		rimraf.sync('.ava-webpack');
	}

	if(isError) {
		console.error(output);
		process.exit(1);
		return;
	}

	console.log(output);
	process.exit(0);
}

function run(input, flags, showHelp) {
	const webpackConfigPath =  flags.webpackConfig || findWebpackConfig();
	const webpackConfigResolvedPath = webpackConfigPath && path.resolve(process.cwd(), webpackConfigPath);
	
	const testDiscoveryPattern = input || '**/*.test.{js,jsx,ts,tsx}';

	const runId = generateRunId();
	const outDir = `./.ava-webpack/${ runId }`;

	let existingWebpackConfig = {};
	
	if(webpackConfigPath) {
		try {
			existingWebpackConfig = require(webpackConfigResolvedPath);
		}
		catch(e) {
			console.error("Webpack config not found. Using default.");
		}
	}

	const webpackConfig = getWebpackConfig(
		existingWebpackConfig,
		getFileHash(getFiles(testDiscoveryPattern)),
		outDir
	);

	runWebpack(webpackConfig).then(
		webpackRes => runAva(outDir)
			.then(
				res => complete(res, false, flags.clean),
				err => complete(err, true, flags.clean)
			),
			err => complete(err, true, flags.clean)
	);
}

module.exports = run;