'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { InterviewType } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ExtractedData {
  companyName: string | null;
  position: string | null;
  interviewDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  interviewType: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  meetingUrl: string | null;
  originalDateText: string | null;
  interpretedDate: string | null;
}

type Step = 'input' | 'analyzing' | 'review' | 'creating';

export function AIImportModal({ open, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('input');
  const [message, setMessage] = useState('');
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [editData, setEditData] = useState({
    companyName: '',
    position: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'OFFLINE',
    location: '',
    meetingUrl: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: '',
  });

  const handleAnalyze = async () => {
    if (message.trim().length < 10) {
      toast.error('Please paste a longer message (at least 10 characters)');
      return;
    }

    setStep('analyzing');

    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      if (data.success) {
        const result = data.data;
        setExtracted(result);
        setEditData({
          companyName: result.companyName || '',
          position: result.position || '',
          date: result.interviewDate || '',
          startTime: result.startTime || '',
          endTime: result.endTime || '',
          type: result.interviewType || 'OFFLINE',
          location: result.location || '',
          meetingUrl: result.meetingUrl || '',
          contactName: result.contactName || '',
          contactPhone: result.contactPhone || '',
          contactEmail: result.contactEmail || '',
          notes: '',
        });
        setStep('review');
      } else {
        toast.error(data.error || 'AI analysis failed');
        setStep('input');
      }
    } catch {
      toast.error('Failed to analyze message');
      setStep('input');
    }
  };

  const handleConfirm = async () => {
    if (!editData.companyName || !editData.position || !editData.date || !editData.startTime) {
      toast.error('Please fill in company, position, date, and start time');
      return;
    }

    setStep('creating');

    try {
      // Step 1: Find or create company
      const companyRes = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.companyName,
          address: editData.location,
        }),
      });

      let companyId: string;
      const companyData = await companyRes.json();

      if (companyData.success) {
        companyId = companyData.data._id;
      } else if (companyRes.status === 409) {
        // Company exists, search for it
        const searchRes = await fetch(`/api/companies?search=${encodeURIComponent(editData.companyName)}`);
        const searchData = await searchRes.json();
        const existing = searchData.data?.[0];
        if (!existing) {
          toast.error('Failed to find or create company');
          setStep('review');
          return;
        }
        companyId = existing._id;
      } else {
        toast.error(companyData.error || 'Failed to create company');
        setStep('review');
        return;
      }

      // Step 2: Create application
      const appRes = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          position: editData.position,
          status: 'INTERVIEW_SCHEDULED',
        }),
      });
      const appData = await appRes.json();
      if (!appData.success) {
        toast.error(appData.error || 'Failed to create application');
        setStep('review');
        return;
      }

      // Step 3: Create interview
      const scheduledStart = new Date(`${editData.date}T${editData.startTime}`);
      const scheduledEnd = editData.endTime
        ? new Date(`${editData.date}T${editData.endTime}`)
        : null;

      const interviewRes = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: appData.data._id,
          companyId,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd?.toISOString() || null,
          type: editData.type,
          location: editData.location,
          meetingUrl: editData.meetingUrl,
          contactName: editData.contactName,
          contactEmail: editData.contactEmail,
          contactPhone: editData.contactPhone,
          notes: editData.notes,
        }),
      });

      const interviewData = await interviewRes.json();
      if (interviewData.success) {
        toast.success('Interview imported successfully! 🎉');
        onImported();
      } else {
        toast.error(interviewData.error || 'Failed to create interview');
        setStep('review');
      }
    } catch {
      toast.error('Failed to import interview');
      setStep('review');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            AI Import Interview
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Input */}
        {step === 'input' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste the HR email, chat message, or any text containing interview details. AI will extract the information automatically.
            </p>
            <Textarea
              placeholder="Paste HR email / message here...&#10;&#10;Example:&#10;Kính gửi ứng viên,&#10;Công ty ABC trân trọng mời bạn tham gia phỏng vấn vị trí Software Engineer.&#10;Thời gian: 14:30 ngày 15/09/2026.&#10;Địa điểm: 123 Nguyễn Huệ, Q1, TP.HCM."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={message.trim().length < 10}
                className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                <Sparkles className="w-4 h-4" />
                Analyze
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Analyzing */}
        {step === 'analyzing' && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Analyzing message...</h3>
            <p className="text-sm text-muted-foreground">
              AI is extracting interview information
            </p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && extracted && (
          <div className="space-y-4">
            {/* AI Interpretation */}
            {extracted.originalDateText && extracted.interpretedDate && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-indigo-600 mb-1">AI Interpreted</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">&quot;{extracted.originalDateText}&quot;</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-medium">{extracted.interpretedDate}</span>
                </div>
              </div>
            )}

            <Separator />

            {/* Editable Form */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Company
                  {!editData.companyName && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] ml-1">
                      <AlertTriangle className="w-3 h-3 mr-0.5" /> Not detected
                    </Badge>
                  )}
                </Label>
                <Input
                  value={editData.companyName}
                  onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
                  placeholder="Company name"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  Position
                  {!editData.position && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] ml-1">
                      <AlertTriangle className="w-3 h-3 mr-0.5" /> Not detected
                    </Badge>
                  )}
                </Label>
                <Input
                  value={editData.position}
                  onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                  placeholder="Job position"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Date
                  </Label>
                  <Input
                    type="date"
                    value={editData.date}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Start
                  </Label>
                  <Input
                    type="time"
                    value={editData.startTime}
                    onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input
                    type="time"
                    value={editData.endTime}
                    onChange={(e) => setEditData({ ...editData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Interview Type</Label>
                <Select
                  value={editData.type}
                  onValueChange={(val) => val && setEditData({ ...editData, type: val as InterviewType })}
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

              {editData.type === 'OFFLINE' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Address
                  </Label>
                  <Input
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    placeholder="Interview address"
                  />
                </div>
              )}

              {editData.type === 'ONLINE' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    Meeting URL
                  </Label>
                  <Input
                    value={editData.meetingUrl}
                    onChange={(e) => setEditData({ ...editData, meetingUrl: e.target.value })}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Contact Name
                  </Label>
                  <Input
                    value={editData.contactName}
                    onChange={(e) => setEditData({ ...editData, contactName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Phone
                  </Label>
                  <Input
                    value={editData.contactPhone}
                    onChange={(e) => setEditData({ ...editData, contactPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </Label>
                <Input
                  value={editData.contactEmail}
                  onChange={(e) => setEditData({ ...editData, contactEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('input')}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Create
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Creating */}
        {step === 'creating' && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Creating interview...</h3>
            <p className="text-sm text-muted-foreground">
              Setting up company, application, and interview
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
