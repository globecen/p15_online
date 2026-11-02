export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'printing'
  | 'error';

export interface PrinterDeviceInfo {
  id: string;
  name: string;
  batteryLevel?: number;
  firmwareVersion?: string;
  statusText?: string;
}

export interface PrintProgressInfo {
  status: 'preparing' | 'sending' | 'completing' | 'done' | 'error';
  currentCopy: number;
  totalCopies: number;
  bytesSent: number;
  totalBytes: number;
  percentage: number;
  message?: string;
}

export type PrinterStatusCode =
  | 'out_of_paper'
  | 'cover_open'
  | 'overheating'
  | 'low_battery'
  | 'cover_closed'
  | 'unknown';
