import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Inbox, X, Check } from 'lucide-react';
import { Task, Habit } from '../types';
import { dateKey, shiftDay, monday, timeMinutes, timeLabel, gestureRange } from './calendarGesture';
import { formatDurationHours } from './taskDuration';
import './MobileCalendar.css';

interface Props {
  tasks: Task[];
  habits: Habit[];
  onScheduleTask: (id: string, date: Date, time?: string | null, duration?: number) => void;
  onUnscheduleTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onEditHabit: (habit: Habit) => void;
  onToggleHabit: (id: string, date: string) => void;
  onAddTask: () => void;
}
type Gesture = {
  task: Task; mode: 'move' | 'start' | 'end'; pointerId: number;
  x: number; y: number; lastX: number; lastY: number; scroll: number;
  originalDate: Date; start: number; duration: number; moved: boolean;
  previewDate: Date; previewStart: number; previewDuration: number;
  target: 'time' | 'allDay' | 'backlog';
};
const HOUR = 64;
const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];

export function MobileCalendar({ tasks, habits, onScheduleTask, onUnscheduleTask, onEditTask, onToggleTask, onEditHabit, onToggleHabit, onAddTask }: Props) {
  const [selected, setSelected] = useState(() => new Date());
  const [mode, setMode] = useState<'week' | 'day' | 'month'>('week');
  const [backlog, setBacklog] = useState(false);
  const [detail, setDetail] = useState<Task | null>(null);
  const [dragStep, setDragStep] = useState(1);
  const [preview, setPreview] = useState<Gesture | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const allDay = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef<number>(0);
  const suppressClick = useRef(false);
  const days = mode === 'day' ? [selected] : Array.from({ length: 7 }, (_, i) => shiftDay(monday(selected), i));
  const unscheduled = tasks.filter(t => !t.doDate && !t.isCompleted);
  const today = dateKey(new Date());

  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = HOUR * 8 - 16;
  }, [mode]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const updateGesture = () => {
    const g = gesture.current;
    const bounds = grid.current?.getBoundingClientRect();
    if (!g || !bounds || !scroll.current) return;
    const dx = g.lastX - g.x;
    const dy = g.lastY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < 6) return;
    g.moved = true;
    suppressClick.current = true;
    const day = Math.max(0, Math.min(days.length - 1, Math.floor((g.lastX - bounds.left) / (bounds.width / days.length))));
    const delta = !g.task.startTime && g.mode === 'move'
      ? (g.lastY - bounds.top) / HOUR * 60 - g.start
      : (dy + scroll.current.scrollTop - g.scroll) / HOUR * 60;
    const range = gestureRange(g.mode, g.start, g.duration, delta, dragStep);
    g.previewDate = g.mode === 'move' ? days[day] : g.originalDate;
    g.previewStart = range.start;
    g.previewDuration = range.duration;
    g.target = 'time';
    if (g.mode === 'move') {
      const all = allDay.current?.getBoundingClientRect();
      const pool = root.current?.querySelector('[data-backlog-target]')?.getBoundingClientRect();
      if (all && g.lastY >= all.top && g.lastY <= all.bottom) g.target = 'allDay';
      if (pool && g.lastX >= pool.left && g.lastX <= pool.right && g.lastY >= pool.top && g.lastY <= pool.bottom) g.target = 'backlog';
    }
    setPreview({ ...g });
  };

  const autoScroll = () => {
    const g = gesture.current;
    const el = scroll.current;
    if (!g || !el) return;
    if (g.moved && g.target === 'time') {
      const rect = el.getBoundingClientRect();
      const speed = g.lastY < rect.top + 40 ? -8 : g.lastY > rect.bottom - 40 ? 8 : 0;
      if (speed) { el.scrollTop += speed; updateGesture(); }
    }
    frame.current = requestAnimationFrame(autoScroll);
  };

  const begin = (e: React.PointerEvent, task: Task, action: Gesture['mode']) => {
    if (e.button !== 0 || gesture.current || !task.doDate || !scroll.current) return;
    e.stopPropagation();
    suppressClick.current = false;
    const start = timeMinutes(task.startTime || '09:00');
    const duration = task.duration || 30;
    gesture.current = {
      task, mode: action, pointerId: e.pointerId, x: e.clientX, y: e.clientY,
      lastX: e.clientX, lastY: e.clientY, scroll: scroll.current.scrollTop,
      originalDate: new Date(task.doDate), start, duration, moved: false,
      previewDate: new Date(task.doDate), previewStart: start, previewDuration: duration, target: 'time',
    };
    // Capture on the stable calendar root: the task may move to another day column.
    root.current?.setPointerCapture(e.pointerId);
    frame.current = requestAnimationFrame(autoScroll);
  };

  const finish = (e: React.PointerEvent, cancelled = false) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    cancelAnimationFrame(frame.current);
    gesture.current = null;
    setPreview(null);
    if (root.current?.hasPointerCapture(e.pointerId)) root.current.releasePointerCapture(e.pointerId);
    if (cancelled) { suppressClick.current = true; return; }
    if (!g.moved) {
      suppressClick.current = true;
      setDetail(g.task);
      return;
    }
    if (g.target === 'backlog') {
      onUnscheduleTask(g.task.id);
      setAnnouncement(`${g.task.title} 已退回待办池`);
    } else {
      onScheduleTask(g.task.id, g.previewDate, g.target === 'allDay' ? null : timeLabel(g.previewStart), g.previewDuration);
      setAnnouncement(`${g.task.title} 已安排到 ${g.previewDate.getMonth() + 1}月${g.previewDate.getDate()}日 ${g.target === 'allDay' ? '全天' : timeLabel(g.previewStart) + ' 至 ' + timeLabel(g.previewStart + g.previewDuration)}`);
    }
  };

  const navigate = (direction: number) => {
    setSelected(d => mode === 'month' ? new Date(d.getFullYear(), d.getMonth() + direction, 1) : shiftDay(d, direction * (mode === 'week' ? 7 : 1)));
  };
  const shownTasks = tasks.map(t => preview?.task.id === t.id && preview.target !== 'backlog'
    ? { ...t, doDate: preview.previewDate, startTime: preview.target === 'allDay' ? undefined : timeLabel(preview.previewStart), duration: preview.previewDuration }
    : t);
  const selectDay = (date: Date) => { setSelected(date); setMode('day'); };
  const nudgeDetail = (action: 'move' | 'end', minutes: number) => {
    if (!detail?.doDate || !detail.startTime) return;
    const range = gestureRange(action, timeMinutes(detail.startTime), detail.duration || 30, minutes);
    onScheduleTask(detail.id, new Date(detail.doDate), timeLabel(range.start), range.duration);
    setDetail({ ...detail, startTime: timeLabel(range.start), duration: range.duration });
  };
  const taskBlock = (task: Task, timed: boolean) => {
    const active = preview?.task.id === task.id;
    const minutes = timeMinutes(task.startTime || '09:00');
    const duration = task.duration || 30;
    return <div key={task.id} role="button" tabIndex={0}
      aria-label={`${task.title}，${timed ? `${task.startTime} 至 ${timeLabel(minutes + duration)}` : '全天'}，拖动调整或点击查看`}
      data-task-id={task.id}
      className={`mc-task ${timed ? 'mc-timed' : 'mc-all-task'} ${timed && duration < 30 ? 'mc-short' : ''} ${active ? 'mc-active' : ''} ${task.isCompleted ? 'mc-completed' : ''}`}
      style={timed ? { top: minutes / 60 * HOUR, height: Math.max(16, duration / 60 * HOUR) } : undefined}
      onPointerDown={e => begin(e, task, 'move')}
      onClick={e => { if (suppressClick.current) { e.preventDefault(); return; } setDetail(task); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetail(task); } }}>
      {timed && <span className="mc-resize mc-resize-start" aria-label="调整开始时间" onPointerDown={e => begin(e, task, 'start')}><i /></span>}
      <span className="mc-task-title">{task.isCompleted && '✓ '}{task.title}</span>
      {timed && duration >= 45 && <span className="mc-task-time">{task.startTime}</span>}
      {timed && <span className="mc-resize mc-resize-end" aria-label="调整结束时间" onPointerDown={e => begin(e, task, 'end')}><i /></span>}
    </div>;
  };

  return <div ref={root} className="mc-calendar"
    onPointerMove={e => { const g = gesture.current; if (g?.pointerId === e.pointerId) { g.lastX = e.clientX; g.lastY = e.clientY; updateGesture(); } }}
    onPointerUp={e => finish(e)} onPointerCancel={e => finish(e, true)} onLostPointerCapture={e => finish(e, true)}>
    <header className="mc-header">
      <div className="mc-heading"><div><span className="mc-eyebrow">我的日程</span><h2>{selected.getFullYear()}年 <strong>{selected.getMonth() + 1}月</strong></h2></div>
        <div className="mc-header-actions"><button data-backlog-target aria-label="打开待办池" className={preview?.target === 'backlog' ? 'mc-drop-active' : ''} onClick={() => setBacklog(true)}><Inbox size={18} /><span>{preview ? '退回' : `待办 ${unscheduled.length}`}</span></button>
          <button className="mc-add" aria-label="新建任务" onClick={onAddTask}><Plus size={21} /></button></div>
      </div>
      <div className="mc-toolbar"><div className="mc-modes">{(['day', 'week', 'month'] as const).map(m => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{m === 'day' ? '日' : m === 'week' ? '周' : '月'}</button>)}</div>
        <div className="mc-navigation"><button aria-label="上一个日期范围" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button><button onClick={() => setSelected(new Date())}>今天</button><button aria-label="下一个日期范围" onClick={() => navigate(1)}><ChevronRight size={18} /></button></div></div>
      {mode !== 'month' && <label className="mc-precision">拖动精度<select aria-label="拖动精度" value={dragStep} onChange={e => setDragStep(Number(e.target.value))}><option value={1}>1 分钟</option><option value={5}>5 分钟</option><option value={15}>15 分钟</option></select><span>点任务也可逐分钟微调</span></label>}
    </header>

    {mode === 'month' ? <div className="mc-month"><div className="mc-month-labels">{weekLabels.map(d => <span key={d}>{d}</span>)}</div><div className="mc-month-grid">{Array.from({ length: 42 }, (_, i) => {
      const date = shiftDay(monday(new Date(selected.getFullYear(), selected.getMonth(), 1)), i);
      const dayTasks = tasks.filter(t => t.doDate && dateKey(new Date(t.doDate)) === dateKey(date));
      return <button key={dateKey(date)} className={`${dateKey(date) === today ? 'mc-today' : ''} ${date.getMonth() !== selected.getMonth() ? 'mc-muted' : ''}`} onClick={() => selectDay(date)}><b>{date.getDate()}</b>{dayTasks.slice(0, 3).map(t => <span key={t.id}>{t.title}</span>)}{dayTasks.length > 3 && <small>+{dayTasks.length - 3}</small>}</button>;
    })}</div></div> : <>
      <div className="mc-day-header" style={{ gridTemplateColumns: `34px repeat(${days.length}, minmax(0, 1fr))` }}><span className="mc-zone">日期</span>{days.map(date => <button key={dateKey(date)} className={dateKey(date) === today ? 'mc-today' : ''} onClick={() => selectDay(date)}><span>{weekLabels[(date.getDay() + 6) % 7]}</span><b>{date.getDate()}</b></button>)}</div>
      <div ref={allDay} className={`mc-all-day ${preview?.target === 'allDay' ? 'mc-drop-active' : ''}`} style={{ gridTemplateColumns: `34px repeat(${days.length}, minmax(0, 1fr))` }}><span className="mc-zone">全天</span>{days.map(date => <div key={dateKey(date)}>{shownTasks.filter(t => t.doDate && !t.startTime && dateKey(new Date(t.doDate)) === dateKey(date)).map(t => taskBlock(t, false))}</div>)}</div>
      <div className="mc-scroll" ref={scroll}><div className="mc-timeline"><div className="mc-hours">{Array.from({ length: 24 }, (_, h) => <span key={h} style={{ top: h * HOUR }}>{String(h).padStart(2, '0')}</span>)}</div><div ref={grid} className="mc-grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>{days.map(date => <div className={`mc-day-column ${dateKey(date) === today ? 'mc-today-column' : ''}`} key={dateKey(date)} data-date={dateKey(date)}>
        {shownTasks.filter(t => t.doDate && t.startTime && dateKey(new Date(t.doDate)) === dateKey(date)).map(t => taskBlock(t, true))}
      </div>)}</div></div></div>
      <div className="mc-hint" role="status">{preview ? `${preview.previewDate.getMonth() + 1}/${preview.previewDate.getDate()} · ${preview.target === 'backlog' ? '松开退回待办池' : preview.target === 'allDay' ? '松开设为全天' : `${timeLabel(preview.previewStart)}–${timeLabel(preview.previewStart + preview.previewDuration)}`}` : '拖动任务改时间 · 拖上下边缘改时长 · 滑动空白处浏览'}</div>
      {habits.length > 0 && <details className="mc-habits"><summary>习惯打卡 · {selected.getMonth() + 1}/{selected.getDate()}</summary><div>{habits.map(h => <div key={h.id}><button aria-label={`打卡 ${h.title}`} onClick={() => onToggleHabit(h.id, dateKey(selected))}>{h.completedDates.includes(dateKey(selected)) ? <Check size={18} /> : <span className="mc-check-empty" />}</button><button onClick={() => onEditHabit(h)}>{h.title}</button></div>)}</div></details>}
    </>}
    <span className="mc-sr-only" aria-live="polite">{announcement}</span>
    {detail && <div className="mc-backlog-overlay"><button className="mc-backdrop" aria-label="关闭任务详情" onClick={() => setDetail(null)} /><section className="mc-backlog" role="dialog" aria-label="任务详情">
      <header><h3>{detail.title}</h3><button aria-label="关闭任务详情" onClick={() => setDetail(null)}><X size={20} /></button></header>
      <p aria-live="polite">{detail.doDate ? dateKey(new Date(detail.doDate)) : '未安排'} · {detail.startTime ? `${detail.startTime}–${timeLabel(timeMinutes(detail.startTime) + (detail.duration || 30))}` : '全天'}{detail.estimatedDuration ? ` · 预估 ${formatDurationHours(detail.estimatedDuration)}` : ''}{detail.category ? ` · ${detail.category.name}` : ''}</p>
      {detail.startTime && <div className="mc-nudge"><button onClick={() => nudgeDetail('move', -1)}>提前 1 分钟</button><button onClick={() => nudgeDetail('move', 1)}>推迟 1 分钟</button><button onClick={() => nudgeDetail('end', -1)}>缩短 1 分钟</button><button onClick={() => nudgeDetail('end', 1)}>延长 1 分钟</button></div>}
      <div className="mc-detail-actions"><button onClick={() => { onToggleTask(detail.id); setDetail(null); }}>{detail.isCompleted ? '标为未完成' : '完成任务'}</button><button onClick={() => { setDetail(null); onEditTask(detail); }}>编辑任务</button><button onClick={() => { onUnscheduleTask(detail.id); setDetail(null); }}>退回待办池</button></div>
    </section></div>}
    {backlog && <div className="mc-backlog-overlay"><button className="mc-backdrop" aria-label="关闭待办池" onClick={() => setBacklog(false)} /><section className="mc-backlog"><header><h3>待办池 <small>{unscheduled.length}</small></h3><button aria-label="关闭待办池" onClick={() => setBacklog(false)}><X size={20} /></button></header><p>加入 {selected.getMonth() + 1}/{selected.getDate()} 的 09:00；有预估时长时，卡片会按预估长度创建。</p><div className="mc-backlog-items">{unscheduled.length === 0 ? <p>暂无未安排任务</p> : unscheduled.map(t => <div key={t.id}><button onClick={() => { setBacklog(false); onEditTask(t); }}>{t.title}</button><button aria-label={`安排 ${t.title}`} onClick={() => { onScheduleTask(t.id, selected, '09:00'); setMode('week'); setBacklog(false); }}><Plus size={20} /></button></div>)}</div></section></div>}
  </div>;
}
