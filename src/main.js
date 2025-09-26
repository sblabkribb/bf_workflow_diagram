// webview/main.js
(function () {
  const vscode = acquireVsCodeApi();
  // 상태 관리 객체를 더 명확하게 구성합니다.
  const state = {
    // 각 워크플로우의 상태를 저장 (선택된 DBTL 사이클 등)
    workflows: [],
    // 현재 적용된 전역 필터 ('D', 'B', 'T', 'L' 또는 null)
    activeFilter: null,
  };

  /**
   * Base64 데이터를 디코딩하여 VS Code 에디터에서 해당 파일 및 라인으로 이동합니다.
   * @param {string} base64Data - 이동할 위치 정보가 인코딩된 문자열
   */
  function navigateTo(base64Data) {
    try {
      // Base64 디코딩 후 UTF-8 문자열로 변환
      const decodedUtf8String = decodeURIComponent(atob(base64Data).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const navData = JSON.parse(decodedUtf8String);
      vscode.postMessage({ command: 'navigateTo', ...navData });
    } catch (e) {
      console.error('Failed to parse navigation data:', e, "Input:", base64Data);
    }
  }

  /**
   * 워크플로우들의 시각적 레이아웃을 계산하고 DOM에 적용합니다.
   */
  function layoutAndDraw() {
    const PADDING = 20;
    const DBTL_LABEL_WIDTH = 40;
    const DBTL_CELL_WIDTH = 50;
    const WORKFLOW_CELL_WIDTH = 270;
    const VERTICAL_GAP = 40; // 워크플로우 간의 수직 간격을 늘려 가독성 확보
    let currentY = PADDING;

    // 1. 필터링 상태에 따라 워크플로우 표시 여부 결정
    const visibleWorkflows = [];
    state.workflows.forEach(wf => {
      const groupEl = document.getElementById(`wf-group-${wf.index}`);
      // activeFilter가 null(전체 보기)이거나, 워크플로우의 selectedCycle이 필터와 일치하는 경우
      if (state.activeFilter === null || wf.selectedCycle === state.activeFilter) {
        groupEl.style.display = 'block';
        visibleWorkflows.push(wf);
      } else {
        groupEl.style.display = 'none';
      }
    });

    // 2. DBTL 사이클 라벨('D', 'B', 'T', 'L') 위치 설정
    updateDbtlCycleLabels(visibleWorkflows, PADDING);

    // 3. 보이는 각 워크플로우의 위치를 순차적으로 계산하여 배치
    visibleWorkflows.forEach(wf => {
      const dbtlCell = document.getElementById(`dbtl-cell-${wf.index}`);
      const titleCell = document.getElementById(`wf-title-${wf.index}`);
      const opsCell = document.getElementById(`ops-cell-${wf.index}`);

      // getBoundingClientRect는 실제 렌더링 크기를 반환하므로, 숨겨진 요소에 사용 시 문제가 발생합니다.
      // 따라서 offsetHeight/offsetWidth를 사용하여 요소 자체의 크기를 가져옵니다.
      const titleHeight = titleCell.offsetHeight;
      const opsHeight = opsCell.offsetHeight;
      const rowHeight = Math.max(titleHeight, opsHeight);

      // 필터가 적용되었을 때와 아닐 때의 시작 X 위치 조정
      const leftPos = state.activeFilter ? PADDING + DBTL_LABEL_WIDTH : PADDING;
      
      // 수직 중앙 정렬
      dbtlCell.style.top = `${currentY + (rowHeight / 2) - (dbtlCell.offsetHeight / 2)}px`;
      dbtlCell.style.left = `${leftPos}px`;

      titleCell.style.top = `${currentY}px`;
      titleCell.style.left = `${leftPos + DBTL_CELL_WIDTH}px`;
      
      opsCell.style.top = `${currentY + (rowHeight / 2) - (opsHeight / 2)}px`;
      opsCell.style.left = `${leftPos + DBTL_CELL_WIDTH + WORKFLOW_CELL_WIDTH}px`;

      // 다음 워크플로우의 Y 위치를 계산
      currentY += rowHeight + VERTICAL_GAP;
    });

    // 4. 컨테이너 전체 높이를 내용물에 맞게 조절
    document.getElementById('diagram-container').style.height = `${currentY}px`;
    document.getElementById('arrow-svg-container').style.height = `${currentY}px`;

    // 5. 레이아웃 배치가 끝난 후 화살표를 그림
    // requestAnimationFrame을 사용하여 브라우저가 렌더링을 마친 후 화살표를 그리도록 보장
    requestAnimationFrame(() => drawArrows(visibleWorkflows));
  }

  /**
   * 필터링된 그룹의 시작점에 DBTL 라벨을 표시합니다.
   * @param {Array} visibleWorkflows - 현재 화면에 보이는 워크플로우 목록
   * @param {number} PADDING - 다이어그램의 좌측 패딩
   */
  function updateDbtlCycleLabels(visibleWorkflows, PADDING) {
      ['D', 'B', 'T', 'L'].forEach(cycle => {
          const labelEl = document.getElementById(`dbtl-label-${cycle}`);
          if (labelEl) labelEl.style.display = 'none';
      });

      if (state.activeFilter && visibleWorkflows.length > 0) {
          const labelEl = document.getElementById(`dbtl-label-${state.activeFilter}`);
          if (labelEl) {
              const firstWfTitle = document.getElementById(`wf-title-${visibleWorkflows[0].index}`);
              labelEl.style.display = 'block';
              labelEl.style.left = `${PADDING}px`;
              // 첫번째 워크플로우의 타이틀 높이를 고려하여 중앙에 배치
              labelEl.style.top = `${firstWfTitle.offsetTop + firstWfTitle.offsetHeight / 2 - labelEl.offsetHeight / 2}px`;
          }
      }
  }

  /**
   * 워크플로우와 유닛 오퍼레이션들을 연결하는 화살표 SVG를 생성합니다.
   * @param {Array} visibleWorkflows - 현재 화면에 보이는 워크플로우 목록
   */
  function drawArrows(visibleWorkflows) {
    const svg = document.getElementById('arrow-svg-container');
    if (!svg) return;
    svg.innerHTML = ''; // 이전 화살표 모두 삭제

    // 화살촉 SVG 정의(marker)
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
    visibleWorkflows.forEach(wf => {
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
    for (let i = 0; i < visibleWorkflows.length - 1; i++) {
      const sourceWf = visibleWorkflows[i];
      const targetWf = visibleWorkflows[i + 1];

      const sourceOps = document.querySelectorAll(`#ops-cell-${sourceWf.index} .unit-operation-node`);
      const targetOps = document.querySelectorAll(`#ops-cell-${targetWf.index} .unit-operation-node`);
      
      if (sourceOps.length === 0 || targetOps.length === 0) continue;

      const sourceEl = sourceOps[sourceOps.length - 1]; // 마지막 유닛 오퍼레이션
      const targetEl = targetOps[0]; // 첫 번째 유닛 오퍼레이션

      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      
      const startX = sourceRect.left + sourceRect.width / 2 - containerRect.left;
      const startY = sourceRect.bottom - containerRect.top;
      const endX = targetRect.left + targetRect.width / 2 - containerRect.left;
      const endY = targetRect.top - containerRect.top;
      
      // 꺾이는 화살표 경로 계산
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

  /**
   * DBTL 버튼의 'selected' 클래스를 현재 필터 상태에 맞게 업데이트합니다.
   */
  function updateAllButtonStyles() {
    document.querySelectorAll('.dbtl-btn').forEach(btn => {
      const cycle = btn.dataset.cycle;
      // 현재 전역 필터와 버튼의 사이클이 일치하면 'selected' 클래스 추가
      if (state.activeFilter === cycle) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  // DOM이 완전히 로드된 후 스크립트를 실행합니다.
  document.addEventListener('DOMContentLoaded', () => {
    // 1. 초기 상태 데이터 수집
    document.querySelectorAll('.workflow-group').forEach((group) => {
      const index = parseInt(group.dataset.wfIndex);
      state.workflows[index] = {
        index: index,
        selectedCycle: null, // 각 워크플로우는 초기에 선택된 사이클이 없음
      };
    });

    // 2. 이벤트 리스너 설정
    // 모든 노드의 클릭 이벤트 (에디터로 이동)
    document.querySelectorAll('[data-nav]').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateTo(node.getAttribute('data-nav'));
      });
    });

    // DBTL 버튼 클릭 이벤트 (필터링 로직)
    document.querySelectorAll('.dbtl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const clickedCycle = btn.dataset.cycle;
        const wfIndex = parseInt(btn.closest('.workflow-group').dataset.wfIndex);
        
        // 클릭된 버튼에 해당하는 워크플로우의 'selectedCycle' 상태를 업데이트
        state.workflows[wfIndex].selectedCycle = clickedCycle;
        
        // 전역 필터 상태 업데이트
        if (state.activeFilter === clickedCycle) {
          // 이미 활성화된 필터를 다시 클릭하면 필터 해제
          state.activeFilter = null;
        } else {
          // 새로운 필터를 클릭하면 해당 필터로 설정
          state.activeFilter = clickedCycle;
        }

        // 모든 버튼의 시각적 스타일을 현재 필터 상태에 맞게 업데이트
        updateAllButtonStyles();
        
        // 레이아웃과 화살표를 다시 계산하고 그림
        layoutAndDraw();
      });
    });

    // 3. PNG로 내보내기 버튼 이벤트
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        const diagramContainer = document.getElementById('diagram-container');
        if (diagramContainer && typeof html2canvas !== 'undefined') {
          // 캡처 시 화살표가 위에 오도록 z-index 임시 조정
          document.getElementById('arrow-svg-container').style.zIndex = 1; 
          html2canvas(diagramContainer, { // body 대신 diagram-container만 캡처
            backgroundColor: getComputedStyle(document.body).backgroundColor, // 배경색 동적 적용
            logging: true,
            useCORS: true,
            onclone: (clonedDoc) => {
              // 복제된 문서에서 SVG를 다시 찾아 z-index를 조정해야 함
              const svgInClone = clonedDoc.getElementById('arrow-svg-container');
              if(svgInClone) svgInClone.style.zIndex = 1;
            }
          }).then(canvas => {
            const pngData = canvas.toDataURL('image/png');
            vscode.postMessage({ command: 'exportToPng', data: pngData });
            // 캡처 후 z-index 원상 복구
            document.getElementById('arrow-svg-container').style.zIndex = -1; 
          });
        }
      });
    }

    // 최초 로드 시 레이아웃 계산 (DOM이 완전히 그려진 후 실행하기 위해 setTimeout 사용)
    setTimeout(layoutAndDraw, 100);

    // 창 크기가 변경될 때마다 레이아웃을 다시 계산
    window.addEventListener('resize', layoutAndDraw);
  });
}());