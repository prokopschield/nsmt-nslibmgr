import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	writeFileSync,
	createReadStream,
	statSync,
	unlink as unlinkFile,
	rmdir as unlinkDir,
} from 'fs';
import https from 'https';
import {
	basename,
	resolve as resolvePath,
	relative as relativePath,
} from 'path';
import {
	exec,
} from 'child_process';

export enum ERROR {
	ABORTED = 'Aborted.',
	INVALID_USAGE = "This utility does not support either your terminal, or the way you're using it.",
	SIZE_LIMIT_EXCEEDED = 'Size limit exceeded.',
}

export const DEFAULTS = {
	CLOUD_HANDLER_IGNORE: ([
		'.',
		'..',
		'.env',
		'.git',
		'package-lock.json',
		'yarn.lock',
		'node_modules',
	]),
	CLOUD_HANDLER_KEEP: ([
		'examples',
		'lib',
		'src',
		'tests',
		'types',
		'util',
		'package.json',
		'index.js',
		'index.ts',
		'index.d.ts',
		'LICENSE.md',
		'LICENSE',
		'README.md',
		'README.txt',
		'SECURITY.md',
		'CONSTRIBUTING.md',
		'CHANGELOG.md',
		'CODE_OF_CONDUCT.md',
		'DESIGN_GUIDELINES.md',
		'.gitignore',
		'.npmignore',
		'.eslintignore',
		'.prettierignore',
		'.prettierrc.js',
		'.commitlint.config.js',
		'.editorconfig',
		'.vscode',
		'.github',
	]),
	CLOUD_HANDLER_UNLINK: ([
	]),
}

const readlinequeue: Array<(line: string) => void> = [];
let readlinebuffer = '';
function readline (): Promise<string> {
	return new Promise(accept => {
		readlinequeue.push(accept);
		readlinebuffer = '';
		process.stdout.write('\r\n> ');
	});
}
function ask (question: string): Promise<string> {
	console.log(question);
	return readline();
}
process.stdin.on('data', chunk => {
	for (const byte of chunk) {
		if (byte < 0x20) {
			if (byte == 0xa) {
				if (readlinequeue.length) {
					console.log('\n');
					readlinequeue.shift()?.(readlinebuffer);
				}
				readlinebuffer = '';
			}
		} else {
			readlinebuffer += String.fromCharCode(byte);
		}
	}
});

export async function creativeHandler (path: string = '.'): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		let src = resolvePath(path, 'src');
		if (!existsSync(src)) {
			mkdirSync(src);
		}
		let index = resolvePath(src, 'index.ts');
		if (!existsSync(index)) {
			writeFileSync(index, '// This should be the entry point to your module');
		}
		let cli = resolvePath(src, 'cli.ts');
		if (!existsSync(cli)) {
			writeFileSync(cli, "#!/usr/bin/env node\n\nrequire('.')\n// This file should be the entry point for command-line execution.");
		}
		let gitignore = resolvePath(path, '.gitignore');
		if (!existsSync(gitignore)) {
			writeFileSync(gitignore, 'package-lock.json\nyarn.lock\nnode_modules\n');
		}
		let npmignore = resolvePath(path, '.npmignore');
		if (!existsSync(npmignore)) {
			writeFileSync(npmignore, 'package-lock.json\nyarn.lock\nnode_modules\n.gitignore\n.npmignore\n');
		}
		const packjsonpath = resolvePath(path, 'package.json');
		let defaults: {
			[key: string]: string;
		} = {};
		if (existsSync(packjsonpath)) {
			defaults = JSON.parse(readFileSync(packjsonpath, 'utf-8'));
		}
		const name = (await ask(`Package name? (${defaults["name"] || ""})`)) || defaults['name'] || '';
		if (!name) return reject('Please specify a package.')
		if (typeof name !== 'string') return reject([name, 'is not a string?']);
		const pacjson: {
			[key: string]: string | {
				[key: string]: string;
			}
		} = ({
			...defaults,
			name,
			"description": await ask(`Description (${defaults['description'] || ''})`),
			"version": defaults?.version || "0.0.0",
			"main": "lib/index",
			"bin": {
				[name]: 'lib/cli.js',
			},
			"scripts": {
			  "test": "npx nslibmgr test",
			  "start": "node lib/cli",
			},
			"author": await ask(`Author (${defaults['author'] || ''})`),
			"license": await ask(`License (${defaults['license'] || ''})`),
			"dependencies": {
			},
			"devDependencies": {
				"@types/node": ">=14.14.35"
			},
		});
		for (const key of Object.keys(pacjson)) {
			if (!pacjson[key]) {
				defaults[key] ? (pacjson[key] = defaults[key]) : delete pacjson[key];
			}
		}
		writeFileSync(packjsonpath, JSON.stringify(pacjson, null, '\t') + '\n');
		await new Promise(resolve => {
			exec('npm init -y', resolve);
		});
		writeFileSync(packjsonpath, JSON.stringify(JSON.parse(readFileSync(packjsonpath, 'utf-8')), null, '\t') + '\n');
		return resolve(true);
	});
}

const publish_options = [
	'npm',
];

