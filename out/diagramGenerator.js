"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMermaidDiagram = void 0;
function generateMermaidDiagram(workflows) {
    let mermaid = 'graph TD\n'; // Top-down 그래프
    let lastOpIdOfPreviousWf = null; // 이전 워크플로우의 '마지막 작업 ID'를 추적
    workflows.forEach((wf, wfIdx) => {
        const wfId = `WF_${wfIdx}`;
        mermaid += `  subgraph ${wfId} ["${wf.name}"]\n`; // 각 워크플로우를 서브그래프로 정의
        mermaid += '    direction LR\n'; // 서브그래프 내의 방향을 LR(Left to Right)로 설정
        let previousOpIdInCurrentWf = null; // 현재 워크플로우 내의 '이전 작업 ID'
        if (wf.ops.length === 0) {
            // 이 워크플로우에 작업(op)이 없는 경우, 플레이스홀더 노드 생성
            const placeholderId = `OP_${wfIdx}_placeholder`;
            mermaid += `    ${placeholderId}["(작업 없음)"]\n`;
            previousOpIdInCurrentWf = placeholderId;
            // 작업이 없더라도, 이전 워크플로우와 이 플레이스홀더를 연결
            if (lastOpIdOfPreviousWf) {
                mermaid += `  ${lastOpIdOfPreviousWf} --> ${placeholderId}\n`;
            }
        }
        else {
            // 작업 목록 순회
            wf.ops.forEach((op, opIdx) => {
                const opId = `OP_${wfIdx}_${opIdx}`;
                mermaid += `    ${opId}["${op}"]\n`; // 작업 노드 정의
                if (opIdx === 0) {
                    // 이 노드가 워크플로우의 '첫 번째' 작업인 경우
                    if (lastOpIdOfPreviousWf) {
                        // '이전 워크플로우의 마지막 작업'과 연결
                        mermaid += `  ${lastOpIdOfPreviousWf} --> ${opId}\n`;
                    }
                }
                else {
                    // 첫 번째 작업이 아닌 경우, '현재 워크플로우의 이전 작업'과 연결
                    mermaid += `    ${previousOpIdInCurrentWf} --> ${opId}\n`;
                }
                previousOpIdInCurrentWf = opId; // 다음 순회를 위해 현재 작업 ID를 '이전 ID'로 업데이트
            });
        }
        // 현재 워크플로우의 '마지막 작업 ID'를 전체 추적 변수에 저장 (다음 워크플로우 연결용)
        lastOpIdOfPreviousWf = previousOpIdInCurrentWf;
        mermaid += '  end\n\n';
    });
    return mermaid;
}
exports.generateMermaidDiagram = generateMermaidDiagram;
//# sourceMappingURL=diagramGenerator.js.map