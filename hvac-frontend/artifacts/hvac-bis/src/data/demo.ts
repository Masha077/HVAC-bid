export type Project = { id:string; name:string; location:string; buildingType:string; status:string; updatedAt:string };
export type Document = { id:string; name:string; project:string; type:string; createdAt:string; status:string; size:string };
export type Requirement = { location:string; buildingType:string; spaces:{name:string;dimensions:string;occupants:number}[]; occupancy:number; coolingRequired:boolean; ventilationRequired:boolean; missingInformation:string[]; source:string; confidence:string };
export type User = { name:string; email:string; organization:string; role:string; authenticationProvider:string };
export type Space = { name:string; dimensions:string; occupants:number };
export type HVACSizing = { coolingLoad:string; airflow:string; freshAir:string; spaces:number; occupants:number; status:string };
export type Supplier = { name:string; category:string; distance:string; availability:string; location:string };
export type Equipment = { type:string; capacity:string; airflow:string; quantity:string; application:string; status:string; manufacturer:string; model:string; voltage:string; efficiency:string; price:string; supplier:string; datasheet:string };
export type ValidationResult = { label:string; status:string; detail:string };
export type AuditEntry = { source:string; decision:string; calculation:string; recommendation:string; status:string };
export type BidDeliverable = { name:string; category:string; status:string; trustNote:string };
export type ProjectOutput = { name:string; category:string; status:string; project:string };
export const demoProject: Project = { id:'chennai-office', name:'Chennai Office HVAC', location:'Chennai, Tamil Nadu', buildingType:'Commercial office', status:'IN REVIEW', updatedAt:'18 Jun 2024, 14:32' };
export const demoDocuments: Document[] = [
  {id:'doc-1',name:'Chennai Office — Tender Brief.pdf',project:demoProject.name,type:'Tender brief',createdAt:'18 Jun 2024',status:'Processed',size:'2.4 MB'},
  {id:'doc-2',name:'Level 01 Architectural Plan.pdf',project:demoProject.name,type:'Drawing',createdAt:'17 Jun 2024',status:'Processed',size:'8.1 MB'},
  {id:'doc-3',name:'Electrical Load Schedule.xlsx',project:demoProject.name,type:'Schedule',createdAt:'17 Jun 2024',status:'Needs review',size:'124 KB'},
  {id:'doc-4',name:'Client Clarifications — Round 02.docx',project:demoProject.name,type:'Clarification',createdAt:'16 Jun 2024',status:'Processed',size:'86 KB'},
  {id:'doc-5',name:'Site Walkthrough Notes.pdf',project:demoProject.name,type:'Site note',createdAt:'14 Jun 2024',status:'Processed',size:'1.1 MB'},
  {id:'doc-6',name:'BOQ Template — HVAC.xlsx',project:demoProject.name,type:'BOQ',createdAt:'12 Jun 2024',status:'Needs review',size:'210 KB'},
];
export const demoRequirement: Requirement = { location:'Chennai, Tamil Nadu', buildingType:'Commercial office', spaces:[{name:'Open office',dimensions:'18m × 10m × 3m',occupants:10},{name:'Meeting room',dimensions:'6m × 4m × 3m',occupants:4},{name:'Server / support',dimensions:'4m × 3m × 3m',occupants:1}], occupancy:15, coolingRequired:true, ventilationRequired:true, missingInformation:['Window orientation and glazing specification','Final equipment heat load','Operating schedule'], source:'Tender brief + architectural plan (DEMO DATA)', confidence:'Medium · requires engineering review' };
export const demoEquipment: Equipment = {type:'VRF indoor / outdoor combination',capacity:'Awaiting verified data',airflow:'Awaiting verified data',quantity:'Awaiting verified data',application:'Office comfort cooling',status:'Awaiting verified equipment data',manufacturer:'Not provided',model:'Not provided',voltage:'Not provided',efficiency:'Not provided',price:'Not provided',supplier:'Not provided',datasheet:'Not provided'};
export const validationRows = [
  ['Completeness','WARNING','Three source inputs remain unresolved.'],['Compatibility','NEEDS REVIEW','Equipment selection is not connected to verified catalog data.'],['Capacity','WARNING','Preliminary load is available; engineer verification required.'],['Ventilation','PASS','Fresh-air allowance is represented in the prototype requirement.'],['Consistency','CONFLICT','Schedule and tender brief contain different operating-hour notes.'],['Commercial completeness','NEEDS REVIEW','Pricing, tax, lead time, and commercial terms are not supplied.'],
];
export const auditRows = [
  ['Tender brief + plan','Extracted 3 spaces and 15 occupants','2.4 TR / 960 CFM preliminary sizing','Confirm glazing and operating schedule','NEEDS REVIEW'],
  ['User input','Cooling and ventilation required','Fresh air allowance 93 CFM','Carry into design review','SOURCE FACT'],
  ['Deterministic prototype','Space aggregation','3 spaces × listed occupants','Do not treat as final design','PRELIMINARY ESTIMATE'],
];
export const deliverables = [
  ['Technical submission','Equipment schedule, sizing note, drawings','NEEDS REVIEW','Manufacturer authorization; engineer verification'],
  ['Commercial submission','BOQ, quote, exclusions, lead time','NEEDS REVIEW','Tender / bank data; contractor signature'],
  ['Control & audit pack','Assumptions, sources, validation record','DRAFT','Contractor input; traceable source references'],
];