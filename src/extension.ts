import * as vscode from 'vscode';
import { showDiagramPanel } from './webview';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "labnote-diagram-viewer" is now activating...');

  // showDiagramPanel 함수를 한번 더 감싸서, 명령어 호출 자체를 로깅합니다.
  const disposable = vscode.commands.registerCommand('labnote.diagram.view', () => {
    console.log('Command "labnote.diagram.view" was triggered!');
    showDiagramPanel();
  });

  context.subscriptions.push(disposable);

  console.log('Labnote Diagram Viewer is now active and command is registered!');
}

export function deactivate() {}
