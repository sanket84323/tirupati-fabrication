import { supabase } from '../lib/supabase';
import type { AttendanceRecord, AttendanceStatus } from '../types';

export const attendanceService = {
  getByDate: async (date: string): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, worker:workers(id, name, worker_id, daily_wage, photo_url)')
      .eq('date', date)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as AttendanceRecord[];
  },

  getByWorker: async (workerId: string, month: string): Promise<AttendanceRecord[]> => {
    const startDate = `${month}-01`;
    const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('worker_id', workerId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    if (error) throw error;
    return data as AttendanceRecord[];
  },

  markAttendance: async (
    workerId: string,
    date: string,
    status: AttendanceStatus,
    notes?: string
  ): Promise<AttendanceRecord> => {
    const { data, error } = await supabase
      .from('attendance')
      .upsert({ worker_id: workerId, date, status, notes }, { onConflict: 'worker_id,date' })
      .select('*, worker:workers(id, name, worker_id, daily_wage)')
      .single();
    if (error) throw error;
    return data as AttendanceRecord;
  },

  bulkMark: async (
    records: { worker_id: string; date: string; status: AttendanceStatus }[]
  ): Promise<void> => {
    const { error } = await supabase
      .from('attendance')
      .upsert(records, { onConflict: 'worker_id,date' });
    if (error) throw error;
  },

  getMonthlyStats: async (workerId: string, month: string) => {
    const records = await attendanceService.getByWorker(workerId, month);
    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const halfDays = records.filter(r => r.status === 'half_day').length;
    const workingDays = presentDays + halfDays * 0.5;

    return { presentDays, absentDays, halfDays, workingDays, totalRecords: records.length };
  },

  getAllWorkersForDate: async (date: string) => {
    // Get all active workers with their attendance for the date
    const { data: workers, error: wError } = await supabase
      .from('workers')
      .select('id, name, worker_id, daily_wage, photo_url')
      .eq('status', 'active');
    if (wError) throw wError;

    const { data: attendance, error: aError } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date);
    if (aError) throw aError;

    return workers?.map(worker => ({
      ...worker,
      attendance: attendance?.find(a => a.worker_id === worker.id) || null,
    }));
  },
};
