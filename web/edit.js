// File: edit.js
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const openBtn   = document.getElementById("openBtn");
    const saveBtn   = document.getElementById("saveBtn");
    const newBtn    = document.getElementById("newBtn");
    const runBtn    = document.getElementById("runBtn");

    // ── Initialize CodeMirror ─────────────────────────────────────────────────
    const editor = CodeMirror.fromTextArea(
        document.getElementById("code-editor"),
        {
            mode: "text/x-java",
            theme: "eclipse",
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: false,
            autofocus: true
        }
    );
    editor.setSize("100%", "100%");

    // ── Auto Dark/Light Mode ───────────────────────────────────────────────────
    const dm = window.matchMedia("(prefers-color-scheme: dark)");
    function applyTheme(e) {
        editor.setOption("theme", e.matches ? "dracula" : "eclipse");
    }
    dm.addEventListener("change", applyTheme);
    applyTheme(dm);

    // ── Default Template & Restore ─────────────────────────────────────────────
    const defaultCode = [
        "// Schreibe deinen Hamster-Code hier",
        "// z.B.: if (vornFrei()) vor();"
    ].join("\n");

    const saved = localStorage.getItem("hamsterCode");
    editor.setValue(saved || defaultCode);

    editor.on("change", () =>
        localStorage.setItem("hamsterCode", editor.getValue())
    );
    window.addEventListener("beforeunload", () =>
        localStorage.setItem("hamsterCode", editor.getValue())
    );

    // ── Open .java File ────────────────────────────────────────────────────────
    openBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", e => {
        const f = e.target.files[0];
        if (f && f.name.endsWith(".java")) {
            const r = new FileReader();
            r.onload = ev => {
                editor.setValue(ev.target.result);
                localStorage.setItem("hamsterCode", ev.target.result);
            };
            r.readAsText(f);
        } else {
            alert("Bitte wähle eine .java-Datei aus!");
        }
        fileInput.value = "";
    });

    // ── Save to Disk ───────────────────────────────────────────────────────────
    saveBtn.addEventListener("click", () => {
        const code = editor.getValue();
        const blob = new Blob([code], { type: "text/plain" });
        const name = prompt("Dateiname:", "meinCode.java");
        if (!name) return;
        const a = document.createElement("a");
        a.href     = URL.createObjectURL(blob);
        a.download = name.endsWith(".java") ? name : `${name}.java`;
        a.click();
        URL.revokeObjectURL(a.href);
    });

    // ── New File ───────────────────────────────────────────────────────────────
    newBtn.addEventListener("click", () => {
        if (confirm("Neue Datei erstellen? Ungespeicherte Änderungen gehen verloren.")) {
            editor.setValue(defaultCode);
            localStorage.removeItem("hamsterCode");
        }
    });

    // ── Run → transform Java methods to JS, store & flag for simulator ────────
    runBtn.addEventListener("click", () => {
        const raw = editor.getValue();

        // 1) Bracket balance check
        function balanced(s, o, c) {
            let cnt = 0;
            for (const ch of s) {
                if (ch === o) cnt++;
                if (ch === c) cnt--;
                if (cnt < 0) return false;
            }
            return cnt === 0;
        }
        if (!balanced(raw, "{", "}") || !balanced(raw, "(", ")")) {
            return alert("Syntaxfehler: Ungleiche Klammern");
        }

        // 2) Convert Java-style `void foo(...) {` into JS `function foo(...) {`
        let code = raw.replace(/\bvoid\s+([a-zA-Z_]\w*)\s*\(/g, "function $1(");

        // 3) Trim and ensure there's at least one statement
        code = code.trim();
        if (!code) {
            return alert("Bitte schreibe zuerst etwas Code.");
        }

        // 4) Store pure JS snippet for interpreter
        localStorage.setItem("hamsterCode", code);
        localStorage.setItem("runPending", "true");

        // 5) Navigate to simulator
        window.location.href = "ter.html";
    });
});
