"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
function run(cmd) {
    return new Promise(resolve => {
        const child = child_process_1.exec(cmd, (error, _stdout, stderr) => resolve(!stderr && !error));
        if (process.stdout && child.stdout)
            child.stdout.pipe(process.stdout);
        if (process.stderr && child.stderr)
            child.stderr.pipe(process.stderr);
    });
}
exports.default = run;
module.exports = run;
Object.assign(run, {
    default: run,
    run,
});
