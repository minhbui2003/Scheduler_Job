'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  format,
  isToday,
  isSameDay,
  getHours,
  addDays,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Plus,
  Sparkles,
  MapPin,
  Monitor,
  Phone,
  Clock,
} from 'lucide-react';
import { InterviewDetailSheet } from '@/components/scheduler/interview-detail-sheet';
import { CreateInterviewModal } from '@/components/scheduler/create-interview-modal';
import { AIImportModal } from '@/components/scheduler/ai-import-modal';

interface InterviewEvent {
  _id: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  type: string;
  location: string;
  meetingUrl: string;
  status: string;
  company?: { name: string } | null;
  application?: {
    _id: string;
    position: string;
    jdText?: string;
    jdFileUrl?: string;
    jdOriginalFilename?: string;
  } | null;
  applicationId: string;
  companyId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  history: Array<{
    type: string;
    from: string | null;
    to: string;
    reason: string;
    createdAt: string;
  }>;
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS_VI = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

const TIME_SECTIONS = [
  { key: 'morning', label: 'SÁNG', sublabel: '00:00 - 11:59', startHour: 0, endHour: 12 },
  { key: 'afternoon', label: 'CHIỀU', sublabel: '12:00 - 17:59', startHour: 12, endHour: 18 },
  { key: 'evening', label: 'TỐI', sublabel: '18:00 - 23:59', startHour: 18, endHour: 24 },
];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/10 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-500/10 text-green-700 border-green-200',
  RESCHEDULED: 'bg-amber-500/10 text-amber-700 border-amber-200',
  CANCELLED: 'bg-red-500/10 text-red-700 border-red-200',
  NO_SHOW: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

function SchedulerContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const dateParam = searchParams.get('date');

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    if (dateParam && !Number.isNaN(new Date(dateParam).getTime())) {
      return startOfWeek(new Date(dateParam), { weekStartsOn: 1 });
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  const [interviews, setInterviews] = useState<InterviewEvent[]>([]);
  const [loadError, setLoadError] = useState('');
  const requestVersion = React.useRef(0);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<InterviewEvent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAIImport, setShowAIImport] = useState(searchParams.get('import') === 'ai');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<{
    date?: string;
    startTime?: string;
    endTime?: string;
  } | undefined>(undefined);

  const weekStartTimestamp = currentWeekStart.getTime();

