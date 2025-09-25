import { Experiment } from './types';

/**
 * Mermaid.js 노드 텍스트에 사용될 문자열을 안전하게 이스케이프 처리합니다.
 * @param text 이스케이프할 원본 텍스트
 * @returns 이스케이프 처리된 텍스트
 */
function sanitizeForMermaid(text: string): string {
  // 큰따옴표를 HTML 엔티티로 변환하여 Mermaid 파싱 오류를 방지합니다.
  return text.replace(/"/g, '#quot;');
}

export function generateDiagramHtml(experiment: Experiment): string {
  let mermaidCode = 'graph TD\n';
  mermaidCode += '  classDef default fill:#222,stroke:#fff,stroke-width:2px,color:#fff;\n';
  mermaidCode += '  classDef workflow fill:#003,stroke:#0af,stroke-width:2px,color:#fff;\n';

  let lastNodeIdOfPreviousWf: string | null = null;

  experiment.workflows.forEach((workflow, wfIndex) => {
    const workflowNodeId = `wf${wfIndex}`;
    const safeDisplayTitle = sanitizeForMermaid(workflow.title);
    // Mermaid v10+에서는 subgraph ID와 제목을 모두 따옴표로 묶어야 합니다.
    mermaidCode += `  subgraph "${workflowNodeId}[${safeDisplayTitle}]"\n`;
    mermaidCode += `    direction LR\n`;

    const safeFilePath = workflow.filePath.replace(/\\/g, '\\\\');
    let firstNodeIdInCurrentWf: string | null = null;
    let lastNodeIdInCurrentWf: string | null = null;

    if (workflow.unitOperations.length === 0) {
      const placeholderId = `${workflowNodeId}_placeholder`;
      const navData = JSON.stringify({ filePath: safeFilePath, line: 1 });
      // Base64 인코딩을 사용하여 특수문자 문제를 회피합니다.
      const safeNavData = Buffer.from(navData).toString('base64');
      mermaidCode += `    ${placeholderId}["(No operations)"]:::default\n`;
      mermaidCode += `    click ${placeholderId} call navigateTo('${safeNavData}')\n`;
      firstNodeIdInCurrentWf = placeholderId;
      lastNodeIdInCurrentWf = placeholderId;
    } else {
      workflow.unitOperations.forEach((op, opIndex) => {
        const opId = `${workflowNodeId}_op${opIndex}`;
        const opSafeFilePath = op.filePath.replace(/\\/g, '\\\\');
        const navData = JSON.stringify({ filePath: opSafeFilePath, line: op.line });
        // Base64 인코딩을 사용하여 특수문자 문제를 회피합니다.
        const safeNavData = Buffer.from(navData).toString('base64');
        mermaidCode += `    ${opId}["${sanitizeForMermaid(op.id)}<br/>${sanitizeForMermaid(op.name)}"]\n`;
        mermaidCode += `    click ${opId} call navigateTo('${safeNavData}')\n`;
        if (opIndex === 0) {
          firstNodeIdInCurrentWf = opId;
        }
        if (opIndex === workflow.unitOperations.length - 1) {
          lastNodeIdInCurrentWf = opId;
        }
      });

      for (let i = 0; i < workflow.unitOperations.length - 1; i++) {
        mermaidCode += `    ${workflowNodeId}_op${i} --> ${workflowNodeId}_op${i + 1}\n`;
      }
    }

    mermaidCode += `  end\n`;

    if (lastNodeIdOfPreviousWf && firstNodeIdInCurrentWf) {
      mermaidCode += `  ${lastNodeIdOfPreviousWf} --> ${firstNodeIdInCurrentWf}\n`;
    }

    lastNodeIdOfPreviousWf = lastNodeIdInCurrentWf;
  });

  return `<div class="mermaid">${mermaidCode}</div>`;
}