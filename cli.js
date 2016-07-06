#!/usr/bin/env node

const meow = require("meow");
const run = require("./");

var cli = meow(`Help me.`);
//rimraf ./.testbin && webpack --config webpack.config-test.js && ava
run(cli.input[0], cli.flags, cli.showHelp);
