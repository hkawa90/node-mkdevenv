import gitignore from '!!raw-loader!./template/.gitignore.txt';
import webpackConf from '!!raw-loader!./template/webpackconfrule.txt';
import fs from 'fs';
import path from 'path';
import cmd from 'node-cmd';
import readline from 'readline';
import stream from 'stream';
import commandLineArgs from 'command-line-args';

import { progressListOnTerm } from './term';
import { EventEmitter } from 'events';


const gitignoreFile = '.gitignore';
const package_json = 'package.json';
const node_modules = 'node_modules';
const defaultPkgMgr = 'npm';
const webpackConfPath = 'webpack.config.js';


var progressState = [{ title: 'Create .gitignore.', state: '-' },
{ title: 'Initialize package.json.', state: '-' },
{ title: 'Install core webpack modules.', state: '-' },
{ title: 'Customize package.json.', state: '-' },
{ title: 'Install webpack loaders/plugins.', state: '-' },
{ title: 'Create webpack.config.js.', state: '-' }
];

const optionDefinitions = [
    {
        name: 'node_app',
        alias: 'n',
        type: Boolean
    },
    {
        name: 'node_lib_commonJS',
        type: Boolean
    },
    {
        name: 'web',
        alias: 'w',
        type: Boolean
    },
    {
        name: 'css',
        type: Boolean
    },
    {
        name: 'sass',
        type: Boolean
    },
    {
        name: 'images',
        type: Boolean
    },
    {
        name: 'no_install',
        type: Boolean,
        defaultValue: false
    },
    {
        name: 'no_webpack',
        type: Boolean,
        defaultValue: false
    },
    {
        name: 'with_sample_code',
        type: Boolean
    },
    {
        name: 'use_dev_server',
        type: Boolean
    },
    {
        name: 'package_manager',
        type: String,
        defaultValue: 'npm'
    },
    {
        name: 'help',
        alias: 'h',
        type: Boolean
    }
];

function isExistFile(file) {
    try {
        fs.statSync(file);
        return true
    } catch (err) {
        if (err.code === 'ENOENT') return false
    }
}

function isExistDir(dirname) {
    try {
        fs.accessSync(dirname, fs.constants.R_OK | fs.constants.W_OK);
        return true;
    } catch (err) {
        return false;
    }
}

async function isExistModules(moduleList, pkgMgr) {
    var modules = '';
    if ((pkgMgr === undefined) || (pkgMgr === null) || (pkgMgr === '')) {
        pkgMgr = defaultPkgMgr;
    }
    if (!isExistDir(node_modules))
        return moduleList;
    for (var i = 0; i < moduleList.length; i++) {
        modules += moduleList[i] + ' ';
    }
    if (pkgMgr === 'npm') {
        return new Promise(function (resolve, reject) {
            var notInstalled = [];
            cmd.get('npm ls --depth 0 ' + modules, function (err, data, stderr) {
                if (err)
                    reject(err);
                for (var i = 0; i < moduleList.length; i++) {
                    var re = new RegExp(moduleList[i], 'g');
                    var r = re.exec(data);
                    if (r === null) {
                        // not installed
                        notInstalled.push(moduleList[i]);
                    }
                }
                resolve(notInstalled);
            });
        });
    }
}

async function installDevModules(moduleList, pkgMgr) {
    var modules = '';
    if ((pkgMgr === undefined) || (pkgMgr === null) || (pkgMgr === '')) {
        pkgMgr = defaultPkgMgr;
    }
    var m = await isExistModules(moduleList, pkgMgr);
    if (m.length === 0) {
        return 'skip';
    }
    for (var i = 0; i < m.length; i++) {
        modules += m[i] + ' ';
    }
    if (pkgMgr === 'npm') {
        return new Promise(function (resolve, reject) {
            var notInstalled = [];
            cmd.get('npm install ' + modules + ' --save-dev', function (err, data, stderr) {
                if (err)
                    reject('ng');
                resolve('ok');
            });
        });
    }
}

function createGitIgnore(reporter) {
    if (!isExistFile(path.join('./', gitignoreFile))) {
        try {
            fs.writeFileSync(path.join('./', gitignoreFile),
                gitignore.toString('utf8'));
            reporter.emit('ok', 'Create .gitignore.');
        } catch (err) {
            reporter.emit('ng', 'Create .gitignore.');
        }
    } else {
        reporter.emit('skip', 'Create .gitignore.');
    }
}

function mkDevDir(path) {
    if (!isExistDir(path))
        fs.mkdirSync(path);
}

