// webview/main.js
(function () {
  const vscode = acquireVsCodeApi();

  /**
   * Base64로 인코딩된 데이터를 UTF-8 문자열로 안전하게 디코딩하여 파일로 이동하는 함수
   * @param {string} base64Data 
   */
  function navigateTo(base64Data) {
    try {
      // atob로 디코딩 시 발생하는 멀티바이트 문자 깨짐 현상을 방지합니다.
      const decodedUtf8String = decodeURIComponent(atob(base64Data).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const navData = JSON.parse(decodedUtf8String);
      vscode.postMessage({ command: 'navigateTo', ...navData });
    } catch (e) {
      console.error('Failed to parse navigation data:', e, "Input:", base64Data);
    }
  }

  // DOM이 로드된 후 이벤트 리스너 설정
  document.addEventListener('DOMContentLoaded', () => {
    // 모든 노드에 클릭 이벤트 리스너 추가
    const clickableNodes = document.querySelectorAll('[data-nav]');
    clickableNodes.forEach(node => {
      node.addEventListener('click', () => {
        const navData = node.getAttribute('data-nav');
        if (navData) {
          navigateTo(navData);
        }
      });
    });

    // PNG 내보내기 버튼 설정
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        const diagramContainer = document.getElementById('diagram-container');
        if (diagramContainer && typeof html2canvas !== 'undefined') {
          html2canvas(diagramContainer, { 
            backgroundColor: '#1e1e1e', // VS Code 다크 테마 배경색과 일치
            useCORS: true 
          }).then(canvas => {
            const pngData = canvas.toDataURL('image/png');
            vscode.postMessage({ command: 'exportToPng', data: pngData });
          }).catch(err => {
            console.error('html2canvas failed:', err);
            vscode.window.showErrorMessage('Diagram to PNG conversion failed.');
          });
        } else {
            console.error('Diagram container or html2canvas library not found.');
        }
      });
    }
  });
}());

