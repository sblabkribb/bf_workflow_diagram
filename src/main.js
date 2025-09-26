// webview/main.js
(function () {
  const vscode = acquireVsCodeApi();

  // DOM이 로드된 후 이벤트 리스너 설정
  document.addEventListener('DOMContentLoaded', () => {
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        console.log('Export button clicked');
        const svgElement = document.querySelector('.mermaid > svg');
        if (svgElement) {
          const style = document.createElement('style');
          style.textContent = `
            svg { background-color: #1e1e1e; color: #d4d4d4; }
            .node rect, .node circle, .node polygon, .node ellipse { fill: #222 !important; stroke: #fff !important; stroke-width: 2px !important; }
            .node .label { color: #fff !important; } 
            .edgePath path { stroke: #fff !important; } 
            .arrowhead { fill: #fff !important; }
          `;
          svgElement.prepend(style);
          vscode.postMessage({ command: 'exportToSvg', svgContent: svgElement.outerHTML });
          // 스타일 노드를 다시 제거하여 웹뷰의 원래 스타일을 복원합니다.
          svgElement.removeChild(style);
        }
      });
    }

    // Mermaid 렌더링
    try {
      const isDark = document.body.classList.contains('vscode-dark');
      const theme = isDark ? 'dark' : 'default';

      mermaid.initialize({ startOnLoad: false, theme: theme });

      const mermaidContainer = document.querySelector('.mermaid');
      if (mermaidContainer) {
        console.log("--- Mermaid Code to Render ---", mermaidContainer.textContent);
        mermaid.run({ nodes: [mermaidContainer] });
      }
    } catch (e) {
      console.error("Mermaid rendering failed:", e);
      const container = document.querySelector('.mermaid');
      if (container) {
        container.innerHTML = '<h2>Error Rendering Diagram</h2><p>Please check the developer console (Help > Toggle Developer Tools) for more details.</p><pre>' + e.message + '</pre>';
      }
    }
  });
}());

// Base64로 인코딩된 데이터를 디코딩하여 파일로 이동하는 함수 (전역 스코프에 정의)
function navigateTo(base64Data) {
  const vscode = acquireVsCodeApi();
  const decodedString = atob(base64Data);
  const navData = JSON.parse(decodedString);
  vscode.postMessage({ command: 'navigateTo', ...navData });
}