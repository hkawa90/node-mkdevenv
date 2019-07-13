const ansiEscapes = require('ansi-escapes');
const style = require('ansi-styles');

async function sleep(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

function progressListOnTerm(state, options) {
    let open, close, bullet;
    let done = true;
    let defaultOption = {
        ok : {color: 'green', mark : '\u2611'},
        ng : {color: 'red', mark : '\u2612'},
        skip : {color: 'blackBright', mark : '\u2615'},
        std : {color : 'white', mark : '\u2610'}
    }
    if (!Array.isArray(state)) {
        return;
    }
    Object.assign(defaultOption, options || defaultOption);
    process.stdout.write(ansiEscapes.cursorHide);
    for (let i = 0; i < state.length; i++) {
        switch (state[i].state) {
            case 'ok':
                bullet = defaultOption.ok.mark;
                // open = style.green.open;
                // close = style.green.close;
                open = style[defaultOption.ok.color].open;
                close = style[defaultOption.ok.color].close;
                break;
            case 'ng':
                bullet = defaultOption.ng.mark;
                // open = style.red.open;
                // close = style.red.close;
                open = style[defaultOption.ng.color].open;
                close = style[defaultOption.ng.color].close;
                break;
            case 'skip':
                bullet = defaultOption.skip.mark;
                // open = style.blackBright.open;
                // close = style.blackBright.close;
                open = style[defaultOption.skip.color].open;
                close = style[defaultOption.skip.color].close;
                break;
            case '-':
                bullet = defaultOption.std.mark;
                // open = style.white.open;
                // close = style.white.close;
                open = style[defaultOption.std.color].open;
                close = style[defaultOption.std.color].close;
                done = false;
                break;
        }
        process.stdout.write(open);

        process.stdout.write(bullet);
        process.stdout.write(ansiEscapes.cursorMove(1, 0));
        output = state[i].title + '\n';
        process.stdout.write(output);
        process.stdout.write(close);
    }
    process.stdout.write(ansiEscapes.cursorMove(0, -state.length));

    if (done) {
        process.stdout.write(ansiEscapes.cursorShow);
        process.stdout.write(ansiEscapes.cursorMove(0, state.length));
    }
}

function progressListWithStatus(str, status) {
    var output = status ? '\u2610 ' : '\u2611 ';
    process.stdout.write(output);
    process.stdout.write(str + '\n');
}

module.exports.progressListWithStatus = progressListWithStatus;
module.exports.progressListOnTerm = progressListOnTerm;