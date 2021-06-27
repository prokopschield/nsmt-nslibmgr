#!/usr/bin/env node

const SUCCESS = 'Success.';
const FAILED = 'Failed.';
let HAS_FAILED = false;
function FAILURE() {
	HAS_FAILED = true;
	return FAILED;
}
const RESULT = (res: any) => (res ? SUCCESS : FAILURE());

import { exec } from 'child_process';
import {
	creativeHandler,
	publishHandler,
	compileHandler,
	cloudHandler,
	testHandler,
	gpl,
	lintHandler,
} from './nslibmgr';

new Promise(async (accept, reject) => {
	for (const arg of process.argv) {
		if (HAS_FAILED) {
			return reject(`Previous instructions failed, ${arg} did not run.`);
		}
		switch (arg) {
			case 'create':
			case 'init':
				console.log('Creating new project!');
				console.log(
					await creativeHandler().catch((...error) => [
						'Project creation failed.',
						...error,
					])
				);
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
			case 'install':
				console.log('Installing!');
				await new Promise((resolve) => {
					const child = exec('npm install', (error, stdout, stderr) =>
						resolve({ error, stdout, stderr })
					);
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
					const child = exec(
						'npm install -g nslibmgr',
						(error, stdout, stderr) => resolve({ error, stdout, stderr })
					);
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
					const child = exec('node lib/index', (error, stdout, stderr) =>
						resolve({ error, stdout, stderr })
					);
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
				console.log(
					RESULT(
						await cloudHandler('.', {
							unlink_by_default: true,
						})
					)
				);
				break;
			case 'purge':
				console.log('Purging!');
				console.log(
					RESULT(
						await cloudHandler('.', {
							unlink_by_default: true,
							unlink: ['package-lock.json', 'yarn.lock', 'node_modules', 'lib'],
						})
					)
				);
				break;
			case 'dev':
			case 'd':
			case 'go':
			case 'g':
			case 'all':
			case 'a':
			case 'full':
			case 'f':
				console.log('Cleaning...');
				console.log(
					RESULT(
						await cloudHandler('.', {
							unlink_by_default: true,
							unlink: ['package-lock.json', 'yarn.lock', 'lib'],
						})
					)
				);
				console.log('Compiling!');
				console.log(RESULT(await compileHandler()));
				console.log('Running!');
				await new Promise((resolve) => {
					const child = exec('node lib/index', (error, stdout, stderr) =>
						resolve({ error, stdout, stderr })
					);
					if (child.stdin && child.stdout && child.stderr) {
						process.stdin.pipe(child.stdin);
						child.stdout.pipe(process.stdout);
						child.stderr.pipe(process.stdout);
					}
				}).then(console.log);
				break;
			case 'gpl':
				console.log('Replacing LICENSE with GPL!');
				console.log(`Success: ${gpl() ? 'yes' : 'no'}`);
				break;
			case 'l':
			case 'lint':
			case 'p':
			case 'pretty':
				console.log(`Prettying!`);
				await lintHandler().then(() => console.log(`Prettied!`));
				break;
		}
	}
	accept(new Date());
})
	.then((...args: any[]) => {
		console.log('Finished!', args);
		process.exit(0);
	})
	.catch(console.log);
