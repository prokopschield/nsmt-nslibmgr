import { exec } from 'child_process';

/**
 * Executes shell command
 *
 * @param {string} cmd shell command
 * @returns {Promise<boolean>} Were there no errors?
 */
export function run(cmd: string): Promise<boolean> {
	return new Promise((resolve) => {
		const child = exec(cmd, (error, _stdout, stderr) =>
			resolve(!stderr && !error)
		);
		if (process.stdout && child.stdout)
			child.stdout.on('data', (chunk: Buffer) =>
				process.stdout.write(chunk)
			);
		if (process.stderr && child.stderr)
			child.stderr.on('data', (chunk: Buffer) =>
				process.stderr.write(chunk)
			);
	});
}

export default run;
module.exports = run;

Object.assign(run, {
	default: run,
	run,
});
