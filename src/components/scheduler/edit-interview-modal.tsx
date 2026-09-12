'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Details { _id: string; type: string; location: string; meetingUrl: string; contactName: string; contactEmail: string; contactPhone: string; notes: string }
export function EditInterviewModal({ interview, onClose, onSaved }: { interview: Details; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ type: interview.type, location: interview.location || '', meetingUrl: interview.meetingUrl || '', contactName: interview.contactName || '', contactEmail: interview.contactEmail || '', contactPhone: interview.contactPhone || '', notes: interview.notes || '' });
  const [saving, setSaving] = useState(false);
  const fields = [
    { key: 'location', label: 'Địa điểm phỏng vấn', max: 500, type: 'text' },
    { key: 'meetingUrl', label: 'Liên kết họp trực tuyến', max: 500, type: 'url' },
    { key: 'contactName', label: 'Tên người liên hệ', max: 100, type: 'text' },
    { key: 'contactEmail', label: 'Email liên hệ', max: 255, type: 'email' },
    { key: 'contactPhone', label: 'Số điện thoại liên hệ', max: 20, type: 'tel' },
  ] as const;
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}><DialogContent className="sm:max-w-xl" showCloseButton={!saving}>
    <DialogHeader><DialogTitle>Sửa thông tin phỏng vấn</DialogTitle><p className="text-sm text-muted-foreground">Để thay đổi ngày hoặc giờ, dùng nút Dời lịch trong chi tiết phỏng vấn.</p></DialogHeader>
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); if (saving) return; setSaving(true);
      try {
        const res = await fetch(`/api/interviews/${interview._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Không thể cập nhật phỏng vấn.');
        toast.success('Đã cập nhật thông tin phỏng vấn.'); onSaved(); onClose();
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể cập nhật phỏng vấn.'); }
      finally { setSaving(false); }
    }}>
      <fieldset disabled={saving} className="space-y-4 min-w-0">
        <div className="space-y-2"><Label htmlFor="interview-type">Hình thức</Label><select id="interview-type" className="h-11 w-full rounded-lg border bg-background px-3" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="OFFLINE">Trực tiếp</option><option value="ONLINE">Trực tuyến</option><option value="PHONE">Điện thoại</option><option value="OTHER">Khác</option></select></div>
        {fields.map(({ key, label, max, type }) => <div key={key} className="space-y-2"><Label htmlFor={`edit-${key}`}>{label}</Label><Input id={`edit-${key}`} type={type} maxLength={max} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>)}
        <div className="space-y-2"><Label htmlFor="interview-notes">Ghi chú phỏng vấn</Label><Textarea id="interview-notes" maxLength={10000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </fieldset>
      <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Hủy</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Lưu thay đổi</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
