import fs from "fs";
import path from "path";

import { pkgmgr } from "./pkgmgr";
import run from "./run";
import { noop } from "ps-std";

export function* generateImportTransformationOptions(
	name: string
): Generator<[string, boolean], void, void> {
	yield [`${name}.js`, true];
	yield [`${name}.json`, false];
	yield [`${name}.node`, false];
	yield [`${name}/package.json`, false];
	yield [`${name}/index.js`, true];
	yield [`${name}/index.json`, false];
	yield [`${name}/index.node`, false];
	yield [name, false];
}

export async function transform(file: string) {
	let code = await fs.promises.readFile(file, "utf-8");
	let replacements = 0;

	const matches = code.match(/require\([^)]*\)/g);

	for (const match of matches || []) {
		if (match.includes("/") && !match.match(/\..?js/)) {
			const [, name, quote] = match.match(/^require\(.(.+)(['"])\)$/)!;

			for (const [option, replace] of generateImportTransformationOptions(
				name
			)) {
				const option_path = path.resolve(file, "..", option);

				if (fs.existsSync(option_path)) {
					if (replace) {
						code = code.replace(
							match,
							`require(${quote}${option}${quote})`
						);

						++replacements;
					}

					break;
				}
			}
		}
	}

	if (replacements) {
		await fs.promises.writeFile(file, code);
	}
}

export async function traverse(directory = "lib") {
	const promises = new Array<Promise<void>>();

	for (const name of await fs.promises.readdir(directory)) {
		const file = path.resolve(directory, name);
		const stats = await fs.promises.stat(file);

		if (stats.isDirectory()) {
			promises.push(traverse(file));
		} else if (file.endsWith(".js")) {
			promises.push(transform(file));
		}
	}

	await Promise.all(promises);
}

export async function linkOrCopyFile(src: string, dest: string) {
	const src_stats = await fs.promises.stat(src);
	const dest_stats = await fs.promises.stat(dest).catch(noop);

	if (dest_stats) {
		if (src_stats.ino === dest_stats.ino) {
			return;
		}
	}

	try {
		await fs.promises.link(src, dest);
	} catch (error) {
		await fs.promises.copyFile(src, dest);
	}
}

export async function linkSources(input = "src", output = "lib") {
	for (const entry of await fs.promises.readdir(input)) {
		const input_file = path.resolve(input, entry);
		const output_file = path.resolve(output, entry);
		const stats = await fs.promises.stat(input_file);

		if (stats.isDirectory()) {
			await linkSources(input_file, output_file);
		} else {
			await linkOrCopyFile(input_file, output_file);
		}
	}
}

export async function compile() {
	try {
		await pkgmgr().install();
		await run("tsc");
		await traverse();
		await linkSources();

		return true;
	} catch {
		return false;
	}
}
