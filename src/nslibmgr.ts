import { getConfig } from 'doge-config';
import { read, write, fs } from 'doge-json';
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
	lstatSync,
	readlinkSync,
	unlinkSync,
} from 'fs';
import https from 'https';
import nsblob from 'nsblob';
import OpList from 'oplist';
import {
	basename,
	resolve as resolvePath,
	relative as relativePath,
} from 'path';
import { ask, readline } from './ask';
import run from './run';
import selector from './selector';
import semver from './semver';
import tsconfig from './tsconfig';

const gitignore = new OpList('.gitignore');
const npmignore = new OpList('.npmignore');

export enum ERROR {
	ABORTED = 'Aborted.',
	INVALID_USAGE = "This utility does not support either your terminal, or the way you're using it.",
	SIZE_LIMIT_EXCEEDED = 'Size limit exceeded.',
}

export const DEFAULTS = {
	CLOUD_HANDLER_IGNORE: ['.', '..', '.env', '.git', 'node_modules'],
	CLOUD_HANDLER_KEEP: [
		'config',
		'docs',
		'examples',
		'lib',
		'src',
		'test',
		'tests',
		'types',
		'util',
		'package.json',
		'index.js',
		'index.ts',
		'index.d.ts',
		'app.js',
		'app.ts',
		'app.d.ts',
		'gpl-3.0.md',
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
		'.whitesource',
		'.vscode',
		'.github',
		'tsconfig.json',
		'yarn.lock',
	],
	CLOUD_HANDLER_UNLINK: [],
};

export async function creativeHandler(path: string = '.'): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		let src = resolvePath(path, 'src');
		if (!existsSync(src)) {
			mkdirSync(src);
		}
		const dir = await fs.promises.readdir(src);
		let index = resolvePath(
			src,
			dir.filter((a) => a && a !== 'cli.ts').shift() || 'index.ts'
		);
		if (!existsSync(index)) {
			writeFileSync(index, '// This should be the entry point to your module');
		}
		let cli = resolvePath(src, 'cli.ts');
		if (!existsSync(cli)) {
			writeFileSync(
				cli,
				"#!/usr/bin/env node\n\nrequire('.');\n// This file should be the entry point for command-line execution."
			);
		}
		gitignore.add('node_modules/');
		const packjsonpath = resolvePath(path, 'package.json');
		let defaults: {
			[key: string]:
				| string
				| {
						[key: string]: string;
				  };
		} = {};
		if (existsSync(packjsonpath)) {
			defaults = JSON.parse(readFileSync(packjsonpath, 'utf-8'));
		}

		const name = defaults.name || (await ask('Enter package name'));

		const pacjson: {
			[key: string]:
				| string
				| {
						[key: string]: string;
				  };
		} = {
			...{
				name,
				description:
					defaults.description || (await ask('Please enter a description')),
				version: defaults.version || '0.0.0',
				main: defaults.main || 'lib/index.js',
				bin: defaults.bin || {
					[name.toString()]: 'lib/cli.js',
				},
				scripts:
					typeof defaults.scripts === 'object'
						? {
								start: 'node lib/cli',
								...defaults.scripts,
						  }
						: {
								start: 'node lib/cli',
								test: 'npx nslibmgr test',
						  },
				author: defaults.author || (await ask("Author's name?")),
				license: defaults.license || (await ask('License?')),
			},
			...defaults,
		};

		pacjson.dependencies =
			typeof pacjson.dependencies === 'object'
				? { ...pacjson.dependencies }
				: {};

		pacjson.devDependencies =
			typeof pacjson.devDependencies === 'object'
				? { ...pacjson.devDependencies }
				: {};
		if (!pacjson.devDependencies['@types/node'])
			pacjson.devDependencies['@types/node'] = `>=${process.version.substr(
				1,
				2
			)}`;

		for (const key of Object.keys(pacjson)) {
			if (!pacjson[key]) {
				defaults[key] ? (pacjson[key] = defaults[key]) : delete pacjson[key];
			}
		}
		writeFileSync(packjsonpath, JSON.stringify(pacjson, null, '\t') + '\n');
		await run('npm init -y');
		writeFileSync(
			packjsonpath,
			JSON.stringify(
				JSON.parse(readFileSync(packjsonpath, 'utf-8')),
				null,
				'\t'
			) + '\n'
		);
		return resolve(true);
	});
}

async function gitignore_set(
	dirname: string,
	shouldExist?: boolean,
	isDirectory?: boolean
): Promise<boolean> {
	try {
		shouldExist
			? gitignore.add(isDirectory ? `${dirname}/` : dirname)
			: gitignore.remove(dirname, `${dirname}/`);
		return true;
	} catch (error) {
		return false;
	}
}

const publish_options = ['npm', 'yarn'];

