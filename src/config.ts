import { read, write } from "doge-don";
import { write as json } from "doge-json";

import defaults from "./defaults";

const cfile = ".nslibrc";
const config: Record<string, unknown> = { format: false, ...read(cfile) };

const errors = Array.isArray(config.error)
	? config.error
	: "error" in config
		? [config.error]
		: [];

config.error = errors;

let automod = false;

const keep = Array<string>();
const unlink = Array<string>();
const ignore = Array<string>();

const dgroups = [
	defaults.CLOUD_HANDLER_IGNORE,
	defaults.CLOUD_HANDLER_KEEP,
	defaults.CLOUD_HANDLER_UNLINK,
];

const groups = [ignore, keep, unlink];
const names = ["ignore", "keep", "unlink"];

for (const [from, to] of [
	[defaults.CLOUD_HANDLER_IGNORE, ignore],
	[defaults.CLOUD_HANDLER_KEEP, keep],
	[defaults.CLOUD_HANDLER_UNLINK, unlink],
]) {
	for (const value of from) {
		if (!config[value]) {
			to.push(value);
		}
	}
}

for (const [key, value] of Object.entries(config)) {
	const value_is_string = typeof value === "string";

	if (value_is_string) {
		const index = names.indexOf(value);

		if (index >= 0) {
			groups[index].push(key);

			continue;
		}
	}

	if (!key.startsWith("invalid:")) {
		for (let index = 0; index < groups.length; ++index) {
			if (dgroups[index].includes(key)) {
				if (typeof value === "string" && value !== "default") {
					errors.push({ invalid: { [key]: config[key] } });
				}

				config[key] = names[index];
				automod = true;
			}
		}
	}
}

export const directory = String((config.directory ||= "."));

if (!("unlink_by_default" in config)) {
	config.unlink_by_default = false;
}

if (errors.length === 0) {
	delete config.error;
}

if (!automod && config.format === false) {
	// do not format
} else if (config.format === "json") {
	config.format = "json";
	json(cfile, config);
} else if (config.format === "don") {
	config.format = "don";
	write(cfile, config);
} else if (automod || config.format) {
	config.format = "rc";
	write(cfile, config, true);
}

export { config, ignore, keep, unlink };
