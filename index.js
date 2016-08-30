var path = require('path');
var fs = require('fs');
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
			resolve(stats);
		});
	});
}

function runAva(emittedFiles, tap) {
	return new Promise(function (resolve, reject) {
		exec('ava ' + (tap ? '--tap ' : '') + emittedFiles.join(' '), {},  function (err, stdout, stderr) {
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
	
	var cleanOutput = !flags.debug || flags.clean;

	if(webpackConfigPath) {
		try {
			existingWebpackConfig = require(webpackConfigResolvedPath);
			existingWebpackConfig = existingWebpackConfig.default || existingWebpackConfig;
		}
		catch(e) {
			console.error("Webpack config not found. Using default.");
		}
	}

	var testFiles = getFiles(testDiscoveryPattern);
	var webpackEntries = getFileHash(testFiles, flags.polyfill);

	var webpackConfig = getWebpackConfig(
		existingWebpackConfig,
		webpackEntries,
		outDir
	);

	runWebpack(webpackConfig).then(
		function(stats) {
			var jsonStats = stats.toJson();

			if (jsonStats.errors.length > 0) {
				for (var i = 0; i < jsonStats.errors.length; i++) {
					console.error(jsonStats.errors[i]);
				}
				return complete(null, true, cleanOutput);
			}

			var emittedFiles = jsonStats.assets.map(function(asset) {
				return path.join(outDir, asset.name);
			});

			if(flags.debug) {
				console.log(stats.toString({ colors: true }));
			}

			runAva(emittedFiles, flags.tap).then(
				function(res) { return complete(res, false, cleanOutput); },
				function(err) { return complete(err, true, cleanOutput); }
			)
		},
		function(err) { return complete(err, true, cleanOutput); }
	);
}

module.exports = run;
