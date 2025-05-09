// ter.js
document.addEventListener('DOMContentLoaded', () => {
    // ── State & Element References ─────────────────────────────────────────────
    let currentTool      = null;
    let gridElement      = null;
    let modalTool        = null;
    let modalTarget      = null;
    let hamMouthCount    = 0;
    let initialSnapshot  = null;
    let userGen          = null;
    let timer            = null;

    const TERR_KEY = "hamsterTerritory";
    const CODE_KEY = "hamsterCode";
    const RUN_KEY  = "runPending";

    const territoryModal = document.getElementById('territoryModal');
    const cornModal      = document.getElementById('cornModal');
    const fileInput      = document.getElementById('fileInput');
    const cornDisplay    = document.getElementById('cornDisplay');
    const writerOutput   = document.getElementById('writerOutput');

    const stepBackBtn = document.querySelector('button[title="Schritt zurück"]');
    const playBtn     = document.querySelector('button[title="Play"]');
    const pauseBtn    = document.querySelector('button[title="Pause"]');
    const stopBtn     = document.querySelector('button[title="Stop"]');

    // ── Helpers ────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        // The exact command sequence your "ESP" should run:
        const sequence = [
            'linksUm','vor','nimm',
            'rechtsUm','vor','gib',
            'vor','nimm','rechtsUm',
            'vor','gib','linksUm',
            'vor','gib'
        ];
        let idx = 0;

        // Show a little popup in the bottom-left
        function showRfidMsg() {
            const msg = document.createElement('div');
            msg.textContent = 'RFID-Schreibvorgang erfolgreich';
            Object.assign(msg.style, {
                position:       'fixed',
                bottom:         '12px',
                left:           '12px',
                background:     'rgba(0,0,0,0.7)',
                color:          'white',
                padding:        '6px 10px',
                borderRadius:   '4px',
                fontSize:       '14px',
                zIndex:         9999,
                pointerEvents:  'none'
            });
            document.body.appendChild(msg);
            setTimeout(() => document.body.removeChild(msg), 1500);
        }

        function runNext() {
            if (idx >= sequence.length) return;
            const cmd = sequence[idx++];
            const btn = document.querySelector(`[data-cmd="${cmd}"]`);
            if (btn) {
                btn.click();
                // on nimm() or gib(), show the fake RFID-write popup
                if (cmd === 'nimm' || cmd === 'gib') {
                    showRfidMsg();
                }
            }
            // slightly slower than the default 500 ms
            setTimeout(runNext, 1000);
        }

        // kick off after a short delay
        setTimeout(runNext, 800);
    });

    function updateCornDisplay() {
        cornDisplay.textContent = `Körner im Maul: ${hamMouthCount}`;
    }

    function snapshot() {
        return localStorage.getItem(TERR_KEY) + '||' + hamMouthCount;
    }

    function restore(s) {
        const [terr, mouth] = s.split('||');
        localStorage.setItem(TERR_KEY, terr);
        loadTerritoryState();
        hamMouthCount = +mouth;
        updateCornDisplay();
    }

    function drawCell(cell) {
        cell.innerHTML = '';
        if (cell.dataset.wall === 'true') {
            cell.innerHTML = '<img src="data/wand/Wall32.png" style="width:100%;height:100%;">';
        } else {
            const cnt = +cell.dataset.cornCount;
            if (cnt > 0) {
                const d = Math.min(cnt,12);
                cell.innerHTML = `<img src="data/körner/${d}Corn32.png" style="width:100%;height:100%;">`;
            }
        }
        cell.style.position = 'relative';
    }

    function renderHamster(cell, rot) {
        // remove old hamster(s)
        gridElement.querySelectorAll('[data-has-hamster="true"]').forEach(oldCell => {
            oldCell.dataset.hasHamster = 'false';
            drawCell(oldCell);
        });
        // place new hamster
        cell.dataset.hasHamster = 'true';
        cell.dataset.rotation   = rot;
        drawCell(cell);
        const img = document.createElement('img');
        img.src = 'data/hamster/hamstereast.png';
        img.style.cssText = `
            width:100%;height:100%;position:absolute;
            top:0;left:0;transform:rotate(${rot}deg);
        `;
        cell.appendChild(img);
    }

    function updateToolbarState() {
        const hasGrid = !!gridElement;
        const hasHam  = hasGrid && !!gridElement.querySelector('[data-has-hamster="true"]');
        // enable/disable grid-based tools
        ['newTerritory','openTerritory','saveTerritory',
            'placeHamster','rotateBtn','placeCorn','placeWall',
            'deleteItem','zoomIn','zoomOut'
        ].forEach(id => {
            document.getElementById(id).disabled = !hasGrid;
        });
        // hamster-corn only if hamster exists
        document.getElementById('placeHamsterCorn').disabled = !hasHam;
        // playback controls only after run
        [stepBackBtn, playBtn, pauseBtn, stopBtn].forEach(b => {
            // these get enabled when code is runPending
        });
    }

    // ── Grid Construction ─────────────────────────────────────────────────────
    function buildGrid(rows, cols) {
        const container = document.getElementById('gridContainer');
        if (gridElement) gridElement.remove();
        gridElement = document.createElement('div');
        gridElement.id = 'grid';
        gridElement.style.display = 'grid';
        gridElement.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
        gridElement.dataset.scale = '1';
        for (let i = 0; i < rows * cols; i++) {
            const cell = document.createElement('div');
            cell.dataset.hasHamster = 'false';
            cell.dataset.cornCount  = '0';
            cell.dataset.wall       = 'false';
            drawCell(cell);
            gridElement.appendChild(cell);
        }
        container.innerHTML = '';
        container.appendChild(gridElement);
        hamMouthCount = 0;
        updateCornDisplay();
        updateToolbarState();
    }

    // ── Persistence ────────────────────────────────────────────────────────────
    function saveTerritoryState() {
        if (!gridElement) return;
        const cols = +gridElement.style.gridTemplateColumns.match(/\d+/)[0];
        const rows = gridElement.children.length / cols;
        const cells = Array.from(gridElement.children).map(c => ({
            hasHamster: c.dataset.hasHamster === 'true',
            rotation:   +c.dataset.rotation || 0,
            wall:       c.dataset.wall === 'true',
            cornCount:  +c.dataset.cornCount
        }));
        localStorage.setItem(TERR_KEY,
            JSON.stringify({ cols, rows, cells, hamMouthCount })
        );
    }

    function loadTerritoryState() {
        const raw = localStorage.getItem(TERR_KEY);
        if (!raw) return false;
        let st;
        try { st = JSON.parse(raw); } catch { return false; }
        const { cols, rows, cells, hamMouthCount: mouth } = st;
        if (!Array.isArray(cells) || cells.length !== rows * cols) return false;
        buildGrid(rows, cols);
        cells.forEach((c, idx) => {
            const cell = gridElement.children[idx];
            cell.dataset.wall       = c.wall      ? 'true' : 'false';
            cell.dataset.cornCount  = c.cornCount + '';
            cell.dataset.hasHamster = c.hasHamster ? 'true' : 'false';
            if (c.hasHamster) cell.dataset.rotation = c.rotation + '';
        });
        gridElement.querySelectorAll('div').forEach(drawCell);
        gridElement.querySelectorAll('[data-has-hamster="true"]').forEach(c => {
            renderHamster(c, +c.dataset.rotation);
        });
        hamMouthCount = mouth;
        updateCornDisplay();
        updateToolbarState();
        return true;
    }

    loadTerritoryState();
    window.addEventListener('beforeunload', saveTerritoryState);

    // ── Territory UI ──────────────────────────────────────────────────────────
    document.getElementById('newTerritory').onclick = () => territoryModal.classList.remove('hidden');
    document.getElementById('createTerritoryConfirm').onclick = () => {
        const rows = +document.getElementById('rows').value;
        const cols = +document.getElementById('cols').value;
        if (!rows || !cols) return alert('Ungültige Werte');
        buildGrid(rows, cols);
        territoryModal.classList.add('hidden');
        saveTerritoryState();
    };
    document.getElementById('createTerritoryCancel').onclick = () => territoryModal.classList.add('hidden');
    document.getElementById('openTerritory').onclick = () => fileInput.click();
    fileInput.onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = ev => {
            processTerritoryFile(ev.target.result);
            saveTerritoryState();
        };
        r.readAsText(f);
        fileInput.value = '';
    };

    function processTerritoryFile(text) {
        const lines = text.split(/\r?\n/);
        if (lines[0].startsWith('initializeTerritory')) loadScriptTerritory(lines);
        else                                      loadAsciiTerritory(lines);
    }

    function loadScriptTerritory(lines) {
        const m0 = /initializeTerritory\s*\(\s*new Size\((\d+),\s*(\d+)\)\)/.exec(lines[0]);
        if (!m0) return alert('Invalid header');
        const cols = +m0[1], rows = +m0[2];
        buildGrid(rows, cols);

        let hamX, hamY, hamRot;
        lines.forEach(l => {
            const m = /defaultHamsterAt\s*\(\s*new Location\((\d+),\s*(\d+)\),\s*Direction\.([A-Z]+),\s*(\d+)\)/.exec(l);
            if (m) {
                hamX = +m[1]; hamY = +m[2];
                hamRot = { EAST:0, SOUTH:90, WEST:180, NORTH:270 }[m[3]] || 0;
                hamMouthCount = +m[4];
            }
        });

        let w;
        while (w = /wallAt\s*\(\s*new Location\((\d+),\s*(\d+)\)\)/g.exec(lines.join('\n'))) {
            const x = +w[1], y = +w[2];
            gridElement.children[y*cols + x].dataset.wall = 'true';
        }

        let g;
        while (g = /grainAt\s*\(\s*new Location\((\d+),\s*(\d+)\)\s*,\s*(\d+)\)/g.exec(lines.join('\n'))) {
            const x = +g[1], y = +g[2], cnt = +g[3];
            gridElement.children[y*cols + x].dataset.cornCount = cnt + '';
        }

        if (hamX != null) {
            const cell = gridElement.children[hamY*cols + hamX];
            cell.dataset.hasHamster = 'true';
            cell.dataset.rotation   = hamRot + '';
        }

        gridElement.querySelectorAll('div').forEach(drawCell);
        gridElement.querySelectorAll('[data-has-hamster="true"]').forEach(c => {
            renderHamster(c, +c.dataset.rotation);
        });

        updateCornDisplay();
        updateToolbarState();
    }

    function loadAsciiTerritory(lines) {
        const cols = +lines[0], rows = +lines[1];
        if (isNaN(cols)||isNaN(rows)) return alert('Ungültige Dimension');
        const ascii = lines.slice(2,2+rows);
        if (ascii.some(r=>r.length!==cols)) return alert('Zeilenlängen falsch');
        buildGrid(rows, cols);

        let hamX, hamY, hamRot;
        const cornPos = [];
        ascii.forEach((row,y) => [...row].forEach((ch,x) => {
            const cell = gridElement.children[y*cols + x];
            if (ch === '#') {
                cell.dataset.wall = 'true';
            } else if (ch === '*') {
                cornPos.push({x,y});
            } else if ('>v<^'.includes(ch)) {
                hamX = x; hamY = y;
                hamRot = { '>':0,'v':90,'<':180,'^':270 }[ch];
                cell.dataset.hasHamster = 'true';
                cell.dataset.rotation   = hamRot + '';
            }
        }));

        const counts = lines.slice(2+rows,2+rows+cornPos.length+1).map(l=>+l||0);
        cornPos.forEach((p,i) => {
            gridElement.children[p.y*cols + p.x].dataset.cornCount = counts[i] + '';
        });

        if (hamX!=null) {
            const cell = gridElement.children[hamY*cols + hamX];
            cell.dataset.hasHamster = 'true';
            cell.dataset.rotation   = hamRot + '';
        }

        gridElement.querySelectorAll('div').forEach(drawCell);
        gridElement.querySelectorAll('[data-has-hamster="true"]').forEach(c => {
            renderHamster(c, +c.dataset.rotation);
        });

        hamMouthCount = counts[cornPos.length]||0;
        updateCornDisplay();
        updateToolbarState();
    }

    document.getElementById('saveTerritory').onclick = () => {
        if (!gridElement) return alert('Kein Territorium');
        const cols  = +gridElement.style.gridTemplateColumns.match(/\d+/)[0];
        const cells = Array.from(gridElement.children);
        const rows  = cells.length/cols;
        const ascii = [];

        for (let y=0; y<rows; y++) {
            let line = '';
            for (let x=0; x<cols; x++) {
                const c = cells[y*cols + x];
                if (c.dataset.wall==='true')             line+='#';
                else if (c.dataset.hasHamster==='true') line += {0:'>',90:'v',180:'<',270:'^'}[+c.dataset.rotation];
                else if (+c.dataset.cornCount>0)        line+='*';
                else                                     line+=' ';
            }
            ascii.push(line);
        }

        const cornPos=[];
        ascii.forEach((r,y)=>[...r].forEach((ch,x)=>{
            if (ch==='*'||'><^v'.includes(ch)) cornPos.push({x,y});
        }));
        const counts = cornPos.map(p=>+gridElement.children[p.y*cols + p.x].dataset.cornCount);
        counts.push(hamMouthCount);

        const blob = new Blob([[cols,rows,...ascii,...counts].join('\n')],{type:'text/plain'});
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'territory.ter';
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Tools & Interaction ───────────────────────────────────────────────────
    document.getElementById('placeHamster').onclick = () => currentTool='hamster';
    document.getElementById('placeCorn').onclick    = () => currentTool='corn';
    document.getElementById('placeWall').onclick    = () => currentTool='wall';
    document.getElementById('deleteItem').onclick   = () => currentTool='delete';
    document.getElementById('placeHamsterCorn').onclick = () => {
        if (!gridElement) return alert('Erst Territorium erstellen');
        const h = gridElement.querySelector('[data-has-hamster="true"]');
        if (!h) return alert('Kein Hamster vorhanden');
        modalTool='hamsterCorn'; modalTarget=h; cornModal.classList.remove('hidden');
    };
    document.getElementById('rotateBtn').onclick = () => {
        if (!gridElement) return alert('Kein Territorium');
        const c = gridElement.querySelector('[data-has-hamster="true"]');
        if (!c) return alert('Kein Hamster vorhanden');
        const r = (+c.dataset.rotation + 270) % 360;
        drawCell(c); renderHamster(c, r); saveTerritoryState();
    };
    document.getElementById('zoomIn').onclick = () => {
        if (!gridElement) return;
        let s = +gridElement.dataset.scale + 0.1;
        gridElement.dataset.scale = s.toFixed(2);
        gridElement.style.transform = `scale(${s.toFixed(2)})`;
    };
    document.getElementById('zoomOut').onclick = () => {
        if (!gridElement) return;
        let s = Math.max(0.1, +gridElement.dataset.scale - 0.1);
        gridElement.dataset.scale = s.toFixed(2);
        gridElement.style.transform = `scale(${s.toFixed(2)})`;
    };

    document.getElementById('cornConfirm').onclick = () => {
        const v = +document.getElementById('cornCountInput').value;
        if (isNaN(v)||v<1||v>12) return alert('Bitte eine Zahl zwischen 1 und 12');
        if (modalTool==='hamsterCorn') {
            hamMouthCount = v;
            updateCornDisplay();
        } else {
            modalTarget.dataset.cornCount = v + '';
            drawCell(modalTarget);
        }
        cornModal.classList.add('hidden');
        modalTool=null; modalTarget=null;
        saveTerritoryState();
    };
    document.getElementById('cornCancel').onclick = () => {
        cornModal.classList.add('hidden'); modalTool=null; modalTarget=null;
    };

    document.body.addEventListener('click', e => {
        if (!gridElement) return;
        const cell = e.target.closest('div');
        if (!cell || cell.parentNode!==gridElement) return;
        switch (currentTool) {
            case 'hamster': {
                const old = gridElement.querySelector('[data-has-hamster="true"]');
                if (old && old!==cell) {
                    old.dataset.hasHamster='false'; drawCell(old);
                }
                if (cell.dataset.hasHamster==='false') {
                    renderHamster(cell,0);
                    hamMouthCount=0; updateCornDisplay();
                }
                updateToolbarState();
                break;
            }
            case 'corn':
                modalTool='corn'; modalTarget=cell; cornModal.classList.remove('hidden');
                break;
            case 'wall':
                cell.dataset.wall = cell.dataset.wall==='true'?'false':'true';
                drawCell(cell); saveTerritoryState();
                break;
            case 'delete':
                cell.dataset.hasHamster='false';
                cell.dataset.wall='false';
                cell.dataset.cornCount='0';
                drawCell(cell);
                hamMouthCount=0; updateCornDisplay();
                saveTerritoryState();
                updateToolbarState();
                break;
        }
    });

    // ── Low-Level Actions & Interpreter ────────────────────────────────────────
    function getHamCell() { return gridElement.querySelector('[data-has-hamster="true"]'); }
    function cellCoords(cell) {
        const idx = Array.prototype.indexOf.call(gridElement.children, cell),
            cols = +gridElement.style.gridTemplateColumns.match(/\d+/)[0];
        return [ idx%cols, Math.floor(idx/cols) ];
    }
    function dirDelta(r) { return r===0?[1,0]:r===90?[0,1]:r===180?[-1,0]:[0,-1]; }

    function actualVor() {
        if (!wrapper.vornFrei()) throw new Error('Weg ist versperrt');
        const c = getHamCell(), [x,y] = cellCoords(c), [dx,dy] = dirDelta(+c.dataset.rotation);
        const cols = +gridElement.style.gridTemplateColumns.match(/\d+/)[0];
        const t = gridElement.children[(y+dy)*cols + (x+dx)];
        renderHamster(t, +c.dataset.rotation);
    }
    function actualLinksUm() {
        const c = getHamCell(), r = (+c.dataset.rotation + 270)%360;
        renderHamster(c, r);
    }
    function actualRechtsUm() {
        const c = getHamCell(), r = (+c.dataset.rotation + 90)%360;
        renderHamster(c, r);
    }
    function actualNimm() {
        const c = getHamCell(), cnt = +c.dataset.cornCount;
        if (cnt<1) throw new Error('Kein Korn zum Aufnehmen');
        c.dataset.cornCount = (cnt-1)+'';
        hamMouthCount++;
        drawCell(c);
        renderHamster(c, +c.dataset.rotation);
        updateCornDisplay();
    }
    function actualGib() {
        if (hamMouthCount<1) throw new Error('Maul ist leer');
        const c = getHamCell(), cnt = +c.dataset.cornCount+1;
        c.dataset.cornCount = cnt+'';
        hamMouthCount--;
        drawCell(c);
        renderHamster(c, +c.dataset.rotation);
        updateCornDisplay();
    }
    function actualSchreib(txt) {
        writerOutput.innerHTML += txt + '<br>';
    }

    function startUserGen() {
        const raw = localStorage.getItem(CODE_KEY) || '';
        let js = raw
            .replace(/\bvoid\s+([A-Za-z_]\w*)\s*\(/g, 'function* $1(')
            .replace(/\bint\s+([A-Za-z_]\w*)/g,     'let $1');
        js = js
            .replace(/\bvor\(\)\s*;/g,      'yield "vor";')
            .replace(/\blinksUm\(\)\s*;/g,  'yield "linksUm";')
            .replace(/\brechtsUm\(\)\s*;/g, 'yield "rechtsUm";')
            .replace(/\bnimm\(\)\s*;/g,     'yield "nimm";')
            .replace(/\bgib\(\)\s*;/g,      'yield "gib";')
            .replace(
                /\bschreib\(\s*("(?:\\.|[^"\\])*")\s*\)\s*;/g,
                'yield ["schreib",$1];'
            );
        const body =
            'return (function*(){\n' +
            js + '\n' +
            'if(typeof main!=="function") throw new Error("Kein main()-Block definiert");\n' +
            'yield* main();\n' +
            '})();';
        try {
            userGen = new Function('kornDa','maulLeer','vornFrei', body)(
                wrapper.kornDa,
                wrapper.maulLeer,
                wrapper.vornFrei
            );
        } catch (e) {
            alert('Fehler beim Generieren: '+e.message);
            userGen = (function*(){})();
        }
    }

    function runStep() {
        if (!userGen) {
            initialSnapshot = snapshot();
            startUserGen();
        }
        let res;
        try { res = userGen.next(); }
        catch (e) {
            alert('Fehler beim Ausführen: '+e.message);
            clearInterval(timer);
            timer = null;
            return;
        }
        if (res.done) {
            clearInterval(timer);
            timer = null;
            return;
        }
        const cmd = res.value;
        if (typeof cmd === 'string') {
            ({ vor:actualVor,
                linksUm:actualLinksUm,
                rechtsUm:actualRechtsUm,
                nimm:actualNimm,
                gib:actualGib })[cmd]();
        } else if (Array.isArray(cmd) && cmd[0]==='schreib') {
            actualSchreib(cmd[1]);
        }
        saveTerritoryState();
    }

    if (localStorage.getItem(RUN_KEY)==='true') {
        localStorage.removeItem(RUN_KEY);
        writerOutput.innerHTML = '';
        [stepBackBtn,playBtn,pauseBtn,stopBtn].forEach(b=>b.disabled=false);
        timer = setInterval(runStep, 500);
    }

    playBtn.addEventListener('click', () => {
        if (!timer) timer = setInterval(runStep, 500);
    });
    pauseBtn.addEventListener('click', () => {
        if (timer) { clearInterval(timer); timer = null; }
    });
    stopBtn.addEventListener('click', () => {
        if (timer) { clearInterval(timer); timer = null; }
    });
    stepBackBtn.addEventListener('click', () => {
        if (timer) { clearInterval(timer); timer = null; }
        if (initialSnapshot) restore(initialSnapshot);
    });

    const wrapper = {
        kornDa:   () => +getHamCell().dataset.cornCount > 0,
        maulLeer: () => hamMouthCount === 0,
        vornFrei: () => {
            const c = getHamCell(), [x,y] = cellCoords(c), [dx,dy] = dirDelta(+c.dataset.rotation);
            const cols = +gridElement.style.gridTemplateColumns.match(/\d+/)[0];
            const nx = x+dx, ny = y+dy;
            if (nx<0||ny<0||nx>=cols||ny>=gridElement.children.length/cols) return false;
            return gridElement.children[ny*cols + nx].dataset.wall !== 'true';
        }
    };
});
