'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { InterviewType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, FolderCheck, X } from 'lucide-react';
import { toast } from 'sonner';

interface Company {
  _id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefillData?: {
    companyName?: string;
    companyId?: string;
    position?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    type?: string;
    location?: string;
    meetingUrl?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    notes?: string;
  };
}

export function CreateInterviewModal({ open, onClose, onCreated, prefillData }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyId: prefillData?.companyId || '',
    companyName: prefillData?.companyName || '',
    position: prefillData?.position || '',
    date: prefillData?.date || '',
    startTime: prefillData?.startTime || '',
    endTime: prefillData?.endTime || '',
    type: prefillData?.type || 'OFFLINE',
    location: prefillData?.location || '',
    meetingUrl: prefillData?.meetingUrl || '',
    contactName: prefillData?.contactName || '',
    contactPhone: prefillData?.contactPhone || '',
    contactEmail: prefillData?.contactEmail || '',
    notes: prefillData?.notes || '',
    requiredDocuments: [] as string[],
  });
  const [docInput, setDocInput] = useState('');

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.data || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (prefillData) {
      setFormData((prev) => ({
        ...prev,
        ...prefillData,
        companyId: prefillData.companyId || '',
        companyName: prefillData.companyName || '',
      }));
    }
  }, [prefillData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.position || !formData.date || !formData.startTime) {
      toast.error('Please fill in position, date, and start time');
      return;
    }

    if (!formData.companyId && !formData.companyName) {
      toast.error('Please select or enter a company name');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create or find company
      let companyId = formData.companyId;
      if (!companyId && formData.companyName) {
        // Check existing
        const existing = companies.find(
          (c) => c.name.toLowerCase() === formData.companyName.toLowerCase()
        );
        if (existing) {
          companyId = existing._id;
        } else {
          const companyRes = await fetch('/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formData.companyName, address: formData.location }),
          });
          const companyData = await companyRes.json();
          if (!companyData.success) {
            toast.error(companyData.error || 'Failed to create company');
            setLoading(false);
            return;
          }
          companyId = companyData.data._id;
        }
      }

      // Step 2: Create application
      const appRes = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          position: formData.position,
          status: 'INTERVIEW_SCHEDULED',
          requiredDocuments: formData.requiredDocuments,
        }),
      });
      const appData = await appRes.json();
      if (!appData.success) {
        toast.error(appData.error || 'Failed to create application');
        setLoading(false);
        return;
      }

      // Step 3: Create interview
      const scheduledStart = new Date(`${formData.date}T${formData.startTime}`);
      const scheduledEnd = formData.endTime
        ? new Date(`${formData.date}T${formData.endTime}`)
        : null;

      const interviewRes = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: appData.data._id,
          companyId,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd?.toISOString() || null,
          type: formData.type,
          location: formData.location,
          meetingUrl: formData.meetingUrl,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          notes: formData.notes,
        }),
      });
      const interviewData = await interviewRes.json();
      if (interviewData.success) {
        toast.success('Interview created successfully!');
        onCreated();
        onClose();
      } else {
        toast.error(interviewData.error || 'Failed to create interview');
      }
    } catch {
      toast.error('Failed to create interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-500" />
            Create Interview
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company */}
          <div className="space-y-2">
            <Label>Company</Label>
            {companies.length > 0 ? (
              <Select
                value={formData.companyId}
                onValueChange={(val) => {
                  if (!val) return;
                  if (val === 'new') {
                    setFormData({ ...formData, companyId: '', companyName: '' });
                  } else {
                    const company = companies.find((c) => c._id === val);
                    setFormData({
                      ...formData,
                      companyId: val,
                      companyName: company?.name || '',
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company or create new" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ New Company</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            {(!formData.companyId || formData.companyId === '') && (
              <Input
                placeholder="Enter company name"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            )}
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label>Position *</Label>
            <Input
              placeholder="e.g., Software Engineer"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              required
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Interview Type</Label>
            <Select
              value={formData.type}
              onValueChange={(val) => val && setFormData({ ...formData, type: val as InterviewType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OFFLINE">Offline</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="PHONE">Phone</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location / Meeting URL */}
          {formData.type === 'OFFLINE' && (
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Interview location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          )}
          {formData.type === 'ONLINE' && (
            <div className="space-y-2">
              <Label>Meeting URL</Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={formData.meetingUrl}
                onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
              />
            </div>
          )}

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                placeholder="HR name"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                placeholder="Phone number"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input
              type="email"
              placeholder="hr@company.com"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            />
          </div>

          {/* Yêu cầu hồ sơ (tùy chọn) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <FolderCheck className="w-4 h-4 text-amber-600" />
              Yêu cầu hồ sơ mang theo (tùy chọn)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nhập hồ sơ (VD: CCCD photo, Bằng ĐH, CV in...)"
                value={docInput}
                onChange={(e) => setDocInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = docInput.trim();
                    if (trimmed && !formData.requiredDocuments.includes(trimmed)) {
                      setFormData({ ...formData, requiredDocuments: [...formData.requiredDocuments, trimmed] });
                      setDocInput('');
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const trimmed = docInput.trim();
                  if (trimmed && !formData.requiredDocuments.includes(trimmed)) {
                    setFormData({ ...formData, requiredDocuments: [...formData.requiredDocuments, trimmed] });
                    setDocInput('');
                  }
                }}
                disabled={!docInput.trim()}
              >
                Thêm
              </Button>
            </div>
            {formData.requiredDocuments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.requiredDocuments.map((doc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    <span>{doc}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          requiredDocuments: formData.requiredDocuments.filter((_, i) => i !== idx),
                        })
                      }
                      className="hover:text-red-600 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Interview
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
