var path = require('path');
var webpack = require('webpack');
var glob = require('glob');
var findup = require('findup-sync');
var cuid = require('cuid');
var rimraf = require('rimraf');
var nodeExternals = require('webpack-node-externals');
var objectAssign = require('object-assign');
var Promise = require('bluebird');

var exec = require('npm-run').exec;

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

function getFileHash(files, polyfillPath) {
	return files.reduce(function (prev, next) {
		var path = "./" + next;
		prev[getFileNameFromPath(next)] = polyfillPath ? [ polyfillPath, path ] : path;
		return prev;
	}, {});
}

function generateRunId() {
	return cuid();
}

function getWebpackConfig(config, fileHash, path) {
	return objectAssign({}, config, {
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
	return new Promise(function (resolve, reject) {
		webpack(config).run(function (err, stats) {
			if(err) {
				reject(err);
				return;
			}

			resolve(stats.toJson());
		});
	});
}

function runAva(outDir, tap) {
	return new Promise(function (resolve, reject) {
		exec('ava ' + (tap ? '--tap ' : '') + outDir + '/**/*.test.js', {},  function (err, stdout, stderr) {
			var output = tap ? stdout : stderr;

			if(err) {
				reject(output);
				return;
			}

			resolve(output);
		});
	});
}

function complete(output, isError, shouldClean) {
	if(shouldClean) {
		rimraf.sync('.ava-webpack');
	}

	if(isError) {
		console.log(output);
		process.exit(1);
		return;
	}

	console.log(output);
	process.exit(0);
}

function run(input, flags, showHelp) {
	var webpackConfigPath =  flags.webpackConfig || findWebpackConfig();
	var webpackConfigResolvedPath = webpackConfigPath && path.resolve(process.cwd(), webpackConfigPath);
	
	var testDiscoveryPattern = input || '**/*.test.{js,jsx,ts,tsx}';

	var runId = generateRunId();
	var outDir = './.ava-webpack/' + runId;

	var existingWebpackConfig = {};
	
	if(webpackConfigPath) {
		try {
			existingWebpackConfig = require(webpackConfigResolvedPath);
			existingWebpackConfig = existingWebpackConfig.default || existingWebpackConfig;
		}
		catch(e) {
			console.error("Webpack config not found. Using default.");
		}
	}

	var webpackConfig = getWebpackConfig(
		existingWebpackConfig,
		getFileHash(getFiles(testDiscoveryPattern), flags.polyfill),
		outDir
	);

	runWebpack(webpackConfig).then(
		function(webpackRes) {
			if (webpackRes.errors.length > 0) {
				for (var i = 0; i < webpackRes.errors.length; i++) {
					console.error(webpackRes.errors[i]);
				}
				return;
			}
			runAva(outDir, flags.tap).then(
				function(res) { complete(res, false, flags.clean); },
				function(err) { complete(err, true, flags.clean); }
			)
		},
		function(err) { complete(err, true, flags.clean); }
	);
}

module.exports = run;
