import { run } from "../run";
import { PkgMgr } from "./types";

export const Bun: PkgMgr = {
	binary: "bun",
	install: () => run("bun install"),
	lockfile: "bun.lockb",
};

export const Npm: PkgMgr = {
	binary: "npm",
	install: () => run("npm install"),
	lockfile: "package-lock.json",
};

export const Yarn: PkgMgr = {
	binary: "yarn",
	install: () => run("yarn"),
	lockfile: "yarn.lock",
};

export const Pnpm: PkgMgr = {
	binary: "pnpm",
	install: () => run("pnpm install"),
	lockfile: "pnpm-lock.yaml",
};

export const pkgmgrs = [Bun, Yarn, Pnpm, Npm];
