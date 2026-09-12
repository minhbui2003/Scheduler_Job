'use client';

import React, { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Star,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Plus,
  X,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createReviewSchema } from '@/lib/validations';
import type { IInterviewReview, ReviewResult, SalaryType } from '@/types';

interface Props {
  initialReview?: IInterviewReview;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  interviewId: string;
  applicationId: string;
  companyId: string;
  companyName: string;
}

const PREDEFINED_BENEFITS = [
  'BHXH', '13th Month Salary', 'Bonus', 'Laptop', 'Lunch',
  'Parking', 'Remote', 'Hybrid', 'Annual Leave', 'Health Insurance',
  'Team Building', 'Training', 'Flexible Hours',
];

const BENEFIT_LABELS: Record<string, string> = {
  BHXH: 'Bảo hiểm xã hội',
  '13th Month Salary': 'Lương tháng 13',
  Bonus: 'Thưởng',
  Laptop: 'Cấp máy tính',
  Lunch: 'Hỗ trợ ăn trưa',
  Parking: 'Hỗ trợ gửi xe',
  Remote: 'Làm việc từ xa',
  Hybrid: 'Làm việc kết hợp',
  'Annual Leave': 'Nghỉ phép năm',
  'Health Insurance': 'Bảo hiểm sức khỏe',
  'Team Building': 'Hoạt động gắn kết đội ngũ',
  Training: 'Đào tạo',
  'Flexible Hours': 'Giờ làm linh hoạt',
};