  const weekEnd = useMemo(
    () => endOfWeek(new Date(weekStartTimestamp), { weekStartsOn: 1 }),
    [weekStartTimestamp]
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(new Date(weekStartTimestamp), i)),
    [weekStartTimestamp]
  );

  const fetchInterviews = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoadError('');
    setLoading(true);
    try {
      const weekDate = new Date(weekStartTimestamp);
      const start = startOfWeek(weekDate, { weekStartsOn: 1 }).toISOString();
      const end = endOfWeek(weekDate, { weekStartsOn: 1 }).toISOString();
      const res = await fetch(`/api/interviews?start=${start}&end=${end}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được dữ liệu. Vui lòng thử lại.');
      if (version === requestVersion.current) {
        setInterviews(data.data || []);
      }
    } catch (error) {
      if (version === requestVersion.current) setLoadError(error instanceof Error ? error.message : 'Không tải được dữ liệu');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [weekStartTimestamp]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  // Synchronize when dateParam in URL changes
  useEffect(() => {
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        setCurrentWeekStart(startOfWeek(parsed, { weekStartsOn: 1 }));
      }
    }
  }, [dateParam]);

  // Listen for AI Import event from header
  useEffect(() => {
    const handleOpenAI = () => setShowAIImport(true);
    window.addEventListener('open-ai-import', handleOpenAI);
    return () => window.removeEventListener('open-ai-import', handleOpenAI);
  }, []);

  // Highlight effect
  useEffect(() => {
    if (highlightId && interviews.length > 0) {
      const interview = interviews.find((i) => i._id === highlightId);
      if (interview) {
        setSelectedInterview(interview);
      }
    }
  }, [highlightId, interviews]);

  const getEventsForDaySection = (day: Date, section: { startHour: number; endHour: number }) => {
    return interviews.filter((interview) => {
      const interviewDate = new Date(interview.scheduledStart);
      const hour = getHours(interviewDate);
      return isSameDay(interviewDate, day) && hour >= section.startHour && hour < section.endHour;
    });
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleCellClick = (day: Date, section: { startHour: number }) => {
    const startHourStr = String(section.startHour === 6 ? 9 : section.startHour === 12 ? 14 : 19).padStart(2, '0');
    const endHourStr = String(section.startHour === 6 ? 10 : section.startHour === 12 ? 15 : 20).padStart(2, '0');
    setCreatePrefill({
      date: format(day, 'yyyy-MM-dd'),
      startTime: `${startHourStr}:00`,
      endTime: `${endHourStr}:00`,
    });
    setShowCreate(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ONLINE':
        return <Monitor className="w-3 h-3" />;
      case 'PHONE':
        return <Phone className="w-3 h-3" />;
      default:
        return <MapPin className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 min-w-0">
      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{loadError}</p><Button variant="outline" onClick={fetchInterviews}>Thử lại</Button></div>}
      {/* Scheduler Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Scheduler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your interview schedule
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAIImport(true)}
            className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <Sparkles className="w-4 h-4" />
            AI Import
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4" />
            New Interview
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-card rounded-xl border p-3 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
          aria-label="Tuần trước"
          className="gap-1 hover:bg-accent"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Tuần trước</span>
        </Button>

        <div className="flex min-w-0 flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="h-9 px-3 gap-2 font-semibold text-xs sm:text-sm hover:bg-indigo-50/50 border-indigo-100 hover:border-indigo-300 transition-all shadow-xs cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">
                    {format(currentWeekStart, 'dd MMM yyyy')} — {format(weekEnd, 'dd MMM yyyy')}
                  </span>
                  <span className="sm:hidden">{format(currentWeekStart, 'dd/MM')} — {format(weekEnd, 'dd/MM')}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
                </Button>
              }
            />
            <PopoverContent
              className="w-auto p-3 shadow-xl border-indigo-100/60"
              align="center"
              side="bottom"
              sideOffset={6}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b">
                  <div>
                    <div className="text-xs font-bold text-foreground">Chọn lịch phỏng vấn</div>
                    <div className="text-[11px] text-muted-foreground">Chọn ngày bất kỳ để nhảy đến tuần đó</div>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-700 font-medium">
                    {format(currentWeekStart, 'MMMM yyyy')}
                  </Badge>
                </div>

                {/* Quick jump pills */}
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs justify-start gap-1.5 hover:bg-indigo-50 hover:text-indigo-700"
                    onClick={() => {
                      goToToday();
                      setCalendarOpen(false);
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Tuần này (Hôm nay)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs justify-start gap-1.5 hover:bg-indigo-50 hover:text-indigo-700"
                    onClick={() => {
                      setCurrentWeekStart(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1));
                      setCalendarOpen(false);
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Tuần sau
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs justify-start gap-1.5 hover:bg-indigo-50 hover:text-indigo-700"
                    onClick={() => {
                      setCurrentWeekStart(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 2));
                      setCalendarOpen(false);
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    2 tuần nữa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs justify-start gap-1.5 hover:bg-indigo-50 hover:text-indigo-700"
                    onClick={() => {
                      setCurrentWeekStart(startOfWeek(addMonths(new Date(), 1), { weekStartsOn: 1 }));
                      setCalendarOpen(false);
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Tháng sau
                  </Button>
                </div>

                {/* Month Calendar Picker */}
                <div className="border rounded-lg p-1 bg-muted/5">
                  <Calendar
                    mode="single"
                    selected={currentWeekStart}
                    onSelect={(date) => {
                      if (date) {
                        setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
                        setCalendarOpen(false);
                      }
                    }}
                    defaultMonth={currentWeekStart}
                    className="p-1"
                  />
                </div>

                {/* Footer helper */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                  <span>Tuần {format(currentWeekStart, 'ww, yyyy')}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-indigo-600 hover:text-indigo-700 p-0 font-medium"
                    onClick={() => {
                      goToToday();
                      setCalendarOpen(false);
                    }}
                  >
                    Về hôm nay
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-9 px-2.5 text-xs hover:bg-accent"
          >
            Hôm nay
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          aria-label="Tuần sau"
          className="gap-1 hover:bg-accent"
        >
          <span className="hidden sm:inline">Tuần sau</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Scheduler Grid */}
      <div className="flex flex-1 flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
        {/* Desktop view - Single Unified Grid (100% aligned columns) */}
        <div className="hidden lg:grid flex-1 grid-cols-[80px_repeat(7,minmax(0,1fr))] grid-rows-[auto_repeat(3,minmax(min-content,1fr))] divide-y divide-border">
          {/* Day Headers Row */}
          <div className="p-3 border-r bg-muted/40 flex items-center justify-center text-[11px] font-bold text-muted-foreground uppercase">
            Khung giờ
          </div>
          {days.map((day, i) => (
            <div
              key={i}
              className={`p-3 text-center border-r last:border-r-0 transition-colors ${
                isToday(day)
                  ? 'bg-indigo-50/80 border-b-2 border-b-indigo-500'
                  : 'bg-muted/20'
              }`}
            >
              <div className={`text-[11px] font-bold tracking-wider ${
                isToday(day) ? 'text-indigo-600 font-extrabold' : 'text-muted-foreground'
              }`}>
                {DAY_LABELS_VI[i]} <span className="opacity-60 text-[10px]">({DAY_LABELS[i]})</span>
              </div>
              <div className={`text-base font-extrabold mt-0.5 ${
                isToday(day) ? 'text-indigo-700' : 'text-foreground'
              }`}>
                {format(day, 'dd/MM')}
              </div>
            </div>
          ))}

          {/* Time Sections (All aligned to same grid columns) */}
          {TIME_SECTIONS.map((section) => (
            <React.Fragment key={section.key}>
              {/* Section Header Cell */}
              <div className="p-3 border-r bg-muted/20 flex flex-col justify-center items-center">
                <span className="text-xs font-bold text-muted-foreground tracking-wider">{section.label}</span>
                <span className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">{section.sublabel}</span>
              </div>

              {/* 7 Day Cells */}
              {days.map((day, dayIdx) => {
                const events = getEventsForDaySection(day, section);
                return (
                  <div
                    key={dayIdx}
                    className={`p-2 border-r last:border-r-0 min-h-[96px] min-w-0 overflow-hidden group relative transition-colors hover:bg-indigo-50/15 ${
                      isToday(day) ? 'bg-indigo-50/20' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      {events.map((event) => (
                        <button
                          key={event._id}
                          onClick={() => setSelectedInterview(event)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer block min-w-0 overflow-hidden ${
                            STATUS_COLORS[event.status] || STATUS_COLORS.SCHEDULED
                          } ${event._id === highlightId ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1 font-bold text-xs text-indigo-700">
                              <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>{format(new Date(event.scheduledStart), 'HH:mm')}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 font-semibold border-current/20 bg-background/70 shrink-0 uppercase flex items-center gap-1"
                            >
                              {getTypeIcon(event.type)}
                              <span>{event.type}</span>
                            </Badge>
                          </div>
                          <div
                            className="text-xs font-bold text-foreground line-clamp-2 leading-snug break-words"
                            title={event.company?.name || 'Unknown'}
                          >
                            {event.company?.name || 'Unknown'}
                          </div>
                          {event.application?.position && (
                            <div className="text-[11px] text-muted-foreground truncate font-medium mt-0.5">
                              {event.application.position}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Quick add interview slot on hover */}
                    <button
                      onClick={() => handleCellClick(day, section)}
                      className="w-full py-1 px-2 rounded-md border border-dashed border-indigo-200 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[11px] font-medium hover:bg-indigo-50 hover:border-indigo-400 mt-1 cursor-pointer"
                      title="Bấm để tạo buổi phỏng vấn vào khung giờ này"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm lịch</span>
                    </button>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile/Tablet view - Day tabs */}
        <MobileScheduler
          days={days}
          interviews={interviews}
          loading={loading}
          highlightId={highlightId}
          onSelectInterview={setSelectedInterview}
        />
      </div>

      {/* Interview Detail Sheet */}
      {selectedInterview && (
        <InterviewDetailSheet
          interview={selectedInterview}
          open={!!selectedInterview}
          onClose={() => setSelectedInterview(null)}
          onUpdate={fetchInterviews}
        />
      )}

      {/* Create Interview Modal */}
      {showCreate && (
        <CreateInterviewModal
          open={showCreate}
          onClose={() => {
            setShowCreate(false);
            setCreatePrefill(undefined);
          }}
          onCreated={fetchInterviews}
          prefillData={createPrefill}
        />
      )}

      {/* AI Import Modal */}
      {showAIImport && (
        <AIImportModal
          open={showAIImport}
          onClose={() => setShowAIImport(false)}
          onImported={() => {
            fetchInterviews();
            setShowAIImport(false);
          }}
        />
      )}
    </div>
  );
}

// Mobile Scheduler Component
function MobileScheduler({
  days,
  interviews,
  loading,
  highlightId,
  onSelectInterview,
}: {
  days: Date[];
  interviews: InterviewEvent[];
  loading: boolean;
  highlightId: string | null;
  onSelectInterview: (interview: InterviewEvent) => void;
}) {
  const [selectedDay, setSelectedDay] = useState(() => {
    const todayIdx = days.findIndex((d) => isToday(d));
    return todayIdx >= 0 ? todayIdx : 0;
  });

  const day = days[selectedDay] || days[0];
  const dayInterviews = day
    ? interviews.filter((i) => isSameDay(new Date(i.scheduledStart), day))
    : [];

  return (
    <div className="flex flex-1 flex-col lg:hidden">
      {/* Day tabs */}
      <div className="flex border-b overflow-x-auto">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setSelectedDay(i)}
            className={`flex-1 min-w-[60px] p-3 text-center transition-colors ${
              selectedDay === i
                ? 'border-b-2 border-indigo-500 bg-indigo-50 text-indigo-700'
                : isToday(d)
                ? 'bg-indigo-50/50 text-indigo-600'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <div className="text-[10px] font-bold tracking-wider">{DAY_LABELS_VI[i]}</div>
            <div className="text-sm font-bold mt-0.5">{format(d, 'dd/MM')}</div>
          </button>
        ))}
      </div>

      {/* Events */}
      <div className="flex-1 p-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : dayInterviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No interviews on this day
          </div>
        ) : (
          TIME_SECTIONS.map((section) => {
            const sectionEvents = dayInterviews.filter((i) => {
              const hour = getHours(new Date(i.scheduledStart));
              return hour >= section.startHour && hour < section.endHour;
            });
            if (sectionEvents.length === 0) return null;
            return (
              <div key={section.key}>
                <div className="text-xs font-bold text-muted-foreground mb-2 tracking-wider">
                  {section.label}
                </div>
                <div className="space-y-2">
                  {sectionEvents.map((event) => (
                    <button
                      key={event._id}
                      onClick={() => onSelectInterview(event)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        STATUS_COLORS[event.status] || STATUS_COLORS.SCHEDULED
                      } ${event._id === highlightId ? 'ring-2 ring-indigo-500' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-sm font-bold">
                            {format(new Date(event.scheduledStart), 'HH:mm')}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {STATUS_LABELS[event.status]}
                        </Badge>
                      </div>
                      <div className="font-semibold">{event.company?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        {event.type === 'ONLINE' ? (
                          <Monitor className="w-3 h-3" />
                        ) : (
                          <MapPin className="w-3 h-3" />
                        )}
                        {event.type}
                        {event.location && ` • ${event.location}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function SchedulerPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-xl" />}>
      <SchedulerContent />
    </Suspense>
  );
}
