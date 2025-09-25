// webview/main.js
(function () {
  const vscode = acquireVsCodeApi();

  // VS Code로 메시지를 보내는 함수
  function sendMessage(command, data) {
    vscode.postMessage({ command, ...data });
  }

  /**
   * Mermaid.js 노드 텍스트에 사용될 문자열을 디코딩합니다.
   * @param text 디코딩할 원본 텍스트
   * @returns 디코딩된 텍스트
   */
  function decodeFromMermaid(text) {
    return text.replace(/#quot;/g, '"');
  }

  // Mermaid.js 노드 클릭 시 파일 이동 처리
  window.navigateTo = (navDataString) => {
    try {
      const decodedString = decodeFromMermaid(navDataString);
      const navData = JSON.parse(decodedString);
      const { filePath, line } = navData;
      if (filePath && line) {
        sendMessage('navigateTo', { filePath, line: parseInt(line, 10) });
      }
    } catch (e) {
      console.error('Failed to parse navigation data:', e, 'Original data:', navDataString);
    }
  };

  // DOM이 로드된 후 이벤트 리스너 설정
  document.addEventListener('DOMContentLoaded', () => {
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        const svgElement = document.querySelector('.mermaid > svg');
        if (svgElement) {
          const style = document.createElement('style');
          style.textContent = `
            svg { background-color: #1e1e1e; color: #d4d4d4; }
            .node rect, .node circle, .node polygon, .node ellipse { fill: #222; stroke: #fff; stroke-width: 2px; }
            .node .label { color: #fff; } .edgePath path { stroke: #fff; } .arrowhead { fill: #fff; }
          `;
          svgElement.prepend(style);
          sendMessage('exportToSvg', { svgContent: svgElement.outerHTML });
        }
      });
    }
  });
}());