# LabNote 워크플로우 다이어그램 뷰어

`labnote` 폴더 내에 구조화된 연구노트(`.md` 파일)들을 파싱하여, 전체 실험 흐름을 한눈에 파악할 수 있는 워크플로우 다이어그램을 시각화하는 VS Code 확장 프로그램입니다.

## ✨ 주요 기능

*   **워크플로우 시각화**: `README.md`와 각 워크플로우 파일을 분석하여 실험의 전체 흐름을 다이어그램으로 보여줍니다.
*   **코드 연동**: 다이어그램의 각 노드(워크플로우, 유닛 오퍼레이션)를 클릭하면 해당 마크다운 파일의 소스 코드 위치로 즉시 이동합니다.
*   **자동 새로고침**: 실험 폴더 내의 `.md` 파일이 변경되면 다이어그램이 자동으로 업데이트되어 항상 최신 상태를 유지합니다.
*   **SVG 내보내기**: 생성된 다이어그램을 SVG 이미지 파일로 내보내어 보고서나 프레젠테이션에 활용할 수 있습니다.
*   **어디서든 실행**: 실험 폴더(`labnote/EXPERIMENT_NAME/`) 내의 어떤 마크다운 파일(`README.md` 또는 워크플로우 파일)에서든 명령어를 실행할 수 있습니다.

## 🚀 사용 방법

1.  `labnote` 실험 폴더 내의 `README.md` 또는 워크플로우 `.md` 파일을 엽니다.
2.  명령어 팔레트(`Ctrl+Shift+P`)를 열고 `LabNote: 워크플로우 다이어그램 보기`를 실행합니다.
3.  편집기 옆에 새로운 탭으로 다이어그램이 나타납니다.
4.  다이어그램의 노드를 클릭하여 해당 소스 코드로 이동하거나, 우측 상단의 `Export to SVG` 버튼을 눌러 이미지를 저장할 수 있습니다.

## 📄 파일 구조 요구사항

다이어그램을 올바르게 생성하기 위해 마크다운 파일들은 다음 구조를 따라야 합니다.

### 1. 실험 `README.md`

*   **YAML Front Matter**: 파일 상단에 `title` 속성으로 실험 제목을 명시해야 합니다.
*   **워크플로우 링크**: 본문에 워크플로우 파일로 연결되는 마크다운 링크(`링크 텍스트`)가 순서대로 포함되어야 합니다.

```markdown
---
title: DmpR sensor design
---

# 나의 실험 노트

- [WD070 Vector Design](./001_WD070_Vector_Design.md)
- [WB000 Material Preparation](./002_WB000_Material_Preparation.md)
```

### 2. 워크플로우 `.md` 파일

*   **YAML Front Matter**: 파일 상단에 `title` 속성으로 워크플로우의 전체 제목을 명시해야 합니다.
*   **유닛 오퍼레이션**: `###` (H3) 헤딩을 사용하여 `[ID] 이름` 형식으로 유닛 오퍼레이션을 순서대로 작성해야 합니다. (예: `### [UHW0010] Manual (Dilute)`)

```markdown
---
title: 001 WD070 Vector Design
---

# Vector Design

### [UHW0010] Manual (Dilute)

### [UHW0020] Liquid Handling
```

## 🛠️ 구현 방식 (개발자용)

*   **`src/extension.ts`**:
    *   `bf-workflow-diagram.showDiagram` 명령어를 등록하고 웹뷰 패널을 생성합니다.
    *   웹뷰로부터 `navigateTo` (코드 이동), `exportToSvg` (SVG 저장) 메시지를 수신하고 처리합니다.

*   **`src/webview.ts`**:
    *   `createDiagramPanel` 함수를 통해 웹뷰 패널을 생성하고 관리합니다.
    *   `findReadmePath` 함수로 현재 파일 위치에서 상위 `README.md`를 탐색하여 컨텍스트를 설정합니다.
    *   `FileSystemWatcher`를 사용하여 `.md` 파일 변경 시 다이어그램을 자동으로 새로고침(`updateWebview`)합니다.
    *   `getWebviewContent` 함수에서 최종 HTML을 생성하고, Mermaid.js와 클라이언트 스크립트(`main.js`)를 삽입합니다.

*   **`src/parser.ts`**:
    *   `parseExperiment`: `README.md`를 파싱하여 실험 제목과 워크플로우 파일 목록을 추출합니다.
    *   `parseWorkflow`: 각 워크플로우 파일을 파싱하여 제목과 유닛 오퍼레이션(ID, 이름, 라인 번호) 목록을 추출합니다.

*   **`src/diagramGenerator.ts`**:
    *   `generateDiagramHtml`: 파싱된 `Experiment` 객체를 기반으로 Mermaid.js 그래프 문법을 동적으로 생성합니다. 각 노드에는 클릭 시 `navigateTo` 함수를 호출하는 `click` 이벤트가 바인딩됩니다.

*   **`webview/main.js`**:
    *   웹뷰 내에서 실행되는 클라이언트 스크립트입니다.
    *   Mermaid.js가 렌더링한 노드의 클릭 이벤트를 처리하기 위한 `navigateTo` 전역 함수를 정의합니다. 이 함수는 `vscode.postMessage`를 통해 `extension.ts`로 파일 경로와 라인 정보를 전달합니다.
    *   `Export to SVG` 버튼 클릭 시, 렌더링된 SVG DOM을 추출하여 `extension.ts`로 전송합니다.
