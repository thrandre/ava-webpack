#!/usr/bin/env node

const meow = require("meow");
const run = require("./");

var cli = meow(`Help me.`);
run(cli.input[0], cli.flags, cli.showHelp);
