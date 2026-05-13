import './style.css'
import { Viewer } from './viewer';

// Declare VS Code API
declare function acquireVsCodeApi(): any;

// Initialize Viewer
try {
    const viewer = new Viewer('app');
    // Expose viewer on window for E2E tests and debugging.
    (window as any).__viewer = viewer;
    console.log("q3dviewer Initialized.");
    
    // Check if running in VS Code
    let vscode: any = null;
    try {
        vscode = acquireVsCodeApi();
        console.log("VS Code API detected");
    } catch(e) {
        console.log("Running in Standalone mode");
    }

    if (vscode) {
        // Share vscode API with the viewer (for host-side file save dialogs, etc.)
        (viewer as any).vscode = vscode;
        // VS Code Mode
        // Listen for messages from VS Code extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'loadData':
                case 'loadPCD':
                    viewer.loadData(message.value, message.filename);
                    break;
                case 'startStream':
                    viewer.startStream(message.totalSize, message.filename);
                    break;
                case 'chunk':
                    viewer.processChunk(message.data, message.offset);
                    break;
                case 'endStream':
                    viewer.finalizeStream();
                    break;
            }
        });

        // Signal readiness
        vscode.postMessage({ type: 'ready' });
    } else {
        // Standalone Mode
        console.log("Drag and drop a point cloud file (.pcd, .ply, .las, .laz, .e57) to view it.");
    }

} catch(e) {
    console.error("Initialization failed:", e);
    document.body.innerHTML = `<h1>Error: ${e}</h1>`;
}

