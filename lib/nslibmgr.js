"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudHandler = exports._upload_dir = exports._upload_file = exports.declarationHandler = exports.compileHandler = exports.testHandler = exports.publishHandler = exports.creativeHandler = exports.DEFAULTS = exports.ERROR = void 0;
const fs_1 = require("fs");
const https_1 = __importDefault(require("https"));
const path_1 = require("path");
const child_process_1 = require("child_process");
var ERROR;
(function (ERROR) {
    ERROR["ABORTED"] = "Aborted.";
    ERROR["INVALID_USAGE"] = "This utility does not support either your terminal, or the way you're using it.";
    ERROR["SIZE_LIMIT_EXCEEDED"] = "Size limit exceeded.";
})(ERROR = exports.ERROR || (exports.ERROR = {}));
exports.DEFAULTS = {
    CLOUD_HANDLER_IGNORE: ([
        '.',
        '..',
        '.env',
        '.git',
        'package-lock.json',
        'yarn.lock',
        'node_modules',
    ]),
    CLOUD_HANDLER_KEEP: ([
        'config',
        'docs',
        'examples',
        'lib',
        'src',
        'test',
        'tests',
        'types',
        'util',
        'package.json',
        'index.js',
        'index.ts',
        'index.d.ts',
        'app.js',
        'app.ts',
        'app.d.ts',
        'LICENSE.md',
        'LICENSE',
        'README.md',
        'README.txt',
        'SECURITY.md',
        'CONSTRIBUTING.md',
        'CHANGELOG.md',
        'CODE_OF_CONDUCT.md',
        'DESIGN_GUIDELINES.md',
        '.gitignore',
        '.npmignore',
        '.eslintignore',
        '.prettierignore',
        '.prettierrc.js',
        '.commitlint.config.js',
        '.editorconfig',
        '.vscode',
        '.github',
    ]),
    CLOUD_HANDLER_UNLINK: ([]),
};
const readlinequeue = [];
let readlinebuffer = '';
function readline() {
    return new Promise(accept => {
        readlinequeue.push(accept);
        readlinebuffer = '';
        process.stdout.write('\r\n> ');
    });
}
function ask(question) {
    console.log(question);
    return readline();
}
process.stdin.on('data', chunk => {
    for (const byte of chunk) {
        if (byte < 0x20) {
            if (byte == 0xa) {
                if (readlinequeue.length) {
                    console.log('\n');
                    readlinequeue.shift()?.(readlinebuffer);
                }
                readlinebuffer = '';
            }
        }
        else {
            readlinebuffer += String.fromCharCode(byte);
        }
    }
});
async function creativeHandler(path = '.') {
    return new Promise(async (resolve, reject) => {
        let src = path_1.resolve(path, 'src');
        if (!fs_1.existsSync(src)) {
            fs_1.mkdirSync(src);
        }
        let index = path_1.resolve(src, 'index.ts');
        if (!fs_1.existsSync(index)) {
            fs_1.writeFileSync(index, '// This should be the entry point to your module');
        }
        let cli = path_1.resolve(src, 'cli.ts');
        if (!fs_1.existsSync(cli)) {
            fs_1.writeFileSync(cli, "#!/usr/bin/env node\n\nrequire('.')\n// This file should be the entry point for command-line execution.");
        }
        let gitignore = path_1.resolve(path, '.gitignore');
        if (!fs_1.existsSync(gitignore)) {
            fs_1.writeFileSync(gitignore, 'package-lock.json\nyarn.lock\nnode_modules\n');
        }
        let npmignore = path_1.resolve(path, '.npmignore');
        if (!fs_1.existsSync(npmignore)) {
            fs_1.writeFileSync(npmignore, 'package-lock.json\nyarn.lock\nnode_modules\n.gitignore\n.npmignore\n');
        }
        const packjsonpath = path_1.resolve(path, 'package.json');
        let defaults = {};
        if (fs_1.existsSync(packjsonpath)) {
            defaults = JSON.parse(fs_1.readFileSync(packjsonpath, 'utf-8'));
        }
        const name = defaults.name || await ask('Enter package name');
        const pacjson = ({
            ...{
                name,
                description: defaults.description || await ask('Please enter a description'),
                version: defaults.version || "0.0.0",
                main: defaults.main || 'lib/index.js',
                bin: defaults.bin || {
                    [name.toString()]: 'lib/cli.js',
                },
                scripts: ((typeof defaults.scripts === 'object')
                    ? {
                        start: 'node lib/cli',
                        ...defaults.scripts,
                    } : {
                    start: 'node lib/cli',
                    test: 'npx nslibmgr test',
                }),
                author: defaults.author || await ask("Author's name?"),
                license: defaults.license || await ask('License?'),
            },
            ...defaults,
        });
        pacjson.dependencies = (typeof pacjson.dependencies === 'object') ? { ...pacjson.dependencies } : {};
        pacjson.devDependencies = (typeof pacjson.devDependencies === 'object') ? { ...pacjson.devDependencies } : {};
        if (!pacjson.devDependencies['@types/node'])
            pacjson.devDependencies['@types/node'] = `>=${process.version.substr(1)}`;
        for (const key of Object.keys(pacjson)) {
            if (!pacjson[key]) {
                defaults[key] ? (pacjson[key] = defaults[key]) : delete pacjson[key];
            }
        }
        fs_1.writeFileSync(packjsonpath, JSON.stringify(pacjson, null, '\t') + '\n');
        await new Promise(resolve => {
            child_process_1.exec('npm init -y', resolve);
        });
        fs_1.writeFileSync(packjsonpath, JSON.stringify(JSON.parse(fs_1.readFileSync(packjsonpath, 'utf-8')), null, '\t') + '\n');
        return resolve(true);
    });
}
exports.creativeHandler = creativeHandler;
const publish_options = [
    'npm',
];
function publishHandler(path = '.') {
    return new Promise(async (resolve, reject) => {
        const file = path_1.resolve(path, 'package.json');
        const pacjson = require(file);
        if (!pacjson.version)
            pacjson.version = '0.0.-1';
        let ver = pacjson.version.split('.');
        let [maj, min, pat] = [...ver, 0, 0, 0];
        ++pat;
        pacjson.version = `${+maj || 0}.${+min || 0}.${+pat || 0}`;
        fs_1.writeFileSync(file, JSON.stringify(pacjson, null, '\t') + '\n');
        console.log(`Publish ${pacjson.name} version ${pacjson.version}?`);
        console.log('Type "publish" to publish.');
        if ((await readline()) === 'publish') {
            console.log(`Publish where? (${publish_options.join(', ')})`);
            switch (await readline() || 'npm') {
                case 'npm': {
                    const child = child_process_1.exec('npm publish', {}, (error, stdout, stderr) => resolve(!(stdout || stderr)));
                    if (process.stdin && child.stdin) {
                        process.stdin.pipe(child.stdin);
                    }
                    if (child.stdout && child.stderr && process.stdout) {
                        child.stdout.pipe(process.stdout);
                        child.stderr.pipe(process.stdout);
                    }
                    return;
                }
            }
        }
        --pat;
        pacjson.version = `${+maj || 0}.${+min || 0}.${+pat || 0}`;
        fs_1.writeFileSync(file, JSON.stringify(pacjson, null, '\t') + '\n');
        console.log('Publishing aborted!');
        reject(ERROR.ABORTED);
    });
}
exports.publishHandler = publishHandler;
async function testHandler(path = './tests') {
    return new Promise(async (resolve, reject) => {
        const files = fs_1.readdirSync(path);
        for (const filename of files) {
            const file = path_1.resolve(path, filename);
            const test = require(file);
            if (typeof test === 'function') {
                await test();
            }
            console.log(`Finished test ${filename}`);
        }
        resolve(true);
    });
}
exports.testHandler = testHandler;
function compileHandler(path = '.') {
    return new Promise((resolve, _reject) => {
        let estr = '';
        if (fs_1.existsSync('yarn.lock') || !fs_1.existsSync('package-lock.json')) {
            estr = 'yarn';
        }
        else {
            estr = 'npm i';
        }
        estr += ';tsc --target ES2020 --module CommonJS --declaration --outDir ./lib --esModuleInterop --strict --removeComments --forceConsistentCasingInFilenames src/*.ts';
        const child = child_process_1.exec(estr, {}, (error, stdout, stderr) => {
            process.stderr.write('' + error);
            process.stdout.write(stderr);
            process.stdout.write(stdout);
            resolve(!(stderr || error));
        });
        if (child.stdout && child.stderr) {
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stdout);
        }
    });
}
exports.compileHandler = compileHandler;
async function declarationHandler(path = '.') {
    return new Promise((resolve, _reject) => {
        const pacjsonpath = path_1.resolve(path, 'package.json');
        const pacjson = JSON.parse(fs_1.readFileSync(pacjsonpath, 'utf-8'));
        const { main } = pacjson;
        const entry = path_1.relative(path, main);
        const child = child_process_1.exec(`tsc --target ES2020 --module CommonJS --declaration --AllowJS --outDir ./types --esModuleInterop --strict --forceConsistentCasingInFilenames */**/*.js */**/*ts`, (error, stdout, stderr) => {
            resolve(!(stderr || error));
        });
        if (child.stdout && child.stderr) {
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stdout);
        }
        pacjson.types = `types/${path_1.basename(entry).split('.').slice(0, -1).join('.')}.d.ts`;
        fs_1.writeFileSync(pacjsonpath, JSON.stringify(pacjson, null, '\t') + '\n');
    });
}
exports.declarationHandler = declarationHandler;
function _upload_file(path, unlink = false) {
    return new Promise((resolve, reject) => {
        const stat = fs_1.statSync(path);
        if (stat.size > 2 ** 20)
            return reject(ERROR.SIZE_LIMIT_EXCEEDED);
        const req = https_1.default.request('https://nslibmgr.nodesite.eu/static/upload', {
            method: 'PUT',
            headers: {
                'Content-Type': 'Application/Octet-Stream',
                'Content-Length': stat.size,
                'X-Client': 'nslibmgr',
            }
        }, (res => {
            let b = '';
            res.on('data', data => b += data);
            res.on('end', () => (b.length === 64) ? (unlink ? fs_1.unlink(path, () => resolve(b)) : resolve(b)) : reject(ERROR.SIZE_LIMIT_EXCEEDED));
        }));
        fs_1.createReadStream(path).pipe(req);
    });
}
exports._upload_file = _upload_file;
function _upload_dir(path, unlink = false) {
    return new Promise(async (resolve, reject) => {
        let hasFailed = 0;
        const stat = fs_1.statSync(path);
        if (!stat.isDirectory()) {
            return resolve(!!await _upload_file(path, unlink));
        }
        const files = fs_1.readdirSync(path);
        for (const filename of files) {
            const file = path_1.resolve(path, filename);
            const stat = fs_1.statSync(file);
            if (stat.isDirectory()) {
                hasFailed += +!await _upload_dir(file, unlink)
                    .catch(_error => false);
            }
            else {
                hasFailed += +!await _upload_file(file, unlink)
                    .catch(_error => false);
            }
        }
        if (hasFailed)
            return resolve(false);
        if (unlink)
            return fs_1.rmdir(path, {}, () => resolve(true));
        return resolve(true);
    });
}
exports._upload_dir = _upload_dir;
async function cloudHandler(path = '.', { ignore = exports.DEFAULTS.CLOUD_HANDLER_IGNORE, keep = exports.DEFAULTS.CLOUD_HANDLER_KEEP, unlink = exports.DEFAULTS.CLOUD_HANDLER_UNLINK, unlink_by_default = false, }) {
    let success = true;
    const files = fs_1.readdirSync(path);
    for (const filename of files) {
        let _ignore = false, _unlink = unlink_by_default;
        if (ignore.includes(filename)) {
            _ignore = true;
        }
        if (keep.includes(filename)) {
            _unlink = false;
        }
        if (unlink.includes(filename)) {
            _ignore = false;
            _unlink = true;
        }
        if (!_ignore)
            success = (!!await _upload_dir(path_1.resolve(path, filename), _unlink).catch(() => false)) && success;
    }
    return success;
}
exports.cloudHandler = cloudHandler;
