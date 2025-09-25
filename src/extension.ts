import * as vscode from 'vscode';
import * as fs from 'fs';
import { createDiagramPanel } from './webview';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "labnote-diagram-viewer" is now activating...');

  // showDiagramPanel 함수를 한번 더 감싸서, 명령어 호출 자체를 로깅합니다.
  const disposable = vscode.commands.registerCommand('bf-workflow-diagram.showDiagram', () => {
    console.log('Command "bf-workflow-diagram.showDiagram" was triggered!');
    const panel = createDiagramPanel(context.extensionUri);

    // 패널 생성이 실패한 경우 (예: 유효한 파일이 아님) 더 이상 진행하지 않음
    if (!panel) {
      return;
    }

    // 웹뷰로부터 메시지 수신
    panel.webview.onDidReceiveMessage(
      async message => {
        if (message.command === 'navigateTo') {
          const { filePath, line } = message;
          const uri = vscode.Uri.file(filePath);
          const document = await vscode.workspace.openTextDocument(uri);
          const position = new vscode.Position(line - 1, 0);
          await vscode.window.showTextDocument(document, {
            selection: new vscode.Selection(position, position),
          });
        } else if (message.command === 'exportToSvg') {
          const { svgContent } = message;
          const uri = await vscode.window.showSaveDialog({
            filters: {
              'SVG Images': ['svg']
            },
            defaultUri: vscode.Uri.file('workflow-diagram.svg')
          });

          if (uri) {
            fs.writeFileSync(uri.fsPath, svgContent);
            vscode.window.showInformationMessage(`Diagram exported to ${uri.fsPath}`);
          }
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);

  console.log('Labnote Diagram Viewer is now active and command is registered!');
}

export function deactivate() {}