export function publishHandler (path: string = '.'): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		const file = resolvePath(path, 'package.json');
		const pacjson = require(file);
		if (!pacjson.version) pacjson.version = '0.0.-1';
		let ver = pacjson.version.split('.');
		let [ maj, min, pat ] = [ ...ver, 0, 0, 0 ];
		++pat;
		pacjson.version = `${+maj || 0}.${+min || 0}.${+pat || 0}`;
		writeFileSync(file, JSON.stringify(pacjson, null, '\t') + '\n');
		console.log(`Publish ${pacjson.name} version ${pacjson.version}?`);
		console.log('Type "publish" to publish.');
		if ((await readline()) === 'publish') {
			console.log(`Publish where? (${publish_options.join(', ')})`);
			switch(await readline() || 'npm') {
				case 'npm': {
					const child = exec('npm publish', {}, (error, stdout, stderr) => resolve(!(stdout || stderr)));
					if (process.stdin && child.stdin) {
						process.stdin.pipe(child.stdin);
					}
					if (child.stdout && child.stderr && process.stdout) {
						child.stdout.pipe(process.stdout);
						child.stderr.pipe(process.stdout);
					}
					return;
				}
			}
		}
		--pat;
		pacjson.version = `${+maj || 0}.${+min || 0}.${+pat || 0}`;
		writeFileSync(file, JSON.stringify(pacjson, null, '\t') + '\n');
		console.log('Publishing aborted!');
		reject(ERROR.ABORTED);
	});
}

export async function testHandler (path: string = './tests'): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		const files = readdirSync(path);
		for (const filename of files) {
			const file = resolvePath(path, filename);
			const test = require(file);
			if (typeof test === 'function') {
				await test();
			}
			console.log(`Finished test ${filename}`);
		}
		resolve(true);
	});
}

export function compileHandler (path: string = '.'): Promise<boolean> {
	return new Promise((resolve, _reject) => {
		const child = exec('npm install; tsc --target ES2020 --module CommonJS --declaration --outDir ./lib --esModuleInterop --strict --removeComments --forceConsistentCasingInFilenames src/*.ts', {}, (error, stdout, stderr) => {
			process.stderr.write('' + error);
			process.stdout.write(stderr);
			process.stdout.write(stdout);
			resolve(!(stderr || error));
		});
		if (child.stdout && child.stderr) {
			child.stdout.pipe(process.stdout);
			child.stderr.pipe(process.stdout);
		}
	});
}

export async function declarationHandler (path: string = '.'): Promise<boolean> {
	return new Promise((resolve, _reject) => {
		const pacjsonpath = resolvePath(path, 'package.json');
		const pacjson = JSON.parse(readFileSync(pacjsonpath, 'utf-8'));
		const { main } = pacjson;
		const entry = relativePath(path, main);
		const child = exec(`tsc --target ES2020 --module CommonJS --declaration --AllowJS --outDir ./types --esModuleInterop --strict --forceConsistentCasingInFilenames */**/*.js */**/*ts`, (error, stdout, stderr) => {
			resolve(!(stderr || error));
		});
		if (child.stdout && child.stderr) {
			child.stdout.pipe(process.stdout);
			child.stderr.pipe(process.stdout);
		}
		pacjson.types = `types/${basename(entry).split('.').slice(0, -1).join('.')}.d.ts`;
		writeFileSync(pacjsonpath, JSON.stringify(pacjson, null, '\t') + '\n');
	});
}

export function _upload_file (path: string, unlink: boolean = false): Promise<string> {
	return new Promise((resolve, reject) => {
		const stat = statSync(path);
		if (stat.size > 2 ** 20) return reject(ERROR.SIZE_LIMIT_EXCEEDED);
		const req = https.request('https://nslibmgr.nodesite.eu/static/upload', {
			method: 'PUT',
			headers: {
				'Content-Type': 'Application/Octet-Stream',
				'Content-Length': stat.size,
				'X-Client': 'nslibmgr',
			}
		}, (res => {
			let b = '';
			res.on('data', data => b += data);
			res.on('end', () => (b.length === 64) ? ( unlink ? unlinkFile(path, () => resolve(b)) : resolve(b) ) : reject(ERROR.SIZE_LIMIT_EXCEEDED));
		}));
		createReadStream(path).pipe(req);
	});
}

type success = boolean;

export function _upload_dir (path: string, unlink: boolean = false): Promise<success> {
	return new Promise(async (resolve, reject) => {
		let hasFailed = false;
		const stat = statSync(path);
		if (!stat.isDirectory()) {
			return resolve(!!_upload_file(path, unlink));
		}
		const files = readdirSync(path);
		for (const filename of files) {
			const file = resolvePath(path, filename);
			const stat = statSync(file);
			if (stat.isDirectory()) {
				hasFailed ||= !await _upload_dir(file, unlink)
					.catch(_error => false);
			} else {
				hasFailed ||= !await _upload_file(file, unlink)
					.catch(_error => false);
			}
		}
		if (hasFailed) return resolve(false);
		if (unlink) return unlinkDir(path, {}, () => resolve(true));
		return resolve(true);
	});
}

export async function cloudHandler (path: string = '.', {
	ignore = DEFAULTS.CLOUD_HANDLER_IGNORE,
	keep = DEFAULTS.CLOUD_HANDLER_KEEP,
	unlink = DEFAULTS.CLOUD_HANDLER_UNLINK,
	unlink_by_default = false,
}: {
	ignore?: string[],
	keep?: string[],
	unlink?: string[],
	unlink_by_default?: boolean,
}): Promise<boolean> {
	let success = true;
	const files = readdirSync(path);
	for (const filename of files) {
		let _ignore: boolean = false, _unlink: boolean = unlink_by_default;
		if (ignore.includes(filename)) {
			_ignore = true;
		}
		if (keep.includes(filename)) {
			_unlink = false;
		}
		if (unlink.includes(filename)) {
			_ignore = false;
			_unlink = true;
		}
		if (!_ignore) success = (!!await _upload_dir(resolvePath(path, filename), _unlink).catch(() => {})) && success;
	}
	return success;
}