async function pkgInit(pkgMgr, reporter) {
    if ((pkgMgr === undefined) || (pkgMgr === null) || (pkgMgr === '')) {
        pkgMgr = defaultPkgMgr;
    }
    if (isExistFile(path.join('./', package_json))) {
        reporter.emit('skip', 'Initialize package.json.');
        return;
    }
    if (pkgMgr === 'npm') {
        return new Promise(function (resolve, reject) {
            var notInstalled = [];
            cmd.get('npm init -y', function (err, data, stderr) {
                if (err) {
                    reporter.emit('ng', 'Initialize package.json.');
                    reject(err);
                } else {
                    reporter.emit('ok', 'Initialize package.json.');
                    resolve();
                }
            });
        });
    }
}

function mkConfProp(sectionName, option, conf) {
    var buffer = '';
    for (var ins in conf[sectionName]) {
        if (ins === 'common') {
            buffer += conf[sectionName][ins];
        }
        if ((option[ins] !== undefined) && (option[ins]) && (conf[sectionName][ins] !== undefined)) {
            buffer += conf[sectionName][ins];
        }
    }
    return buffer;
}

async function createWebpackConf(option, conf, reporter) {
    var buffer = '';
    var header = '', output = '';
    var rules = '', plugins = '';
    var resolve = '', node = '';
    // install require modules
    if (!option.no_install) {
        for (var ins in conf['install']) {
            if ((option[ins] !== undefined) && (option[ins])) {
                var m = conf['install'][ins].split(' ');
                await installDevModules(m, option.package_manager);
            }
        }
    }
    // build webpack.config.js
    // - header
    header = mkConfProp('header', option, conf);
    // - rules
    rules = mkConfProp('rules', option, conf);
    // - plugins
    plugins = mkConfProp('plugins', option, conf);
    // - output
    output = mkConfProp('output', option, conf);
    // - resolve
    resolve = mkConfProp('resolve', option, conf);
    // - node
    node = mkConfProp('node', option, conf);

    buffer += header + '\n';
    buffer += 'module.exports = (env, argv) => {\n';
    buffer += '  const enabledSourceMap = (argv.mode === "production") ? false : true;\n';
    buffer += '  return {\n';
    buffer += '    target: "' + option.target + '",\n';
    buffer += '    entry: "./src/index.js",\n';
    if (output !== '') {
        buffer += '    output: {\n';
        buffer += '      ' + output + '\n';
        buffer += '    },\n';
    }
    if (resolve !== '') {
        buffer += '    resolve: {\n';
        buffer += '      ' + resolve + '\n';
        buffer += '    },\n';
    }
    if (rules !== '') {
        buffer += '    module: {\n';
        buffer += '    rules: [\n';
        buffer += '      ' + rules + '\n';
        buffer += '    ]\n';
    }
    if (plugins !== '') {
        buffer += '    plugins: [\n';
        buffer += '      ' + plugins + '\n';
        buffer += '    ],\n';
    }
    if (node !== '') {
        buffer += '    node: {\n';
        buffer += '      ' + node + '\n';
        buffer += '    },\n';
    }
    buffer += '  }\n';
    buffer += '}\n';
    try {
        fs.writeFileSync(path.join('./', webpackConfPath), buffer);
        reporter.emit('ok', 'Create webpack.config.js.');
    } catch (err) {
        reporter.emit('ng', 'Create webpack.config.js.');
    }
}

async function readWebpackConf() {
    var conf = [], section = null, subsection = null;
    // string to buffer
    var buf = new Buffer.from(webpackConf);
    var bufferStream = new stream.PassThrough();
    bufferStream.end(buf);

    return new Promise(function (resolve, reject) {
        var rl = readline.createInterface({
            input: bufferStream,
        });

        rl.on('line', function (line) {
            var re = new RegExp(/^\[\[(.*)\]\]$/, 'g');
            var r = re.exec(line);
            if (r !== null) {
                if (conf[r[1]] === undefined) {
                    conf[r[1]] = [];
                }
                section = r[1];
                subsection = null;
            } else {
                re = new RegExp(/^\[(.*)\]$/, 'g');
                r = re.exec(line);
                if (r !== null) {
                    if (section !== null) {
                        subsection = r[1];
                        if (conf[section][subsection] === undefined)
                            conf[section][subsection] = '';
                    }
                } else {
                    if ((section !== null) && (subsection !== null)) {
                        conf[section][subsection] += line + '\n';
                    }
                }
            }
        });

        rl.on('close', function () {
            resolve(conf);
        });

    });
}

