import { Experiment, Workflow } from './types';

/**
 * HTML에 표시될 텍스트를 안전하게 이스케이프 처리합니다.
 * @param text 이스케이프할 원본 텍스트
 * @returns 이스케이프 처리된 텍스트
 */
function sanitizeForHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function generateDiagramHtml(experiments: Experiment[]): string {
  const allWorkflows: Workflow[] = experiments.flatMap(exp => exp.workflows);
  let html = '<div id="diagram-container">\n';

  // DBTL 사이클 제목을 표시할 영역
  html += `
    <div class="dbtl-cycle-label" id="dbtl-label-D" style="display: none;">D</div>
    <div class="dbtl-cycle-label" id="dbtl-label-B" style="display: none;">B</div>
    <div class="dbtl-cycle-label" id="dbtl-label-T" style="display: none;">T</div>
    <div class="dbtl-cycle-label" id="dbtl-label-L" style="display: none;">L</div>
  `;
  
  allWorkflows.forEach((workflow, wfIndex) => {
    const workflowNavData = Buffer.from(JSON.stringify({ filePath: workflow.filePath, line: 1 })).toString('base64');
    
    // 각 워크플로우 요소를 그룹화하는 컨테이너
    html += `<div class="workflow-group" id="wf-group-${wfIndex}" data-wf-index="${wfIndex}">\n`;
    
    // 1열: DBTL 버튼
    html += `    <div class="dbtl-cell" id="dbtl-cell-${wfIndex}">`;
    html += `      <button class="dbtl-btn" data-cycle="D">D</button>`;
    html += `      <button class="dbtl-btn" data-cycle="B">B</button>`;
    html += `      <button class="dbtl-btn" data-cycle="T">T</button>`;
    html += `      <button class="dbtl-btn" data-cycle="L">L</button>`;
    html += `    </div>\n`;

    // 2열: 워크플로우 제목
    html += `    <div class="workflow-title-cell" id="wf-title-${wfIndex}" data-nav="${workflowNavData}">${sanitizeForHtml(workflow.title)}</div>\n`;
    
    // 3열: 유닛 오퍼레이션
    html += `    <div class="unit-operations-cell" id="ops-cell-${wfIndex}">\n`;
    if (workflow.unitOperations.length > 0) {
      workflow.unitOperations.forEach((op, opIndex) => {
        const opNavData = Buffer.from(JSON.stringify({ filePath: op.filePath, line: op.line })).toString('base64');
        html += `        <div class="unit-operation-node" id="op-${wfIndex}-${opIndex}" data-nav="${opNavData}">`;
        html += `          <div class="op-id">${sanitizeForHtml(op.id)}</div>`;
        html += `          <div class="op-name">${sanitizeForHtml(op.name)}</div>`;
        html += `        </div>\n`;
      });
    }
    html += `    </div>\n`;
    html += `</div>\n`;
  });

  html += '</div>\n';
  return html;
}

