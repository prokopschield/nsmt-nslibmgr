import { Config } from 'doge-config';
import { read, write } from 'doge-json';

const current_tsconfig = read('tsconfig.json');

class TSConfig extends Config {
	write () {
		write('./tsconfig.json', {
			...this,
			include: this.__getArray('include'),
			exclude: this.__getArray('exclude'),
		});
	}
	constructor () {
		super('tsconfig', {
			compilerOptions: {
				target: 'ES2018',
				module: 'CommonJS',
				declaration: true,
				outDir: './lib',
				esModuleInterop: true,
				strict: true,
				forceConsistentCasingInFileNames: true,
			},
			include: [
				'src/**/*',
			],
			exclude: [
			],
		});
		if (typeof current_tsconfig === 'object') {
			this.__setDefault(current_tsconfig);
		}
	}
}

export const tsconfig = new TSConfig;

export default tsconfig;
module.exports = tsconfig;
