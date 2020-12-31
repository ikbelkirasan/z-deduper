export interface Records {
  [id: string]: string;
}

export interface Page {
  records: string[];
  total?: number;
}

export interface DeduperChanges {
  created: any[];
  updated: any[];
  all: any[];
}

export interface PollRecord {
  id: string | number;
  [key: string]: any;
}
