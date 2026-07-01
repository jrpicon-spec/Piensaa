import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, History, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/PageHeader';
import { mockCaregivers, mockPatients, mockReactionRecords } from '@/data/mock';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatDate, getStatusColor } from '@/utils';
import { motion } from 'framer-motion';
import type { PatientStatus } from '@/types';

export function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | PatientStatus>('all');

  if (!user) return null;

  // Cuidador demo: c-001
  const caregiverId = 'c-001';
  const myPatientIds = mockPatients.filter((p) => p.caregiverId === caregiverId).map((p) => p.id);

  const records = useMemo(() => {
    return mockReactionRecords
      .filter((r) => myPatientIds.includes(r.patientId))
      .filter((r) => (status === 'all' ? true : r.status === status))
      .filter((r) => {
        if (!search) return true;
        const p = mockPatients.find((pp) => pp.id === r.patientId);
        return p?.fullName.toLowerCase().includes(search.toLowerCase()) ?? false;
      })
      .sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
  }, [search, status, myPatientIds]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial"
        description="Registro completo de evaluaciones realizadas a tus pacientes asignados."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-border bg-white p-3 shadow-card">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-transparent bg-slate-50 focus-visible:bg-white"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="normal">🟢 Normal</SelectItem>
            <SelectItem value="atencion">🟡 Atención</SelectItem>
            <SelectItem value="riesgo">🔴 Riesgo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title="Sin registros"
          description="No se encontraron evaluaciones para los filtros aplicados."
        />
      ) : (
        <div className="space-y-2">
          {records.slice(0, 30).map((r, idx) => {
            const p = mockPatients.find((pp) => pp.id === r.patientId);
            const cg = p?.caregiverId ? mockCaregivers.find((c) => c.id === p.caregiverId) : undefined;
            const colors = getStatusColor(r.status);
            return (
              <motion.button
                key={r.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => navigate(`/patients/${r.patientId}`)}
                className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-card hover:shadow-elevated transition text-left"
              >
                <div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-base font-semibold tabular-nums', colors.bg, colors.text)}>
                  {r.reactionMs}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p?.fullName ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.date)} · {r.time} {cg && `· ${cg.name}`}
                  </p>
                </div>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold', colors.bg, colors.text)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
                  {colors.label}
                </span>
                <Button variant="ghost" size="sm">Ver</Button>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
