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
const fs = __importStar(require("fs"));
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
    const labnoteRoot = findLabnoteRoot(editor.document.uri.fsPath);
    if (!labnoteRoot) {
        console.error('Execution stopped: Could not find a "labnote" parent folder.');
        vscode.window.showErrorMessage('"labnote" 폴더의 하위 파일을 열어주세요.');
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
            const experimentReadmePaths = findExperimentReadmes(labnoteRoot);
            if (experimentReadmePaths.length === 0) {
                vscode.window.showInformationMessage('"labnote" 폴더 내에서 유효한 실험(README.md 포함)을 찾을 수 없습니다.');
                panel.webview.html = getWebviewContent(panel.webview, extensionUri, [], "No Experiments Found");
                return;
            }
            const experiments = await Promise.all(experimentReadmePaths.map(p => (0, parser_1.parseExperiment)(p)));
            const title = path.basename(labnoteRoot);
            console.log("[Debug] Updating webview with new data.");
            panel.webview.html = getWebviewContent(panel.webview, extensionUri, experiments, title);
        }
        catch (err) {
            vscode.window.showErrorMessage(`다이어그램 업데이트 중 오류 발생: ${err.message}`);
        }
    };
    // 초기 로드
    updateWebview();
    panel.reveal(vscode.ViewColumn.Beside);
    // 파일 변경 감지를 위한 Watcher 설정
    const pattern = new vscode.RelativePattern(labnoteRoot, '**/*.md');
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
function getWebviewContent(webview, extensionUri, experiments, title) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'main.js'));
    const nonce = getNonce();
    const diagramHtml = (0, diagramGenerator_1.generateDiagramHtml)(experiments);
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data: https:; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
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
        <span>📁 ${title}</span>
        <button id="export-button">Export to SVG</button>
      </h1>
      ${diagramHtml}
      <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
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
/**
 * 현재 경로에서 시작하여 상위로 이동하며 'labnote' 폴더를 찾습니다.
 * @param currentPath 현재 파일의 절대 경로
 * @returns 'labnote' 폴더의 절대 경로 또는 null
 */
function findLabnoteRoot(currentPath) {
    let dir = path.dirname(currentPath);
    const root = path.parse(dir).root; // 시스템의 루트 디렉터리 (e.g., 'C:\' or '/')
    while (dir !== root) {
        if (path.basename(dir) === 'labnote') {
            return dir;
        }
        dir = path.dirname(dir);
    }
    return null;
}
/**
 * 주어진 'labnote' 폴더 경로 하위에서 README.md를 포함하는 모든 실험 폴더를 찾습니다.
 * @param labnoteRoot 'labnote' 폴더의 절대 경로
 * @returns 각 실험의 README.md 파일 절대 경로 배열
 */
function findExperimentReadmes(labnoteRoot) {
    const entries = fs.readdirSync(labnoteRoot, { withFileTypes: true });
    const experimentReadmePaths = [];
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
//# sourceMappingURL=webview.js.map