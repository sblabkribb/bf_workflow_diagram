# GEMINI.md: LabNote 워크플로우 다이어그램 확장 프로그램 개발 명세서

## 1\. 프로젝트 개요

### 1.1. 목표

`labnote` 폴더 내에 구조화된 연구노트(`.md` 파일)들을 파싱하여, 전체 실험 흐름을 한눈에 파악할 수 있는 **워크플로우 다이어그램**을 VS Code 내의 웹뷰(Webview)에 시각화한다.

### 1.2. 다이어그램 구조

  - **세로 (행)**: 워크플로우(Workflow)의 순서를 나타낸다. `README.md`에 명시된 워크플로우 파일 순서를 따른다.
  - **가로 (열)**: 하나의 워크플로우 내에 포함된 유닛 오퍼레이션(Unit Operation)의 순서를 나타낸다.

-----

## 2\. 핵심 기능 명세

### 2.1. 명령어 (Command)

  - **명령어 ID**: `bf-workflow-diagram.showDiagram`
  - **제목**: `LabNote: 워크플로우 다이어그램 보기`
  - **동작**:
    1.  현재 활성화된 편집기 파일이 `labnote/실험폴더/README.md`인지 확인한다.
    2.  유효한 파일일 경우, 해당 `README.md`를 기준으로 다이어그램을 생성하여 새 웹뷰 탭에 표시한다.
    3.  유효하지 않은 파일일 경우, 사용자에게 오류 메시지를 표시한다.

### 2.2. 데이터 파싱 로직 (`src/parser.ts` 수정)

`parser.ts`는 다이어그램을 생성하는 데 필요한 모든 데이터를 마크다운 파일에서 추출하는 역할을 담당한다.

1.  **`parseExperiment` (신규 함수):**

      - **입력**: `readmePath` (e.g., `.../labnote/001_My_Experiment/README.md`의 전체 경로)
      - **프로세스**:
        a. `README.md` 파일을 읽어 YAML Front Matter에서 \*\*실험 제목(title)\*\*을 추출한다.
        b. 파일 본문에서 워크플로우 파일 링크 목록(`[...](./001_... .md)`)을 순서대로 추출한다.
        c. 각 워크플로우 파일 경로에 대해 `parseWorkflow` 함수를 호출한다.
      - **출력**: `Experiment` 객체 (아래 3. 데이터 구조 정의 참고)

2.  **`parseWorkflow` (신규 함수):**

      - **입력**: `workflowPath` (e.g., `.../001_WD070_Vector_Design.md`의 전체 경로)
      - **프로세스**:
        a. 워크플로우 `.md` 파일을 읽는다.
        b. YAML Front Matter에서 \*\*워크플로우 제목(title)\*\*을 추출한다.
        c. 파일 본문에서 `### [U... ]` 패턴을 사용하여 **유닛 오퍼레이션(Unit Operation)** 블록을 순서대로 모두 찾는다.
        d. 각 블록에서 **ID, 이름, 설명(Description), 그리고 해당 라인 번호**를 추출한다.
      - **출력**: `Workflow` 객체

### 2.3. 다이어그램 생성 로직 (`src/diagramGenerator.ts` 수정)

`diagramGenerator.ts`는 파싱된 데이터를 기반으로 웹뷰에 표시될 HTML 콘텐츠를 생성한다.

1.  **`generateDiagramHtml` (기존 함수 수정):**
      - **입력**: `Experiment` 객체
      - **프로세스**:
        a. HTML `<table>` 구조를 생성한다.
        b. `experiment.workflows` 배열을 순회하며 각 워크플로우에 대해 `<tr>` (행)을 생성한다.
        \- 첫 번째 `<td>`에는 워크플로우 제목을 표시한다.
        c. 각 `workflow.unitOperations` 배열을 순회하며 `<td>` (열)을 생성한다.
        d. 각 `<td>` 셀 내부에 **Unit Operation의 ID와 이름**을 표시한다.
        e. **(중요)** 각 `<td>` 셀에 클릭 이벤트를 위한 `data-*` 속성을 추가한다.
        \- `data-filepath`: 해당 Unit Operation이 포함된 파일의 절대 경로
        \- `data-line`: 해당 Unit Operation의 시작 라인 번호
      - **출력**: 완성된 HTML 문자열

### 2.4. 웹뷰 및 상호작용 (`src/webview.ts`, `src/extension.ts` 수정)

1.  **웹뷰 생성 (`src/webview.ts`):**

      - `vscode.WebviewPanel`을 생성하고 `diagramGenerator`가 만든 HTML을 삽입한다.
      - 웹뷰 내에 `main.js` 스크립트를 포함시켜 클릭 이벤트를 처리하도록 한다.

