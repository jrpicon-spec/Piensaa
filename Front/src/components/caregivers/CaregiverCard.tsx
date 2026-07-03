import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MoreVertical, Pencil, Phone, Trash2, UserPlus, Users } from 'lucide-react';
import type { Caregiver } from '@/types';
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
import { cn, getInitials, relativeTime } from '@/utils';

interface CaregiverCardProps {
  caregiver: Caregiver;
  index?: number;
  onEdit?: (caregiver: Caregiver) => void;
  onDelete?: (caregiver: Caregiver) => void;
}

export function CaregiverCard({ caregiver, index = 0, onEdit, onDelete }: CaregiverCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group rounded-2xl border border-border bg-white p-5 shadow-card hover:shadow-elevated transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-white shadow-elevated">
            <AvatarImage src={caregiver.avatar} alt={caregiver.name} />
            <AvatarFallback>{getInitials(caregiver.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-base font-semibold text-foreground">{caregiver.name}</h3>
            <p className="text-xs text-muted-foreground">Desde {relativeTime(caregiver.createdAt ?? new Date().toISOString())}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(caregiver)}>
              <Pencil className="h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => onDelete?.(caregiver)}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{caregiver.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{caregiver.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{caregiver.patientsCount} pacientes asignados</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <Badge variant={caregiver.status === 'activo' ? 'success' : 'muted'}>
          <span className={cn('h-1.5 w-1.5 rounded-full mr-1', caregiver.status === 'activo' ? 'bg-emerald-500' : 'bg-slate-400')} />
          {caregiver.status === 'activo' ? 'Activo' : 'Inactivo'}
        </Badge>
        <Button variant="ghost" size="sm">
          Ver pacientes
        </Button>
      </div>
    </motion.div>
  );
}
