import { motion } from 'framer-motion';
import { Calendar, Eye, HeartPulse, MoreVertical, Pencil, Phone, Trash2 } from 'lucide-react';
import type { Patient } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  calculateAge,
  cn,
  generateAvatarUrl,
  getInitials,
  getStatusColor,
  relativeTime,
} from '@/utils';

interface PatientCardProps {
  patient: Patient;
  index?: number;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patient: Patient) => void;
  onView?: (patient: Patient) => void;
  onStartTest?: (patient: Patient) => void;
}

export function PatientCard({ patient, index = 0, onEdit, onDelete, onView, onStartTest }: PatientCardProps) {
  const colors = getStatusColor(patient.status);
  const age = patient.birthDate ? calculateAge(patient.birthDate) : patient.age;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all"
    >
      {/* Status bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1', colors.dot)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-white shadow-elevated">
            <AvatarImage src={patient.photo ?? generateAvatarUrl(patient.fullName)} alt={patient.fullName} />
            <AvatarFallback>{getInitials(patient.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-base font-semibold text-foreground line-clamp-1">{patient.fullName}</h3>
            <p className="text-xs text-muted-foreground">
              {age} años · {patient.gender}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(patient)}>
              <Eye className="h-4 w-4" /> Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(patient)}>
              <Pencil className="h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => onDelete?.(patient)}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{patient.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">Última eval: {patient.lastEvaluation ? relativeTime(patient.lastEvaluation) : 'Sin evaluaciones'}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Badge variant={patient.status === 'normal' ? 'success' : patient.status === 'atencion' ? 'warning' : 'danger'}>
          <span className={cn('h-1.5 w-1.5 rounded-full mr-1', colors.dot)} />
          {colors.label}
        </Badge>
        <div className="flex gap-1.5">
          {onStartTest && (
            <Button variant="outline" size="sm" onClick={() => onStartTest(patient)}>
              Iniciar prueba
              <HeartPulse className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onView?.(patient)}>
            Ver perfil
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
