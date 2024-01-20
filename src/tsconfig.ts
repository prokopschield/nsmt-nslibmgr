import { Config } from "doge-config";

class TSConfig extends Config {
	constructor() {
		super(
			"tsconfig",
			{
				compilerOptions: {
					target: "ES2018",
					module: "CommonJS",
					declaration: true,
					outDir: "./lib",
					esModuleInterop: true,
					strict: true,
					forceConsistentCasingInFileNames: true,
				},
				include: ["src/**/*"],
				exclude: [],
			},
			"."
		);
	}
}

export const tsconfig = new TSConfig();

export default tsconfig;
module.exports = tsconfig;
