// webview/main.js
(function () {
  const vscode = acquireVsCodeApi();
  const state = {
    workflows: [],
  };

  // --- 유틸리티 함수들 ---
  function navigateTo(base64Data) {
    try {
      const decodedUtf8String = decodeURIComponent(atob(base64Data).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const navData = JSON.parse(decodedUtf8String);
      vscode.postMessage({ command: 'navigateTo', ...navData });
    } catch (e) {
      console.error('Failed to parse navigation data:', e, "Input:", base64Data);
    }
  }

  // --- 이벤트 핸들러 ---
  function handleDbtlButtonClick(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const clickedCycle = btn.dataset.cycle;
    const wfIndex = parseInt(btn.closest('.workflow-group').dataset.wfIndex, 10);
    const wfState = state.workflows[wfIndex];

    wfState.selectedCycle = (wfState.selectedCycle === clickedCycle) ? null : clickedCycle;

    const buttonsInGroup = document.querySelectorAll(`#dbtl-cell-${wfIndex} .dbtl-btn`);
    buttonsInGroup.forEach(b => {
      if (!wfState.selectedCycle) {
        b.style.display = 'inline-block';
        b.classList.remove('selected');
      } else {
        b.style.display = (b.dataset.cycle === wfState.selectedCycle) ? 'inline-block' : 'none';
        if (b.dataset.cycle === wfState.selectedCycle) b.classList.add('selected');
      }
    });
    layoutAndDraw();
  }

  // --- 핵심 로직: 레이아웃 계산과 그리기 ---

  /**
   * DOM을 직접 읽지 않고, 계산된 레이아웃 정보를 기반으로 화살표를 그립니다.
   * 이로 인해 렌더링 타이밍 문제에서 자유로워집니다.
   */
  function drawArrows(layoutData) {
    const svg = document.getElementById('arrow-svg-container');
    if (!svg) return;
    svg.innerHTML = ''; 

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

    // 수평 화살표 (Unit Operation 간)
    layoutData.forEach(wfLayout => {
      for (let i = 0; i < wfLayout.ops.length - 1; i++) {
        const sourceOp = wfLayout.ops[i];
        const targetOp = wfLayout.ops[i + 1];
        
        const startX = wfLayout.opsCellX + sourceOp.x + sourceOp.width;
        const startY = wfLayout.opsCellY + wfLayout.opsHeight / 2;
        const endX = wfLayout.opsCellX + targetOp.x;

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', `M ${startX} ${startY} H ${endX}`);
        pathEl.setAttribute('stroke', '#aaa');
        pathEl.setAttribute('stroke-width', '2');
        pathEl.setAttribute('fill', 'none');
        pathEl.setAttribute('marker-end', 'url(#arrowhead)');
        svg.appendChild(pathEl);
      }
    });
    
    // 수직 화살표 (Workflow 간)
    for (let i = 0; i < layoutData.length - 1; i++) {
      const sourceWf = layoutData[i];
      const targetWf = layoutData[i + 1];

      if (sourceWf.ops.length === 0 || targetWf.ops.length === 0) continue;

      const sourceOp = sourceWf.ops[sourceWf.ops.length - 1];
      const targetOp = targetWf.ops[0];

      const startX = sourceWf.opsCellX + sourceOp.x + sourceOp.width / 2;
      const startY = sourceWf.y + sourceWf.rowHeight;
      const endX = targetWf.opsCellX + targetOp.x + targetOp.width / 2;
      const endY = targetWf.y;

      const midY = startY + (endY - startY) / 2;
      const pathData = `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`;
      
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', pathData);
      pathEl.setAttribute('stroke', '#aaa');
      pathEl.setAttribute('stroke-width', '2');
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('marker-end', 'url(#arrowhead)');
      svg.appendChild(pathEl);
    }
  }

  /**
   * 모든 요소의 위치를 계산하고, 이 정보를 기반으로 DOM을 업데이트하며,
   * 화살표를 그릴 레이아웃 데이터를 생성합니다.
   */
  function layoutAndDraw() {
    const PADDING = 20;
    const DBTL_LABEL_WIDTH = 40;
    const DBTL_CELL_WIDTH = 50;
    const WORKFLOW_CELL_WIDTH = 270;
    const VERTICAL_GAP = 40;
    let currentY = PADDING;

    const hasAnySelection = state.workflows.some(wf => wf.selectedCycle);
    const layoutData = [];

    // 1. 레이아웃 정보 계산 및 DOM 위치 설정
    state.workflows.forEach(wf => {
      const groupEl = document.getElementById(`wf-group-${wf.index}`);
      groupEl.style.display = 'block';

      const dbtlCell = document.getElementById(`dbtl-cell-${wf.index}`);
      const titleCell = document.getElementById(`wf-title-${wf.index}`);
      const opsCell = document.getElementById(`ops-cell-${wf.index}`);
      
      const titleHeight = titleCell.offsetHeight;
      const opsHeight = opsCell.offsetHeight;
      const rowHeight = Math.max(titleHeight, opsHeight);

      const leftPos = hasAnySelection ? PADDING + DBTL_LABEL_WIDTH : PADDING;
      
      dbtlCell.style.top = `${currentY + (rowHeight / 2) - (dbtlCell.offsetHeight / 2)}px`;
      dbtlCell.style.left = `${leftPos}px`;
      
      titleCell.style.top = `${currentY}px`;
      titleCell.style.left = `${leftPos + DBTL_CELL_WIDTH}px`;
      
      const opsCellX = leftPos + DBTL_CELL_WIDTH + WORKFLOW_CELL_WIDTH;
      const opsCellY = currentY + (rowHeight / 2) - (opsHeight / 2);
      opsCell.style.top = `${opsCellY}px`;
      opsCell.style.left = `${opsCellX}px`;

      // 2. 화살표 그리기를 위한 레이아웃 데이터 저장
      const wfLayout = {
        index: wf.index,
        y: currentY,
        rowHeight: rowHeight,
        opsCellX: opsCellX,
        opsCellY: opsCellY,
        opsHeight: opsHeight,
        ops: [],
      };
      opsCell.querySelectorAll('.unit-operation-node').forEach(opNode => {
        wfLayout.ops.push({
          x: opNode.offsetLeft,
          width: opNode.offsetWidth,
        });
      });
      layoutData.push(wfLayout);

      currentY += rowHeight + VERTICAL_GAP;
    });

    const containerHeight = `${currentY}px`;
    document.getElementById('diagram-container').style.height = containerHeight;
    document.getElementById('arrow-svg-container').style.height = containerHeight;
    
    // 3. 계산된 정보를 바탕으로 라벨 및 화살표 그리기
    updateDbtlCycleLabels(layoutData, PADDING, hasAnySelection);
    requestAnimationFrame(() => drawArrows(layoutData));
  }

  function updateDbtlCycleLabels(layoutData, PADDING, hasAnySelection) {
    ['D', 'B', 'T', 'L'].forEach(cycle => {
        const labelEl = document.getElementById(`dbtl-label-${cycle}`);
        if (labelEl) labelEl.style.display = 'none';
    });
    if (!hasAnySelection) return;

    const cycleGroups = {};
    layoutData.forEach(wfLayout => {
        const wfState = state.workflows[wfLayout.index];
        if (wfState.selectedCycle) {
            if (!cycleGroups[wfState.selectedCycle]) {
                cycleGroups[wfState.selectedCycle] = [];
            }
            cycleGroups[wfState.selectedCycle].push(wfLayout);
        }
    });

    for (const cycle in cycleGroups) {
        const labelEl = document.getElementById(`dbtl-label-${cycle}`);
        const firstWfInGroup = cycleGroups[cycle][0];
        if (labelEl) {
            labelEl.style.display = 'block';
            labelEl.style.left = `${PADDING}px`;
            labelEl.style.top = `${firstWfInGroup.y + firstWfInGroup.rowHeight / 2 - labelEl.offsetHeight / 2}px`;
        }
    }
  }

  // --- 초기화 ---
  document.addEventListener('DOMContentLoaded', () => {
    state.workflows = [];
    document.querySelectorAll('.workflow-group').forEach((group) => {
      const index = parseInt(group.dataset.wfIndex, 10);
      state.workflows[index] = { index: index, selectedCycle: null };
    });

    document.querySelectorAll('[data-nav]').forEach(node => {
      node.addEventListener('click', (e) => navigateTo(node.getAttribute('data-nav')));
    });

    document.querySelectorAll('.dbtl-btn').forEach(btn => {
      btn.addEventListener('click', handleDbtlButtonClick);
      btn.style.display = 'inline-block'; 
    });
    
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        const captureArea = document.getElementById('capture-area');
        if (captureArea && typeof html2canvas !== 'undefined') {
          
          // 캡처할 요소의 실제 크기를 옵션으로 전달하여 잘림 문제 해결
          const options = {
            width: captureArea.scrollWidth,
            height: captureArea.scrollHeight,
            backgroundColor: getComputedStyle(document.body).backgroundColor,
            logging: false,
            useCORS: true,
          };

          html2canvas(captureArea, options).then(canvas => {
            const pngData = canvas.toDataURL('image/png');
            vscode.postMessage({ command: 'exportToPng', data: pngData });
          });
        }
      });
    }

    setTimeout(layoutAndDraw, 200); // 초기 렌더링을 위한 충분한 시간 확보
    window.addEventListener('resize', layoutAndDraw);
  });
}());