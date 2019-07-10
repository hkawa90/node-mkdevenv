import gitignore from '!!raw-loader!./template/.gitignore.txt';
import webpackConf from '!!raw-loader!./template/webpackconfrule.txt';
import fs from 'fs';
import path from 'path';
import cmd from 'node-cmd';
import readline from 'readline';
import stream from 'stream';
import commandLineArgs from 'command-line-args';
//import terminal_kit from 'terminal-kit';

//const term = terminal_kit.terminal;

const gitignoreFile = '.gitignore';
const package_json = 'package.json';
const node_modules = 'node_modules';
const defaultPkgMgr = 'npm';
const webpackConfPath = 'webpack.config.js';

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
    for (var i = 0; i < m.length; i++) {
        modules += m[i] + ' ';
    }
    if (pkgMgr === 'npm') {
        return new Promise(function (resolve, reject) {
            var notInstalled = [];
            cmd.get('npm install ' + modules + ' --save-dev', function (err, data, stderr) {
                if (err)
                    reject(err);
                resolve();
            });
        });
    }
}

function createGitIgnore() {
    if (!isExistFile(path.join('./', gitignoreFile))) {
        fs.writeFileSync(path.join('./', gitignoreFile),
            gitignore.toString('utf8'));
    }
}

function mkDevDir(path) {
    if (!isExistDir(path))
        fs.mkdirSync(path);
}

async function pkgInit(pkgMgr) {
    if ((pkgMgr === undefined) || (pkgMgr === null) || (pkgMgr === '')) {
        pkgMgr = defaultPkgMgr;
    }
    if (isExistFile(path.join('./', package_json)))
        return;
    if (pkgMgr === 'npm') {
        return new Promise(function (resolve, reject) {
            var notInstalled = [];
            cmd.get('npm init -y', function (err, data, stderr) {
                if (err)
                    reject(err);
                resolve();
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

async function createWebpackConf(option, conf) {
    var buffer = '';
    var header = '', output = '';
    var rules = '', plugins = '';
    var resolve = '';
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

    buffer += header + '\n';
    buffer += 'module.exports = {\n';
    buffer += 'target:' + option.target + ',\n';
    buffer += 'mode:' + option.mode + ',\n';
    buffer += 'entry: "./src/index.js",\n';
    if (output !== '') {
        buffer += 'output: {\n';
        buffer += output + '\n';
        buffer += '},\n';
    }
    if (resolve !== '') {
        buffer += 'resolve: {\n';
        buffer += resolve + '\n';
        buffer += '},\n';
    }
    if (rules !== '') {
        buffer += 'module: {\n';
        buffer += 'rules: [\n';
        buffer += rules + '\n';
        buffer += ']\n';
    }
    if (plugins !== '') {
        buffer += 'plugins: {\n';
        buffer += plugins + '\n';
        buffer += '},\n';
    }
    buffer += '};\n';
    fs.writeFileSync(path.join('./', webpackConfPath), buffer);
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
            console.log(conf);
            resolve(conf);
        });

    });
}

async function mkDevEnv(option) {
    // default
    createGitIgnore();
    await pkgInit('npm');
    // read package.json
    var packageJson = JSON.parse(
        fs.readFileSync(path.join('./', package_json), 'utf8'));
    mkDevDir(path.join('./', 'src'));
    mkDevDir(path.join('./', 'dist'));
    packageJson.files = ["README.md", "LICENSE", "package.json", "dist"];
    if (option.withWebpack) {
        // install webpack
        var m = ['webpack', 'webpack-cli'];
        console.log('Install webpack');
        await installDevModules(m, option.package_manager);
        createWebpackConf(option);
        // write package.json
        packageJson.scripts.build = 'webpack --mode production';
        packageJson.scripts.build_dev = 'webpack --mode development';
        writeFileSync(path.join('./', package_json), JSON.stringify(packageJson, null, '  '));

        if (option.node_app) {
            option.target = 'node';
        } else if (option.node_lib_commonJS) {
            option.target = 'node';
        } else if (option.web) {
            option.target = 'web';
            mkDevDir(path.join('./', 'html'));
            var m = ['babel-loader', '@babel/core', '@babel/preset-env'];
            await installDevModules(m, option.package_manager);
        }
    }
    // create webpack.config.js
    var conf = await readWebpackConf();
    console.log(conf);
    createWebpackConf(option, conf);
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
    main_process(options);
} catch (err) {
    process.stdout.write(err.toString() + '\n');
    printHelp();
}

