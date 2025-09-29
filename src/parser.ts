import * as fs from 'fs/promises';
import * as path from 'path';
import { Experiment, Workflow, UnitOperation } from './types';

async function parseYamlFrontMatter(content: string): Promise<{ [key: string]: any }> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return {};

  const frontMatter = match[1];
  const lines = frontMatter.split('\n');
  const data: { [key: string]: any } = {};
  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join(':').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      data[key] = value;
    }
  });
  return data;
}

export async function parseWorkflow(workflowPath: string): Promise<Workflow> {
  console.log(`[Parser] Parsing workflow: ${workflowPath}`);
  try {
    const content = await fs.readFile(workflowPath, 'utf8');
    const frontMatter = await parseYamlFrontMatter(content);
    const title = frontMatter.title || path.basename(workflowPath, '.md');
    
    let dbtl: 'D' | 'B' | 'T' | 'L' | undefined;
    const upperTitle = title.toUpperCase();
    if (upperTitle.includes('WD')) dbtl = 'D';
    else if (upperTitle.includes('WB')) dbtl = 'B';
    else if (upperTitle.includes('WT')) dbtl = 'T';
    else if (upperTitle.includes('WL')) dbtl = 'L';

    const unitOperations: UnitOperation[] = [];
    const lines = content.split('\n');
    // ### [ID Name] 형식을 더 명확하게 파싱하기 위한 최종 정규식
    // ID(영문/숫자)와 Name(모든 문자) 사이에 반드시 하나 이상의 공백이 오도록 강제합니다.
    const opRegex = /^###\s*\[([A-Z0-9]+)\s+([^\]]+)\]/;

    lines.forEach((line, index) => {
      const match = line.match(opRegex);
      if (match) {
        unitOperations.push({
          id: match[1],
          name: match[2].trim(),
          filePath: workflowPath,
          line: index + 1,
        });
      }
    });

    return {
      title,
      filePath: workflowPath,
      dbtl,
      unitOperations,
    };
  } catch (err: any) {
    console.error(`[Parser] Error parsing workflow file: ${workflowPath}`, err);
    throw new Error(`Failed to parse workflow file: ${path.basename(workflowPath)}`);
  }
}

export async function parseExperiment(readmePath: string): Promise<Experiment> {
  console.log(`[Parser] Starting to parse experiment from README: ${readmePath}`);
  try {
    const content = await fs.readFile(readmePath, 'utf8');
    const frontMatter = await parseYamlFrontMatter(content);
    const title = frontMatter.title || 'Experiment';

    const linkRegex = /\[.*?\]\((.*?\.md)\)/g;
    const workflowLinks = [...content.matchAll(linkRegex)];

    if (workflowLinks.length === 0) {
      console.warn('[Parser] No workflow links found in README.');
      return { title, workflows: [] };
    }

    const readmeDir = path.dirname(readmePath);
    const workflowPromises = workflowLinks.map(match => {
      const relativePath = match[1];
      const fullPath = path.resolve(readmeDir, relativePath);
      console.log(`[Parser] Found workflow link: ${relativePath} -> Resolved to: ${fullPath}`);
      return parseWorkflow(fullPath);
    });

    const workflows = await Promise.all(workflowPromises);

    return {
      title,
      workflows,
    };
  } catch (err: any)    {
    console.error(`[Parser] Error parsing experiment from README: ${readmePath}`, err);
    throw new Error('Failed to parse experiment from README.md');
  }
}
