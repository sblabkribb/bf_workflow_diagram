# 연구노트 다이어그램 시각화

## 1. 프로젝트 목표

'Labnote Manager'로 생성된 **실험별 `README.md` 파일을 기반**으로, 해당 실험에 포함된 모든 워크플로우와 각 워크플로우의 단위 작업(Unit Operation) 흐름을 **자동으로 파싱하여 다이어그램으로 시각화**하는 VS Code 확장 기능을 개발합니다.



## 2. 핵심 연동 방식

이 기능은 'Labnote Manager'가 생성하는 **구조화된 마크다운 형식에 직접적으로 의존**합니다.

* **워크플로우 인식**:
    * 현재 열린 `labnote/.../README.md` 파일의 내용에서 `<!-- WORKFLOW_LIST_START -->`와 `<!-- WORKFLOW_LIST_END -->` 사이의 워크플로우 링크 목록(`[ ] [링크](./001_...md)`)을 자동으로 인식합니다.
* **단위 작업(Unit Operation) 파싱**:
    * `README.md`에 연결된 각 워크플로 파일 (`001_...md`)을 엽니다.
    * 해당 파일 내에서 `<!-- UNITOPERATION_LIST_START -->`와 `<!-- UNITOPERATION_LIST_END -->` 사이의 단위 작업 목록을 순서대로 추출합니다.
* **자동 다이어그램 생성**:
    * VS Code 내에서 "Labnote: 현재 실험 다이어그램으로 보기" 명령어를 실행하면, 위에서 파싱된 정보를 바탕으로 **Mermaid.js** 문법의 순서도(Flowchart)를 생성합니다.
    * 생성된 다이어그램은 VS Code의 웹뷰(Webview) 패널에 즉시 렌더링되어 나타납니다.

## 3. 기술 스택 및 Workflow

* **파싱 로직**: `labnote-manager/src/labnote.ts`의 `parseUnitOperationsFromWorkflow` 함수 로직을 활용하여 각 워크플로 파일 내의 단위 작업 순서를 정확하게 추출합니다.
* **시각화**: **Mermaid.js**를 사용하여 웹뷰에서 다이어그램을 렌더링합니다.
* **VS Code 연동**:
    * 새로운 명령어를 추가합니다.
    * `vscode.window.createWebviewPanel` API를 사용하여 다이어그램을 표시할 별도의 패널을 생성합니다.
* **Workflow**:
    1.  **명령 실행**: 사용자가 `labnote/.../README.md` 파일이 열린 상태에서 시각화 명령어를 실행합니다.
    2.  **파일 스캔**: 확장 프로그램이 `README.md`를 읽어 연결된 모든 워크플로 파일 경로를 얻습니다.
    3.  **콘텐츠 파싱**: 각 워크플로 파일을 순차적으로 읽어 단위 작업의 목록과 순서를 추출합니다.
    4.  **Mermaid 코드 생성**: 추출된 정보를 바탕으로 Mermaid 순서도 코드를 동적으로 생성합니다.
        ```mermaid
        graph TD;
            subgraph Experiment 001_Metagenome_Screening
                direction LR
                
                subgraph Workflow 001_Library_Construction
                    A["UHW010: Liquid Handling"] --> B["UHW060: Colony Picking"];
                end
                
                subgraph Workflow 002_Sequencing
                    C["UHW260: Short-read Analysis"] --> D["USW120: Sequence Trimming"];
                end
                
                Workflow_001_Library_Construction --> Workflow_002_Sequencing;
            end
        ```
    5.  **결과 렌더링**: 생성된 코드를 웹뷰 패널에 전달하여 사용자에게 다이어그램을 보여줍니다.
