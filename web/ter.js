document.addEventListener('DOMContentLoaded', () => {
    let currentTool = null;
    let gridElement = null;
    let modalTool   = null;
    let modalTarget = null;
    let hamMouthCount = 0;

    const territoryModal = document.getElementById('territoryModal');
    const cornModal      = document.getElementById('cornModal');
    const fileInput      = document.getElementById('fileInput');
    const cornDisplay    = document.getElementById('cornDisplay');

    // ─── Helpers ────────────────────────────────────────────────────────────────

    function updateCornDisplay() {
        cornDisplay.textContent = `Körner im Maul: ${hamMouthCount}`;
    }

    function showTerritoryModal() { territoryModal.style.display = 'block'; }
    function hideTerritoryModal() { territoryModal.style.display = 'none'; }
    function showCornModal() {
        document.getElementById('cornCountInput').value = '';
        cornModal.style.display = 'block';
    }
    function hideCornModal() { cornModal.style.display = 'none'; }

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

    // ─── New Territory ─────────────────────────────────────────────────────────

    document.getElementById('newTerritory')
        .addEventListener('click', showTerritoryModal);
    document.getElementById('createTerritoryConfirm')
        .addEventListener('click', () => {
            const r = parseInt(document.getElementById('rows').value, 10);
            const c = parseInt(document.getElementById('cols').value, 10);
            if (!r || !c) { alert('Ungültige Werte'); return; }
            buildGrid(r, c);
            hideTerritoryModal();
        });
    document.getElementById('createTerritoryCancel')
        .addEventListener('click', hideTerritoryModal);

    // ─── Load (“Öffnen”) ───────────────────────────────────────────────────────

    document.getElementById('openTerritory')
        .addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => processTerritoryFile(evt.target.result);
        reader.readAsText(file);
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

    function loadScriptTerritory(lines) {
        // header
        const init = /initializeTerritory\s*\(\s*new Size\((\d+),\s*(\d+)\)\s*\)/.exec(lines[0]);
        if (!init) { alert('Invalid script header'); return; }
        const rows = +init[1], cols = +init[2];
        buildGrid(rows, cols);

        // defaultHamsterAt(...)
        let hamX, hamY, hamRot;
        const hamRe = /defaultHamsterAt\s*\(\s*new Location\((\d+),\s*(\d+)\),\s*Direction\.([A-Z]+),\s*(\d+)\)/;
        lines.forEach(line => {
            const m = hamRe.exec(line);
            if (m) {
                hamX = +m[1]; hamY = +m[2];
                const dir = m[3]; hamMouthCount = +m[4];
                hamRot = { EAST:0, SOUTH:90, WEST:180, NORTH:270 }[dir] || 0;
            }
        });

        // walls
        const wallRe = /wallAt\s*\(\s*new Location\((\d+),\s*(\d+)\)\s*\)/g;
        let m;
        while (m = wallRe.exec(lines.join('\n'))) {
            const x = +m[1], y = +m[2];
            const cell = gridElement.children[y * cols + x];
            cell.innerHTML = '<img src="../assets/wand/Wall32.png" style="width:100%;height:100%">';
            cell.dataset.wall = 'true';
        }

        // grains
        const grainRe = /grainAt\s*\(\s*new Location\((\d+),\s*(\d+)\)\s*,\s*(\d+)\s*\)/g;
        while (m = grainRe.exec(lines.join('\n'))) {
            const x = +m[1], y = +m[2], cnt = +m[3];
            const cell = gridElement.children[y * cols + x];
            cell.dataset.cornCount = cnt;
            const draw = Math.min(cnt, 9);
            cell.innerHTML = `<img src="../assets/körner/${draw}Corn32.png" style="width:100%;height:100%">`;
        }

        // draw hamster last
        if (hamX != null) {
            const cell = gridElement.children[hamY * cols + hamX];
            cell.innerHTML = `<img src="../assets/hamster/hamstereast.png"
                                  style="width:100%;height:100%;transform:rotate(${hamRot}deg)">`;
        }

        updateCornDisplay();
    }

    function loadAsciiTerritory(lines) {
        const cols = parseInt(lines[0], 10);
        const rows = parseInt(lines[1], 10);
        if (isNaN(cols) || isNaN(rows)) {
            alert('Ungültige Dimension im .ter-File');
            return;
        }
        const ascii = lines.slice(2, 2 + rows);
        if (ascii.some(r => r.length !== cols)) {
            alert('Zeilenlängen stimmen nicht');
            return;
        }
        buildGrid(rows, cols);

        let hamX, hamY, hamRot;
        const cornPos = [];

        // map
        ascii.forEach((row, y) => {
            for (let x = 0; x < cols; x++) {
                const ch   = row[x];
                const cell = gridElement.children[y * cols + x];
                if (ch === '#') {
                    cell.innerHTML = '<img src="../assets/wand/Wall32.png" style="width:100%;height:100%">';
                    cell.dataset.wall = 'true';
                } else if ('>v<^'.includes(ch)) {
                    hamX = x; hamY = y;
                    hamRot = { '>':0, 'v':90, '<':180, '^':270 }[ch];
                    cell.dataset.hasHamster = 'true';
                    cell.dataset.rotation   = hamRot;
                    cornPos.push({ x, y, isHam: true });
                } else if (ch === '*') {
                    cornPos.push({ x, y, isHam: false });
                }
            }
        });

        // counts
        const countLines = lines.slice(2 + rows, 2 + rows + cornPos.length + 1).map(l => parseInt(l, 10) || 0);
        cornPos.forEach((p, i) => {
            if (!p.isHam) {
                const cnt = countLines[i];
                const cell = gridElement.children[p.y * cols + p.x];
                cell.dataset.cornCount = cnt;
                const draw = Math.min(cnt, 9);
                cell.innerHTML = `<img src="../assets/körner/${draw}Corn32.png" style="width:100%;height:100%">`;
            }
        });
        hamMouthCount = countLines[cornPos.length] || 0;

        // hamster image
        if (hamX != null) {
            const cell = gridElement.children[hamY * cols + hamX];
            cell.innerHTML = `<img src="../assets/hamster/hamstereast.png"
                                  style="width:100%;height:100%;transform:rotate(${hamRot}deg)">`;
        }

        updateCornDisplay();
    }

    // ─── Save (“Speichern”) ─────────────────────────────────────────────────────

    document.getElementById('saveTerritory')
        .addEventListener('click', () => {
            if (!gridElement) { alert('Kein Territorium'); return; }
            const cols = parseInt(gridElement.style.gridTemplateColumns.match(/\d+/)[0], 10);
            const cells = Array.from(gridElement.children);
            const rows = cells.length / cols;

            // 1) ASCII map with only #, space, *, or >v<^
            const ascii = [];
            for (let y = 0; y < rows; y++) {
                let line = '';
                for (let x = 0; x < cols; x++) {
                    const cell = cells[y * cols + x];
                    let ch = ' ';
                    if (cell.dataset.wall === 'true') {
                        ch = '#';
                    } else if (cell.dataset.hasHamster === 'true') {
                        const r = parseInt(cell.dataset.rotation || '0', 10);
                        ch = {0:'>',90:'v',180:'<',270:'^'}[r] || '>';
                    } else if ((parseInt(cell.dataset.cornCount,10) || 0) > 0) {
                        ch = '*';
                    }
                    line += ch;
                }
                ascii.push(line);
            }

            // 2) Collect positions in scan order that were '*' or hamster
            const cornPos = [];
            ascii.forEach((row, y) =>
                row.split('').forEach((ch, x) => {
                    if (ch === '*' || '><^v'.includes(ch)) {
                        cornPos.push({ x, y, isHam: '><^v'.includes(ch) });
                    }
                })
            );

            // 3) Output counts for each position, then mouth‐count
            const counts = cornPos.map(p => {
                if (p.isHam) {
                    // hamster cell: might have corn under it?
                    const cell = cells[p.y * cols + p.x];
                    return parseInt(cell.dataset.cornCount,10) || 0;
                } else {
                    const cell = cells[p.y * cols + p.x];
                    return parseInt(cell.dataset.cornCount,10) || 0;
                }
            });
            counts.push(hamMouthCount);

            // 4) Combine into text
            const content = [
                cols,
                rows,
                ...ascii,
                ...counts
            ].join('\n');

            // 5) Trigger download
            const blob = new Blob([content], { type:'text/plain' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = 'territory.ter';
            a.click();
            URL.revokeObjectURL(url);
        });

    // ─── Tools & Handlers ─────────────────────────────────────────────────────

    document.getElementById('placeHamster')
        .addEventListener('click', () => currentTool = 'hamster');
    document.getElementById('placeHamsterCorn')
        .addEventListener('click', () => {
            if (!gridElement) { alert('Erst Territorium erstellen'); return; }
            const ham = gridElement.querySelector('[data-has-hamster="true"]');
            if (!ham) { alert('Kein Hamster vorhanden'); return; }
            modalTool   = 'hamsterCorn';
            modalTarget = ham;
            showCornModal();
        });
    document.getElementById('placeCorn')
        .addEventListener('click', () => currentTool = 'corn');
    document.getElementById('placeWall')
        .addEventListener('click', () => currentTool = 'wall');
    document.getElementById('deleteItem')
        .addEventListener('click', () => currentTool = 'delete');

    // Zoom
    document.getElementById('zoomIn').addEventListener('click', () => {
        if (!gridElement) return;
        let s = parseFloat(gridElement.dataset.scale) || 1;
        s += 0.1;
        gridElement.dataset.scale = s.toFixed(2);
        gridElement.style.transform = `scale(${s.toFixed(2)})`;
    });
    document.getElementById('zoomOut').addEventListener('click', () => {
        if (!gridElement) return;
        let s = parseFloat(gridElement.dataset.scale) || 1;
        s = Math.max(0.1, s - 0.1);
        gridElement.dataset.scale = s.toFixed(2);
        gridElement.style.transform = `scale(${s.toFixed(2)})`;
    });

    // Rotate ←90°
    document.getElementById('rotateBtn').addEventListener('click', () => {
        if (!gridElement) { alert('Kein Territorium'); return; }
        const cell = gridElement.querySelector('[data-has-hamster="true"]');
        if (!cell) { alert('Kein Hamster vorhanden'); return; }
        let r = parseInt(cell.dataset.rotation || '0', 10);
        r = (r + 270) % 360;
        cell.dataset.rotation = r;
        cell.querySelector('img').style.transform = `rotate(${r}deg)`;
    });

    // Körner‐Modal OK/Cancel
    document.getElementById('cornConfirm').addEventListener('click', () => {
        const val = parseInt(document.getElementById('cornCountInput').value, 10);
        if (isNaN(val) || val < 1 || val > 12) {
            alert('Bitte eine Zahl zwischen 1 und 12 eingeben.');
            return;
        }
        if (modalTool === 'hamsterCorn') {
            hamMouthCount = val;
            alert(`Hamster hat jetzt ${val} Körner im Maul.`);
            updateCornDisplay();
        } else {
            const c = Math.min(val, 12);
            modalTarget.dataset.cornCount = c;
            modalTarget.innerHTML = `<img src="../assets/körner/${c}Corn32.png"
                                     style="width:100%;height:100%">`;
        }
        hideCornModal();
        modalTool   = null;
        modalTarget = null;
    });
    document.getElementById('cornCancel').addEventListener('click', () => {
        hideCornModal();
        modalTool   = null;
        modalTarget = null;
    });

    // Grid Cell Click Handler
    document.body.addEventListener('click', e => {
        if (!gridElement) return;
        const cell = e.target.closest('div');
        if (!cell || cell.parentNode !== gridElement) return;

        switch (currentTool) {
            case 'hamster':
                const old = gridElement.querySelector('[data-has-hamster="true"]');
                if (old && old !== cell) {
                    old.innerHTML = '';
                    old.dataset.hasHamster = 'false';
                    delete old.dataset.rotation;
                }
                if (cell.dataset.hasHamster === 'false') {
                    cell.innerHTML = `<img src="../assets/hamster/hamstereast.png"
                                 style="width:100%;height:100%;transform:rotate(0deg)">`;
                    cell.dataset.hasHamster = 'true';
                    cell.dataset.rotation   = '0';
                    hamMouthCount = 0;
                    updateCornDisplay();
                }
                break;

            case 'corn':
                modalTool   = 'corn';
                modalTarget = cell;
                showCornModal();
                break;

            case 'wall':
                if (cell.dataset.wall === 'true') {
                    cell.innerHTML = '';
                    cell.dataset.wall = 'false';
                } else {
                    cell.innerHTML = `<img src="../assets/wand/Wall32.png"
                                 style="width:100%;height:100%">`;
                    cell.dataset.wall = 'true';
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
    });
});
