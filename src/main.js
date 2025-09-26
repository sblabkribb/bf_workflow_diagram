// webview/main.js
(function () {
  const vscode = acquireVsCodeApi();
  const state = {
    // 각 워크플로우의 상태(선택된 DBTL 사이클)를 저장합니다.
    workflows: [],
  };

  /**
   * Base64 데이터를 디코딩하여 VS Code 에디터에서 해당 파일 및 라인으로 이동합니다.
   * @param {string} base64Data - 이동할 위치 정보가 인코딩된 문자열
   */
  function navigateTo(base64Data) {
    try {
      const decodedUtf8String = decodeURIComponent(atob(base64Data).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const navData = JSON.parse(decodedUtf8String);
      vscode.postMessage({ command: 'navigateTo', ...navData });
    } catch (e) {
      console.error('Failed to parse navigation data:', e, "Input:", base64Data);
    }
  }

  /**
   * DBTL 버튼 클릭을 처리하는 함수입니다.
   * 전역 필터링 대신, 해당 워크플로우의 상태만 변경합니다.
   * @param {Event} e - 클릭 이벤트 객체
   */
  function handleDbtlButtonClick(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const clickedCycle = btn.dataset.cycle;
    const wfIndex = parseInt(btn.closest('.workflow-group').dataset.wfIndex, 10);
    const wfState = state.workflows[wfIndex];

    // 같은 버튼을 다시 클릭하면 선택 해제(null), 다른 버튼을 클릭하면 상태 변경
    if (wfState.selectedCycle === clickedCycle) {
      wfState.selectedCycle = null;
    } else {
      wfState.selectedCycle = clickedCycle;
    }

    // 클릭된 워크플로우 행의 버튼들의 표시 상태만 업데이트합니다.
    const buttonsInGroup = document.querySelectorAll(`#dbtl-cell-${wfIndex} .dbtl-btn`);
    buttonsInGroup.forEach(b => {
      if (wfState.selectedCycle === null) {
        // 선택이 해제되면 모든 버튼을 다시 보여줍니다.
        b.style.display = 'inline-block';
        b.classList.remove('selected');
      } else {
        // 특정 사이클이 선택되면, 해당 버튼만 보여주고 나머지는 숨깁니다.
        if (b.dataset.cycle === wfState.selectedCycle) {
          b.style.display = 'inline-block';
          b.classList.add('selected');
        } else {
          b.style.display = 'none';
        }
      }
    });

    // 레이아웃과 화살표를 다시 계산합니다 (측면 DBTL 라벨 위치 조정을 위해 필요).
    layoutAndDraw();
  }

  /**
   * 워크플로우들의 시각적 레이아웃을 계산하고 DOM에 적용합니다.
   * 이제 필터링 없이 항상 모든 워크플로우를 표시합니다.
   */
  function layoutAndDraw() {
    const PADDING = 20;
    const DBTL_LABEL_WIDTH = 40;
    const DBTL_CELL_WIDTH = 50;
    const WORKFLOW_CELL_WIDTH = 270;
    const VERTICAL_GAP = 40;
    let currentY = PADDING;

    // DBTL 사이클이 하나라도 선택되었는지 확인합니다.
    const hasAnySelection = state.workflows.some(wf => wf.selectedCycle);

    // 측면 DBTL 라벨('D', 'B', 'T', 'L')을 표시할지 결정하고 위치를 업데이트합니다.
    updateDbtlCycleLabels(state.workflows, PADDING, hasAnySelection);

    // 모든 워크플로우에 대해 위치를 계산합니다.
    state.workflows.forEach(wf => {
      const groupEl = document.getElementById(`wf-group-${wf.index}`);
      groupEl.style.display = 'block'; // 항상 보이도록 설정

      const dbtlCell = document.getElementById(`dbtl-cell-${wf.index}`);
      const titleCell = document.getElementById(`wf-title-${wf.index}`);
      const opsCell = document.getElementById(`ops-cell-${wf.index}`);
      
      const titleHeight = titleCell.offsetHeight;
      const opsHeight = opsCell.offsetHeight;
      const rowHeight = Math.max(titleHeight, opsHeight);

      // 측면 라벨이 표시될 공간이 필요한지 여부에 따라 시작 X 위치를 조정합니다.
      const leftPos = hasAnySelection ? PADDING + DBTL_LABEL_WIDTH : PADDING;
      
      dbtlCell.style.top = `${currentY + (rowHeight / 2) - (dbtlCell.offsetHeight / 2)}px`;
      dbtlCell.style.left = `${leftPos}px`;

      titleCell.style.top = `${currentY}px`;
      titleCell.style.left = `${leftPos + DBTL_CELL_WIDTH}px`;
      
      opsCell.style.top = `${currentY + (rowHeight / 2) - (opsHeight / 2)}px`;
      opsCell.style.left = `${leftPos + DBTL_CELL_WIDTH + WORKFLOW_CELL_WIDTH}px`;

      currentY += rowHeight + VERTICAL_GAP;
    });

    // 컨테이너 높이를 재조정합니다.
    const containerHeight = `${currentY}px`;
    document.getElementById('diagram-container').style.height = containerHeight;
    document.getElementById('arrow-svg-container').style.height = containerHeight;

    // 레이아웃 배치 후 화살표를 다시 그립니다.
    requestAnimationFrame(() => drawArrows(state.workflows));
  }

  /**
   * 선택된 DBTL 사이클에 따라 측면의 큰 라벨을 표시하고 정렬합니다.
   * @param {Array} allWorkflows - 모든 워크플로우 목록
   * @param {number} PADDING - 다이어그램의 좌측 패딩
   * @param {boolean} hasAnySelection - 선택된 DBTL이 하나라도 있는지 여부
   */
  function updateDbtlCycleLabels(allWorkflows, PADDING, hasAnySelection) {
    const cycleGroups = {};

    // 먼저 모든 라벨을 숨깁니다.
    ['D', 'B', 'T', 'L'].forEach(cycle => {
      const labelEl = document.getElementById(`dbtl-label-${cycle}`);
      if (labelEl) labelEl.style.display = 'none';
    });
    
    // 선택된 DBTL이 없으면 함수를 종료합니다.
    if (!hasAnySelection) return;

    // 워크플로우를 선택된 사이클별로 그룹화합니다.
    allWorkflows.forEach(wf => {
      if (wf.selectedCycle) {
        if (!cycleGroups[wf.selectedCycle]) {
          cycleGroups[wf.selectedCycle] = [];
        }
        cycleGroups[wf.selectedCycle].push(wf.index);
      }
    });

    // 각 그룹의 첫 번째 워크플로우에 맞춰 라벨을 표시하고 위치를 조정합니다.
    for (const cycle in cycleGroups) {
      const labelEl = document.getElementById(`dbtl-label-${cycle}`);
      const firstWfInGroupIndex = cycleGroups[cycle][0];
      const firstWfTitle = document.getElementById(`wf-title-${firstWfInGroupIndex}`);
      
      if (labelEl && firstWfTitle) {
        labelEl.style.display = 'block';
        labelEl.style.left = `${PADDING}px`;
        labelEl.style.top = `${firstWfTitle.offsetTop + firstWfTitle.offsetHeight / 2 - labelEl.offsetHeight / 2}px`;
      }
    }
  }


  /**
   * 워크플로우와 유닛 오퍼레이션들을 연결하는 화살표 SVG를 생성합니다.
   * @param {Array} allWorkflows - 모든 워크플로우 목록
   */
  function drawArrows(allWorkflows) {
    const svg = document.getElementById('arrow-svg-container');
    if (!svg) return;
    svg.innerHTML = ''; // 이전 화살표 모두 삭제

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('fill', '#aaa');
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);

    const containerRect = document.getElementById('diagram-container').getBoundingClientRect();

    // Unit Operation 간의 수평 화살표
    allWorkflows.forEach(wf => {
      const opsInWf = document.querySelectorAll(`#ops-cell-${wf.index} .unit-operation-node`);
      for (let i = 0; i < opsInWf.length - 1; i++) {
        const sourceEl = opsInWf[i];
        const targetEl = opsInWf[i + 1];
        
        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        const startX = sourceRect.right - containerRect.left;
        const startY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
        const endX = targetRect.left - containerRect.left;

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', `M ${startX} ${startY} H ${endX}`);
        pathEl.setAttribute('stroke', '#aaa');
        pathEl.setAttribute('stroke-width', '2');
        pathEl.setAttribute('fill', 'none');
        pathEl.setAttribute('marker-end', 'url(#arrowhead)');
        svg.appendChild(pathEl);
      }
    });
    
    // Workflow 간의 수직 화살표
    for (let i = 0; i < allWorkflows.length - 1; i++) {
      const sourceWf = allWorkflows[i];
      const targetWf = allWorkflows[i + 1];

      const sourceOps = document.querySelectorAll(`#ops-cell-${sourceWf.index} .unit-operation-node`);
      const targetOps = document.querySelectorAll(`#ops-cell-${targetWf.index} .unit-operation-node`);
      
      if (sourceOps.length === 0 || targetOps.length === 0) continue;

      const sourceEl = sourceOps[sourceOps.length - 1];
      const targetEl = targetOps[0];

      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      
      const startX = sourceRect.left + sourceRect.width / 2 - containerRect.left;
      const startY = sourceRect.bottom - containerRect.top;
      const endX = targetRect.left + targetRect.width / 2 - containerRect.left;
      const endY = targetRect.top - containerRect.top;
      
      const pathData = `M ${startX} ${startY} V ${startY + 20} H ${endX} V ${endY}`;
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', pathData);
      pathEl.setAttribute('stroke', '#aaa');
      pathEl.setAttribute('stroke-width', '2');
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('marker-end', 'url(#arrowhead)');
      svg.appendChild(pathEl);
    }
  }
  
  // DOM 로드 후 실행
  document.addEventListener('DOMContentLoaded', () => {
    // 1. 초기 상태 데이터 수집
    document.querySelectorAll('.workflow-group').forEach((group) => {
      const index = parseInt(group.dataset.wfIndex, 10);
      state.workflows[index] = { index: index, selectedCycle: null };
    });

    // 2. 이벤트 리스너 설정
    document.querySelectorAll('[data-nav]').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateTo(node.getAttribute('data-nav'));
      });
    });

    // DBTL 버튼에 새로운 핸들러 연결
    document.querySelectorAll('.dbtl-btn').forEach(btn => {
      btn.addEventListener('click', handleDbtlButtonClick);
      // 버튼의 기본 표시 속성을 inline-block으로 설정
      btn.style.display = 'inline-block'; 
    });
    
    // 3. PNG 내보내기 버튼 이벤트
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            const diagramContainer = document.getElementById('diagram-container');
            if (diagramContainer && typeof html2canvas !== 'undefined') {
                document.getElementById('arrow-svg-container').style.zIndex = 1;
                html2canvas(diagramContainer, {
                    backgroundColor: getComputedStyle(document.body).backgroundColor,
                    onclone: (clonedDoc) => {
                        const svgInClone = clonedDoc.getElementById('arrow-svg-container');
                        if(svgInClone) svgInClone.style.zIndex = 1;
                    }
                }).then(canvas => {
                    const pngData = canvas.toDataURL('image/png');
                    vscode.postMessage({ command: 'exportToPng', data: pngData });
                    document.getElementById('arrow-svg-container').style.zIndex = -1;
                });
            }
        });
    }

    setTimeout(layoutAndDraw, 100);
    window.addEventListener('resize', layoutAndDraw);
  });
}());