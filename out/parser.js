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
exports.parseUnitOperationsFromWorkflow = exports.parseWorkflowsFromReadme = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function parseWorkflowsFromReadme(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const workflowStart = '<!-- WORKFLOW_LIST_START -->';
    const workflowEnd = '<!-- WORKFLOW_LIST_END -->';
    const startIndex = content.indexOf(workflowStart);
    const endIndex = content.indexOf(workflowEnd);
    if (startIndex === -1 || endIndex === -1) {
        console.warn('Workflow markers not found in README.md');
        return [];
    }
    const list = content.slice(startIndex + workflowStart.length, endIndex).trim();
    const links = [...list.matchAll(/\[.*?\]\((.*?)\)/g)];
    return links.map(match => {
        const relativePath = match[1];
        return path.resolve(path.dirname(filePath), relativePath);
    });
}
exports.parseWorkflowsFromReadme = parseWorkflowsFromReadme;
function parseUnitOperationsFromWorkflow(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`Workflow file not found: ${filePath}`);
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const start = '<!-- UNITOPERATION_LIST_START -->';
    const end = '<!-- UNITOPERATION_LIST_END -->';
    const startIndex = content.indexOf(start);
    const endIndex = content.indexOf(end);
    if (startIndex === -1 || endIndex === -1) {
        console.warn(`Unit operation markers not found in: ${filePath}`);
        return [];
    }
    const list = content.slice(startIndex + start.length, endIndex).trim();
    const lines = list.split('\n').map(line => line.trim());
    return lines
        .filter(line => line.startsWith('['))
        .map(line => {
        const match = line.match(/\[(.*?)\](.*)/);
        return match ? `${match[1].trim()} ${match[2].trim()}` : '';
    })
        .filter(Boolean);
}
exports.parseUnitOperationsFromWorkflow = parseUnitOperationsFromWorkflow;
//# sourceMappingURL=parser.js.map