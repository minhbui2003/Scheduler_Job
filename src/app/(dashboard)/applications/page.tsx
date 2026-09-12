'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Briefcase,
  Building2,
  Calendar,
  Filter,
  Sparkles,
} from 'lucide-react';
import { CreateInterviewModal } from '@/components/scheduler/create-interview-modal';
import { EditJobModal } from '@/components/applications/edit-job-modal';
import { AIImportModal } from '@/components/scheduler/ai-import-modal';

interface ApplicationItem {
  _id: string;
  position: string;
  status: string;
  applicationDate: string;
  createdAt: string;
  notes: string;
  company?: { _id: string; name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  APPLIED: { label: 'Applied', color: 'bg-blue-100 text-blue-700' },
  INTERVIEW_SCHEDULED: { label: 'Interview Scheduled', color: 'bg-indigo-100 text-indigo-700' },
  INTERVIEWED: { label: 'Interviewed', color: 'bg-purple-100 text-purple-700' },
  WAITING_RESULT: { label: 'Waiting Result', color: 'bg-amber-100 text-amber-700' },
  OFFER: { label: 'Offer', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700' },
};

export default function ApplicationsPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const requestVersion = React.useRef(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [showCreate, setShowCreate] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchApplications = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoadError('');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('sort', sortBy);
      params.set('limit', '50');
      params.set('page', String(page));

      const res = await fetch(`/api/applications?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được dữ liệu. Vui lòng thử lại.');
      if (version === requestVersion.current) {
        setApplications(data.data?.data || []);
        setTotal(data.data?.total || 0);
      }
    } catch (error) {
      if (version === requestVersion.current) setLoadError(error instanceof Error ? error.message : 'Không tải được dữ liệu');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [search, statusFilter, sortBy, page]);

  useEffect(() => {
    const debounce = setTimeout(fetchApplications, 300);
    return () => clearTimeout(debounce);
  }, [fetchApplications]);

  useEffect(() => {
    const handleOpenAI = () => setShowAIImport(true);
    window.addEventListener('open-ai-import', handleOpenAI);
    return () => window.removeEventListener('open-ai-import', handleOpenAI);
  }, []);

  return (
    <div className="space-y-4">
      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{loadError}</p><Button variant="outline" onClick={fetchApplications}>Thử lại</Button></div>}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} application{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            <Plus className="w-4 h-4" />
            New Application
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by company or position..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => val && (setStatusFilter(val), setPage(1))}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="APPLIED">Applied</SelectItem>
            <SelectItem value="INTERVIEW_SCHEDULED">Interview Scheduled</SelectItem>
            <SelectItem value="INTERVIEWED">Interviewed</SelectItem>
            <SelectItem value="WAITING_RESULT">Waiting Result</SelectItem>
            <SelectItem value="OFFER">Offer</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(val) => val && (setSortBy(val), setPage(1))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Application Cards */}
      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold mb-1">No applications yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || statusFilter !== 'ALL'
              ? 'No applications match your filters'
              : "You haven't added any applications yet"}
          </p>
          {!search && statusFilter === 'ALL' && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Application
              </Button>
              <Button onClick={() => setShowAIImport(true)} className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600">
                <Sparkles className="w-4 h-4" />
                AI Import
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {applications.map((app) => {
            const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.APPLIED;
            return (
              <Card
                key={app._id}
                className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-1 basis-44 items-start gap-3 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 shrink-0">
                        <Building2 className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {app.company?.name || 'Unknown Company'}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 shrink-0" />
                          {app.position}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {format(new Date(app.applicationDate || app.createdAt), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
                      <Badge className={config.color}>{config.label}</Badge>
                      <Button variant="outline" size="sm" onClick={() => setEditingId(app._id)}>Chi tiết</Button>
                    </div>
                  </div>
                  {app.notes && <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap break-words">{app.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {total > 50 && <div className="flex flex-wrap items-center justify-center gap-3"><Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)}>Trang trước</Button><span className="text-sm">Trang {page} / {Math.ceil(total / 50)}</span><Button variant="outline" disabled={loading || page >= Math.ceil(total / 50)} onClick={() => setPage((p) => p + 1)}>Trang sau</Button></div>}
      {editingId && <EditJobModal key={editingId} applicationId={editingId} onClose={() => setEditingId(null)} onSaved={fetchApplications} />}
      {/* Modals */}
      {showCreate && (
        <CreateInterviewModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={fetchApplications}
        />
      )}
      {showAIImport && (
        <AIImportModal
          open={showAIImport}
          onClose={() => setShowAIImport(false)}
          onImported={() => {
            fetchApplications();
            setShowAIImport(false);
          }}
        />
      )}
    </div>
  );
}
