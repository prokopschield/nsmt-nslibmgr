export type PkgMgr = {
	binary: string;
	install(): Promise<boolean>;
	lockfile: string;
};
