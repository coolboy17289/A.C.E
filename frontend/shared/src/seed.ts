// Seed data that the backend writes on its first run so the user opens the
// Pi to a working device rather than an empty shell.

import type {
  CalendarEvent,
  Subject,
  Task,
} from './types.js';

export const seedSubjects: Subject[] = [
  {
    id: 'sub_math',
    name: 'Mathematics',
    color: '#60a5fa',
    description: 'Algebra, calculus and problem solving',
    targetHoursPerWeek: 6,
    progress: 0.42,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sub_phys',
    name: 'Physics',
    color: '#a78bfa',
    description: 'Mechanics, electromagnetism, modern physics',
    targetHoursPerWeek: 5,
    progress: 0.31,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sub_chem',
    name: 'Chemistry',
    color: '#34d399',
    description: 'Organic, inorganic and physical chemistry',
    targetHoursPerWeek: 4,
    progress: 0.55,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sub_eng',
    name: 'English Literature',
    color: '#fbbf24',
    description: 'Reading comprehension and essay writing',
    targetHoursPerWeek: 3,
    progress: 0.66,
    createdAt: new Date().toISOString(),
  },
];

export const seedTasks: Task[] = [
  {
    id: 'tsk_calc',
    title: 'Complete calculus problem set',
    description: 'Chapter 7, problems 1-15',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400e3).toISOString(),
    completed: false,
    category: 'homework',
    subjectId: 'sub_math',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tsk_read',
    title: 'Read physics chapter 4',
    priority: 'medium',
    dueDate: new Date(Date.now() + 2 * 86400e3).toISOString(),
    completed: false,
    category: 'reading',
    subjectId: 'sub_phys',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tsk_lab',
    title: 'Write up lab report',
    priority: 'urgent',
    dueDate: new Date(Date.now() + 4 * 86400e3).toISOString(),
    completed: false,
    category: 'lab',
    subjectId: 'sub_chem',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tsk_essay',
    title: 'Outline English essay',
    description: 'Compare two poems from the anthology',
    priority: 'medium',
    dueDate: new Date(Date.now() + 7 * 86400e3).toISOString(),
    completed: false,
    category: 'homework',
    subjectId: 'sub_eng',
    createdAt: new Date().toISOString(),
  },
];

export const seedEvents: CalendarEvent[] = [
  {
    id: 'evt_class_math',
    title: 'Mathematics Class',
    type: 'class',
    start: nextWeekdayAt(1, 9, 0),
    end: nextWeekdayAt(1, 10, 0),
    subjectId: 'sub_math',
    location: 'Room 12',
  },
  {
    id: 'evt_class_phys',
    title: 'Physics Class',
    type: 'class',
    start: nextWeekdayAt(2, 11, 0),
    end: nextWeekdayAt(2, 12, 0),
    subjectId: 'sub_phys',
    location: 'Lab 2',
  },
  {
    id: 'evt_exam_chem',
    title: 'Chemistry Mid-term Exam',
    type: 'exam',
    start: nextWeekdayAt(5, 14, 0),
    end: nextWeekdayAt(5, 16, 0),
    subjectId: 'sub_chem',
    location: 'Hall A',
  },
];

function nextWeekdayAt(day: number, hour: number, minute: number) {
  const d = new Date();
  const diff = (day + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
