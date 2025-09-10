# 프로젝트 개요: VS Code 워크플로우 다이어그램 생성기

이 프로젝트는 VS Code 확장 프로그램으로, 사용자가 작성한 특정 형식의 마크다운 텍스트를 파싱하여 Mermaid.js 기반의 워크플로우 다이어그램을 생성하고 웹뷰(Webview)에 시각화해주는 도구입니다.

## 핵심 기능 및 동작 방식

1.  **명령 실행:** 사용자가 VS Code의 Command Palette를 통해 "Generate Workflow Diagram" 같은 명령을 실행합니다.
2.  **문서 파싱:** `parser.ts`가 현재 활성화된 편집기의 텍스트를 읽어, 'Workflow'나 'Unit Operation' 같은 특정 키워드와 구조를 분석하여 다이어그램의 노드(Node)와 엣지(Edge) 정보를 추출합니다.
3.  **다이어그램 코드 생성:** `diagramGenerator.ts`가 파싱된 정보를 바탕으로 Mermaid.js가 이해할 수 있는 `graph TD` 형식의 다이어그램 코드를 생성합니다.
4.  **시각화:** `webview.ts`가 생성된 Mermaid 코드를 웹뷰 패널에 렌더링하여 사용자에게 다이어그램을 시각적으로 보여줍니다.

## 주요 파일 및 역할

-   **`src/extension.ts`**: 확장 프로그램의 메인 진입점입니다. VS Code 명령어를 등록하고, 파서, 생성기, 웹뷰를 통합하여 전체 프로세스를 조율합니다.
-   **`src/parser.ts`**: 활성화된 텍스트 문서의 내용을 파싱하는 로직을 담당합니다. 워크플로우의 각 단계(Unit Operation)를 식별하고 연결 관계를 파악합니다.
-   **`src/diagramGenerator.ts`**: 파싱된 데이터를 입력받아 Mermaid.js 구문으로 변환하는 역할을 합니다.
-   **`src/webview.ts`**: 다이어그램을 표시할 VS Code 내의 웹뷰 패널을 생성하고 관리합니다. Mermaid.js 라이브러리를 로드하고 렌더링을 처리합니다.

## 개발 환경

-   **언어:** TypeScript
-   **플랫폼:** VS Code Extension API
-   **주요 의존성:**
    -   `@types/vscode`: VS Code 확장 프로그램 개발을 위한 타입 정의
    -   `typescript`: 타입스크립트 컴파일러

## 요청 가이드

-   코드 수정이나 기능 추가 요청 시, 관련된 파일(`parser.ts`, `diagramGenerator.ts` 등)을 명시해주면 더 좋습니다.
-   TypeScript의 타입 안전성과 모듈화 원칙을 준수하는 코드를 제안해주세요.
-   Mermaid.js의 다양한 다이어그램 옵션(스타일, 방향 등)을 활용하는 방안을 제안해주세요.