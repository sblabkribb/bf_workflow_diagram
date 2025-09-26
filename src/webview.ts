import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseExperiment } from './parser';
import { generateDiagramHtml } from './diagramGenerator';
import { Experiment } from './types';

export function createDiagramPanel(context: vscode.ExtensionContext): vscode.WebviewPanel | undefined {
  const extensionUri = context.extensionUri;
  console.log('Function "createDiagramPanel" started.');

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    console.error('Execution stopped: No active editor found.');
    vscode.window.showErrorMessage('다이어그램을 생성하려면 먼저 파일을 열어주세요.');
    return;
  }

  const labnoteRoot = findLabnoteRoot(editor.document.uri.fsPath);
  if (!labnoteRoot) {
    console.error('Execution stopped: Could not find a "labnote" parent folder.');
    vscode.window.showErrorMessage('"labnote" 폴더의 하위 파일을 열어주세요.');
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'labnoteDiagram',
    'Labnote Workflow Diagram',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out')]
    }
  );

  const updateWebview = async () => {
    try {
      const experimentReadmePaths = findExperimentReadmes(labnoteRoot);
      if (experimentReadmePaths.length === 0) {
        panel.webview.html = getWebviewContent(panel.webview, extensionUri, [], "No Experiments Found");
        return;
      }

      const experiments = await Promise.all(experimentReadmePaths.map(p => parseExperiment(p)));
      const title = path.basename(labnoteRoot);
      console.log("[Debug] Updating webview with new data.");
      panel.webview.html = getWebviewContent(panel.webview, extensionUri, experiments, title);
    } catch (err: any) {
      vscode.window.showErrorMessage(`다이어그램 업데이트 중 오류 발생: ${err.message}`);
    }
  };

  updateWebview();
  panel.reveal(vscode.ViewColumn.Beside);

  const pattern = new vscode.RelativePattern(labnoteRoot, '**/*.md');
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  const onFileChange = (uri: vscode.Uri) => {
    console.log(`File changed: ${uri.fsPath}, refreshing diagram.`);
    updateWebview();
  };

  watcher.onDidChange(onFileChange);
  watcher.onDidCreate(onFileChange);
  watcher.onDidDelete(onFileChange);

  panel.onDidDispose(
    () => { watcher.dispose(); },
    null,
    context.subscriptions
  );

  return panel;
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, experiments: Experiment[], title: string): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'main.js'));
  const nonce = getNonce();
  const diagramHtml = generateDiagramHtml(experiments);
  const html2canvasUri = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none'; 
        style-src ${webview.cspSource} 'unsafe-inline'; 
        img-src ${webview.cspSource} data: https:; 
        script-src 'nonce-${nonce}' 'unsafe-eval' https://cdnjs.cloudflare.com;
      ">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 20px;
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        h1 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid var(--vscode-focusBorder);
          padding-bottom: 10px;
        }
        #export-button {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: 1px solid var(--vscode-button-border, var(--vscode-contrastBorder));
          padding: 6px 12px;
          cursor: pointer;
          border-radius: 4px;
        }
        #export-button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        #diagram-container {
          position: relative;
          width: 100%;
          min-height: 800px;
        }
        .workflow-group {
            position: absolute; /* Controlled by JS */
        }
        .dbtl-cell, .workflow-title-cell, .unit-operations-cell, .dbtl-cycle-label {
            position: absolute; /* Controlled by JS */
        }
        .dbtl-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dbtl-btn {
          border: 1px solid #ccc;
          background-color: #555;
          color: white;
          width: 25px;
          height: 25px;
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
        }
        .dbtl-btn.selected {
          background-color: #007acc;
          border-color: #007acc;
        }
        .dbtl-cycle-label {
            font-size: 24px;
            font-weight: bold;
            color: #ccc;
        }
        .workflow-title-cell {
          background-color: #444;
          border: 1px solid #777;
          padding: 10px 15px;
          border-radius: 6px;
          text-align: center;
          cursor: pointer;
          min-width: 250px;
          box-sizing: border-box;
        }
        .unit-operations-cell {
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        .unit-operation-node {
          background-color: #003;
          border: 1px solid #0af;
          color: #fff;
          padding: 8px;
          border-radius: 6px;
          text-align: center;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          min-width: 150px;
          margin-right: 20px; /* Gap between operations */
        }
        .unit-operation-node .op-id { font-weight: bold; margin-bottom: 5px; }
        .unit-operation-node:hover, .workflow-title-cell:hover { border-color: yellow; }
      </style>
    </head>
    <body>
      <h1>
        <span>📁 ${title}</span>
        <button id="export-button">Export to PNG</button>
      </h1>
      <div id="capture-area" style="position: relative; width: 100%;">
        ${diagramHtml}
        <svg id="arrow-svg-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1;"></svg>
      </div>
      <script nonce="${nonce}" src="${html2canvasUri}"></script>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>
  `;
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function findLabnoteRoot(currentPath: string): string | null {
  let dir = path.dirname(currentPath);
  const root = path.parse(dir).root; 
  while (dir !== root) {
    if (path.basename(dir) === 'labnote') return dir;
    dir = path.dirname(dir);
  }
  if (path.basename(currentPath) === 'labnote' && fs.statSync(currentPath).isDirectory()) {
    return currentPath;
  }
  return null;
}

function findExperimentReadmes(labnoteRoot: string): string[] {
  const entries = fs.readdirSync(labnoteRoot, { withFileTypes: true });
  const experimentReadmePaths: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const readmePath = path.join(labnoteRoot, entry.name, 'README.md');
      if (fs.existsSync(readmePath)) {
        experimentReadmePaths.push(readmePath);
      }
    }
  }
  return experimentReadmePaths;
}

