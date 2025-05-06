// File: esp32-client.js

// Base URL of your ESP32’s HTTP server (mDNS name or IP)
const ESP_URL = 'http://esp32.local';

// Send a single command to the ESP32
async function sendCmd(cmd) {
    try {
        const res = await fetch(`${ESP_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cmd })
        });
        if (!res.ok) {
            console.error(`ESP cmd failed: ${res.status}`);
        }
    } catch (err) {
        console.error('Error sending command to ESP32:', err);
    }
}

// Poll the ESP32 for its latest telemetry and update the UI
async function pollTelemetry() {
    try {
        const res = await fetch(`${ESP_URL}/telemetry`);
        if (!res.ok) return;
        const data = await res.json();
        handleTelemetry(data);
    } catch (err) {
        console.error('Error fetching telemetry from ESP32:', err);
    }
}

// Update UI elements with the latest telemetry
function handleTelemetry({ action, uid, distance, seeds }) {
    const elAction   = document.getElementById('last-action');
    const elUid      = document.getElementById('last-uid');
    const elDistance = document.getElementById('last-distance');
    const elSeeds    = document.getElementById('last-seeds');

    if (elAction)   elAction.innerText   = action;
    if (elUid)      elUid.innerText      = uid || '–';
    if (elDistance) elDistance.innerText = distance.toFixed(1);
    if (elSeeds)    elSeeds.innerText    = seeds;
}

// When the DOM is ready, wire up buttons and start telemetry polling
document.addEventListener('DOMContentLoaded', () => {
    // Attach sendCmd to every element with a data-cmd attribute
    document.querySelectorAll('[data-cmd]').forEach(button => {
        button.addEventListener('click', () => {
            const cmd = button.getAttribute('data-cmd');
            sendCmd(cmd);
        });
    });

    // Start polling telemetry every 500 milliseconds
    setInterval(pollTelemetry, 500);
});