async function mkDevEnv(option) {
    // regist event
    var reporter = new EventEmitter;
    reporter.on('ok', (title) => {
        for (var i = 0; i < progressState.length; i++)
            if (progressState[i].title === title) {
                progressState[i].state = 'ok';
                progressListOnTerm(progressState);
            }
    });
    reporter.on('ng', (title) => {
        for (var i = 0; i < progressState.length; i++)
            if (progressState[i].title === title) {
                progressState[i].state = 'ng';
                progressListOnTerm(progressState);
            }
    });
    reporter.on('skip', (title) => {
        for (var i = 0; i < progressState.length; i++)
            if (progressState[i].title === title) {
                progressState[i].state = 'skip';
                progressListOnTerm(progressState);
            }
    });
    if (option.node_app) {
        option.target = 'node';
    } else if (option.node_lib_commonJS) {
        option.target = 'node';
    } else if (option.web) {
        option.target = 'web';
    }
    // default
    createGitIgnore(reporter);
    await pkgInit(option.package_manager, reporter);
    mkDevDir(path.join('./', 'src'));
    mkDevDir(path.join('./', 'dist'));
    if (option.withWebpack) {
        // install webpack
        var m;
        if (option.use_dev_server) {
            m = ['webpack', 'webpack-cli', 'webpack-dev-server'];
        } else {
            m = ['webpack', 'webpack-cli'];
        }
        if (!option.no_install) {
            var ret = await installDevModules(m, option.package_manager);
            reporter.emit(ret, 'Install core webpack modules.');
        } else {
            reporter.emit('skip', 'Install core webpack modules.');
        }
        // read package.json
        try {
            var packageJson = JSON.parse(
                fs.readFileSync(path.join('./', package_json), 'utf8'));
            // write package.json
            packageJson.scripts.build = 'webpack --mode production';
            packageJson.scripts.build_dev = 'webpack --mode development';
            packageJson.files = ["README.md", "LICENSE", "package.json", "dist"];
            if (option.node_app) {
                packageJson.bin = {};
                packageJson.bin[packageJson.name] = './dist/main.js';
            }
            if (option.node_lib_commonJS) {
                packageJson.main = "./dist/main.js";
            }
            fs.writeFileSync(path.join('./', package_json), JSON.stringify(packageJson, null, '  '));
            reporter.emit('ok', 'Customize package.json.');
        } catch (err) {
            reporter.emit('ng', 'Customize package.json.');
        }
        if (option.web) {
            mkDevDir(path.join('./', 'html'));
            var m = ['babel-loader', '@babel/core', '@babel/preset-env'];
            if (!option.no_install) {
                await installDevModules(m, option.package_manager);
            }
        }
        reporter.emit('ok', 'Install webpack loaders/plugins.');
        // create webpack.config.js
        var conf = await readWebpackConf();
        await createWebpackConf(option, conf, reporter);
    } else {
        reporter.emit('skip', 'Install core webpack modules.');
        reporter.emit('skip', 'Customize package.json.');
        reporter.emit('skip', 'Install webpack loaders/plugins.');
        reporter.emit('skip', 'Create webpack.config.js.');
    }
}

async function main_process(options) {
    options.withWebpack = true; // default
    if (options.web)
        options.html = true;
    await mkDevEnv(options);
}

function printHelp() {
    process.stdout.write('option list:\n');
    process.stdout.write(' -n,--node_app          : make node application environment.\n');
    process.stdout.write('    --node_lib_commonJS : make node library environment.\n');
    process.stdout.write(' -w,--web               : make web application environment.\n');
    process.stdout.write('    --css               : make web application environment using css.\n');
    process.stdout.write('    --sass              : make web application environment using sass.\n');
    process.stdout.write('    --images            : make web application environment using images.\n');
    process.stdout.write('    --use_dev_server    : webpack with webpack-dev-server.\n');
    process.stdout.write('    --no_install        : do not install required modules.\n');
    process.stdout.write('    --no_webpack        : do not use webpack.\n');
    process.stdout.write('    --with_sample_code  : create sample code.\n');
    process.stdout.write('    --package_manager npm|yarn : specify package manager(defult:npm).\n');
    process.stdout.write(' -h,--help              : This message.\n');
    process.exit(1);
}

try {
    const options = commandLineArgs(optionDefinitions);
    if (options.help) {
        printHelp();
    }
    progressListOnTerm(progressState);
    main_process(options);
} catch (err) {
    process.stdout.write(err.toString() + '\n');
    printHelp();
}

