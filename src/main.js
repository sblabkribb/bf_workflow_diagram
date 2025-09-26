// bf_workflow_diagram/src/main.js
(function () {
  const vscode = acquireVsCodeApi();
  const state = {
    workflows: [],
  };

  function navigateTo(base64Data) {
    try {
      const decodedUtf8String = decodeURIComponent(atob(base64Data).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const navData = JSON.parse(decodedUtf8String);
      vscode.postMessage({ command: 'navigateTo', ...navData });
    } catch (e) {
      console.error('Failed to parse navigation data:', e, "Input:", base64Data);
    }
  }

  function handleDbtlButtonClick(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const clickedCycle = btn.dataset.cycle;
    const wfIndex = parseInt(btn.closest('.workflow-group').dataset.wfIndex, 10);
    const wfState = state.workflows[wfIndex];

    if (wfState.selectedCycle === clickedCycle) {
      wfState.selectedCycle = null;
    } else {
      wfState.selectedCycle = clickedCycle;
    }

    const buttonsInGroup = document.querySelectorAll(`#dbtl-cell-${wfIndex} .dbtl-btn`);
    buttonsInGroup.forEach(b => {
      if (wfState.selectedCycle === null) {
        b.style.display = 'inline-block';
        b.classList.remove('selected');
      } else {
        if (b.dataset.cycle === wfState.selectedCycle) {
          b.style.display = 'inline-block';
          b.classList.add('selected');
        } else {
          b.style.display = 'none';
        }
      }
    });
    layoutAndDraw();
  }

  function layoutAndDraw() {
    const PADDING = 20;
    const DBTL_LABEL_WIDTH = 40;
    const DBTL_CELL_WIDTH = 50;
    const WORKFLOW_CELL_WIDTH = 270;
    const VERTICAL_GAP = 40;
    let currentY = PADDING;

    const hasAnySelection = state.workflows.some(wf => wf.selectedCycle);
    updateDbtlCycleLabels(state.workflows, PADDING, hasAnySelection);

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
      opsCell.style.top = `${currentY + (rowHeight / 2) - (opsHeight / 2)}px`;
      opsCell.style.left = `${leftPos + DBTL_CELL_WIDTH + WORKFLOW_CELL_WIDTH}px`;

      currentY += rowHeight + VERTICAL_GAP;
    });

    const containerHeight = `${currentY}px`;
    document.getElementById('diagram-container').style.height = containerHeight;
    document.getElementById('arrow-svg-container').style.height = containerHeight;

    requestAnimationFrame(() => drawArrows(state.workflows));
  }

  function updateDbtlCycleLabels(allWorkflows, PADDING, hasAnySelection) {
    const cycleGroups = {};
    ['D', 'B', 'T', 'L'].forEach(cycle => {
      const labelEl = document.getElementById(`dbtl-label-${cycle}`);
      if (labelEl) labelEl.style.display = 'none';
    });
    if (!hasAnySelection) return;

    allWorkflows.forEach(wf => {
      if (wf.selectedCycle) {
        if (!cycleGroups[wf.selectedCycle]) {
          cycleGroups[wf.selectedCycle] = [];
        }
        cycleGroups[wf.selectedCycle].push(wf.index);
      }
    });

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

  function drawArrows(allWorkflows) {
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

    const containerRect = document.getElementById('diagram-container').getBoundingClientRect();

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
    
    // ▼▼▼ 세로 화살표 로직 수정 ▼▼▼
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
      
      // 중간 지점을 이용한 안정적인 경로 계산
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
  
  document.addEventListener('DOMContentLoaded', () => {
    state.workflows = []; // 상태 초기화
    document.querySelectorAll('.workflow-group').forEach((group) => {
      const index = parseInt(group.dataset.wfIndex, 10);
      state.workflows[index] = { index: index, selectedCycle: null };
    });

    document.querySelectorAll('[data-nav]').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateTo(node.getAttribute('data-nav'));
      });
    });

    document.querySelectorAll('.dbtl-btn').forEach(btn => {
      btn.addEventListener('click', handleDbtlButtonClick);
      btn.style.display = 'inline-block'; 
    });
    
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        // ▼▼▼ 캡처 대상을 'capture-area'로 변경 ▼▼▼
        const captureArea = document.getElementById('capture-area');
        if (captureArea && typeof html2canvas !== 'undefined') {
          html2canvas(captureArea, {
            backgroundColor: getComputedStyle(document.body).backgroundColor,
            logging: false // 콘솔 로그 비활성화
          }).then(canvas => {
            const pngData = canvas.toDataURL('image/png');
            vscode.postMessage({ command: 'exportToPng', data: pngData });
          });
        }
      });
    }

    setTimeout(layoutAndDraw, 150); // 렌더링 시간 확보
    window.addEventListener('resize', layoutAndDraw);
  });
}());