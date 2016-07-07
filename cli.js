#!/usr/bin/env node

var meow = require("meow");
var run = require("./");

var cli = meow('Help me.');
run(cli.input[0], cli.flags, cli.showHelp);
