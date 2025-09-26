import { Experiment } from './types';

/**
 * Mermaid.js 노드 텍스트에 사용될 문자열을 안전하게 이스케이프 처리합니다.
 * @param text 이스케이프할 원본 텍스트
 * @returns 이스케이프 처리된 텍스트
 */
function sanitizeForMermaid(text: string): string {
  // 큰따옴표를 HTML 엔티티(#quot;)로 변환하여 Mermaid 파싱 오류를 방지합니다.
  return text.replace(/"/g, '#quot;');
}

export function generateDiagramHtml(experiments: Experiment[]): string {
  let mermaidCode = 'graph TD\n'; // 전체 다이어그램 방향은 위에서 아래로(Top Down)
  mermaidCode += '  classDef default fill:#222,stroke:#fff,stroke-width:2px,color:#fff;\n';
  mermaidCode += '  classDef workflow fill:#003,stroke:#0af,stroke-width:2px,color:#fff;\n';
  mermaidCode += '  classDef experiment fill:#303,stroke:#a6f,stroke-width:4px,color:#fff;\n';

  let lastNodeIdOfPreviousExperiment: string | null = null;

  experiments.forEach((experiment, expIndex) => {
    const experimentId = `exp${expIndex}`;
    
    // 실험 제목을 별도의 노드로 만들어 그룹처럼 보이게 합니다.
    mermaidCode += `  subgraph ${experimentId} ["🔬 ${sanitizeForMermaid(experiment.title)}"]\n`;
    mermaidCode += `    direction LR\n`; // 실험 내부는 좌에서 우로(Left Right)

    let lastNodeIdInCurrentExperiment: string | null = null;
    let firstNodeIdOfCurrentExperiment: string | null = null;

    experiment.workflows.forEach((workflow, wfIndex) => {
        const workflowId = `${experimentId}_wf${wfIndex}`;
        // 워크플로우 제목을 노드로 만듭니다.
        mermaidCode += `    ${workflowId}["${sanitizeForMermaid(workflow.title)}"]:::workflow\n`;

        if (lastNodeIdInCurrentExperiment) {
            mermaidCode += `    ${lastNodeIdInCurrentExperiment} --> ${workflowId}\n`;
        } else {
            firstNodeIdOfCurrentExperiment = workflowId;
        }
        
        lastNodeIdInCurrentExperiment = workflowId;

        workflow.unitOperations.forEach((op, opIndex) => {
            const opId = `${workflowId}_op${opIndex}`;
            const opSafeFilePath = op.filePath.replace(/\\/g, '\\\\');
            const navData = JSON.stringify({ filePath: opSafeFilePath, line: op.line });
            const safeNavData = Buffer.from(navData).toString('base64');
            
            // [중요] ID와 Name을 <br/>로 명시적으로 분리합니다.
            const nodeText = `"${sanitizeForMermaid(op.id)}<br/>${sanitizeForMermaid(op.name)}"`;
            mermaidCode += `    ${opId}[${nodeText}]\n`;
            mermaidCode += `    click ${opId} call navigateTo('${safeNavData}')\n`;
            
            // 워크플로우 노드에서 첫 번째 유닛 오퍼레이션으로 연결합니다.
            mermaidCode += `    ${lastNodeIdInCurrentExperiment} --> ${opId}\n`;
            lastNodeIdInCurrentExperiment = opId;
        });
    });

    mermaidCode += `  end\n`; // 실험 subgraph 종료

    // 이전 실험의 마지막 노드와 현재 실험의 첫 노드를 연결합니다.
    if (lastNodeIdOfPreviousExperiment && firstNodeIdOfCurrentExperiment) {
        mermaidCode += `  ${lastNodeIdOfPreviousExperiment} --> ${firstNodeIdOfCurrentExperiment}\n`;
    }

    lastNodeIdOfPreviousExperiment = lastNodeIdInCurrentExperiment;
  });

  return `<div class="mermaid">${mermaidCode}</div>`;
}