2.  **클릭 이벤트 처리 (`webview/main.js` 신규 생성):**

      - 다이어그램의 모든 `<td>` 셀에 클릭 이벤트 리스너를 추가한다.
      - 셀이 클릭되면, 해당 셀의 `data-filepath`와 `data-line` 속성을 읽는다.
      - `vscode.postMessage()`를 사용하여 확장 프로그램 호스트(extension.ts)로 데이터를 전송한다.

3.  **파일 네비게이션 (`src/extension.ts`):**

      - 웹뷰로부터 메시지를 수신하는 리스너(`panel.webview.onDidReceiveMessage`)를 등록한다.
      - 메시지를 받으면(`{ command: 'navigateTo', filePath: '...', line: '...' }`), `vscode.workspace.openTextDocument`와 `vscode.window.showTextDocument`를 사용하여 해당 파일을 열고, 계산된 라인으로 커서를 이동시킨다.

-----

## 3\. 데이터 구조 정의 (TypeScript Interfaces)

파서와 제너레이터 간의 데이터 교환을 위해 다음과 같은 타입을 정의한다.

```typescript
// src/types.ts (신규 파일)

export interface UnitOperation {
  id: string;          // 예: UHW010
  name: string;        // 예: Liquid Handling
  filePath: string;    // 이 Unit Operation이 포함된 파일의 절대 경로
  line: number;        // 파일 내에서 이 Unit Operation이 시작되는 라인 번호
}

export interface Workflow {
  title: string;       // 예: 001 WD070 Vector Design
  filePath: string;    // 이 워크플로우 파일의 절대 경로
  unitOperations: UnitOperation[];
}

export interface Experiment {
  title: string;       // 예: DmpR sensor design
  workflows: Workflow[];
}
```

-----

## 4\. 파일별 수정 가이드

  - **`src/extension.ts`**:

      - `bf-workflow-diagram.showDiagram` 명령어를 등록한다.
      - 명령어 실행 시 `parser.parseExperiment`를 호출하여 데이터를 가져온다.
      - `webview.createPanel`을 호출하고, `diagramGenerator.generateDiagramHtml`의 결과로 받은 HTML을 웹뷰에 삽입한다.
      - `panel.webview.onDidReceiveMessage`를 구현하여 웹뷰로부터의 네비게이션 요청을 처리한다.

  - **`src/parser.ts`**:

      - 위 `2.2. 데이터 파싱 로직`에 명시된 `parseExperiment`, `parseWorkflow` 함수를 구현한다. 정규 표현식(Regex)을 활용하여 필요한 정보를 효율적으로 추출한다.

  - **`src/diagramGenerator.ts`**:

      - `generateDiagramHtml` 함수가 `Experiment` 객체를 받도록 수정한다.
      - `<table>` 기반의 HTML을 생성하고, 각 셀에 `data-*` 속성을 포함시킨다.
      - 기본적인 스타일을 위한 CSS를 `<style>` 태그 안에 포함시킨다.

  - **`src/webview.ts`**:

      - 웹뷰 패널을 생성하는 로직을 담당한다.
      - 웹뷰 HTML에 삽입될 클라이언트 측 `main.js` 스크립트 로더를 포함시킨다.

  - **`webview/main.js` (신규 파일):**

      - `<td>` 요소에 대한 클릭 이벤트 리스너를 작성하고, `vscode.postMessage`를 호출하는 로직을 구현한다.

-----

## 5\. 개발 로드맵

1.  **1단계: 파싱 및 정적 뷰 구현**

      - `parser.ts`에 데이터 파싱 로직을 완성한다.
      - `diagramGenerator.ts`에서 파싱된 데이터를 받아 정적인 `<table>` 형태의 HTML을 생성하는 기능을 구현한다.
      - `extension.ts`에서 명령어를 실행하면 이 HTML이 웹뷰에 표시되도록 연동한다.

2.  **2단계: 상호작용 기능 추가**

      - `diagramGenerator.ts`의 HTML 셀에 `data-*` 속성을 추가한다.
      - 웹뷰에 `main.js` 스크립트를 추가하여 클릭 이벤트를 감지하고 `postMessage`를 보내도록 구현한다.
      - `extension.ts`에서 `onDidReceiveMessage`를 통해 메시지를 받아 파일을 열고 해당 라인으로 이동하는 기능을 구현한다.

3.  **3단계: 스타일링 및 고도화**

      - 다이어그램의 가독성을 높이기 위해 CSS 스타일을 개선한다.
      - 파일이 변경될 때 다이어그램이 자동으로 새로고침되는 기능을 추가한다.
      - 다이어그램을 이미지(SVG, PNG)로 내보내는 기능을 고려한다.