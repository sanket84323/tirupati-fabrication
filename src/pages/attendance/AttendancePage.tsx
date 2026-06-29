import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import { attendanceService } from '../../services/attendance.service';
import { workersService } from '../../services/workers.service';
import { formatCurrency, calculateSalary } from '../../lib/utils';
import type { AttendanceStatus } from '../../types';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  present: { label: 'Present', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-500' },
  absent: { label: 'Absent', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-500' },
  half_day: { label: 'Half Day', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500' },
};

export default function AttendancePage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: attendanceData = [], isLoading } = useQuery({
    queryKey: ['attendance-workers', date],
    queryFn: () => attendanceService.getAllWorkersForDate(date),
  });

  const markMutation = useMutation({
    mutationFn: ({ workerId, status }: { workerId: string; status: AttendanceStatus }) =>
      attendanceService.markAttendance(workerId, date, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-workers', date] });
      toast.success('Attendance marked!');
    },
    onError: () => toast.error('Failed to mark attendance'),
  });

  const presentCount = attendanceData.filter((w: { attendance: { status: string } | null }) => w.attendance?.status === 'present').length;
  const absentCount = attendanceData.filter((w: { attendance: { status: string } | null }) => w.attendance?.status === 'absent').length;
  const halfDayCount = attendanceData.filter((w: { attendance: { status: string } | null }) => w.attendance?.status === 'half_day').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Daily attendance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarMonthIcon className="text-gray-500" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input w-auto" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{presentCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Present</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{halfDayCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Half Day</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{absentCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Absent</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          Mark Attendance — {dayjs(date).format('dddd, DD MMMM YYYY')}
        </h2>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : attendanceData.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No active workers found</p>
            <p className="text-sm mt-1">Add workers first to mark attendance</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(attendanceData as { id: string; name: string; worker_id: string; daily_wage: number; photo_url?: string; attendance: { status: AttendanceStatus } | null }[]).map((worker, i) => {
              const currentStatus = worker.attendance?.status;
              const salary = calculateSalary(
                currentStatus === 'present' ? 1 : 0,
                currentStatus === 'half_day' ? 1 : 0,
                worker.daily_wage
              );

              return (
                <motion.div key={worker.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {worker.photo_url ? <img src={worker.photo_url} alt={worker.name} className="w-full h-full object-cover" /> :
                      <span className="font-bold text-primary-700 dark:text-primary-400">{worker.name.charAt(0)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{worker.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{worker.worker_id} · ₹{worker.daily_wage}/day</p>
                    {currentStatus && (
                      <p className={`text-xs font-medium mt-0.5 ${STATUS_CONFIG[currentStatus].color}`}>
                        Day's Earning: {formatCurrency(salary)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(['present', 'half_day', 'absent'] as AttendanceStatus[]).map(status => {
                      const icons: Record<AttendanceStatus, React.ElementType> = { present: CheckCircleIcon, half_day: RemoveCircleIcon, absent: CancelIcon };
                      const Icon = icons[status];
                      const isActive = currentStatus === status;
                      return (
                        <button key={status} onClick={() => markMutation.mutate({ workerId: worker.id, status })}
                          title={STATUS_CONFIG[status].label}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isActive ? `${STATUS_CONFIG[status].bg} text-white shadow-md scale-110` : 'bg-white dark:bg-slate-600 text-gray-400 hover:scale-105'}`}>
                          <Icon style={{ fontSize: 20 }} />
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
