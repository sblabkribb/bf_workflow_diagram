import * as vscode from 'vscode';
import * as path from 'path';
import { parseWorkflowsFromReadme, parseUnitOperationsFromWorkflow } from './parser';
import { generateMermaidDiagram } from './diagramGenerator';

export async function showDiagramPanel() {
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

  let workflows: { name: string; ops: string[] }[] = [];

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
  } else {
    // 🚀 실제 파싱 모드
    try {
      const workflowPaths = await parseWorkflowsFromReadme(readmePath);
      workflows = await Promise.all(workflowPaths.map(async (fullPath) => {
        const fileName = path.basename(fullPath, '.md');
        const displayName = fileName.split('_').slice(1).join(' '); // e.g., "001_Material_Preparation" → "Material Preparation"
        const ops = await parseUnitOperationsFromWorkflow(fullPath);
        return { name: displayName, ops };
      }));
    } catch (err) {
      vscode.window.showErrorMessage(`Error parsing workflows: ${err}`);
      return;
    }
  }

  // 🧾 파싱 결과 콘솔 출력 (디버깅용)
  console.log("[Debug] Parser-to-Generator Data:", JSON.stringify(workflows, null, 2));

  const mermaidCode = generateMermaidDiagram(workflows);

  console.log("--- [Generated Mermaid Code Start] ---");
  console.log(mermaidCode);
  console.log("--- [Generated Mermaid Code End] ---");

  // 🖼️ Webview 생성
  const panel = vscode.window.createWebviewPanel(
    'labnoteDiagram',
    'Labnote Diagram',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  const nonce = getNonce();

  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${panel.webview.cspSource} 'unsafe-inline';
        img-src ${panel.webview.cspSource} data: https:;
        script-src 'nonce-${nonce}';
      ">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Labnote Workflow Diagram</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 20px;
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        h1 {
          border-bottom: 2px solid var(--vscode-focusBorder);
          padding-bottom: 10px;
        }
        .mermaid {
          background-color: var(--vscode-sideBar-background);
          padding: 20px;
          border-radius: 8px;
          border: 1px solid var(--vscode-sideBar-border);
          overflow: auto;
        }
      </style>
    </head>
    <body>
      <h1>🔬 Labnote Workflow Diagram</h1>
      <div class="mermaid">
        ${mermaidCode}
      </div>
      <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
      <script nonce="${nonce}">
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'linear'
          }
        });
        mermaid.run();
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
