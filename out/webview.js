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
exports.showDiagramPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const parser_1 = require("./parser");
const diagramGenerator_1 = require("./diagramGenerator");
async function showDiagramPanel() {
    // 함수가 시작되었는지 확인하는 최우선 로그
    console.log('Function "showDiagramPanel" started.');
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        console.error('Execution stopped: No active editor found.'); // 조기 종료 원인 로깅
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }
    const readmePath = editor.document.uri.fsPath;
    if (!readmePath.endsWith('README.md')) {
        console.error('Execution stopped: Active file is not a README.md.'); // 조기 종료 원인 로깅
        vscode.window.showErrorMessage('Please open a README.md file.');
        return;
    }
    // === 🧪 테스트 모드 (더미 데이터) ===
    const useTestMode = false; // ✅ true로 설정하면 테스트 모드 활성화!
    let workflows = [];
    if (useTestMode) {
        // 🧪 테스트용 더미 데이터
        workflows = [
            {
                name: "WD070 Vector Design",
                ops: [
                    "UH0010 Manual (Dilute)",
                    "UH0020 Liquid Handling",
                    "UH0030 Plate Reader"
                ]
            },
            {
                name: "WB000 Material Preparation",
                ops: [
                    "UH0100 Liquid Handling",
                    "UH0110 Centrifuge",
                    "UH0120 Incubator"
                ]
            },
            {
                name: "WB030 DNA Assembly",
                ops: [
                    "UH0200 PCR Setup",
                    "UH0210 Thermocycler",
                    "UH0220 Gel Electrophoresis"
                ]
            }
        ];
    }
    else {
        // 🚀 실제 파싱 모드
        try {
            const workflowPaths = (0, parser_1.parseWorkflowsFromReadme)(readmePath);
            workflows = workflowPaths.map(fullPath => {
                const fileName = path.basename(fullPath, '.md');
                const displayName = fileName.split('_').slice(1).join(' '); // e.g., "001_Material_Preparation" → "Material Preparation"
                const ops = (0, parser_1.parseUnitOperationsFromWorkflow)(fullPath);
                return { name: displayName, ops };
            });
        }
        catch (err) {
            vscode.window.showErrorMessage(`Error parsing workflows: ${err}`);
            return;
        }
    }
    // 🧾 파싱 결과 콘솔 출력 (디버깅용)
    console.log("[Debug] Parser-to-Generator Data:", JSON.stringify(workflows, null, 2));
    const mermaidCode = (0, diagramGenerator_1.generateMermaidDiagram)(workflows);
    console.log("--- [Generated Mermaid Code Start] ---");
    console.log(mermaidCode);
    console.log("--- [Generated Mermaid Code End] ---");
    // 🖼️ Webview 생성
    const panel = vscode.window.createWebviewPanel('labnoteDiagram', 'Labnote Diagram', vscode.ViewColumn.Beside, {
        enableScripts: true,
        retainContextWhenHidden: true
    });
    panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src 'unsafe-inline';
        script-src https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js 'unsafe-inline';
      ">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Labnote Workflow Diagram</title>
      <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 20px;
          background: #f9f9f9;
        }
        h1 {
          color: #333;
          border-bottom: 2px solid #007acc;
          padding-bottom: 10px;
        }
        #diagram {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          overflow: auto;
        }
      </style>
    </head>
    <body>
      <h1>🔬 Labnote Workflow Diagram</h1>
      <div id="diagram" class="mermaid">
        ${mermaidCode}
      </div>
      <script>
        mermaid.initialize({
          startOnLoad: true,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'linear'
          }
        });
      </script>
    </body>
    </html>
  `;
}
exports.showDiagramPanel = showDiagramPanel;
//# sourceMappingURL=webview.js.map