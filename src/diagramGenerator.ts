import { Experiment } from './types';

/**
 * HTML에 표시될 텍스트를 안전하게 이스케이프 처리합니다.
 * @param text 이스케이프할 원본 텍스트
 * @returns 이스케이프 처리된 텍스트
 */
function sanitizeForHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function generateDiagramHtml(experiments: Experiment[]): string {
  // 전체 다이어그램을 감싸는 컨테이너
  let html = '<div id="diagram-container" class="diagram-grid-container">\n';

  experiments.forEach((experiment, expIndex) => {
    // 각 실험 그룹을 위한 헤더 추가
    html += `<div class="experiment-header">🔬 ${sanitizeForHtml(experiment.title)}</div>\n`;
    
    experiment.workflows.forEach((workflow, wfIndex) => {
      const workflowNavData = Buffer.from(JSON.stringify({ filePath: workflow.filePath, line: 1 })).toString('base64');
      
      // 각 워크플로우가 하나의 행(row)을 구성합니다.
      html += `  <div class="workflow-row">\n`;
      
      // 첫 번째 열: 워크플로우 제목
      html += `    <div class="workflow-title-cell" data-nav="${workflowNavData}">${sanitizeForHtml(workflow.title)}</div>\n`;
      
      // 두 번째 열: 유닛 오퍼레이션들이 가로로 배열되는 공간
      html += `    <div class="unit-operations-cell">\n`;
      if (workflow.unitOperations.length > 0) {
        workflow.unitOperations.forEach((op, opIndex) => {
          const opNavData = Buffer.from(JSON.stringify({ filePath: op.filePath, line: op.line })).toString('base64');
          
          // 각 유닛 오퍼레이션 노드
          html += `        <div class="unit-operation-node" data-nav="${opNavData}">`;
          html += `          <div class="op-id">${sanitizeForHtml(op.id)}</div>`;
          html += `          <div class="op-name">${sanitizeForHtml(op.name)}</div>`;
          html += `        </div>\n`;

          // 마지막 노드가 아닐 경우 오른쪽 화살표 추가
          if (opIndex < workflow.unitOperations.length - 1) {
            html += `        <div class="arrow right"></div>\n`;
          }
        });
      }
      html += `    </div>\n`; // unit-operations-cell 종료
      html += `  </div>\n`; // workflow-row 종료
    });
  });

  html += '</div>\n';
  return html;
}

