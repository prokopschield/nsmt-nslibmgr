#!/usr/bin/env node

const SUCCESS = 'Success.';
const FAILED = 'Failed.';
let HAS_FAILED = false;
function FAILURE () {
	HAS_FAILED = true;
	return FAILED;
}
const RESULT = (res: any) => res ? SUCCESS : FAILURE();

import { exec } from 'child_process';
import {
	creativeHandler,
	publishHandler,
	compileHandler,
	cloudHandler,
	testHandler,
	declarationHandler,
} from './nslibmgr';

new Promise (async (accept, reject) => {
	for (const arg of process.argv) {
		if (HAS_FAILED) {
			return reject(`Previous instructions failed, ${arg} did not run.`);
		}
		switch (arg) {
			case 'create':
			case 'init':
				console.log('Creating new project!');
				console.log(await creativeHandler().catch((...error) => [ 'Project creation failed.', ...error ]));
				break;
			case 'build':
			case 'comp':
			case 'compile':
			case 'make':
			case 'b':
			case 'c':
			case 'm':
				console.log('Compiling!');
				console.log(RESULT(await compileHandler()));
				break;
			case 'declare':
			case 'declaration':
			case 'declarations':
			case 'd':
				console.log('Generating TypeScript declarations!');
				console.log(RESULT(await declarationHandler()));
				break;
			case 'install':
				console.log('Installing!');
				await new Promise((resolve) => {
					const child = exec('npm install', (error, stdout, stderr) => resolve({error, stdout, stderr}));
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
					const child = exec('npm install -g nslibmgr', (error, stdout, stderr) => resolve({error, stdout, stderr}));
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
					const child = exec('node lib/index', (error, stdout, stderr) => resolve({error, stdout, stderr}));
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
				await testHandler()
					.then(RESULT)
					.catch((...args: any[]) => ['Failed', ...args])
					.then(console.log);
				break;
			case 'publish':
				console.log('Publishing...');
				await publishHandler()
					.then(RESULT)
					.catch((...args: any[]) => ['Failed', ...args])
					.then(console.log);
				break;
			case 'cloud':
				console.log('Syncing with cloud!');
				console.log(RESULT(await cloudHandler('.', {})));
				break;
			case 'clean':
				console.log('Cleaning!');
				console.log(RESULT(await cloudHandler('.', {
					unlink_by_default: true,
				})));
				break;
			case 'purge':
				console.log('Purging!');
				console.log(RESULT(await cloudHandler('.', {
					unlink_by_default: true,
					unlink: [
						'package-lock.json',
						'yarn.lock',
						'node_modules',
						'lib',
					],
				})));
				break;
		}
	}
	accept(new Date);
}).then((...args: any[]) => {
	console.log('Finished!', args);
	process.exit(0);
}).catch(console.log);
