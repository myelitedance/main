// lib/types/dashboard.ts

export type DashboardRow = {
  measurement_event_id: string | null;
  student_id: string;
  first_name: string;
  last_name: string;

  has_height: boolean;
  has_shoe_size: boolean;
  has_girth: boolean;
  has_photo: boolean;

  is_complete: boolean;
};
