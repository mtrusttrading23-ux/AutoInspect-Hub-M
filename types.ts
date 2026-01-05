
export enum UserRole {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  INSPECTOR = 'INSPECTOR',
  USER = 'USER'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  nationalId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CarRecord {
  id: string;
  brand: string;
  type: string;
  model: string;
  color: string;
  chassisNumber: string;
  mileage: number;
  inspectorId: string;
  inspectorName: string;
  inspectionDate: string;
  notes: string;
  images?: string[]; // مصفوفة الصور بتنسيق base64
  status: 'APPROVED' | 'LOCKED' | 'PENDING_PERMISSION' | 'PERMISSION_GRANTED';
}

export interface EditRequest {
  id: string;
  carId: string;
  inspectorId: string;
  inspectorName: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  allowedEditsCount: number;
  usedEditsCount: number;
  oldData?: Partial<CarRecord>;
  newData?: Partial<CarRecord>;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string; // LOGIN, ADD_CAR, EDIT_CAR, REQUEST_EDIT, APPROVE_EDIT
  details: string;
  timestamp: string;
}

export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
};
