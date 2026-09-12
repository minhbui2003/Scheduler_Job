'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ConfirmDeleteDialog({ title, description, onClose, onConfirm }: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try { await onConfirm(); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể xóa. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent showCloseButton={!busy}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription className="break-words">{description}</DialogDescription></DialogHeader>
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={onClose}>Giữ lại</Button>
        <Button variant="destructive" disabled={busy} onClick={confirm}>{busy ? <Loader2 className="animate-spin" /> : <Trash2 />} {busy ? 'Đang xóa...' : 'Xác nhận xóa'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
