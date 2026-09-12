'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Star,
  GitCompareArrows,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  Filter,
  ThumbsUp,
  ThumbsDown,
  FileText,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { PostInterviewReviewModal } from '@/components/reviews/post-interview-review-modal';
import type { IInterviewReview } from '@/types';

interface ReviewItem extends Omit<IInterviewReview, 'createdAt' | 'updatedAt'> {
  interview?: { scheduledStart: string; type: string } | null;
  company?: { _id: string; name: string } | null;
  application?: { position: string } | null;
  createdAt: string;
  updatedAt: string;
}

const RESULT_CONFIG: Record<string, { label: string; color: string }> = {
  WAITING: { label: 'Waiting', color: 'bg-amber-100 text-amber-700' },
  PASSED: { label: 'Passed', color: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  OFFER: { label: 'Offer', color: 'bg-emerald-100 text-emerald-700' },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700' },
};

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function formatSalary(amount: number | null, currency: string): string {
  if (amount == null) return 'Chưa có';
  return `${amount.toLocaleString('vi-VN')} ${currency}`;
}

export default function ReviewsPage() {
  const [editing, setEditing] = useState<ReviewItem | null>(null);
  const [error, setError] = useState('');
  const requestVersion = React.useRef(0);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);

  const fetchReviews = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (resultFilter !== 'ALL') params.set('result', resultFilter);
      params.set('sort', sortBy === 'salary-high' ? 'salary-high' : sortBy === 'rating-high' ? 'rating-high' : sortBy);

      const res = await fetch(`/api/reviews?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được đánh giá');
      if (version !== requestVersion.current) return;
      setReviews(data.data || []);
      setSelectedIds((prev) => new Set([...prev].filter((id) => data.data.some((r: ReviewItem) => r._id === id))));
    } catch (error) {
      if (version === requestVersion.current) setError(error instanceof Error ? error.message : 'Không tải được đánh giá');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [resultFilter, sortBy]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const toggleSelect = (id: string) => {
    if (!selectedIds.has(id) && selectedIds.size >= 4) {
      toast.error('Chọn tối đa 4 job để so sánh');
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedReviews = reviews.filter((r) => selectedIds.has(r._id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews & Compare</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Chọn 2–4 job để đối chiếu mức lương, ưu nhược điểm và cảm nhận sau phỏng vấn.
          </p>
        </div>
        {selectedIds.size >= 2 && (
          <Button
            disabled={loading || !!error}
            onClick={() => { setCompareMode(true); requestAnimationFrame(() => document.getElementById('job-comparison')?.scrollIntoView({ block: 'start' })); }}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            <GitCompareArrows className="w-4 h-4" />
            Compare ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={resultFilter} onValueChange={(val) => val && setResultFilter(val)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue>{resultFilter === 'ALL' ? 'All Results' : RESULT_CONFIG[resultFilter]?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Results</SelectItem>
            <SelectItem value="WAITING">Waiting</SelectItem>
            <SelectItem value="PASSED">Passed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="OFFER">Offer</SelectItem>
            <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(val) => val && setSortBy(val)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue>{({ newest: 'Newest', oldest: 'Oldest', 'salary-high': 'Salary by currency', 'rating-high': 'Highest Rating' } as Record<string, string>)[sortBy]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="salary-high">Salary by currency</SelectItem>
            <SelectItem value="rating-high">Highest Rating</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compare Mode */}
      {!loading && !error && compareMode && selectedReviews.length >= 2 && (
        <Card id="job-comparison" className="shadow-lg border-indigo-200 scroll-mt-24 min-w-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitCompareArrows className="w-5 h-5 text-indigo-500" />
                Company Comparison
              </CardTitle>
              <Button aria-label="Đóng so sánh" variant="ghost" size="icon" onClick={() => setCompareMode(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Mức lương theo tháng. Đối chiếu cùng tiền tệ và Gross/Net; chưa quy đổi tỷ giá. Vuốt ngang để xem đầy đủ bảng.</p>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Bảng so sánh job">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-card min-w-[140px]">Criteria</TableHead>
                    {selectedReviews.map((r) => (
                      <TableHead key={r._id} className="text-center min-w-[160px]">
                        <div className="font-semibold">{r.company?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {r.application?.position}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: 'Lương trao đổi', value: (r: ReviewItem) => formatSalary(r.salaryDiscussed, r.currency) },
                    { label: 'Gross / Net', value: (r: ReviewItem) => r.salaryType === 'UNKNOWN' ? 'Chưa rõ' : r.salaryType },
                    { label: 'Thử việc', value: (r: ReviewItem) => `${r.probationSalary == null ? 'Chưa có' : r.probationSalary + '%'} ? ${r.probationDuration || 'Chưa rõ thời gian'}` },
                    { label: 'Phúc lợi', value: (r: ReviewItem) => r.benefits.join(', ') || 'Chưa ghi nhận' },
                  ].map(({ label, value }) => (
                    <TableRow key={label}>
                      <TableCell className="font-medium">{label}</TableCell>
                      {selectedReviews.map((r) => <TableCell key={r._id} className="text-center whitespace-normal min-w-44 max-w-72 break-words">{value(r)}</TableCell>)}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium">Expected Salary</TableCell>
                    {selectedReviews.map((r) => (
                      <TableCell key={r._id} className="text-center">
                        {formatSalary(r.expectedSalary, r.currency)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Offer</TableCell>
                    {selectedReviews.map((r) => (
                      <TableCell key={r._id} className="text-center font-semibold">
                        {formatSalary(r.companyOffer, r.currency)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {(['salary', 'location', 'technology', 'careerGrowth', 'culture', 'benefits', 'workLifeBalance'] as const).map((key) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium capitalize">
                        {key === 'careerGrowth' ? 'Career Growth' : key === 'workLifeBalance' ? 'Work-Life Balance' : key}
                      </TableCell>
                      {selectedReviews.map((r) => (
                        <TableCell key={r._id} className="text-center">
                          <div className="flex justify-center">
                            <StarRating value={r.ratings?.[key] || 0} />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-bold">Overall</TableCell>
                    {selectedReviews.map((r) => (
                      <TableCell key={r._id} className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-lg">{r.ratings?.overall ? r.ratings.overall.toFixed(1) : 'Chưa chấm'}</span>
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Result</TableCell>
                    {selectedReviews.map((r) => {
                      const config = RESULT_CONFIG[r.result] || RESULT_CONFIG.WAITING;
                      return (
                        <TableCell key={r._id} className="text-center">
                          <Badge className={config.color}>{config.label}</Badge>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Pros / Cons / Notes */}
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedReviews.map((r) => (
                <div key={r._id} className="space-y-3 min-w-0 break-words rounded-xl border bg-muted/20 p-4">
                  <h4 className="font-semibold text-sm">{r.company?.name}</h4>

                  {r.advantages.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-green-600 flex items-center gap-1 mb-1">
                        <ThumbsUp className="w-3 h-3" /> Pros
                      </div>
                      <ul className="text-xs space-y-0.5">
                        {r.advantages.map((a, i) => (
                          <li key={i} className="text-muted-foreground">• {a}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {r.disadvantages.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-1">
                        <ThumbsDown className="w-3 h-3" /> Cons
                      </div>
                      <ul className="text-xs space-y-0.5">
                        {r.disadvantages.map((d, i) => (
                          <li key={i} className="text-muted-foreground">• {d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {r.generalNotes && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                        <FileText className="w-3 h-3" /> Notes
                      </div>
                      <p className="text-xs text-muted-foreground">{r.generalNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review List */}
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
          <p>{error}</p><Button variant="outline" onClick={fetchReviews}>Thử lại</Button>
        </div>
      ) : loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold mb-1">No reviews yet</h3>
          <p className="text-sm text-muted-foreground">
            Hoàn thành phỏng vấn và lưu đánh giá để bắt đầu so sánh.
          </p>
          <Link className="inline-flex mt-4 text-primary underline underline-offset-4" href="/scheduler">Đi tới lịch phỏng vấn</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {reviews.map((review) => {
            const config = RESULT_CONFIG[review.result] || RESULT_CONFIG.WAITING;
            return (
              <Card
                key={review._id}
                className={`hover:shadow-md transition-all duration-200 ${
                  selectedIds.has(review._id) ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      aria-label={`Chọn ${review.company?.name} · ${review.application?.position} để so sánh`}
                      checked={selectedIds.has(review._id)}
                      onCheckedChange={() => toggleSelect(review._id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-foreground flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                            {review.company?.name || 'Unknown'}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Briefcase className="w-3.5 h-3.5 shrink-0" />
                            {review.application?.position || 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={config.color}>{config.label}</Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {review.interview?.scheduledStart && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(review.interview.scheduledStart), 'dd MMM yyyy')}
                          </span>
                        )}
                        {review.companyOffer && (
                          <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatSalary(review.companyOffer, review.currency)}
                          </span>
                        )}
                        {review.expectedSalary && !review.companyOffer && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Expected: {formatSalary(review.expectedSalary, review.currency)}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <StarRating value={review.ratings?.overall || 0} />
                          <span className="text-xs font-medium ml-1">
                            {review.ratings?.overall ? review.ratings.overall.toFixed(1) : 'Chưa chấm'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm break-words">
                        <div className="rounded-lg bg-green-50 p-3"><p className="font-medium text-green-700 mb-1">Ưu điểm</p><p className="whitespace-pre-wrap">{review.advantages.join('\n') || 'Chưa ghi nhận'}</p></div>
                        <div className="rounded-lg bg-red-50 p-3"><p className="font-medium text-red-700 mb-1">Nhược điểm</p><p className="whitespace-pre-wrap">{review.disadvantages.join('\n') || 'Chưa ghi nhận'}</p></div>
                      </div>
                      {review.generalNotes && <p className="mt-3 text-sm whitespace-pre-wrap break-words"><span className="font-medium">Ghi chú: </span>{review.generalNotes}</p>}
                      <Button variant="outline" className="mt-4 gap-2" onClick={() => setEditing(review)}><FileText className="w-4 h-4" />Xem / chỉnh sửa đánh giá</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {editing && <PostInterviewReviewModal
        key={editing._id} open initialReview={{ ...editing, createdAt: new Date(editing.createdAt), updatedAt: new Date(editing.updatedAt) }}
        onClose={() => setEditing(null)} onSaved={fetchReviews}
        interviewId={editing.interviewId} applicationId={editing.applicationId}
        companyId={editing.companyId} companyName={editing.company?.name || ''}
      />}
    </div>
  );
}
