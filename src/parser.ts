import * as fs from 'fs';
import * as path from 'path';

export function parseWorkflowsFromReadme(filePath: string): string[] {
  console.log(`[Parser] Starting to parse README: ${filePath}`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const workflowStart = '<!-- WORKFLOW_LIST_START -->';
    const workflowEnd = '<!-- WORKFLOW_LIST_END -->';
    const startIndex = content.indexOf(workflowStart);
    const endIndex = content.indexOf(workflowEnd);

    if (startIndex === -1 || endIndex === -1) {
      console.warn('[Parser] Workflow markers not found in README.md');
      return [];
    }

    const list = content.slice(startIndex + workflowStart.length, endIndex).trim();
    const links = [...list.matchAll(/\[.*?\]\((.*?)\)/g)];

    return links.map(match => {
      const relativePath = match[1];
      const resolvedPath = path.resolve(path.dirname(filePath), relativePath);
      console.log(`[Parser] Found workflow link: ${relativePath} -> Resolved to: ${resolvedPath}`);
      return resolvedPath;
    });
  } catch (err) {
    console.error(`[Parser] Error reading or parsing README file: ${filePath}`, err);
    return [];
  }
}

export function parseUnitOperationsFromWorkflow(filePath: string): string[] {
  console.log(`[Parser] Parsing unit operations from: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[Parser] Workflow file not found: ${filePath}`);
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const start = '<!-- UNITOPERATION_LIST_START -->';
    const end = '<!-- UNITOPERATION_LIST_END -->';
    const startIndex = content.indexOf(start);
    const endIndex = content.indexOf(end);

    if (startIndex === -1 || endIndex === -1) {
      console.warn(`[Parser] Unit operation markers not found in: ${filePath}`);
      return [];
    }

    const list = content.slice(startIndex + start.length, endIndex).trim();
    const lines = list.split('\n').map(line => line.trim());

    const operations = lines
      .filter(line => line.startsWith('['))
      .map(line => {
        const match = line.match(/\[(.*?)\](.*)/);
        return match ? `${match[1].trim()} ${match[2].trim()}` : '';
      })
      .filter(Boolean);
    
    console.log(`[Parser] Found ${operations.length} operations in ${filePath}`);
    return operations;
  } catch(err) {
    console.error(`[Parser] Error reading or parsing workflow file: ${filePath}`, err);
    return [];
  }
}
