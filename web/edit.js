const fileInput = document.getElementById('fileInput');
const openBtn = document.getElementById('openBtn');
const editor = document.getElementById('code-editor');
const saveBtn = document.getElementById('saveBtn');
const newBtn = document.getElementById('newBtn');

openBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.java')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            editor.textContent = e.target.result;
        };
        reader.readAsText(file);
    } else {
        alert('Bitte wähle eine gültige .java-Datei aus!');
    }
});

saveBtn.addEventListener('click', () => {
    const code = editor.textContent;
    const blob = new Blob([code], { type: 'text/plain' });
    const fileName = prompt('Dateiname eingeben:', 'meinCode.java');

    if (fileName) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName.endsWith('.java') ? fileName : `${fileName}.java`;
        a.click();
        URL.revokeObjectURL(a.href);
    }
});

newBtn.addEventListener('click', () => {
    const confirmNew = confirm("Willst du wirklich eine neue Datei erstellen? Ungespeicherte Änderungen gehen verloren.");
    if (confirmNew) {
        editor.textContent = '';
    }
});
