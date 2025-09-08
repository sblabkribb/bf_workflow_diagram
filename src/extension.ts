import * as vscode from 'vscode';
import { showDiagramPanel } from './webview';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('labnote.diagram.view', showDiagramPanel);
  context.subscriptions.push(disposable);

  console.log('Labnote Diagram Viewer is now active!');
}

export function deactivate() {}