export function publishHandler(path: string = '.'): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		await lintHandler();
		const file = resolvePath(path, 'package.json');
		const pacjson = require(file);
		if (!pacjson.version) pacjson.version = '0.0.0-0';
		const ov = pacjson.version;
		pacjson.version = semver(
			pacjson.version,
			await selector('Release type?', {
				pp: 'pre-release (x.x.x-X)',
				p: 'patch (x.x.X)',
				pm: 'pre-minor (x.x.0-X)',
				m: 'minor (x.X.0)',
				pM: 'pre-major (x.0.0-X)',
				M: 'major (X.0.0)',
			})
		);
		if (
			!fs.existsSync(
				resolvePath(
					'.',
					pacjson.main.includes('.js') ? pacjson.main : `${pacjson.main}.js`
				)
			)
		) {
			console.log(`ERROR: ${pacjson.main} does not exist!`);
			console.log(`Refusing to publish.`);
			return reject(false);
		}
		console.log(`Publish ${pacjson.name} version ${pacjson.version}?`);
		console.log('Type "publish" to publish.');
		if ((await readline()) === 'publish') {
			console.log(`Publish where? (${publish_options.join(', ')})`);
			writeFileSync(file, JSON.stringify(pacjson, null, '\t') + '\n');
			gitignore_set('lib', false);
			gitignore_set('node_modules', true, true);
			npmignore.add(...gitignore.entries, 'src/', 'tsconfig.json');
			npmignore.remove('lib');
			switch ((await readline()) || 'yarn') {
				case 'npm': {
					return run('npm publish')
						.then((success) => gitignore_set('lib', true, true) && success)
						.then(resolve);
				}
				case 'yarn': {
					return run('yarn publish')
						.then((success) => gitignore_set('lib', true, true) && success)
						.then(resolve);
				}
			}
		}
		pacjson.version = ov;
		writeFileSync(file, JSON.stringify(pacjson, null, '\t') + '\n');
		gitignore_set('lib', true, true);
		console.log('Publishing aborted!');
		reject(ERROR.ABORTED);
	});
}

export async function lintHandler() {
	await run(`npx prettier --use-tabs --single-quote --write .`);
}

export async function testHandler(path: string = './tests'): Promise<boolean> {
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

export function compileHandler(path: string = '.'): Promise<boolean> {
	return new Promise((resolve, _reject) => {
		tsconfig.write();
		return run('yarn')
			.then((suc: boolean) => suc && run('tsc'))
			.then(resolve);
	});
}

let warnedAboutSymlinkSupport = false;
function warnSymlinkSupport() {
	if (!warnedAboutSymlinkSupport) {
		warnedAboutSymlinkSupport = true;
		console.log(`nslibmgr does not support symbolic links`);
		console.log(`Undesired behavior may happen!`);
	}
}

const nsblob_config = getConfig('nsblob');
const file_too_large = nsblob.store(nsblob_config.str.file_too_large);

export async function _upload_file(
	path: string,
	unlink: boolean = false
): Promise<string | false> {
	const up = await nsblob.store_file(path);
	return up === (await file_too_large)
		? up
		: unlink
		? (await fs.promises.unlink(path), false)
		: up;
}

type success = boolean;

export function _upload_dir(
	path: string,
	unlink: boolean = false
): Promise<success> {
	return new Promise(async (resolve, reject) => {
		let hasFailed = 0;
		const stat = statSync(path);
		if (!stat.isDirectory()) {
			return resolve(!!(await _upload_file(path, unlink)));
		}
		const files = readdirSync(path);
		for (const filename of files) {
			const file = resolvePath(path, filename);
			const stat = lstatSync(file);
			if (stat.isSymbolicLink()) {
				console.log(`Encountered symbolic link: ${file}`);
				warnSymlinkSupport();
				const linked = resolvePath(path, readlinkSync(file));
				if (existsSync(linked)) {
					const stat = statSync(file);
					if (stat.isDirectory()) {
						if (linked.includes(path)) {
							++hasFailed;
							console.log(
								`Symlink ${file}->${linked} is recursive, skipping...`
							);
						} else if (await _upload_dir(file, false)) {
							console.log(
								`Directory ${file}->${linked} processed successfully.`
							);
							if (unlink) {
								unlinkSync(file);
							}
						} else {
							console.log(`Directory ${file}->${linked} processing failed!`);
						}
					} else if (await _upload_file(file, unlink)) {
						console.log(`File ${file}->${linked} processed successfully.`);
					} else {
						console.log(`Symlink ${file}->${linked} processing failed!`);
						++hasFailed;
					}
				} else {
					console.log(`${linked} does not exist.`);
					console.log(`Removing invalid symlink ${file}`);
					unlinkSync(file);
				}
			} else if (stat.isDirectory()) {
				hasFailed += +!(await _upload_dir(file, unlink).catch(
					(_error) => false
				));
			} else {
				hasFailed += +!(await _upload_file(file, unlink).catch(
					(_error) => false
				));
			}
		}
		if (hasFailed) return resolve(false);
		if (unlink) return unlinkDir(path, {}, () => resolve(true));
		return resolve(true);
	});
}

export async function cloudHandler(
	path: string = '.',
	{
		ignore = DEFAULTS.CLOUD_HANDLER_IGNORE,
		keep = DEFAULTS.CLOUD_HANDLER_KEEP,
		unlink = DEFAULTS.CLOUD_HANDLER_UNLINK,
		unlink_by_default = false,
	}: {
		ignore?: string[];
		keep?: string[];
		unlink?: string[];
		unlink_by_default?: boolean;
	}
): Promise<boolean> {
	let success = true;
	const files = readdirSync(path);
	for (const filename of files) {
		let _ignore: boolean = false,
			_unlink: boolean = unlink_by_default;
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
		if (!_ignore)
			success =
				!!(await _upload_dir(resolvePath(path, filename), _unlink).catch(
					() => false
				)) && success;
	}
	return success;
}

export function gpl(): boolean {
	try {
		fs.writeFileSync(
			'./LICENSE.md',
			fs.readFileSync(resolvePath(__dirname, '..', 'gpl-3.0.md'))
		);
		if (fs.existsSync('./LICENSE')) fs.unlinkSync('./LICENSE');
		const pacjson = read('./package.json');
		pacjson.license = 'GPL-3.0-or-later';
		write('./package.json', pacjson);
		return true;
	} catch (error) {
		return false;
	}
}
