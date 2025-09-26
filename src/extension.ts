import * as vscode from 'vscode';
import * as fs from 'fs';
import { createDiagramPanel } from './webview';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "labnote-diagram-viewer" is now activating...');

  const disposable = vscode.commands.registerCommand('bf-workflow-diagram.showDiagram', () => {
    console.log('Command "bf-workflow-diagram.showDiagram" was triggered!');
    // createDiagramPanel 함수에 context 객체 전체를 전달하도록 수정합니다.
    const panel = createDiagramPanel(context);

    if (!panel) {
      return;
    }

    // 웹뷰로부터 메시지 수신
    panel.webview.onDidReceiveMessage(
      async message => {
        if (message.command === 'navigateTo') {
          const { filePath, line } = message;
          try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const position = new vscode.Position(line - 1, 0);
            await vscode.window.showTextDocument(document, {
              selection: new vscode.Selection(position, position),
            });
          } catch(e) {
            console.error(e);
            vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
          }
        } else if (message.command === 'exportToPng') {
          const { data } = message; // Base64 data URL
          const uri = await vscode.window.showSaveDialog({
            filters: {
              'PNG Images': ['png']
            },
            defaultUri: vscode.Uri.file('workflow-diagram.png')
          });

          if (uri) {
            // "data:image/png;base64," 접두사를 제거하여 순수 Base64 데이터만 남깁니다.
            const base64Data = data.replace(/^data:image\/png;base64,/, "");
            try {
              fs.writeFileSync(uri.fsPath, base64Data, 'base64');
              vscode.window.showInformationMessage(`Diagram exported to ${uri.fsPath}`);
            } catch (err) {
              console.error('Failed to save PNG:', err);
              vscode.window.showErrorMessage('Failed to save diagram file.');
            }
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

