#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SUCCESS = 'Success.';
const FAILED = 'Failed.';
let HAS_FAILED = false;
function FAILURE() {
    HAS_FAILED = true;
    return FAILED;
}
const RESULT = (res) => res ? SUCCESS : FAILURE();
const child_process_1 = require("child_process");
const nslibmgr_1 = require("./nslibmgr");
new Promise(async (accept, reject) => {
    for (const arg of process.argv) {
        if (HAS_FAILED) {
            return reject(`Previous instructions failed, ${arg} did not run.`);
        }
        switch (arg) {
            case 'create':
            case 'init':
                console.log('Creating new project!');
                console.log(await nslibmgr_1.creativeHandler().catch((...error) => ['Project creation failed.', ...error]));
                break;
            case 'build':
            case 'comp':
            case 'compile':
            case 'make':
            case 'b':
            case 'c':
            case 'm':
                console.log('Compiling!');
                console.log(RESULT(await nslibmgr_1.compileHandler()));
                break;
            case 'declare':
            case 'declaration':
            case 'declarations':
            case 'd':
                console.log('Generating TypeScript declarations!');
                console.log(RESULT(await nslibmgr_1.declarationHandler()));
                break;
            case 'install':
                console.log('Installing!');
                await new Promise((resolve) => {
                    const child = child_process_1.exec('npm install', (error, stdout, stderr) => resolve({ error, stdout, stderr }));
                    if (child.stdin && child.stdout && child.stderr) {
                        process.stdin.pipe(child.stdin);
                        child.stdout.pipe(process.stdout);
                        child.stderr.pipe(process.stdout);
                    }
                }).then(console.log);
                break;
            case 'update':
                console.log('Installing!');
                await new Promise((resolve) => {
                    const child = child_process_1.exec('npm install -g nslibmgr', (error, stdout, stderr) => resolve({ error, stdout, stderr }));
                    if (child.stdin && child.stdout && child.stderr) {
                        process.stdin.pipe(child.stdin);
                        child.stdout.pipe(process.stdout);
                        child.stderr.pipe(process.stdout);
                    }
                }).then(console.log);
                break;
            case 'run':
            case 'r':
                console.log('Running!');
                await new Promise((resolve) => {
                    const child = child_process_1.exec('node lib/index', (error, stdout, stderr) => resolve({ error, stdout, stderr }));
                    if (child.stdin && child.stdout && child.stderr) {
                        process.stdin.pipe(child.stdin);
                        child.stdout.pipe(process.stdout);
                        child.stderr.pipe(process.stdout);
                    }
                }).then(console.log);
                break;
            case 'test':
            case 't':
                console.log('Running tests...');
                await nslibmgr_1.testHandler()
                    .then(RESULT)
                    .catch((...args) => ['Failed', ...args])
                    .then(console.log);
                break;
            case 'publish':
                console.log('Publishing...');
                await nslibmgr_1.publishHandler()
                    .then(RESULT)
                    .catch((...args) => ['Failed', ...args])
                    .then(console.log);
                break;
            case 'cloud':
                console.log('Syncing with cloud!');
                console.log(RESULT(await nslibmgr_1.cloudHandler('.', {})));
                break;
            case 'clean':
                console.log('Cleaning!');
                console.log(RESULT(await nslibmgr_1.cloudHandler('.', {
                    unlink_by_default: true,
                })));
                break;
            case 'purge':
                console.log('Purging!');
                console.log(RESULT(await nslibmgr_1.cloudHandler('.', {
                    unlink_by_default: true,
                    unlink: [
                        'package-lock.json',
                        'yarn.lock',
                        'node_modules',
                        'lib',
                    ],
                })));
                break;
            case 'gpl':
                console.log('Replacing LICENSE with GPL!');
                console.log(`Success: ${nslibmgr_1.gpl() ? 'yes' : 'no'}`);
                break;
        }
    }
    accept(new Date);
}).then((...args) => {
    console.log('Finished!', args);
    process.exit(0);
}).catch(console.log);
