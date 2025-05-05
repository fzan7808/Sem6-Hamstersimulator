// edit.js
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const openBtn   = document.getElementById('openBtn');
    const saveBtn   = document.getElementById('saveBtn');
    const newBtn    = document.getElementById('newBtn');
    const runBtn    = document.getElementById('runBtn');

    // initialize CodeMirror
    const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: "text/x-java",
        theme: "eclipse",
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        autofocus: true
    });

    // restore last code
    const saved = sessionStorage.getItem('hamsterCode');
    if (saved) editor.setValue(saved);

    // save on changes
    editor.on('change', () => {
        sessionStorage.setItem('hamsterCode', editor.getValue());
    });

    // ensure persistence on page unload
    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('hamsterCode', editor.getValue());
    });

    // Open .java file
    openBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        const f = e.target.files[0];
        if (f && f.name.endsWith('.java')) {
            const reader = new FileReader();
            reader.onload = ev => {
                editor.setValue(ev.target.result);
                sessionStorage.setItem('hamsterCode', ev.target.result);
            };
            reader.readAsText(f);
        } else {
            alert('Bitte wähle eine .java-Datei aus!');
        }
        fileInput.value = '';
    });

    // Save to disk
    saveBtn.addEventListener('click', () => {
        const code = editor.getValue();
        const blob = new Blob([code], { type: 'text/plain' });
        const name = prompt('Dateiname:', 'meinCode.java');
        if (!name) return;
        const a = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = name.endsWith('.java') ? name : `${name}.java`;
        a.click();
        URL.revokeObjectURL(a.href);
    });

    // New file
    newBtn.addEventListener('click', () => {
        if (confirm('Neue Datei erstellen? Ungespeicherte Änderungen gehen verloren.')) {
            editor.setValue('');
            sessionStorage.removeItem('hamsterCode');
        }
    });

    // Run → switch to ter.html, but only once
    runBtn.addEventListener('click', () => {
        let code = editor.getValue();

        // simple bracket balance check
        function balanced(str, o, c) {
            let cnt = 0;
            for (let ch of str) {
                if (ch === o) cnt++;
                if (ch === c) cnt--;
                if (cnt < 0) return false;
            }
            return cnt === 0;
        }
        if (!balanced(code, '{','}') || !balanced(code,'(',')')) {
            return alert('Syntaxfehler: Ungleiche Anzahl von Klammern');
        }

        // wrap in void main() if not already
        if (!/void\s+main\s*\(/.test(code)) {
            code = `void main() {\n${code.replace(/\n$/, '')}\n}`;
        }

        sessionStorage.setItem('hamsterCode', code);
        sessionStorage.setItem('runPending', 'true');
        // navigate
        window.location.href = 'ter.html';
    });
});
