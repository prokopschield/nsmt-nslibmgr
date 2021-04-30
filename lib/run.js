"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
function run(cmd) {
    return new Promise(resolve => {
        const child = child_process_1.exec(cmd, (error, _stdout, stderr) => resolve(!stderr && !error));
        if (process.stdout && child.stdout)
            child.stdout.on('data', (chunk) => process.stdout.write(chunk));
        if (process.stderr && child.stderr)
            child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    });
}
exports.default = run;
module.exports = run;
Object.assign(run, {
    default: run,
    run,
});
