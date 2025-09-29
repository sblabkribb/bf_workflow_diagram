export interface UnitOperation {
  id: string;          // 예: UHW010
  name: string;        // 예: Liquid Handling
  filePath: string;    // 이 Unit Operation이 포함된 파일의 절대 경로
  line: number;        // 파일 내에서 이 Unit Operation이 시작되는 라인 번호
}

export interface Workflow {
  title: string;       // 예: 001 WD070 Vector Design
  filePath: string;    // 이 워크플로우 파일의 절대 경로
  dbtl?: 'D' | 'B' | 'T' | 'L'; // DBTL 사이클
  unitOperations: UnitOperation[];
}

export interface Experiment {
  title: string;       // 예: DmpR sensor design
  workflows: Workflow[];
}