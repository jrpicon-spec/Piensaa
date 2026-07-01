import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Eye } from 'lucide-react';
import type { Patient } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getInitials, getStatusColor, relativeTime } from '@/utils';

interface PatientListCardProps {
  patients: Patient[];
  limit?: number;
  title?: string;
  description?: string;
  showViewAll?: boolean;
}

export function PatientListCard({
  patients,
  limit = 5,
  title = 'Pacientes destacados',
  description = 'Pacientes con evaluaciones recientes',
  showViewAll = true,
}: PatientListCardProps) {
  const navigate = useNavigate();
  const data = patients.slice(0, limit);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {showViewAll && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/patients')}>
            Ver todos
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-2 flex-1">
        {data.map((p, idx) => {
          const colors = getStatusColor(p.status);
          return (
            <motion.button
              key={p.id}
              type="button"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => navigate(`/patients/${p.id}`)}
              className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left hover:border-border hover:bg-slate-50 transition"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={p.photo} alt={p.fullName} />
                <AvatarFallback>{getInitials(p.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{p.fullName}</p>
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{p.age} años</span>
                  {p.lastEvaluation && (
                    <>
                      <span>•</span>
                      <span>Última eval: {relativeTime(p.lastEvaluation)}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant={p.status === 'normal' ? 'success' : p.status === 'atencion' ? 'warning' : 'danger'}>
                {colors.label}
              </Badge>
              <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
