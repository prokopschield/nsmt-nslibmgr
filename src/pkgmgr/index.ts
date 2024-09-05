import fs from "fs";
import { once } from "ps-std";

import { config, directory } from "../config";
import { gitignore } from "../nslibmgr";
import { Yarn, pkgmgrs } from "./pkgmgrs";

const pick_pkgmgr = once(() => {
	for (const mgr of pkgmgrs) {
		if (config.pkgmgr === mgr.binary) {
			return mgr;
		}
	}

	const readdir = fs.readdirSync(directory);

	for (const mgr of pkgmgrs) {
		if (readdir.includes(mgr.lockfile)) {
			return mgr;
		}
	}

	const ignored = gitignore.set;

	for (const mgr of pkgmgrs) {
		if (ignored.has(mgr.lockfile)) {
			return mgr;
		}
	}

	return Yarn;
});

export const pkgmgr = once(() => {
	const mgr = pick_pkgmgr();

	config.pkgmgr = mgr.binary || "";

	return mgr;
});
