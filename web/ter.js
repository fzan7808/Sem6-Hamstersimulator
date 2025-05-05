// ter.js
document.addEventListener('DOMContentLoaded', () => {
    // ── State & Element References ─────────────────────────────────────────────
    let currentTool = null,
        gridElement = null,
        modalTool = null,
        modalTarget = null,
        hamMouthCount = 0;

    const territoryModal = document.getElementById('territoryModal');
    const cornModal      = document.getElementById('cornModal');
    const fileInput      = document.getElementById('fileInput');
    const cornDisplay    = document.getElementById('cornDisplay');
    const writerOutput   = document.getElementById('writerOutput');

    const stepBackBtn = document.querySelector('button[title="Schritt zurück"]');
    const playBtn     = document.querySelector('button[title="Play"]');
    const pauseBtn    = document.querySelector('button[title="Pause"]');
    const stopBtn     = document.querySelector('button[title="Stop"]');

    // ── Display Helpers ────────────────────────────────────────────────────────
    function updateCornDisplay() {
        cornDisplay.textContent = `Körner im Maul: ${hamMouthCount}`;
    }
    function showTerritoryModal() { territoryModal.classList.remove('hidden'); }
    function hideTerritoryModal() { territoryModal.classList.add('hidden'); }
    function showCornModal() {
        document.getElementById('cornCountInput').value = '';
        cornModal.classList.remove('hidden');
    }
    function hideCornModal() { cornModal.classList.add('hidden'); }

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
            gridElement.appendChild(cell);
        }
        container.innerHTML = '';
        container.appendChild(gridElement);
        hamMouthCount = 0;
        updateCornDisplay();
    }

    // ── State Persistence ──────────────────────────────────────────────────────
    function saveTerritoryState() {
        if (!gridElement) return;
        const cols = parseInt(gridElement.style.gridTemplateColumns.match(/\d+/)[0],10);
        const rows = gridElement.children.length / cols;
        const cells = Array.from(gridElement.children).map(c => ({
            hasHamster: c.dataset.hasHamster === 'true',
            rotation:   c.dataset.rotation ? parseInt(c.dataset.rotation,10) : 0,
            wall:       c.dataset.wall === 'true',
            cornCount:  parseInt(c.dataset.cornCount,10)
        }));
        sessionStorage.setItem('hamsterTerritory',
            JSON.stringify({ cols, rows, cells, hamMouthCount })
        );
    }

    function loadTerritoryState() {
        const s = sessionStorage.getItem('hamsterTerritory');
        if (!s) return false;
        let st;
        try { st = JSON.parse(s); } catch { return false; }
        const { cols, rows, cells, hamMouthCount: mouth } = st;
        if (!Array.isArray(cells) || cells.length !== rows * cols) return false;
        buildGrid(rows, cols);
        cells.forEach((c, idx) => {
            const cell = gridElement.children[idx];
            if (c.wall) {
                cell.dataset.wall = 'true';
                cell.innerHTML = '<img src="data/wand/Wall32.png" style="width:100%;height:100%;">';
            }
            if (c.cornCount > 0) {
                cell.dataset.cornCount = c.cornCount;
                const d = Math.min(c.cornCount,12);
                cell.innerHTML = `<img src="data/körner/${d}Corn32.png" style="width:100%;height:100%;">`;
            }
            if (c.hasHamster) {
                cell.dataset.hasHamster = 'true';
                cell.dataset.rotation   = c.rotation;
                cell.innerHTML = `<img src="data/hamster/hamstereast.png"
            style="width:100%;height:100%;transform:rotate(${c.rotation}deg);">`;
            }
        });
        hamMouthCount = mouth;
        updateCornDisplay();
        return true;
    }

    // restore on load, save on unload
    loadTerritoryState();
    window.addEventListener('beforeunload', saveTerritoryState);

    // ── Territory Creation / Loading ──────────────────────────────────────────
    document.getElementById('newTerritory')
        .addEventListener('click', showTerritoryModal);

    document.getElementById('createTerritoryConfirm')
        .addEventListener('click', () => {
            const rows = +document.getElementById('rows').value;
            const cols = +document.getElementById('cols').value;
            if (!rows || !cols) { alert('Ungültige Werte'); return; }
            buildGrid(rows, cols);
            hideTerritoryModal();
            saveTerritoryState();
        });

    document.getElementById('createTerritoryCancel')
        .addEventListener('click', hideTerritoryModal);

    document.getElementById('openTerritory')
        .addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = ev => {
            processTerritoryFile(ev.target.result);
            saveTerritoryState();
        };
        reader.readAsText(f);
        fileInput.value = '';
    });

    function processTerritoryFile(text) {
        const lines = text.split(/\r?\n/);
        if (lines[0].startsWith('initializeTerritory')) {
            loadScriptTerritory(lines);
        } else {
            loadAsciiTerritory(lines);
        }
    }

    // ── Script‐Based Load ─────────────────────────────────────────────────────
    function loadScriptTerritory(lines) {
        const initRe = /initializeTerritory\s*\(\s*new Size\((\d+),\s*(\d+)\)\s*\)/;
        const m0 = initRe.exec(lines[0]);
        if (!m0) { alert('Invalid script header'); return; }
        const cols = +m0[1], rows = +m0[2];
        buildGrid(rows, cols);

        let hamX, hamY, hamRot;
        const hamRe = /defaultHamsterAt\s*\(\s*new Location\((\d+),\s*(\d+)\),\s*Direction\.([A-Z]+),\s*(\d+)\)/;
        lines.forEach(line => {
            const m = hamRe.exec(line);
            if (m) {
                hamX = +m[1]; hamY = +m[2];
                hamRot = { EAST:0, SOUTH:90, WEST:180, NORTH:270 }[m[3]] || 0;
                hamMouthCount = +m[4];
            }
        });

        const wallRe = /wallAt\s*\(\s*new Location\((\d+),\s*(\d+)\)\s*\)/g;
        let w;
        while (w = wallRe.exec(lines.join('\n'))) {
            const x = +w[1], y = +w[2];
            const cell = gridElement.children[y * cols + x];
            cell.dataset.wall = 'true';
            cell.innerHTML = '<img src="data/wand/Wall32.png" style="width:100%;height:100%;">';
        }

        const grainRe = /grainAt\s*\(\s*new Location\((\d+),\s*(\d+)\)\s*,\s*(\d+)\s*\)/g;
        let g;
        while (g = grainRe.exec(lines.join('\n'))) {
            const x = +g[1], y = +g[2], cnt = +g[3];
            const cell = gridElement.children[y * cols + x];
            cell.dataset.cornCount = cnt;
            const d = Math.min(cnt,12);
            cell.innerHTML = `<img src="data/körner/${d}Corn32.png" style="width:100%;height:100%;">`;
        }

        if (hamX != null) {
            const cell = gridElement.children[hamY * cols + hamX];
            cell.dataset.hasHamster = 'true';
            cell.dataset.rotation   = hamRot;
            cell.innerHTML = `<img src="data/hamster/hamstereast.png"
          style="width:100%;height:100%;transform:rotate(${hamRot}deg);">`;
        }

        updateCornDisplay();
        saveTerritoryState();
    }

    // ── ASCII‐Based Load ──────────────────────────────────────────────────────
    function loadAsciiTerritory(lines) {
        const cols = parseInt(lines[0],10);
        const rows = parseInt(lines[1],10);
        if (isNaN(cols) || isNaN(rows)) { alert('Ungültige Dimension'); return; }
        const ascii = lines.slice(2, 2 + rows);
        if (ascii.some(r => r.length !== cols)) { alert('Zeilenlängen stimmen nicht'); return; }
        buildGrid(rows, cols);

        let hamX, hamY, hamRot;
        const cornPos = [];

        ascii.forEach((row, y) => {
            for (let x = 0; x < cols; x++) {
                const ch = row[x];
                const cell = gridElement.children[y * cols + x];
                if (ch === '#') {
                    cell.dataset.wall = 'true';
                    cell.innerHTML = '<img src="data/wand/Wall32.png" style="width:100%;height:100%;">';
                } else if ('>v<^'.includes(ch)) {
                    hamX = x; hamY = y;
                    hamRot = { '>':0,'v':90,'<':180,'^':270 }[ch];
                    cell.dataset.hasHamster = 'true';
                    cell.dataset.rotation   = hamRot;
                    cornPos.push({ x, y, isHam: true });
                } else if (ch === '*') {
                    cornPos.push({ x, y, isHam: false });
                }
            }
        });

        const counts = lines
            .slice(2 + rows, 2 + rows + cornPos.length + 1)
            .map(l => parseInt(l,10) || 0);

        cornPos.forEach((p, i) => {
            if (!p.isHam) {
                const cell = gridElement.children[p.y * cols + p.x];
                const cnt = counts[i];
                cell.dataset.cornCount = cnt;
                const d = Math.min(cnt,12);
                cell.innerHTML = `<img src="data/körner/${d}Corn32.png" style="width:100%;height:100%;">`;
            }
        });

        hamMouthCount = counts[cornPos.length] || 0;
        if (hamX != null) {
            const cell = gridElement.children[hamY * cols + hamX];
            cell.innerHTML = `<img src="data/hamster/hamstereast.png"
          style="width:100%;height:100%;transform:rotate(${hamRot}deg);">`;
        }

        updateCornDisplay();
        saveTerritoryState();
    }

    // ── Save to .ter File ─────────────────────────────────────────────────────
    document.getElementById('saveTerritory').addEventListener('click', () => {
        if (!gridElement) { alert('Kein Territorium'); return; }
        const cols = parseInt(gridElement.style.gridTemplateColumns.match(/\d+/)[0],10);
        const cells = Array.from(gridElement.children);
        const rows = cells.length / cols;

        const ascii = [];
        for (let y = 0; y < rows; y++) {
            let line = '';
            for (let x = 0; x < cols; x++) {
                const c = cells[y * cols + x];
                if (c.dataset.wall === 'true') line += '#';
                else if (c.dataset.hasHamster === 'true') {
                    const r = parseInt(c.dataset.rotation,10);
                    line += {0:'>',90:'v',180:'<',270:'^'}[r] || '>';
                }
                else if (parseInt(c.dataset.cornCount,10) > 0) line += '*';
                else line += ' ';
            }
            ascii.push(line);
        }

        const cornPos = [];
        ascii.forEach((row, y) =>
            row.split('').forEach((ch, x) => {
                if (ch === '*' || '><^v'.includes(ch)) {
                    cornPos.push({ x, y, isHam: '><^v'.includes(ch) });
                }
            })
        );

        const counts = cornPos.map(p =>
            parseInt(cells[p.y * cols + p.x].dataset.cornCount,10) || 0
        );
        counts.push(hamMouthCount);

        const content = [cols, rows, ...ascii, ...counts].join('\n');
        const blob = new Blob([content], { type:'text/plain' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'territory.ter';
        a.click();
        URL.revokeObjectURL(url);
    });

    // ── Tools & Interaction ───────────────────────────────────────────────────
    document.getElementById('placeHamster')
        .addEventListener('click', () => currentTool = 'hamster');
    document.getElementById('placeHamsterCorn')
        .addEventListener('click', () => {
            if (!gridElement) return alert('Erst Territorium erstellen');
            const ham = gridElement.querySelector('[data-has-hamster="true"]');
            if (!ham) return alert('Kein Hamster vorhanden');
            modalTool = 'hamsterCorn';
            modalTarget = ham;
            showCornModal();
        });
    document.getElementById('placeCorn')
        .addEventListener('click', () => currentTool = 'corn');
    document.getElementById('placeWall')
        .addEventListener('click', () => currentTool = 'wall');
    document.getElementById('deleteItem')
        .addEventListener('click', () => currentTool = 'delete');

    document.getElementById('zoomIn')
        .addEventListener('click', () => {
            if (!gridElement) return;
            let s = parseFloat(gridElement.dataset.scale) || 1;
            s += 0.1;
            gridElement.dataset.scale = s.toFixed(2);
            gridElement.style.transform = `scale(${s.toFixed(2)})`;
        });
    document.getElementById('zoomOut')
        .addEventListener('click', () => {
            if (!gridElement) return;
            let s = parseFloat(gridElement.dataset.scale) || 1;
            s = Math.max(0.1, s - 0.1);
            gridElement.dataset.scale = s.toFixed(2);
            gridElement.style.transform = `scale(${s.toFixed(2)})`;
        });

    document.getElementById('rotateBtn')
        .addEventListener('click', () => {
            if (!gridElement) return alert('Kein Territorium');
            const cell = gridElement.querySelector('[data-has-hamster="true"]');
            if (!cell) return alert('Kein Hamster vorhanden');
            let r = (parseInt(cell.dataset.rotation,10) + 270) % 360;
            cell.dataset.rotation = r;
            const img = cell.querySelector('img');
            if (img) img.style.transform = `rotate(${r}deg)`;
            saveTerritoryState();
        });

    document.getElementById('cornConfirm')
        .addEventListener('click', () => {
            const val = parseInt(document.getElementById('cornCountInput').value,10);
            if (isNaN(val) || val < 1 || val > 12) {
                alert('Bitte eine Zahl zwischen 1 und 12 eingeben.');
                return;
            }
            if (modalTool === 'hamsterCorn') {
                hamMouthCount = val;
                alert(`Hamster hat jetzt ${val} Körner im Maul.`);
                updateCornDisplay();
            } else {
                const c = Math.min(val,12);
                modalTarget.dataset.cornCount = c;
                modalTarget.innerHTML = `<img src="data/körner/${c}Corn32.png" style="width:100%;height:100%;">`;
            }
            hideCornModal();
            modalTool = null;
            modalTarget = null;
            saveTerritoryState();
        });

    document.getElementById('cornCancel')
        .addEventListener('click', () => {
            hideCornModal();
            modalTool = null;
            modalTarget = null;
        });

    document.body.addEventListener('click', e => {
        if (!gridElement) return;
        const cell = e.target.closest('div');
        if (!cell || cell.parentNode !== gridElement) return;
        switch (currentTool) {
            case 'hamster': {
                const old = gridElement.querySelector('[data-has-hamster="true"]');
                if (old && old !== cell) {
                    old.innerHTML = '';
                    old.dataset.hasHamster = 'false';
                    delete old.dataset.rotation;
                }
                if (cell.dataset.hasHamster === 'false') {
                    cell.dataset.hasHamster = 'true';
                    cell.dataset.rotation   = '0';
                    cell.innerHTML = `<img src="data/hamster/hamstereast.png" style="width:100%;height:100%;transform:rotate(0deg);">`;
                    hamMouthCount = 0;
                    updateCornDisplay();
                }
                break;
            }
            case 'corn':
                modalTool = 'corn';
                modalTarget = cell;
                showCornModal();
                break;
            case 'wall':
                if (cell.dataset.wall === 'true') {
                    cell.dataset.wall = 'false';
                    cell.innerHTML = '';
                } else {
                    cell.dataset.wall = 'true';
                    cell.innerHTML = `<img src="data/wand/Wall32.png" style="width:100%;height:100%;">`;
                }
                break;
            case 'delete':
                cell.innerHTML           = '';
                cell.dataset.hasHamster  = 'false';
                cell.dataset.cornCount   = '0';
                cell.dataset.wall        = 'false';
                delete cell.dataset.rotation;
                hamMouthCount = 0;
                updateCornDisplay();
                break;
        }
        saveTerritoryState();
    });

    // ── HAMSTER INTERPRETER & ANIMATION ───────────────────────────────────────
    let commandQueue = [], history = [], currentStep = 0, timer = null;

    function getHamCell() {
        return gridElement.querySelector('[data-has-hamster="true"]');
    }
    function cellCoords(cell) {
        const idx = Array.prototype.indexOf.call(gridElement.children, cell);
        const cols = parseInt(gridElement.style.gridTemplateColumns.match(/\d+/)[0],10);
        return [ idx % cols, Math.floor(idx / cols) ];
    }
    function dirDelta(rot) {
        switch (rot) {
            case 0:   return [1, 0];
            case 90:  return [0, 1];
            case 180: return [-1, 0];
            case 270: return [0, -1];
        }
    }
    function renderHamster(cell, rot) {
        Array.from(gridElement.children).forEach(c => {
            if (c.dataset.hasHamster === 'true') {
                c.innerHTML = '';
                c.dataset.hasHamster = 'false';
            }
        });
        cell.dataset.hasHamster = 'true';
        cell.dataset.rotation   = rot;
        cell.innerHTML = `<img src="data/hamster/hamstereast.png" style="width:100%;height:100%;transform:rotate(${rot}deg);">`;
    }

    // actual low-level actions
    function actualVor() {
        if (!wrapper.vornFrei()) throw new Error('Weg ist versperrt');
        const cell = getHamCell();
        const [x,y] = cellCoords(cell);
        const [dx,dy] = dirDelta(+cell.dataset.rotation);
        const cols = parseInt(gridElement.style.gridTemplateColumns.match(/\d+/)[0],10);
        const tgt = gridElement.children[(y+dy)*cols + (x+dx)];
        renderHamster(tgt, +cell.dataset.rotation);
    }
    function actualLinksUm() {
        const cell = getHamCell();
        const r = (+cell.dataset.rotation + 270) % 360;
        renderHamster(cell, r);
    }
    function actualRechtsUm() {
        const cell = getHamCell();
        const r = (+cell.dataset.rotation + 90) % 360;
        renderHamster(cell, r);
    }
    function actualNimm() {
        const cell = getHamCell();
        let cnt = +cell.dataset.cornCount;
        if (cnt < 1) throw new Error('Kein Korn zum Aufnehmen');
        cnt--; hamMouthCount++;
        cell.dataset.cornCount = cnt;
        cell.innerHTML = cnt
            ? `<img src="data/körner/${Math.min(cnt,12)}Corn32.png" style="width:100%;height:100%;">`
            : '';
        updateCornDisplay();
    }
    function actualGib() {
        if (hamMouthCount < 1) throw new Error('Maul ist leer');
        const cell = getHamCell();
        let cnt = +cell.dataset.cornCount;
        cnt++; hamMouthCount--;
        cell.dataset.cornCount = cnt;
        cell.innerHTML = `<img src="data/körner/${Math.min(cnt,12)}Corn32.png" style="width:100%;height:100%;">`;
        updateCornDisplay();
    }

    // scheduling helpers
    function snapshot() {
        return sessionStorage.getItem('hamsterTerritory') + '||' + hamMouthCount;
    }
    function restore(s) {
        const [terr, mouth] = s.split('||');
        sessionStorage.setItem('hamsterTerritory', terr);
        loadTerritoryState();
        hamMouthCount = +mouth;
        updateCornDisplay();
    }
    function schedule(fn) {
        history.push(snapshot());
        commandQueue.push(() => { fn(); saveTerritoryState(); });
    }
    function scheduleWrite(txt) {
        commandQueue.push(() => schreib(txt));
    }

    // wrapper passed to user code
    const wrapper = {
        vor: () => schedule(actualVor),
        linksUm: () => schedule(actualLinksUm),
        rechtsUm: () => schedule(actualRechtsUm),
        nimm: () => schedule(actualNimm),
        gib: () => schedule(actualGib),
        schreib: txt => scheduleWrite(txt),
        kornDa: () => +getHamCell().dataset.cornCount > 0,
        maulLeer: () => hamMouthCount === 0,
        vornFrei: () => {
            const cell = getHamCell();
            const [x,y] = cellCoords(cell);
            const [dx,dy] = dirDelta(+cell.dataset.rotation);
            const cols = parseInt(gridElement.style.gridTemplateColumns.match(/\d+/)[0],10);
            const nx = x+dx, ny = y+dy;
            if (nx < 0 || ny < 0) return false;
            if (nx >= cols || ny >= gridElement.children.length/cols) return false;
            return gridElement.children[ny*cols + nx].dataset.wall !== 'true';
        }
    };

    // run once if flagged
    if (sessionStorage.getItem('runPending') === 'true') {
        sessionStorage.removeItem('runPending');
        writerOutput.innerHTML = '';
        history = [];
        commandQueue = [];
        currentStep = 0;

        let code = sessionStorage.getItem('hamsterCode') || '';
        if (!/void\s+main\s*\(/.test(code)) {
            code = `void main() {\n${code.replace(/\n$/, '')}\n}`;
        }
        code += '\nmain();';

        try {
            new Function(
                'vor','linksUm','rechtsUm','nimm','gib','schreib',
                'kornDa','maulLeer','vornFrei',
                code
            )(
                wrapper.vor, wrapper.linksUm, wrapper.rechtsUm,
                wrapper.nimm, wrapper.gib, wrapper.schreib,
                wrapper.kornDa, wrapper.maulLeer, wrapper.vornFrei
            );
            // enable controls
            [stepBackBtn, playBtn, pauseBtn, stopBtn].forEach(b => b.disabled = false);
        } catch (e) {
            alert('Fehler beim Ausführen: ' + e.message);
        }
    }

    // ── Control Buttons ───────────────────────────────────────────────────────
    playBtn.addEventListener('click', () => {
        if (timer) return;
        timer = setInterval(() => {
            if (currentStep >= commandQueue.length) {
                clearInterval(timer);
                timer = null;
                return;
            }
            commandQueue[currentStep++]();
        }, 500);
    });

    pauseBtn.addEventListener('click', () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    });

    stopBtn.addEventListener('click', () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        if (history.length) restore(history[0]);
        currentStep = 0;
    });

    stepBackBtn.addEventListener('click', () => {
        if (currentStep <= 0) return;
        restore(history[--currentStep]);
    });
});
