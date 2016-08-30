#!/usr/bin/env node

var meow = require("meow");
var run = require("./");

var cli = meow(
	"Here's some really unhelpful help:" + "\n" +
	"Params:" + "\n" +
	"\t" + "--webpack-config : Path to your webpack config" + "\n" +
	"\t" + "[--polyfill] : Path to your polyfill (e.g. babel-polyfill)" + "\n" +
	"\n" +
	"Flags:" + "\n" +
	"\t" + "[--tap] : Output test results in tap format (useful for chaining in a reporter e.g. tap-teamcity)" + "\n" +
	"\t" + "[--debug] : Enable debug mode (no flushing of temp. files and prints the webpack stats object)"
);

run(cli.input[0], cli.flags, cli.showHelp);