function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex flex-wrap items-center justify-between gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i + 1)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i + 1)}
            aria-label={`${label}: ${i + 1} / 5`}
            aria-pressed={value === i + 1}
            className="p-2 rounded-md focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                i < (hover || value)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-200 hover:text-amber-200'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function PostInterviewReviewModal({
  initialReview,
  open,
  onClose,
  onSaved,
  interviewId,
  applicationId,
  companyId,
  companyName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => ({
    result: 'WAITING',
    expectedSalary: '',
    salaryDiscussed: '',
    companyOffer: '',
    currency: 'VND',
    salaryType: 'UNKNOWN',
    probationSalary: '',
    probationDuration: '',
    benefits: [] as string[],
    customBenefit: '',
    advantages: [] as string[],
    newAdvantage: '',
    disadvantages: [] as string[],
    newDisadvantage: '',
    generalNotes: '',
    questionsAsked: [{ question: '', answerNote: '' }],
    answerNotes: '',
    ratings: {
      salary: 0,
      location: 0,
      technology: 0,
      careerGrowth: 0,
      culture: 0,
      benefits: 0,
      workLifeBalance: 0,
      overall: 0,
    },
    ...(initialReview ? { ...initialReview, expectedSalary: initialReview.expectedSalary?.toString() ?? '', salaryDiscussed: initialReview.salaryDiscussed?.toString() ?? '', companyOffer: initialReview.companyOffer?.toString() ?? '', probationSalary: initialReview.probationSalary?.toString() ?? '' } : {}),
  }));

  const addItem = (field: 'advantages' | 'disadvantages', inputField: 'newAdvantage' | 'newDisadvantage') => {
    const value = form[inputField].trim();
    if (value && !form[field].includes(value)) {
      setForm({ ...form, [field]: [...form[field], value], [inputField]: '' });
    }
  };

  const removeItem = (field: 'advantages' | 'disadvantages', index: number) => {
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== index) });
  };

  const toggleBenefit = (benefit: string) => {
    setForm({
      ...form,
      benefits: form.benefits.includes(benefit)
        ? form.benefits.filter((b) => b !== benefit)
        : [...form.benefits, benefit],
    });
  };

  const addCustomBenefit = () => {
    setForm((prev) => ({ ...prev, benefits: [...new Set([...prev.benefits, prev.customBenefit.trim()].filter(Boolean))], customBenefit: '' }));
  };

  const addQuestion = () => {
    setForm({
      ...form,
      questionsAsked: [...form.questionsAsked, { question: '', answerNote: '' }],
    });
  };

  const updateQuestion = (index: number, field: 'question' | 'answerNote', value: string) => {
    const updated = [...form.questionsAsked];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, questionsAsked: updated });
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const payload = {
        interviewId,
        applicationId,
        companyId,
        result: form.result,
        expectedSalary: form.expectedSalary ? Number(form.expectedSalary) : null,
        salaryDiscussed: form.salaryDiscussed ? Number(form.salaryDiscussed) : null,
        companyOffer: form.companyOffer ? Number(form.companyOffer) : null,
        currency: form.currency,
        salaryType: form.salaryType,
        probationSalary: form.probationSalary ? Number(form.probationSalary) : null,
        probationDuration: form.probationDuration,
        benefits: [...new Set([...form.benefits, form.customBenefit.trim()].filter(Boolean))],
        advantages: [...new Set([...form.advantages, form.newAdvantage.trim()].filter(Boolean))],
        disadvantages: [...new Set([...form.disadvantages, form.newDisadvantage.trim()].filter(Boolean))],
        generalNotes: form.generalNotes,
        questionsAsked: form.questionsAsked.filter((q) => q.question.trim()),
        answerNotes: form.answerNotes,
        ratings: form.ratings,
      };

      const parsed = createReviewSchema.safeParse(payload);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue.path[0];
        toast.error(field === 'probationSalary' ? 'Lương thử việc phải trong khoảng từ 0 đến 100%.' : ['expectedSalary', 'salaryDiscussed', 'companyOffer'].includes(String(field)) ? 'Mức lương phải là số hợp lệ và không được âm.' : 'Thông tin đánh giá chưa hợp lệ hoặc vượt quá độ dài cho phép. Vui lòng kiểm tra lại.');
        return;
      }
      const res = await fetch(initialReview ? `/api/reviews/${initialReview._id}` : '/api/reviews', {
        method: initialReview ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(initialReview ? 'Đã cập nhật đánh giá.' : 'Đã lưu đánh giá và hoàn thành phỏng vấn.');
        onSaved();
        onClose();
      } else {
        toast.error(res.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : res.status === 409 ? 'Phỏng vấn này đã có đánh giá. Vui lòng mở lại để cập nhật.' : 'Không thể lưu đánh giá. Vui lòng kiểm tra thông tin và thử lại.');
      }
    } catch {
      toast.error('Không thể lưu đánh giá. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !loading) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            {initialReview ? 'Cập nhật đánh giá' : 'Hoàn thành phỏng vấn'} — {companyName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground pr-6">Ghi lại mức lương, ưu nhược điểm và cảm nhận để so sánh các công việc trong mục Đánh giá. Bạn có thể cập nhật sau khi nhận đề nghị làm việc.</p>
        </DialogHeader>

        <fieldset disabled={loading} className="min-w-0">
        <Tabs defaultValue="result" className="w-full">
          <TabsList className="flex w-full overflow-x-auto justify-start h-auto min-h-11">
            <TabsTrigger value="result" className="text-xs min-h-10 shrink-0 px-3">Kết quả</TabsTrigger>
            <TabsTrigger value="salary" className="text-xs min-h-10 shrink-0 px-3">Mức lương</TabsTrigger>
            <TabsTrigger value="procons" className="text-xs min-h-10 shrink-0 px-3">Ưu / nhược</TabsTrigger>
            <TabsTrigger value="questions" className="text-xs min-h-10 shrink-0 px-3">Câu hỏi</TabsTrigger>
            <TabsTrigger value="ratings" className="text-xs min-h-10 shrink-0 px-3">Chấm điểm</TabsTrigger>
          </TabsList>

          {/* Result Tab */}
          <TabsContent value="result" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Kết quả phỏng vấn</Label>
              <Select value={form.result} onValueChange={(v) => v && setForm({ ...form, result: v as ReviewResult })}>
                <SelectTrigger>
                  <SelectValue>{({ WAITING: 'Chờ kết quả', PASSED: 'Đạt', FAILED: 'Không đạt', OFFER: 'Nhận đề nghị làm việc', WITHDRAWN: 'Đã rút ứng tuyển' } as Record<string, string>)[form.result]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAITING">Chờ kết quả</SelectItem>
                  <SelectItem value="PASSED">Đạt</SelectItem>
                  <SelectItem value="FAILED">Không đạt</SelectItem>
                  <SelectItem value="OFFER">Nhận đề nghị làm việc</SelectItem>
                  <SelectItem value="WITHDRAWN">Đã rút ứng tuyển</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phúc lợi</Label>
              <div className="flex flex-wrap gap-2">
                {[...new Set([...PREDEFINED_BENEFITS, ...form.benefits])].map((b) => (
                  <button
                    type="button"
                    aria-pressed={form.benefits.includes(b)}
                    key={b}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                      form.benefits.includes(b)
                        ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                        : 'hover:bg-indigo-50'
                    }`}
                    onClick={() => toggleBenefit(b)}
                  >
                    {BENEFIT_LABELS[b] || b}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  aria-label="Phúc lợi tùy chỉnh"
                  placeholder="Thêm phúc lợi khác..."
                  value={form.customBenefit}
                  onChange={(e) => setForm({ ...form, customBenefit: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (form.customBenefit.trim()) {
                        addCustomBenefit();
                      }
                    }
                  }}
                />
                <Button aria-label="Thêm phúc lợi" variant="outline" size="icon" onClick={addCustomBenefit} disabled={!form.customBenefit.trim()}><Plus /></Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-notes">Ghi chú chung</Label>
              <Textarea
                id="review-notes"
                placeholder="Cảm nhận chung, thông tin đội ngũ, văn hóa công ty..."
                value={form.generalNotes}
                onChange={(e) => setForm({ ...form, generalNotes: e.target.value })}
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Salary Tab */}
          <TabsContent value="salary" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Mức lương mong muốn
                </Label>
                <Input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="Ví dụ: 18000000"
                  value={form.expectedSalary}
                  onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mức lương đã trao đổi</Label>
                <Input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="Ví dụ: 17000000"
                  value={form.salaryDiscussed}
                  onChange={(e) => setForm({ ...form, salaryDiscussed: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mức lương công ty đề nghị</Label>
                <Input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="Ví dụ: 17000000"
                  value={form.companyOffer}
                  onChange={(e) => setForm({ ...form, companyOffer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Đơn vị tiền tệ</Label>
                <Select value={form.currency} onValueChange={(v) => v && setForm({ ...form, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VND">VND</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Cách tính lương</Label>
                <Select value={form.salaryType} onValueChange={(v) => v && setForm({ ...form, salaryType: v as SalaryType })}>
                  <SelectTrigger>
                    <SelectValue>{({ GROSS: 'Trước thuế (Gross)', NET: 'Thực nhận (Net)', UNKNOWN: 'Chưa rõ' } as Record<string, string>)[form.salaryType]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GROSS">Trước thuế (Gross)</SelectItem>
                    <SelectItem value="NET">Thực nhận (Net)</SelectItem>
                    <SelectItem value="UNKNOWN">Chưa rõ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lương thử việc (%)</Label>
                <Input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="Ví dụ: 85"
                  value={form.probationSalary}
                  onChange={(e) => setForm({ ...form, probationSalary: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Thời gian thử việc</Label>
                <Input
                  placeholder="Ví dụ: 2 tháng"
                  value={form.probationDuration}
                  onChange={(e) => setForm({ ...form, probationDuration: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Pros/Cons Tab */}
          <TabsContent value="procons" className="space-y-4 mt-4">
            {/* Advantages */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-green-600">
                <ThumbsUp className="w-3.5 h-3.5" />
                Ưu điểm
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập một ưu điểm..."
                  value={form.newAdvantage}
                  onChange={(e) => setForm({ ...form, newAdvantage: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem('advantages', 'newAdvantage');
                    }
                  }}
                />
                <Button aria-label="Thêm ý" type="button" variant="outline" size="icon" onClick={() => addItem('advantages', 'newAdvantage')}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {form.advantages.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-1.5">
                    <span className="text-sm flex-1">{a}</span>
                    <button aria-label="Xóa ý" className="p-2" onClick={() => removeItem('advantages', i)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Disadvantages */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-red-600">
                <ThumbsDown className="w-3.5 h-3.5" />
                Nhược điểm
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập một nhược điểm..."
                  value={form.newDisadvantage}
                  onChange={(e) => setForm({ ...form, newDisadvantage: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem('disadvantages', 'newDisadvantage');
                    }
                  }}
                />
                <Button aria-label="Thêm ý" type="button" variant="outline" size="icon" onClick={() => addItem('disadvantages', 'newDisadvantage')}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {form.disadvantages.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-1.5">
                    <span className="text-sm flex-1">{d}</span>
                    <button aria-label="Xóa ý" className="p-2" onClick={() => removeItem('disadvantages', i)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Câu hỏi phỏng vấn
              </Label>
              {form.questionsAsked.map((q, i) => (
                <div key={i} className="space-y-2 bg-muted/30 rounded-lg p-3">
                  <Input
                    placeholder={`Câu hỏi ${i + 1}`}
                    value={q.question}
                    onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                  />
                  <Textarea
                    placeholder="Ghi chú câu trả lời của bạn (không bắt buộc)"
                    value={q.answerNote}
                    onChange={(e) => updateQuestion(i, 'answerNote', e.target.value)}
                    rows={2}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Thêm câu hỏi
              </Button>
            </div>
          </TabsContent>

          {/* Ratings Tab */}
          <TabsContent value="ratings" className="space-y-3 mt-4">
            <Label className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" />
              Đánh giá cá nhân
            </Label>
            <div className="space-y-2 bg-muted/30 rounded-lg p-4">
              <StarInput label="Mức lương" value={form.ratings.salary} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, salary: v } })} />
              <StarInput label="Địa điểm làm việc" value={form.ratings.location} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, location: v } })} />
              <StarInput label="Công nghệ" value={form.ratings.technology} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, technology: v } })} />
              <StarInput label="Cơ hội phát triển" value={form.ratings.careerGrowth} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, careerGrowth: v } })} />
              <StarInput label="Văn hóa công ty" value={form.ratings.culture} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, culture: v } })} />
              <StarInput label="Phúc lợi" value={form.ratings.benefits} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, benefits: v } })} />
              <StarInput label="Cân bằng công việc và cuộc sống" value={form.ratings.workLifeBalance} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, workLifeBalance: v } })} />
              <div className="pt-2 border-t">
                <StarInput label="Tổng thể" value={form.ratings.overall} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, overall: v } })} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </fieldset>

        <DialogFooter className="sticky -bottom-4 bg-background/95 backdrop-blur-md">
          <Button variant="outline" disabled={loading} onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Đang lưu...' : initialReview ? 'Lưu thay đổi' : 'Lưu & hoàn thành'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
