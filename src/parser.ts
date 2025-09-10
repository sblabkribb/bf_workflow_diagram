import * as fs from 'fs/promises';
import * as path from 'path';

export async function parseWorkflowsFromReadme(filePath: string): Promise<string[]> {
  console.log(`[Parser] Starting to parse README: ${filePath}`);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const workflowStart = '<!-- WORKFLOW_LIST_START -->';
    const workflowEnd = '<!-- WORKFLOW_LIST_END -->';
    const startIndex = content.indexOf(workflowStart);
    const endIndex = content.indexOf(workflowEnd);

    let listContent = content; // 기본적으로 전체 콘텐츠를 사용

    if (startIndex !== -1 && endIndex !== -1) {
      // 마커가 존재하면, 해당 부분만 잘라내서 사용
      console.log('[Parser] Workflow markers found. Parsing content between them.');
      listContent = content.slice(startIndex + workflowStart.length, endIndex).trim();
    } else {
      console.warn('[Parser] Workflow markers not found. Parsing all links in the file as a fallback.');
    }

    const links = [...listContent.matchAll(/\[.*?\]\((.*?)\)/g)];

    if (links.length === 0) {
      console.warn('[Parser] No workflow links found.');
      return [];
    }

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

export async function parseUnitOperationsFromWorkflow(filePath: string): Promise<string[]> {
  console.log(`[Parser] Parsing unit operations from: ${filePath}`);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const startMarker = '<!-- UNITOPERATION_LIST_START -->';
    const endMarker = '<!-- UNITOPERATION_LIST_END -->';
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    let listContent = content; // 기본적으로 전체 콘텐츠를 사용

    if (startIndex !== -1 && endIndex !== -1) {
      // 마커가 존재하면, 해당 부분만 잘라내서 사용
      console.log('[Parser] Unit operation markers found. Parsing content between them.');
      listContent = content.slice(startIndex + startMarker.length, endIndex).trim();
    } else {
      console.warn(`[Parser] Unit operation markers not found in ${path.basename(filePath)}. Parsing all list items in the file as a fallback.`);
    }

    const lines = listContent.split('\n').map(line => line.trim());

    const operations = lines
      .filter(line => line.match(/^\s*-\s*\[/))
      .map(line => {
        const match = line.match(/\[(.*?)\](.*)/);
        return match ? `${match[1].trim()} ${match[2].trim()}` : '';
      })
      .filter(Boolean);
    
    console.log(`[Parser] Found ${operations.length} operations in ${filePath}`);
    return operations;
  } catch(err: any) {
    if (err.code === 'ENOENT') {
      console.warn(`[Parser] Workflow file not found: ${filePath}`);
    } else {
      console.error(`[Parser] Error reading or parsing workflow file: ${filePath}`, err);
    }
    return [];
  }
}
