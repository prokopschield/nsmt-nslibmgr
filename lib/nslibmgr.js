"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gpl = exports.cloudHandler = exports._upload_dir = exports._upload_file = exports.declarationHandler = exports.compileHandler = exports.testHandler = exports.publishHandler = exports.creativeHandler = exports.DEFAULTS = exports.ERROR = void 0;
const fs_1 = __importStar(require("fs"));
const https_1 = __importDefault(require("https"));
const path_1 = require("path");
const run_1 = __importDefault(require("./run"));
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
        '.eslintignore',
        '.prettierignore',
        '.prettierrc.js',
        '.commitlint.config.js',
        '.editorconfig',
        '.whitesource',
        '.vscode',
        '.github',
        'yarn.lock',
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
    var _a;
    for (const byte of chunk) {
        if (byte < 0x20) {
            if (byte == 0xa) {
                if (readlinequeue.length) {
                    console.log('\n');
                    (_a = readlinequeue.shift()) === null || _a === void 0 ? void 0 : _a(readlinebuffer);
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
        const dir = await fs_1.default.promises.readdir(src);
        let index = path_1.resolve(src, dir.filter(a => a && a !== 'cli.ts').shift() || 'index.ts');
        if (!fs_1.existsSync(index)) {
            fs_1.writeFileSync(index, '// This should be the entry point to your module');
        }
        let cli = path_1.resolve(src, 'cli.ts');
        if (!fs_1.existsSync(cli)) {
            fs_1.writeFileSync(cli, "#!/usr/bin/env node\n\nrequire('.');\n// This file should be the entry point for command-line execution.");
        }
        let gitignore = path_1.resolve(path, '.gitignore');
        const ignored = [
            ...(fs_1.default.existsSync(gitignore)
                ? (await fs_1.default.promises.readFile(gitignore, 'utf8')).split(/[\r\n]+/g)
                : [
                    'node_modules/',
                ]).filter((a) => a),
            '',
        ];
        await fs_1.default.promises.writeFile(gitignore, ignored.join('\n'));
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
            pacjson.devDependencies['@types/node'] = `>=${process.version.substr(1, 2)}`;
        for (const key of Object.keys(pacjson)) {
            if (!pacjson[key]) {
                defaults[key] ? (pacjson[key] = defaults[key]) : delete pacjson[key];
            }
        }
        fs_1.writeFileSync(packjsonpath, JSON.stringify(pacjson, null, '\t') + '\n');
        await run_1.default('npm init -y');
        fs_1.writeFileSync(packjsonpath, JSON.stringify(JSON.parse(fs_1.readFileSync(packjsonpath, 'utf-8')), null, '\t') + '\n');
        return resolve(true);
    });
}
exports.creativeHandler = creativeHandler;
async function gitignore_set(dirname, shouldExist, isDirectory) {
    try {
        if (fs_1.default.existsSync('.gitignore')) {
            fs_1.default.writeFileSync('.gitignore', ((fs_1.default.readFileSync('.gitignore', 'utf8') + '\n')
                .split(/[\r\n]+/g)
                .filter(a => a !== dirname)
                .filter(a => a !== `${dirname}/`)
                .join('\n')
                .replace(/[\n]+/, '\n')
                + (shouldExist ? (`${dirname}${isDirectory ? '/' : ''}\n`) : '')));
        }
        return true;
    }
    catch (error) {
        return false;
    }
}
const publish_options = [
    'npm',
    'yarn',
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
        if (!fs_1.default.existsSync(path_1.resolve('.', (pacjson.main.includes('.js')
            ? pacjson.main
            : `${pacjson.main}.js`)))) {
            console.log(`ERROR: ${pacjson.main} does not exist!`);
            console.log(`Refusing to publish.`);
            return reject(false);
        }
        console.log(`Publish ${pacjson.name} version ${pacjson.version}?`);
        console.log('Type "publish" to publish.');
        if ((await readline()) === 'publish') {
            console.log(`Publish where? (${publish_options.join(', ')})`);
            fs_1.writeFileSync(file, JSON.stringify(pacjson, null, '\t') + '\n');
            gitignore_set('lib', false);
            switch (await readline() || 'yarn') {
                case 'npm': {
                    return run_1.default('npm publish').then((success) => gitignore_set('lib', true, true) && success).then(resolve);
                }
                case 'yarn': {
                    return run_1.default('yarn publish').then((success) => gitignore_set('lib', true, true) && success).then(resolve);
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
        estr += ' && tsc --target ES2019 --module CommonJS --declaration --outDir ./lib --esModuleInterop --strict --removeComments --forceConsistentCasingInFilenames src/*.ts';
        return run_1.default(estr).then(resolve);
    });
}
exports.compileHandler = compileHandler;
async function declarationHandler(path = '.') {
    return new Promise((resolve, _reject) => {
        const pacjsonpath = path_1.resolve(path, 'package.json');
        const pacjson = JSON.parse(fs_1.readFileSync(pacjsonpath, 'utf-8'));
        const { main } = pacjson;
        const entry = path_1.relative(path, main);
        run_1.default(`tsc --target ES2020 --module CommonJS --declaration --AllowJS --outDir ./types --esModuleInterop --strict --forceConsistentCasingInFilenames */**/*.js */**/*ts`).then(resolve);
        pacjson.types = `types/${path_1.basename(entry).split('.').slice(0, -1).join('.')}.d.ts`;
        fs_1.writeFileSync(pacjsonpath, JSON.stringify(pacjson, null, '\t') + '\n');
    });
}
exports.declarationHandler = declarationHandler;
let warnedAboutSymlinkSupport = false;
function warnSymlinkSupport() {
    if (!warnedAboutSymlinkSupport) {
        warnedAboutSymlinkSupport = true;
        console.log(`nslibmgr does not support symbolic links`);
        console.log(`Undesired behavior may happen!`);
    }
}
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
            const stat = fs_1.lstatSync(file);
            if (stat.isSymbolicLink()) {
                console.log(`Encountered symbolic link: ${file}`);
                warnSymlinkSupport();
                const linked = path_1.resolve(path, fs_1.readlinkSync(file));
                if (fs_1.existsSync(linked)) {
                    const stat = fs_1.statSync(file);
                    if (stat.isDirectory()) {
                        if (linked.includes(path)) {
                            ++hasFailed;
                            console.log(`Symlink ${file}->${linked} is recursive, skipping...`);
                        }
                        else if (await _upload_dir(file, false)) {
                            console.log(`Directory ${file}->${linked} processed successfully.`);
                            if (unlink) {
                                fs_1.unlinkSync(file);
                            }
                        }
                        else {
                            console.log(`Directory ${file}->${linked} processing failed!`);
                        }
                    }
                    else if (await _upload_file(file, unlink)) {
                        console.log(`File ${file}->${linked} processed successfully.`);
                    }
                    else {
                        console.log(`Symlink ${file}->${linked} processing failed!`);
                        ++hasFailed;
                    }
                }
                else {
                    console.log(`${linked} does not exist.`);
                    console.log(`Removing invalid symlink ${file}`);
                    fs_1.unlinkSync(file);
                }
            }
            else if (stat.isDirectory()) {
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
function gpl() {
    try {
        const pacjson = JSON.parse(fs_1.readFileSync('./package.json', 'utf8'));
        pacjson.license = 'GPL-3.0-or-later';
        fs_1.writeFileSync('./package.json', JSON.stringify(pacjson, null, '\t') + '\n');
        fs_1.writeFileSync('./LICENSE', fs_1.readFileSync(path_1.resolve(__dirname, '..', 'LICENSE')));
        return true;
    }
    catch (error) {
        console.log({ error });
        return false;
    }
}
exports.gpl = gpl;
