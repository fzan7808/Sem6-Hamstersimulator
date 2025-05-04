document.addEventListener('DOMContentLoaded', () => {
    const fileInput   = document.getElementById('fileInput');
    const openBtn     = document.getElementById('openBtn');
    const editor      = document.getElementById('code-editor');
    const saveBtn     = document.getElementById('saveBtn');
    const newBtn      = document.getElementById('newBtn');
    const runBtn      = document.getElementById('runBtn');
    const themeToggle = document.getElementById('themeToggle');

    // Open .java
    openBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        const f = e.target.files[0];
        if (f && f.name.endsWith('.java')) {
            const r = new FileReader();
            r.onload = ev => editor.textContent = ev.target.result;
            r.readAsText(f);
        } else {
            alert('Bitte eine .java-Datei auswählen!');
        }
    });

    // Save
    saveBtn.addEventListener('click', () => {
        const code = editor.textContent;
        const blob = new Blob([code], { type: 'text/plain' });
        const name = prompt('Dateiname:', 'meinCode.java');
        if (!name) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name.endsWith('.java') ? name : `${name}.java`;
        a.click();
        URL.revokeObjectURL(a.href);
    });

    // New
    newBtn.addEventListener('click', () => {
        if (confirm('Neue Datei erstellen? Ungespeicherte Änderungen gehen verloren.')) {
            editor.textContent = '';
        }
    });

    // Run → Territorium
    runBtn.addEventListener('click', () => {
        window.location.href = 'ter.html';
    });

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (dark) {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.textContent = '☀️';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.textContent = '🌙';
        }
    });
});
