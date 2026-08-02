import { motion } from 'framer-motion';
import { Mail, MoreVertical, Pencil, Phone, ShieldCheck, Trash2, Users } from 'lucide-react';
import type { ManagedUser } from '@/services/users.service';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { cn, getInitials, relativeTime } from '@/utils';

export function UserCard({ user, index, onEdit, onDelete }: {
  user: ManagedUser; index: number;
  onEdit: (user: ManagedUser) => void; onDelete: (user: ManagedUser) => void;
}) {
  const caregiver = user.role === 'cuidador';
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.18 }}
      className="rounded-lg border border-border bg-white p-4 shadow-card transition-colors duration-200 hover:border-slate-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12"><AvatarFallback>{getInitials(user.name)}</AvatarFallback></Avatar>
          <div>
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-xs text-muted-foreground">
              {user.createdAt ? `Desde ${relativeTime(user.createdAt)}` : 'Fecha no disponible'}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(user)}><Pencil className="h-4 w-4" /> Editar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => onDelete(user)}><Trash2 className="h-4 w-4" /> Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span className="truncate">{user.email}</span></div>
        {user.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{user.phone}</div>}
        <div className="flex items-center gap-2">
          {caregiver ? <Users className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {caregiver ? `${user.patientsCount ?? 0} pacientes asignados` : 'Acceso administrativo'}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex gap-2">
          <Badge className={caregiver ? 'border-blue-200 bg-blue-50 text-[#2563EB]' : 'border-red-200 bg-red-50 text-[#C62828]'}>
            {caregiver ? 'Cuidador' : 'Administrador'}
          </Badge>
          <Badge variant={user.status === 'activo' ? 'success' : 'muted'}>
            <span className={cn('mr-1 h-1.5 w-1.5 rounded-full', user.status === 'activo' ? 'bg-emerald-500' : 'bg-slate-400')} />
            {user.status === 'activo' ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
        {caregiver && <Button variant="ghost" size="sm"
          onClick={() => window.location.assign(`/patients?caregiver=${user.id}`)}>
          Ver pacientes
        </Button>}
      </div>
    </motion.div>
  );
}
