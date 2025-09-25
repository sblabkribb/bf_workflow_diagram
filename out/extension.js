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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const webview_1 = require("./webview");
function activate(context) {
    console.log('Extension "labnote-diagram-viewer" is now activating...');
    // showDiagramPanel 함수를 한번 더 감싸서, 명령어 호출 자체를 로깅합니다.
    const disposable = vscode.commands.registerCommand('bf-workflow-diagram.showDiagram', () => {
        console.log('Command "bf-workflow-diagram.showDiagram" was triggered!');
        const panel = (0, webview_1.createDiagramPanel)(context.extensionUri);
        // 패널 생성이 실패한 경우 (예: 유효한 파일이 아님) 더 이상 진행하지 않음
        if (!panel) {
            return;
        }
        // 웹뷰로부터 메시지 수신
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'navigateTo') {
                const { filePath, line } = message;
                const uri = vscode.Uri.file(filePath);
                const document = await vscode.workspace.openTextDocument(uri);
                const position = new vscode.Position(line - 1, 0);
                await vscode.window.showTextDocument(document, {
                    selection: new vscode.Selection(position, position),
                });
            }
            else if (message.command === 'exportToSvg') {
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
        }, undefined, context.subscriptions);
    });
    context.subscriptions.push(disposable);
    console.log('Labnote Diagram Viewer is now active and command is registered!');
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map