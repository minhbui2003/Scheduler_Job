'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MapPin,
  Monitor,
  Phone,
  Calendar,
  Clock,
  User,
  Mail,
  Link2,
  Building2,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Loader2,
  History,
  ArrowRight,
  FileText,
  Download,
  Eye,
  Upload,
  Copy,
  Check,
  Briefcase,
  FileUp,
  Trash2,
  Pencil,
  Plus,
  FolderCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { PostInterviewReviewModal } from '@/components/reviews/post-interview-review-modal';
import type { IInterviewReview } from '@/types';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { EditJobModal } from '@/components/applications/edit-job-modal';
import { EditInterviewModal } from '@/components/scheduler/edit-interview-modal';

interface ApplicationData {
  _id: string;
  position: string;
  jdText?: string;
  jdFileUrl?: string;
  jdOriginalFilename?: string;
  requiredDocuments?: string[];
  status?: string;
  notes?: string;
}

interface InterviewEvent {
  _id: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  type: string;
  location: string;
  meetingUrl: string;
  status: string;
  company?: { name: string } | null;
  applicationId: string;
  companyId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  application?: ApplicationData | null;
  history: Array<{
    type: string;
    from: string | null;
    to: string;
    reason: string;
    createdAt: string;
  }>;
}

interface Props {
  interview: InterviewEvent;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: <Calendar className="w-3.5 h-3.5" /> },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-amber-100 text-amber-700', icon: <CalendarClock className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
  NO_SHOW: { label: 'No Show', color: 'bg-gray-100 text-gray-700', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export function InterviewDetailSheet({ interview, open, onClose, onUpdate }: Props) {
  const [showEditJob, setShowEditJob] = useState(false);
  const [showEditInterview, setShowEditInterview] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'jd' | 'interview' | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const fileReadVersion = React.useRef(0);
  const [showReview, setShowReview] = useState(false);
  const [existingReview, setExistingReview] = useState<IInterviewReview | undefined>();
  const openReview = async () => {
    if (actionLoading) return;
    setActionLoading('review');
    try {
      const res = await fetch(`/api/reviews?interviewId=${interview._id}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được đánh giá');
      setExistingReview(data.data[0]);
      setShowReview(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không tải được đánh giá'); }
    finally { setActionLoading(null); }
  };
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    newDate: '',
    newStartTime: '',
    newEndTime: '',
    reason: '',
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Application & JD state
  const [application, setApplication] = useState<ApplicationData | null>(interview.application || null);
  const [showJDModal, setShowJDModal] = useState(false);
  const [showEditJDModal, setShowEditJDModal] = useState(false);
  const [editJDText, setEditJDText] = useState('');
  const [editJDFileName, setEditJDFileName] = useState('');
  const [editJDFileUrl, setEditJDFileUrl] = useState('');
  const [savingJD, setSavingJD] = useState(false);
  const [copiedJD, setCopiedJD] = useState(false);

  // Required documents state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocText, setNewDocText] = useState('');
  const [savingDocs, setSavingDocs] = useState(false);

  // Sync application data when interview changes
  useEffect(() => {
    if (interview.application) {
      setApplication(interview.application);
    } else if (interview.applicationId) {
      // Fetch fresh application data if not populated
      fetch(`/api/applications/${interview.applicationId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setApplication(data.data);
          }
        })
        .catch(() => {});
    }
  }, [interview]);

  const statusConfig = STATUS_CONFIG[interview.status] || STATUS_CONFIG.SCHEDULED;
  const startDate = new Date(interview.scheduledStart);

  const handleAction = async (action: string) => {
    if (actionLoading) return;
    setActionLoading(action);

    try {
      const res = await fetch(`/api/interviews/${interview._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          action === 'complete'
            ? 'Đã cập nhật: Hoàn thành phỏng vấn!'
            : action === 'cancel'
            ? 'Đã hủy lịch phỏng vấn'
            : 'Đã cập nhật lịch'
        );
        onUpdate();
        onClose();
      } else {
        toast.error(data.error || 'Cập nhật thất bại');
      }
    } catch {
      toast.error('Lỗi khi cập nhật phỏng vấn');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.newDate || !rescheduleData.newStartTime) {
      toast.error('Vui lòng chọn ngày và giờ bắt đầu mới');
      return;
    }

    setActionLoading('reschedule');

    try {
      const newStart = new Date(`${rescheduleData.newDate}T${rescheduleData.newStartTime}`);
      const newEnd = rescheduleData.newEndTime
        ? new Date(`${rescheduleData.newDate}T${rescheduleData.newEndTime}`)
        : null;

      const res = await fetch(`/api/interviews/${interview._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          newStart: newStart.toISOString(),
          newEnd: newEnd?.toISOString() || null,
          reason: rescheduleData.reason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Đã dời lịch phỏng vấn thành công!');
        setShowReschedule(false);
        onUpdate();
        onClose();
      } else {
        toast.error(data.error || 'Dời lịch thất bại');
      }
    } catch {
      toast.error('Lỗi khi dời lịch phỏng vấn');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditJD = () => {
    setEditJDText(application?.jdText || '');
    setEditJDFileName(application?.jdOriginalFilename || '');
    setEditJDFileUrl(application?.jdFileUrl || '');
    setShowEditJDModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const version = ++fileReadVersion.current;
    setReadingFile(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Không đọc được tệp. Vui lòng chọn lại.'));
        reader.readAsDataURL(file);
      });
      const isText = file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name);
      const text = isText ? await file.text() : null;
      if (version !== fileReadVersion.current) return;
      setEditJDFileName(file.name);
      setEditJDFileUrl(dataUrl);
      if (text !== null) setEditJDText(text);
    } catch (error) {
      if (version === fileReadVersion.current) toast.error(error instanceof Error ? error.message : 'Không đọc được tệp.');
    } finally { if (version === fileReadVersion.current) setReadingFile(false); }
  };

  const handleSaveJD = async () => {
    if (savingJD || readingFile) return;
    if (!interview.applicationId) {
      toast.error('Không tìm thấy thông tin hồ sơ ứng tuyển');
      return;
    }

    setSavingJD(true);
    try {
      const res = await fetch(`/api/applications/${interview.applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jdText: editJDText,
          jdFileUrl: editJDFileUrl,
          jdOriginalFilename: editJDFileName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setApplication((prev) => ({
          ...prev,
          _id: interview.applicationId,
          position: prev?.position || 'Interview',
          jdText: editJDText,
          jdFileUrl: editJDFileUrl,
          jdOriginalFilename: editJDFileName,
        }));
        toast.success('Đã lưu thông tin Job Description (JD)!');
        setShowEditJDModal(false);
        onUpdate();
      } else {
        toast.error(data.error || 'Không thể lưu JD');
      }
    } catch {
      toast.error('Lỗi khi lưu JD');
    } finally {
      setSavingJD(false);
    }
  };

  const copyJDToClipboard = () => {
    if (!application?.jdText) return;
    navigator.clipboard.writeText(application.jdText);
    setCopiedJD(true);
    toast.success('Đã sao chép nội dung JD vào clipboard!');
    setTimeout(() => setCopiedJD(false), 2000);
  };

  const SUGGESTED_DOCUMENTS = [
    'CCCD photo công chứng',
    'Sơ yếu lý lịch',
    'Bằng tốt nghiệp ĐH / CĐ',
    'Bản in CV (2 bản)',
    'Ảnh thẻ 3x4 (2 tấm)',
    'Bảng điểm / Chứng chỉ ngoại ngữ',
    'Portfolio dự án',
  ];

  const handleAddDocument = async (textToAdd?: string) => {
    const text = (textToAdd !== undefined ? textToAdd : newDocText).trim();
    if (!text) {
      toast.error('Vui lòng nhập nội dung hồ sơ / giấy tờ cần mang theo');
      return;
    }
    if (savingDocs) return;
    if (!interview.applicationId) {
      toast.error('Không tìm thấy thông tin công việc');
      return;
    }

    const currentDocs = application?.requiredDocuments || [];
    if (currentDocs.includes(text)) {
      toast.error('Yêu cầu hồ sơ này đã có trong danh sách');
      return;
    }

    const updatedDocs = [...currentDocs, text];
    setSavingDocs(true);
    try {
      const res = await fetch(`/api/applications/${interview.applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiredDocuments: updatedDocs }),
      });
      const data = await res.json();
      if (data.success) {
        setApplication((prev) => (prev ? { ...prev, requiredDocuments: updatedDocs } : null));
        setNewDocText('');
        toast.success(`Đã thêm: "${text}"`);
        onUpdate();
      } else {
        toast.error(data.error || 'Không thể lưu yêu cầu hồ sơ');
      }
    } catch {
      toast.error('Lỗi khi lưu yêu cầu hồ sơ');
    } finally {
      setSavingDocs(false);
    }
  };

  const handleDeleteDocument = async (indexToDelete: number) => {
    if (savingDocs || !interview.applicationId) return;
    const currentDocs = application?.requiredDocuments || [];
    const docToDelete = currentDocs[indexToDelete];
    const updatedDocs = currentDocs.filter((_, i) => i !== indexToDelete);

    setSavingDocs(true);
    try {
      const res = await fetch(`/api/applications/${interview.applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiredDocuments: updatedDocs }),
      });
      const data = await res.json();
      if (data.success) {
        setApplication((prev) => (prev ? { ...prev, requiredDocuments: updatedDocs } : null));
        toast.success(`Đã xóa: "${docToDelete}"`);
        onUpdate();
      } else {
        toast.error(data.error || 'Không thể cập nhật yêu cầu hồ sơ');
      }
    } catch {
      toast.error('Lỗi khi cập nhật yêu cầu hồ sơ');
    } finally {
      setSavingDocs(false);
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            // NEVER close the sheet if a child modal is open
            if (showJDModal || showEditJDModal || showReschedule || showReview || showEditJob || showEditInterview || !!deleteTarget) {
              return;
            }
            onClose();
          }
        }}
        modal={false}
        disablePointerDismissal={showJDModal || showEditJDModal || showReschedule || showReview || showEditJob || showEditInterview || !!deleteTarget}
      >
        <SheetContent
          hideOverlay={true}
          className="w-full sm:max-w-xl border-l shadow-2xl p-0 overflow-y-auto"
        >
          {/* Header Banner */}
          <SheetHeader className="p-6 bg-gradient-to-br from-indigo-50/50 via-background to-purple-50/30 border-b relative">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${statusConfig.color} gap-1 shadow-xs`}>
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
              {application?.position && (
                <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-white/70">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {application.position}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-xl font-bold text-foreground leading-snug break-words pr-8 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>{interview.company?.name || 'Chưa rõ công ty'}</span>
            </SheetTitle>
          </SheetHeader>

          <div className="p-6 space-y-6">
            {/* Date & Time Box */}
            <div className="bg-muted/40 rounded-xl p-4 border shadow-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Ngày phỏng vấn</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">
                      {format(startDate, 'EEEE, dd/MM/yyyy')}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Khung giờ</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">
                      {format(startDate, 'HH:mm')}
                      {interview.scheduledEnd && ` — ${format(new Date(interview.scheduledEnd), 'HH:mm')}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Job Description (JD) Section */}
            <div className="rounded-xl border border-indigo-100/80 bg-gradient-to-br from-white to-indigo-50/20 p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Mô tả công việc (JD)
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {application?.jdText || application?.jdFileUrl ? 'Đã có tài liệu JD' : 'Chưa có JD'}
                    </span>
                  </div>
                </div>

                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openEditJD}
                    className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  >
                    {application?.jdText || application?.jdFileUrl ? 'Sửa' : '+ Thêm JD'}
                  </Button>
                </div>
              </div>

              {application?.jdText && (
                <button
                  type="button"
                  onClick={() => setShowJDModal(true)}
                  className="w-full text-left bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed border hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <span className="line-clamp-3 break-words">{application.jdText}</span>
                  <span className="mt-2 inline-flex items-center gap-1 font-medium text-indigo-600"><Eye className="w-3.5 h-3.5" />Xem toàn bộ nội dung</span>
                </button>
              )}
              {application?.jdFileUrl && (
                <div className="flex min-w-0 items-center gap-2 p-2 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-800">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-medium truncate flex-1 min-w-0" title={application.jdOriginalFilename || 'Tệp tài liệu JD đính kèm'}>
                    {application.jdOriginalFilename || 'Tệp tài liệu JD đính kèm'}
                  </span>
                  <a
                    href={application.jdFileUrl}
                    download={application.jdOriginalFilename || 'JD.pdf'}
                    aria-label="Tải file JD"
                    title="Tải file JD"
                    className="min-h-10 min-w-10 px-2 rounded-md text-indigo-600 hover:bg-indigo-100 flex items-center justify-center gap-1 shrink-0 transition-colors"
                  >
                    <Download className="w-4 h-4" /><span className="hidden sm:inline">Tải về</span>
                  </a>
                  <Button variant="ghost" size="icon" aria-label="Xóa file JD" title="Xóa file JD" onClick={() => setDeleteTarget('jd')} className="text-muted-foreground hover:text-red-600 hover:bg-red-50"><Trash2 /></Button>
                </div>
              )}
              {!application?.jdText && !application?.jdFileUrl && (
                <p className="text-xs text-muted-foreground">Thêm nội dung hoặc đính kèm file mô tả công việc.</p>
              )}
            </div>

            {/* Yêu cầu hồ sơ Section */}
            <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/15 p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-100 text-amber-800">
                    <FolderCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Yêu cầu hồ sơ
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {(application?.requiredDocuments?.length ?? 0) > 0
                        ? `${application!.requiredDocuments!.length} giấy tờ / hồ sơ cần mang theo`
                        : 'Chưa có yêu cầu hồ sơ'}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddDoc((v) => !v)}
                  className="h-7 text-xs text-amber-800 hover:text-amber-900 hover:bg-amber-100 font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {showAddDoc ? 'Đóng' : 'Thêm'}
                </Button>
              </div>

              {/* Form nhập hồ sơ mới */}
              {showAddDoc && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      placeholder="Nhập hồ sơ cần mang theo (VD: CCCD photo, Bằng ĐH...)"
                      value={newDocText}
                      onChange={(e) => setNewDocText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDocument();
                        } else if (e.key === 'Escape') {
                          setShowAddDoc(false);
                        }
                      }}
                      className="h-8 text-xs bg-background"
                      maxLength={500}
                      disabled={savingDocs}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddDocument()}
                      disabled={savingDocs || !newDocText.trim()}
                      className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                    >
                      {savingDocs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Thêm'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddDoc(false);
                        setNewDocText('');
                      }}
                      disabled={savingDocs}
                      className="h-8 text-xs shrink-0"
                    >
                      Hủy
                    </Button>
                  </div>
                  {/* Gợi ý nhanh */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" /> Gợi ý:
                    </span>
                    {SUGGESTED_DOCUMENTS.filter(
                      (s) => !(application?.requiredDocuments || []).includes(s)
                    )
                      .slice(0, 4)
                      .map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleAddDocument(suggestion)}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-amber-200/80 text-amber-900 hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
                        >
                          + {suggestion}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Danh sách hồ sơ */}
              {application?.requiredDocuments && application.requiredDocuments.length > 0 ? (
                <div className="space-y-1.5">
                  {application.requiredDocuments.map((doc, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center justify-between gap-2 p-2.5 rounded-lg bg-background/80 border border-amber-200/50 hover:border-amber-300 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 text-[11px] font-bold">
                          {idx + 1}
                        </div>
                        <span className="font-medium text-foreground break-words leading-relaxed">
                          {doc}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteDocument(idx)}
                        disabled={savingDocs}
                        title="Xóa hồ sơ này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                !showAddDoc && (
                  <p className="text-xs text-muted-foreground">
                    Chưa có hồ sơ cần mang theo. Bấm <strong>+ Thêm</strong> để nhập các giấy tờ cần chuẩn bị cho buổi phỏng vấn.
                  </p>
                )
              )}
            </div>

            {/* Interview Type & Location */}
            <div className="space-y-2.5 bg-card rounded-xl border p-4 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {interview.type === 'ONLINE' ? (
                  <Monitor className="w-4 h-4 text-blue-600" />
                ) : interview.type === 'PHONE' ? (
                  <Phone className="w-4 h-4 text-emerald-600" />
                ) : (
                  <MapPin className="w-4 h-4 text-amber-600" />
                )}
                <span>Hình thức: {interview.type}</span>
              </div>

              {interview.location && (
                <div className="text-xs text-muted-foreground flex items-start gap-2 pl-6">
                  <span>{interview.location}</span>
                </div>
              )}

              {interview.meetingUrl && (
                <div className="flex items-center gap-2 pl-6 pt-1">
                  <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <a
                    href={interview.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline truncate font-medium"
                  >
                    {interview.meetingUrl}
                  </a>
                </div>
              )}
            </div>

            {/* Contact Info */}
            {(interview.contactName || interview.contactEmail || interview.contactPhone) && (
              <div className="space-y-3 bg-card rounded-xl border p-4 shadow-xs">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Thông tin liên hệ HR
                </h4>
                <div className="space-y-2 text-xs">
                  {interview.contactName && (
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{interview.contactName}</span>
                    </div>
                  )}
                  {interview.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <a href={`tel:${interview.contactPhone}`} className="text-indigo-600 hover:underline font-medium">
                        {interview.contactPhone}
                      </a>
                    </div>
                  )}
                  {interview.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <a href={`mailto:${interview.contactEmail}`} className="text-indigo-600 hover:underline font-medium truncate">
                        {interview.contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {interview.notes && (
              <div className="space-y-2 bg-card rounded-xl border p-4 shadow-xs">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Ghi chú
                </h4>
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {interview.notes}
                </p>
              </div>
            )}

            {/* History */}
            {interview.history && interview.history.length > 0 && (
              <div className="space-y-2 bg-card rounded-xl border p-4 shadow-xs">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  Lịch sử thay đổi
                </h4>
                <div className="space-y-2 pt-1">
                  {interview.history.map((entry, i) => (
                    <div key={i} className="text-xs bg-muted/40 rounded-lg p-2.5 border">
                      <div className="font-semibold text-foreground">
                        {entry.type === 'CREATED' ? 'Khởi tạo lịch' : 'Dời lịch phỏng vấn'}
                      </div>
                      {entry.type === 'RESCHEDULED' && entry.from && (
                        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                          <span>{format(new Date(entry.from), 'dd/MM HH:mm')}</span>
                          <ArrowRight className="w-3 h-3 text-indigo-500" />
                          <span className="font-semibold text-foreground">
                            {format(new Date(entry.to), 'dd/MM HH:mm')}
                          </span>
                        </div>
                      )}
                      {entry.reason && (
                        <div className="text-muted-foreground mt-1">Lý do: {entry.reason}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground/60 mt-1">
                        {format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {interview.status === 'COMPLETED' && (
              <Button className="w-full gap-2" disabled={!!actionLoading} onClick={openReview}>
                <FileText className="w-4 h-4" /> Xem / bổ sung đánh giá
              </Button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowEditJob(true)}><Briefcase />Sửa / xóa công việc</Button>
              <Button variant="outline" onClick={() => setShowEditInterview(true)}><Pencil />Sửa thông tin phỏng vấn</Button>
              <Button variant="destructive" onClick={() => setDeleteTarget('interview')} className="sm:col-span-2"><Trash2 />Xóa lịch phỏng vấn</Button>
            </div>
            {/* Actions */}
            {interview.status !== 'COMPLETED' && interview.status !== 'CANCELLED' && (
              <div className="space-y-2 pt-2">
                <Button
                  onClick={openReview}
                  disabled={!!actionLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 font-medium shadow-md shadow-green-600/20 cursor-pointer"
                >
                  {actionLoading === 'review' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Đã phỏng vấn xong
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowReschedule(true)}
                    disabled={!!actionLoading}
                    className="gap-2 cursor-pointer"
                  >
                    <CalendarClock className="w-4 h-4 text-amber-600" />
                    Dời lịch
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAction('cancel')}
                    disabled={!!actionLoading}
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
                  >
                    {actionLoading === 'cancel' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Hủy lịch
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {showEditJob && <EditJobModal key={interview.applicationId} applicationId={interview.applicationId} onClose={() => setShowEditJob(false)} onSaved={() => { onUpdate(); onClose(); }} />}
      {showEditInterview && <EditInterviewModal key={interview._id} interview={interview} onClose={() => setShowEditInterview(false)} onSaved={() => { onUpdate(); onClose(); }} />}
      {deleteTarget && <ConfirmDeleteDialog
        title={deleteTarget === 'jd' ? 'Xóa file JD đính kèm?' : 'Xóa lịch phỏng vấn này?'}
        description={deleteTarget === 'jd' ? `File “${application?.jdOriginalFilename || 'JD'}” sẽ bị xóa khỏi công việc. Nội dung JD dạng chữ và công việc được giữ lại.` : 'Lịch này cùng đánh giá và thông báo liên quan sẽ bị xóa vĩnh viễn. Công việc, JD và các vòng phỏng vấn khác được giữ lại.'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const deletingFile = deleteTarget === 'jd';
          const res = await fetch(deletingFile ? `/api/applications/${interview.applicationId}` : `/api/interviews/${interview._id}`, deletingFile ? {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jdFileUrl: '', jdOriginalFilename: '' }),
          } : { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || 'Không thể xóa. Vui lòng thử lại.');
          if (deletingFile) { setApplication((prev) => prev ? { ...prev, jdFileUrl: '', jdOriginalFilename: '' } : prev); toast.success('Đã xóa file JD.'); }
          else { toast.success('Đã xóa lịch phỏng vấn.'); onClose(); }
          onUpdate();
        }}
      />}
      {showReview && (
        <PostInterviewReviewModal
          key={existingReview?._id || interview._id}
          open={showReview} initialReview={existingReview}
          onClose={() => setShowReview(false)}
          onSaved={() => { onUpdate(); onClose(); }}
          interviewId={interview._id} applicationId={interview.applicationId}
          companyId={interview.companyId} companyName={interview.company?.name || ''}
        />
      )}
      {/* POPUP XEM JD (VIEW FULL JD MODAL) */}
      <Dialog open={showJDModal} onOpenChange={setShowJDModal}>
        <DialogContent
          className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    Job Description (JD)
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {interview.company?.name} — {application?.position || 'Vị trí ứng tuyển'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {application?.jdFileUrl && (
                  <a
                    href={application.jdFileUrl}
                    download={application.jdOriginalFilename || 'JD.pdf'}
                  >
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                      <Download className="w-3.5 h-3.5" /> Tải file
                    </Button>
                  </a>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyJDToClipboard}
                  className="h-8 gap-1 text-xs"
                >
                  {copiedJD ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJD ? 'Đã chép' : 'Sao chép'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
            {application?.jdText ? (
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans bg-muted/10 p-4 rounded-xl border">
                {application.jdText}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Không có nội dung văn bản JD.
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowJDModal(false);
                openEditJD();
              }}
              className="text-xs text-indigo-600"
            >
              Chỉnh sửa JD này
            </Button>
            <Button size="sm" onClick={() => setShowJDModal(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POPUP THÊM / CẬP NHẬT JD (EDIT / UPLOAD JD MODAL) */}
      <Dialog open={showEditJDModal} onOpenChange={(open) => { if (!savingJD && !readingFile) setShowEditJDModal(open); }}>
        <DialogContent
          showCloseButton={!savingJD && !readingFile}
          className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Quản lý Job Description (JD)
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dán nội dung JD dạng văn bản hoặc tải lên tệp đính kèm (PDF, DOCX, TXT)
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto space-y-5 max-h-[65vh]">
            {/* File upload box */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tải lên tệp JD (PDF / DOCX / TXT)</Label>
              <div className="border-2 border-dashed border-indigo-200 rounded-xl p-4 text-center hover:bg-indigo-50/20 transition-colors relative">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.xls"
                  disabled={savingJD || readingFile}
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-6 h-6 mx-auto text-indigo-500 mb-1.5" />
                <p className="text-xs font-semibold text-foreground">
                  {editJDFileName ? `Đã chọn: ${editJDFileName}` : 'Kéo thả tệp hoặc bấm để chọn tệp'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Hỗ trợ định dạng PDF, Word DOCX, hoặc tệp văn bản TXT
                </p>
              </div>
            </div>

            {readingFile && <p className="text-sm text-muted-foreground">Đang đọc file...</p>}
            {(editJDFileName || editJDFileUrl) && <Button variant="destructive" disabled={savingJD || readingFile} onClick={() => { setEditJDFileName(''); setEditJDFileUrl(''); }}><Trash2 />Gỡ file đã chọn</Button>}
            <p className="text-xs text-muted-foreground">Thay đổi tệp chỉ được áp dụng sau khi bấm Lưu JD.</p>
            <Separator />

            {/* Textarea for string / text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Hoặc dán nội dung văn bản JD</Label>
                <span className="text-[11px] text-muted-foreground">
                  {editJDText.length} ký tự
                </span>
              </div>
              <Textarea
                placeholder="Dán toàn bộ mô tả công việc (Yêu cầu, trách nhiệm, mức lương, quyền lợi...) vào đây..."
                value={editJDText}
                onChange={(e) => setEditJDText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                rows={10}
                className="text-xs leading-relaxed font-sans"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditJDModal(false)}
              disabled={savingJD || readingFile}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSaveJD}
              disabled={savingJD || readingFile}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {savingJD ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Lưu JD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showReschedule} onOpenChange={setShowReschedule}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Dời lịch phỏng vấn</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <div>
                <Label>Ngày mới</Label>
                <Input
                  type="date"
                  value={rescheduleData.newDate}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Giờ bắt đầu mới</Label>
                  <Input
                    type="time"
                    value={rescheduleData.newStartTime}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, newStartTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Giờ kết thúc (tùy chọn)</Label>
                  <Input
                    type="time"
                    value={rescheduleData.newEndTime}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, newEndTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Lý do dời lịch</Label>
                <Textarea
                  placeholder="Lý do thay đổi thời gian phỏng vấn..."
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReschedule(false)}>
              Hủy
            </Button>
            <Button onClick={handleReschedule} disabled={!!actionLoading}>
              {actionLoading === 'reschedule' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Xác nhận dời lịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
