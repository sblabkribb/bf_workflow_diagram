"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDiagramPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const parser_1 = require("./parser");
const diagramGenerator_1 = require("./diagramGenerator");
function createDiagramPanel(extensionUri) {
    // 함수가 시작되었는지 확인하는 최우선 로그
    console.log('Function "createDiagramPanel" started.');
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        console.error('Execution stopped: No active editor found.'); // 조기 종료 원인 로깅
        vscode.window.showErrorMessage('다이어그램을 생성하려면 먼저 파일을 열어주세요.');
        return;
    }
    const readmePath = findReadmePath(editor.document.uri.fsPath);
    if (!readmePath) {
        console.error('Execution stopped: Could not find a README.md in a labnote experiment folder.');
        vscode.window.showErrorMessage('Labnote 실험 폴더 내의 파일(README.md 또는 워크플로우 .md)을 열어주세요.');
        return;
    }
    // 🖼️ Webview 생성
    const panel = vscode.window.createWebviewPanel('labnoteDiagram', 'Labnote Workflow Diagram', vscode.ViewColumn.Beside, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out')]
    });
    // 웹뷰 콘텐츠를 업데이트하는 함수
    const updateWebview = async () => {
        try {
            const experiment = await (0, parser_1.parseExperiment)(readmePath);
            console.log("[Debug] Updating webview with new data.");
            panel.webview.html = getWebviewContent(panel.webview, extensionUri, experiment);
        }
        catch (err) {
            vscode.window.showErrorMessage(`다이어그램 업데이트 중 오류 발생: ${err.message}`);
        }
    };
    // 초기 로드
    updateWebview();
    panel.reveal(vscode.ViewColumn.Beside);
    // 파일 변경 감지를 위한 Watcher 설정
    const experimentDir = path.dirname(readmePath);
    const pattern = new vscode.RelativePattern(experimentDir, '**/*.md');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    const onFileChange = (uri) => {
        console.log(`File changed: ${uri.fsPath}, refreshing diagram.`);
        updateWebview();
    };
    watcher.onDidChange(onFileChange);
    watcher.onDidCreate(onFileChange);
    watcher.onDidDelete(onFileChange);
    // 패널이 닫힐 때 watcher도 정리
    panel.onDidDispose(() => {
        watcher.dispose();
        panel.dispose();
    }, null, [] // context.subscriptions에 추가하지 않고 패널 자체의 disposables로 관리
    );
    return panel;
}
exports.createDiagramPanel = createDiagramPanel;
function getWebviewContent(webview, extensionUri, experiment) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'main.js'));
    const nonce = getNonce();
    const tableHtml = (0, diagramGenerator_1.generateDiagramHtml)(experiment);
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data: https:; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${experiment.title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 20px;
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          overflow: auto;
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
        .mermaid {
          background-color: var(--vscode-editor-background);
          overflow: auto;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>
        <span>🔬 ${experiment.title}</span>
        <button id="export-button">Export to SVG</button>
      </h1>
      ${tableHtml}
      <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
      <script nonce="${nonce}" src="${scriptUri}"></script>
      <script nonce="${nonce}">
        // VSCode API를 사용하기 위한 인스턴스
        const vscode = acquireVsCodeApi();

        // Base64로 인코딩된 데이터를 디코딩하여 파일로 이동하는 함수
        function navigateTo(base64Data) {
          const decodedString = atob(base64Data);
          const navData = JSON.parse(decodedString);
          vscode.postMessage({ command: 'navigateTo', ...navData });
        }

        try {
          mermaid.initialize({ startOnLoad: false, theme: 'dark' });
          const mermaidContainer = document.querySelector('.mermaid');
          if (mermaidContainer) {
            console.log("--- Mermaid Code to Render ---", mermaidContainer.textContent);
            mermaid.run({ nodes: [mermaidContainer] });
          }
        } catch (e) {
          console.error("Mermaid rendering failed:", e);
          const container = document.querySelector('.mermaid');
          if (container) {
            container.innerHTML = '<h2>Error Rendering Diagram</h2><p>Please check the developer console (Help > Toggle Developer Tools) for more details.</p><pre>' + e.message + '</pre>';
          }
        }
      </script>
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
/**
 * 현재 경로에서 시작하여 상위로 이동하며 labnote 실험 폴더의 README.md를 찾습니다.
 * @param currentPath 현재 파일의 절대 경로
 * @returns README.md 파일의 절대 경로 또는 null
 */
function findReadmePath(currentPath) {
    let dir = path.dirname(currentPath);
    const root = path.parse(dir).root; // 시스템의 루트 디렉터리 (e.g., 'C:\' or '/')
    const fs = require('fs');
    while (dir !== root) {
        const readmePath = path.join(dir, 'README.md');
        // `fs.existsSync`는 동기 방식이지만, UI 이벤트 핸들러의 시작 부분에서
        // 한 번만 호출되므로 성능에 큰 영향을 주지 않습니다.
        if (fs.existsSync(readmePath)) {
            // README.md를 찾았을 때, 상위 경로에 'labnote' 폴더가 있는지 확인
            let tempDir = dir;
            while (tempDir !== root) {
                if (path.basename(tempDir) === 'labnote') {
                    return readmePath; // 'labnote' 폴더의 하위 디렉토리에서 찾았으므로 경로 반환
                }
                tempDir = path.dirname(tempDir);
            }
        }
        dir = path.dirname(dir);
    }
    return null;
}
//# sourceMappingURL=webview.js.map