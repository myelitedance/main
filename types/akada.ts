// types/akada.ts
export interface AkadaStudent {
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  accountEmail: string;
  accountName: string;
}

export interface AkadaClassHistoryItem {
  classId: string;
  className: string;
  sessionId: string;
  startDate: string;
  endDate: string;
  accountEmail?: string;
  accountFirstName?: string;
  accountLastName?: string;
}

export interface RecitalClassSelection {
  classId: string;
  className: string;
  price: number;
  allowMultiDiscount: boolean;
  selected: boolean;
}

export interface RecitalSubmission {
  accountName: string;
  accountEmail: string;
  studentName: string;
  studentId: string;
  classes: RecitalClassSelection[];
  total: number;
  agreed: boolean;
  signature: string;
  submittedAt: string;
}
