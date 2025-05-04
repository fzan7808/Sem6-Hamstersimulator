// ter.js
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

    // Update the lower-right Körner-im-Maul display
    function updateCornDisplay() {
        cornDisplay.textContent = `Körner im Maul: ${hamMouthCount}`;
    }

    // Show/hide modals by toggling the 'hidden' class
    function showTerritoryModal() { territoryModal.classList.remove('hidden'); }
    function hideTerritoryModal() { territoryModal.classList.add('hidden'); }
    function showCornModal() {
        document.getElementById('cornCountInput').value = '';
        cornModal.classList.remove('hidden');
    }
    function hideCornModal() { cornModal.classList.add('hidden'); }

    // Build a new empty grid of the given dimensions
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

    // ── New Territory ────────────────────────────────────────────────────────────
    document.getElementById('newTerritory').addEventListener('click', showTerritoryModal);
    document.getElementById('createTerritoryConfirm').addEventListener('click', () => {
        const rows = parseInt(document.getElementById('rows').value, 10);
        const cols = parseInt(document.getElementById('cols').value, 10);
        if (!rows || !cols) {
            alert('Ungültige Werte');
            return;
        }
        buildGrid(rows, cols);
        hideTerritoryModal();
    });
    document.getElementById('createTerritoryCancel').addEventListener('click', hideTerritoryModal);

    // ── Load Territory from .ter file ───────────────────────────────────────────
    document.getElementById('openTerritory').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = ev => processTerritoryFile(ev.target.result);
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

    function loadScriptTerritory(lines) {
        // Header: initializeTerritory(new Size(cols, rows));
        const initRe = /initializeTerritory\s*\(\s*new Size\((\d+),\s*(\d+)\)\s*\)/;
        const m0 = initRe.exec(lines[0]);
        if (!m0) { alert('Invalid script header'); return; }
        const cols = +m0[1], rows = +m0[2];
        buildGrid(rows, cols);

        // defaultHamsterAt(new Location(x,y), Direction.X, mouthCount);
        const hamRe = /defaultHamsterAt\s*\(\s*new Location\((\d+),\s*(\d+)\),\s*Direction\.([A-Z]+),\s*(\d+)\)/;
        let hamX, hamY, hamRot;
        lines.forEach(line => {
            const m = hamRe.exec(line);
            if (m) {
                hamX = +m[1];
                hamY = +m[2];
                const dir = m[3];
                hamRot = { EAST:0, SOUTH:90, WEST:180, NORTH:270 }[dir] || 0;
                hamMouthCount = +m[4];
            }
        });

        // Walls: wallAt(new Location(x,y));
        const wallRe = /wallAt\s*\(\s*new Location\((\d+),\s*(\d+)\)\s*\)/g;
        let w;
        while (w = wallRe.exec(lines.join('\n'))) {
            const x = +w[1], y = +w[2];
            const cell = gridElement.children[y * cols + x];
            cell.innerHTML = '<img src="data/wand/Wall32.png" style="width:100%;height:100%;">';
            cell.dataset.wall = 'true';
        }

        // Grains: grainAt(new Location(x,y), count);
        const grainRe = /grainAt\s*\(\s*new Location\((\d+),\s*(\d+)\)\s*,\s*(\d+)\s*\)/g;
        let g;
        while (g = grainRe.exec(lines.join('\n'))) {
            const x = +g[1], y = +g[2], cnt = +g[3];
            const cell = gridElement.children[y * cols + x];
            cell.dataset.cornCount = cnt;
            const draw = Math.min(cnt, 12);
            cell.innerHTML = `<img src="../data/körner/${draw}Corn32.png" style="width:100%;height:100%;">`;
        }

        // Place hamster last
        if (hamX != null) {
            const cell = gridElement.children[hamY * cols + hamX];
            cell.innerHTML = `<img src="../data/hamster/hamstereast.png"
                            style="width:100%;height:100%;transform:rotate(${hamRot}deg);">`;
            cell.dataset.hasHamster = 'true';
            cell.dataset.rotation   = hamRot;
        }

        updateCornDisplay();
    }

    function loadAsciiTerritory(lines) {
        // First two lines: cols, rows
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

        // Map characters
        ascii.forEach((row, y) => {
            for (let x = 0; x < cols; x++) {
                const ch = row[x];
                const cell = gridElement.children[y * cols + x];
                if (ch === '#') {
                    cell.innerHTML = '<img src="../data/wand/Wall32.png" style="width:100%;height:100%;">';
                    cell.dataset.wall = 'true';
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

        // Next lines: counts for each position, then hamster mouth count
        const countLines = lines.slice(2 + rows, 2 + rows + cornPos.length + 1)
            .map(l => parseInt(l,10) || 0);

        // Draw corn at each '*' position
        cornPos.forEach((p, i) => {
            if (!p.isHam) {
                const cnt = countLines[i];
                const cell = gridElement.children[p.y * cols + p.x];
                cell.dataset.cornCount = cnt;
                const draw = Math.min(cnt, 12);
                cell.innerHTML = `<img src="../data/körner/${draw}Corn32.png" style="width:100%;height:100%;">`;
            }
        });
        hamMouthCount = countLines[cornPos.length] || 0;

        // Draw hamster
        if (hamX != null) {
            const cell = gridElement.children[hamY * cols + hamX];
            cell.innerHTML = `<img src="../data/hamster/hamstereast.png"
                            style="width:100%;height:100%;transform:rotate(${hamRot}deg);">`;
        }

        updateCornDisplay();
    }

    // ── Save Territory to .ter file ─────────────────────────────────────────────
    document.getElementById('saveTerritory').addEventListener('click', () => {
        if (!gridElement) { alert('Kein Territorium'); return; }

        const cols = parseInt(gridElement.style.gridTemplateColumns.match(/\d+/)[0], 10);
        const cells = Array.from(gridElement.children);
        const rows = cells.length / cols;

        // 1) ASCII map
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
                } else if (parseInt(cell.dataset.cornCount,10) > 0) {
                    ch = '*';
                }
                line += ch;
            }
            ascii.push(line);
        }

        // 2) Positions of '*' or hamster
        const cornPos = [];
        ascii.forEach((row, y) => {
            row.split('').forEach((ch, x) => {
                if (ch === '*' || '><^v'.includes(ch)) {
                    cornPos.push({ x, y, isHam: '><^v'.includes(ch) });
                }
            });
        });

        // 3) Counts for each, then mouth count
        const counts = cornPos.map(p => {
            const cell = cells[p.y * cols + p.x];
            return parseInt(cell.dataset.cornCount,10) || 0;
        });
        counts.push(hamMouthCount);

        // 4) Combine
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

    // ── Tool Buttons ────────────────────────────────────────────────────────────
    document.getElementById('placeHamster').addEventListener('click', () => {
        currentTool = 'hamster';
    });
    document.getElementById('placeHamsterCorn').addEventListener('click', () => {
        if (!gridElement) { alert('Erst Territorium erstellen'); return; }
        const ham = gridElement.querySelector('[data-has-hamster="true"]');
        if (!ham) { alert('Kein Hamster vorhanden'); return; }
        modalTool   = 'hamsterCorn';
        modalTarget = ham;
        showCornModal();
    });
    document.getElementById('placeCorn').addEventListener('click', () => {
        currentTool = 'corn';
    });
    document.getElementById('placeWall').addEventListener('click', () => {
        currentTool = 'wall';
    });
    document.getElementById('deleteItem').addEventListener('click', () => {
        currentTool = 'delete';
    });

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
        const img = cell.querySelector('img');
        if (img) img.style.transform = `rotate(${r}deg)`;
    });

    // Körner Modal OK/Cancel
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
            modalTarget.innerHTML = `<img src="../data/körner/${c}Corn32.png" style="width:100%;height:100%;">`;
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
                    old.dataset.cornCount = '0';
                }
                if (cell.dataset.hasHamster === 'false') {
                    cell.innerHTML = `<img src="../data/hamster/hamstereast.png"
                               style="width:100%;height:100%;transform:rotate(0deg);">`;
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
                    cell.innerHTML = `<img src="../data/wand/Wall32.png" style="width:100%;height:100%;">`;
                    cell.dataset.wall = 'true';
                }
                break;
            case 'delete':
                cell.innerHTML          = '';
                cell.dataset.hasHamster = 'false';
                cell.dataset.cornCount  = '0';
                cell.dataset.wall       = 'false';
                delete cell.dataset.rotation;
                hamMouthCount = 0;
                updateCornDisplay();
                break;
            default:
                break;
        }
    });

});
