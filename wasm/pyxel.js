const PYODIDE_SDL2_URL = 'https://cdn.jsdelivr.net/gh/kitao/pyodide-sdl2/pyodide.js';
const PYXEL_WHEEL_NAME = 'pyxel-1.8.5-cp37-abi3-emscripten_3_1_21_wasm32.whl';

class Pyxel {
    constructor(pyodide) {
        this.pyodide = pyodide;
    }

    async fetchFiles(root, names) {
        const syncfs = (populate) => new Promise((resolve) => FS.syncfs(populate, resolve));
        let FS = this.pyodide.FS;
        FS.mkdir('/home/pyodide/custom');
        for (let name of names) {
            if (!name) {
                continue;
            }
            let dirs = name.split('/');
            dirs.pop();
            let path = '';
            for (let dir of dirs) {
                path += dir;
                if (!FS.analyzePath(path).exists) {
                    FS.mkdir(path);
                }
                path += '/';
            }

            FS.mount(FS.filesystems.IDBFS, { root: `${root}/assets` }, '/home/pyodide/custom');
            FS.mkdir('/home/pyodide/custom/assets');

            // await syncfs(true);
            let fileResponse = await fetch(`${root}/assets/sample.pyxres`);
            let fileBinary = new Uint8Array(await fileResponse.arrayBuffer());
            this.pyodide.runPython("import os; print(os.listdir('/home/pyodide/custom/assets'))");
            FS.writeFile('/home/pyodide/custom/assets/sample.pyxres', fileBinary, { encoding: 'binary' });
            await syncfs(false);

            this.pyodide.runPython("import os; print(os.listdir('/home/pyodide/custom/assets'))");
            console.log(`Fetched ${root}/assets/sample.pyxres`);
        }
    }

    run(pythonScriptFile) {
        if (!pythonScriptFile) {
            return;
        }
        if (pythonScriptFile.endsWith('.py')) {
            this.pyodide.runPython(`import pyxel.cli; pyxel.cli.run_python_script("${pythonScriptFile}")`);
        } else {
            this.pyodide.runPython(pythonScriptFile);
        }
    }

    play(pyxelAppFile) {
        if (pyxelAppFile) {
            this.pyodide.runPython(`import pyxel.cli; pyxel.cli.play_pyxel_app("${pyxelAppFile}")`);
        }
    }

    edit(pyxelResourceFile) {
        this.pyodide.runPython(`import pyxel.cli; pyxel.cli.edit_pyxel_resource("${pyxelResourceFile}")`);
    }
}

function _scriptDir() {
    let scripts = document.getElementsByTagName('script');
    for (const script of scripts) {
        let match = script.src.match(/(^|.*\/)pyxel\.js$/);
        if (match) {
            return match[1];
        }
    }
}

function _setIcon() {
    let head = document.getElementsByTagName('head').item(0);
    let link = document.createElement('link');
    link.rel = 'icon';
    link.href = _scriptDir() + '../docs/images/pyxel_icon_64x64.ico';
    head.appendChild(link);
}

function _setStyleSheet() {
    let head = document.getElementsByTagName('head').item(0);
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = _scriptDir() + 'pyxel.css';
    head.appendChild(link);
}

function _addCanvas() {
    if (document.querySelector('canvas#canvas')) {
        return;
    }
    let body = document.getElementsByTagName('body').item(0);
    if (!body) {
        body = document.createElement('body');
        document.body = body;
    }
    let canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.oncontextmenu = 'event.preventDefault()';
    canvas.tabindex = -1;
    body.appendChild(canvas);

    function adjustCanvasHeight() {
        document.querySelector('canvas#canvas').style.height = window.innerHeight + 'px';
    }

    adjustCanvasHeight();
    window.addEventListener('resize', adjustCanvasHeight);
}

function loadPyxel(callback) {
    _addCanvas();
    let script = document.createElement('script');
    script.src = PYODIDE_SDL2_URL;
    let firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);
    script.onload = async () => {
        let pyodide = await loadPyodide();
        await pyodide.loadPackage(_scriptDir() + PYXEL_WHEEL_NAME);
        let pyxel = new Pyxel(pyodide);
        callback(pyxel);
    };
}

class PyxelAsset extends HTMLElement {
    static names = [];

    static get observedAttributes() {
        return ['name'];
    }

    constructor() {
        super();
    }

    connectedCallback() {
        PyxelAsset.names.push(this.name);
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        this[name] = newValue;
    }
}
window.customElements.define('pyxel-asset', PyxelAsset);

class PyxelRun extends HTMLElement {
    static get observedAttributes() {
        return ['root', 'name', 'script', 'onstart'];
    }

    constructor() {
        super();
        this.root = '.';
        this.name = '';
        this.script = '';
        this.onstart = '';
    }

    connectedCallback() {
        loadPyxel(async (pyxel) => {
            await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
            eval(this.onstart);
            pyxel.run(this.name);
            pyxel.run(this.script);
        });
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        this[name] = newValue;
    }
}
window.customElements.define('pyxel-run', PyxelRun);

class PyxelPlay extends HTMLElement {
    static get observedAttributes() {
        return ['root', 'name', 'onstart'];
    }

    constructor() {
        super();
        this.root = '.';
        this.name = '';
        this.onstart = '';
    }

    connectedCallback() {
        loadPyxel(async (pyxel) => {
            await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
            eval(this.onstart);
            pyxel.play(this.name);
        });
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        this[name] = newValue;
    }
}
window.customElements.define('pyxel-play', PyxelPlay);

class PyxelEdit extends HTMLElement {
    static get observedAttributes() {
        return ['root', 'name', 'onstart'];
    }

    constructor() {
        super();
        this.root = '.';
        this.name = '';
        this.onstart = '';
    }

    connectedCallback() {
        loadPyxel(async (pyxel) => {
            await pyxel.fetchFiles(this.root, PyxelAsset.names.concat(this.name));
            eval(this.onstart);
            pyxel.edit(this.name);
        });
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        this[name] = newValue;
    }
}
window.customElements.define('pyxel-edit', PyxelEdit);

_setIcon();
_setStyleSheet();
