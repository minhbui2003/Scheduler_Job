'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, Trash2, Briefcase, Plus, FolderCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';

const statuses: Record<string, string> = { APPLIED: 'Đã ứng tuyển', INTERVIEW_SCHEDULED: 'Đã lên lịch phỏng vấn', INTERVIEWED: 'Đã phỏng vấn', WAITING_RESULT: 'Chờ kết quả', OFFER: 'Nhận đề nghị làm việc', REJECTED: 'Không đạt', WITHDRAWN: 'Đã rút ứng tuyển' };
interface Job {
  _id: string; position: string; status: string; notes: string; jdText: string; requiredDocuments?: string[];
  company?: { name: string } | null;
  interviews: { _id: string; scheduledStart: string }[];
}

export function EditJobModal({ applicationId, onClose, onSaved }: { applicationId: string; onClose: () => void; onSaved: () => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [form, setForm] = useState<{ companyName: string; position: string; status: string; notes: string; jdText: string; requiredDocuments: string[] }>({ companyName: '', position: '', status: 'APPLIED', notes: '', jdText: '', requiredDocuments: [] });
  const [newDoc, setNewDoc] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    let active = true;
    setError('');
    fetch(`/api/applications/${applicationId}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được thông tin công việc.');
      if (!active) return;
      setJob(data.data);
      setForm({ companyName: data.data.company?.name || '', position: data.data.position, status: data.data.status, notes: data.data.notes || '', jdText: data.data.jdText || '', requiredDocuments: data.data.requiredDocuments || [] });
    }).catch((error) => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [applicationId, attempt]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể lưu công việc.');
      toast.success('Đã cập nhật công việc.'); onSaved(); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể lưu công việc.'); }
    finally { setSaving(false); }
  };

  const handleAddDoc = () => {
    const trimmed = newDoc.trim();
    if (!trimmed) return;
    if (form.requiredDocuments.includes(trimmed)) {
      toast.error('Hồ sơ này đã có trong danh sách');
      return;
    }
    setForm({ ...form, requiredDocuments: [...form.requiredDocuments, trimmed] });
    setNewDoc('');
  };

  return <>
    <Dialog open onOpenChange={(open) => { if (!open && !saving && !confirmDelete) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" showCloseButton={!saving}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Briefcase />Quản lý công việc</DialogTitle><p className="text-sm text-muted-foreground">Chỉnh sửa công việc đã nhập bằng AI hoặc tạo thủ công.</p></DialogHeader>
        {error ? <div role="alert" className="space-y-3"><p>{error}</p><Button variant="outline" onClick={() => setAttempt((v) => v + 1)}>Thử lại</Button></div> : !job ? <p className="flex items-center gap-2"><Loader2 className="animate-spin" />Đang tải...</p> : <form onSubmit={save} className="space-y-4">
          <fieldset disabled={saving} className="space-y-4 min-w-0">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="job-company">Tên công ty</Label><Input id="job-company" required maxLength={200} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="job-position">Vị trí ứng tuyển</Label><Input id="job-position" required maxLength={200} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="job-status">Trạng thái công việc</Label><select id="job-status" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="job-notes">Ghi chú về công việc</Label><Textarea id="job-notes" maxLength={10000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="job-jd">Nội dung JD</Label><Textarea id="job-jd" rows={4} maxLength={50000} value={form.jdText} onChange={(e) => setForm({ ...form, jdText: e.target.value })} /></div>
            <div className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/20 p-3.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="job-doc-input" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <FolderCheck className="w-4 h-4 text-amber-600" />
                  Yêu cầu hồ sơ (cần mang theo)
                </Label>
                <span className="text-xs text-muted-foreground">{form.requiredDocuments.length} hồ sơ</span>
              </div>
              <div className="flex gap-2">
                <Input
                  id="job-doc-input"
                  placeholder="Nhập giấy tờ/hồ sơ cần đem theo (VD: CCCD photo công chứng...)"
                  value={newDoc}
                  onChange={(e) => setNewDoc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDoc();
                    }
                  }}
                  className="text-xs bg-background"
                  maxLength={500}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDoc}
                  disabled={!newDoc.trim()}
                  className="shrink-0 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Thêm
                </Button>
              </div>
              {form.requiredDocuments.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.requiredDocuments.map((doc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-amber-100/70 text-amber-900 border border-amber-200"
                    >
                      <span className="w-4 h-4 rounded-full bg-amber-200/80 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span>
                      <span className="font-medium">{doc}</span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, requiredDocuments: form.requiredDocuments.filter((_, i) => i !== idx) })}
                        className="hover:text-red-600 ml-0.5 text-muted-foreground"
                        title="Xóa hồ sơ này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Chưa có yêu cầu hồ sơ. Nhập tên giấy tờ và bấm Thêm hoặc nhấn Enter.</p>
              )}
            </div>
          </fieldset>
          {job.interviews.length > 0 && <div className="space-y-2"><p className="text-sm font-medium">Lịch phỏng vấn của công việc</p>{job.interviews.map((interview) => <Link key={interview._id} onClick={onClose} href={`/scheduler?${new URLSearchParams({ highlight: interview._id, date: interview.scheduledStart })}`} className="block rounded-lg border px-3 py-2 text-sm text-primary hover:bg-accent">{format(new Date(interview.scheduledStart), 'dd/MM/yyyy HH:mm')} — Xem lịch / quản lý JD</Link>)}</div>}
          <DialogFooter className="sticky -bottom-4 bg-background/95">
            <Button type="button" variant="destructive" disabled={saving} onClick={() => setConfirmDelete(true)} className="sm:mr-auto"><Trash2 />Xóa công việc</Button>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Đóng</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Lưu thay đổi</Button>
          </DialogFooter>
        </form>}
      </DialogContent>
    </Dialog>
    {confirmDelete && <ConfirmDeleteDialog title="Xóa công việc này?" description={`Công việc “${job?.position}” cùng JD, tất cả lịch phỏng vấn, đánh giá và thông báo liên quan sẽ bị xóa vĩnh viễn. Các công việc khác tại cùng công ty được giữ lại.`} onClose={() => setConfirmDelete(false)} onConfirm={async () => {
      const res = await fetch(`/api/applications/${applicationId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể xóa công việc.');
      toast.success('Đã xóa công việc và dữ liệu liên quan.'); onSaved(); onClose();
    }} />}
  </>;
}
