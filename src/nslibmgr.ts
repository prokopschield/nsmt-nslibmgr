import * as json from 'doge-json';
import fs, {
	existsSync,
	mkdirSync,
	readdirSync,
	createReadStream,
	statSync,
	unlink as unlinkFile,
	rmdir as unlinkDir,
	lstatSync,
	readlinkSync,
	unlinkSync,
} from 'fs';
import https from 'https';
import nsblob from 'nsblob64';
import OpList from 'oplist';
import {
	basename,
	resolve as resolvePath,
	relative as relativePath,
} from 'path';
import io from 'serial-async-io';
import { ask, readline } from './ask';
import run from './run';
import selector from './selector';
import semver from './semver';
import tsconfig from './tsconfig';

export const gitignore = new OpList('.gitignore');
export const npmignore = new OpList('.npmignore');

export enum ERROR {
	ABORTED = 'Aborted.',
	INVALID_USAGE = "This utility does not support either your terminal, or the way you're using it.",
	SIZE_LIMIT_EXCEEDED = 'Size limit exceeded.',
}

import DEFAULTS from './defaults';
export { DEFAULTS };

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
			await io.write(index, '');
		}
		let cli = resolvePath(src, 'cli.ts');
		if (!existsSync(cli)) {
			await io.write(cli, '#!/usr/bin/env node\n');
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
			defaults = json.read(packjsonpath);
		}

		const name = defaults.name || (await ask('Enter package name'));

		for (const [key, value] of Object.entries(defaults)) {
			if (!value) delete defaults[key];
		}

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
					defaults.description ||
					(await ask('Please enter a description')),
				version: defaults.version || '0.0.0',
				main: defaults.main || 'lib/index.js',
				bin: defaults.bin || {
					[String(name)]: 'lib/cli.js',
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
			pacjson.devDependencies[
				'@types/node'
			] = `>=${process.version.substr(1, 2)}`;

		for (const key of Object.keys(pacjson)) {
			if (!pacjson[key]) {
				defaults[key]
					? (pacjson[key] = defaults[key])
					: delete pacjson[key];
			}
		}
		await io.write(
			packjsonpath,
			JSON.stringify(pacjson, null, '\t') + '\n'
		);
		await run('npm init -y');
		json.write(packjsonpath, json.read(packjsonpath));
		if (!pacjson.license) gpl();
		return resolve(true);
	});
}

function gitignore_set(
	dirname: string,
	shouldExist?: boolean,
	isDirectory?: boolean
): boolean {
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
				pp: `pre-release (${semver(pacjson.version, 'pp')})`,
				p: `patch (${semver(pacjson.version, 'p')})`,
				pm: `pre-minor (${semver(pacjson.version, 'pm')})`,
				m: `minor (${semver(pacjson.version, 'm')})`,
				pM: `pre-major (${semver(pacjson.version, 'pM')})`,
				M: `major (${semver(pacjson.version, 'M')})`,
			})
		);
		if (
			!fs.existsSync(
				resolvePath(
					'.',
					pacjson.main.includes('.js')
						? pacjson.main
						: `${pacjson.main}.js`
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
			json.write(file, pacjson);
			gitignore_set('lib', false);
			gitignore_set('node_modules', true, true);
			npmignore.add(...gitignore.entries, 'src/', 'tsconfig.json');
			npmignore.remove('lib');
			switch ((await readline()) || 'yarn') {
				case 'npm': {
					return run('npm publish').then(postPublish).then(resolve);
				}
				case 'yarn': {
					return run('yarn publish').then(postPublish).then(resolve);
				}
			}
		}
		pacjson.version = ov;
		json.write(file, pacjson);
		gitignore_set('lib', true, true);
		console.log('Publishing aborted!');
		reject(ERROR.ABORTED);
	});
}

async function postPublish(success: boolean): Promise<boolean> {
	success &&= gitignore_set('lib', true, true);
	return success;
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

/**
 * Copy a file or a directory
 * @param {string} from source path
 * @param {string} to destination path
 * @returns whether copy was successful
 */
export async function copy(from: string, to: string): Promise<boolean> {
	try {
		let success = true;
		const stat = await fs.promises.stat(from);
		if (stat.isDirectory()) {
			if (!fs.existsSync(to)) {
				fs.mkdirSync(to);
			}
			for (const file of await fs.promises.readdir(from)) {
				const fp = resolvePath(from, file);
				const ft = resolvePath(to, file);
				success &&= await copy(fp, ft);
			}
		} else if (stat.isFile()) {
			const data = await io.read(from);
			if (fs.existsSync(to)) {
				if (!Buffer.compare(data, await io.read(to))) {
					return true;
				}
			}
			await io.write(to, data);
		}
		return success;
	} catch (error) {
		return false;
	}
}

export function compileHandler(path: string = '.'): Promise<boolean> {
	return new Promise((resolve, _reject) => {
		tsconfig.__save();
		return run(process.env.NSLIBMGR_USE_PNPM ? 'pnpm i' : 'yarn')
			.then(async (suc: boolean) => suc && (await run('tsc')))
			.then(async (suc: boolean) => (await copy('src', 'lib')) && suc)
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

export function _upload_file(
	path: string,
	unlink: boolean = false
): Promise<string> {
	return new Promise((resolve, reject) => {
		const stat = statSync(path);
		if (stat.size > 2 ** 20) return reject(ERROR.SIZE_LIMIT_EXCEEDED);
		const req = https.request(
			'https://nslibmgr.nodesite.eu/static/upload',
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'Application/Octet-Stream',
					'Content-Length': stat.size,
					'X-Client': 'nslibmgr',
				},
			},
			(res) => {
				let b = '';
				res.on('data', (data) => (b += data));
				res.on('end', () =>
					b.length === 64
						? unlink
							? unlinkFile(path, () => resolve(b))
							: resolve(b)
						: reject(ERROR.SIZE_LIMIT_EXCEEDED)
				);
			}
		);
		createReadStream(path).pipe(req);
	});
}

type success = boolean;

export function _upload_stream(stream: NodeJS.ReadableStream) {
	const promises = new Array<Promise<string>>();

	stream.on('data', (chunk) => promises.push(nsblob.store(chunk)));

	return new Promise<string[]>((resolve) =>
		stream.on('end', () => resolve(Promise.all(promises)))
	);
}

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
							console.log(
								`Directory ${file}->${linked} processing failed!`
							);
						}
					} else if (await _upload_file(file, unlink)) {
						console.log(
							`File ${file}->${linked} processed successfully.`
						);
					} else {
						console.log(
							`Symlink ${file}->${linked} processing failed!`
						);
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
				!!(await _upload_dir(
					resolvePath(path, filename),
					_unlink
				).catch(() => false)) && success;
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
		const pacjson = json.read('./package.json');
		pacjson.license = 'GPL-3.0-or-later';
		json.write('./package.json', pacjson);
		return true;
	} catch (error) {
		return false;
	}
}
