import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, ShieldCheck, Stethoscope, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader, EmptyState } from '@/components/ui/PageHeader';
import { UserCard } from '@/components/users/UserCard';
import { UserFormModal, type UserFormValues } from '@/components/users/UserFormModal';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { usersService, type ManagedUser } from '@/services/users.service';
import { useToast } from '@/contexts/ToastContext';

type RoleFilter = 'all' | 'admin' | 'cuidador';
type StatusFilter = 'all' | 'activo' | 'inactivo';

export function UsersPage() {
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [toDelete, setToDelete] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    usersService.findAll()
      .then(setUsers)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Error al cargar usuarios.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => users.filter((user) => {
    const term = search.trim().toLowerCase();
    return (!term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)) &&
      (role === 'all' || user.role === role) &&
      (status === 'all' || user.status === status);
  }), [users, search, role, status]);

  async function save(values: UserFormValues) {
    if (editing) {
      const updated = await usersService.update(editing.id, {
        nombre: values.name, email: values.email, telefono: values.phone,
        estado: values.status, rol: values.role,
      });
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
      success('Usuario actualizado', `${updated.name} fue actualizado correctamente.`);
    } else {
      const created = await usersService.create({
        nombre: values.name, email: values.email, password: values.password ?? '',
        telefono: values.phone, estado: values.status, rol: values.role,
      });
      setUsers((current) => [created, ...current]);
      success('Usuario creado', `${created.name} fue registrado correctamente.`);
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      await usersService.remove(toDelete.id);
      setUsers((current) => current.filter((user) => user.id !== toDelete.id));
      success('Usuario eliminado', `${toDelete.name} fue removido del sistema.`);
      setToDelete(null);
    } catch (err) {
      showError('No se pudo eliminar', err instanceof Error ? err.message : 'La operación fue rechazada.');
    }
  }

  if (loading) return <div className="p-6">Cargando usuarios…</div>;
  if (loadError) return <div className="p-6 text-rose-600">Error: {loadError}</div>;

  const admins = users.filter((user) => user.role === 'admin').length;
  const caregivers = users.filter((user) => user.role === 'cuidador').length;
  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios"
        description="Gestiona administradores y cuidadores del sistema."
        actions={<Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Total usuarios" value={users.length} icon={<Users className="h-5 w-5" />}
          className="border-sky-200 bg-sky-50 text-sky-800" />
        <Metric label="Administradores" value={admins} icon={<ShieldCheck className="h-5 w-5" />}
          className="border-violet-200 bg-violet-50 text-violet-800" />
        <Metric label="Cuidadores" value={caregivers} icon={<Stethoscope className="h-5 w-5" />}
          className="border-emerald-200 bg-emerald-50 text-emerald-800" />
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1 md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar usuarios..." value={search}
            onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select value={role} onValueChange={(value) => setRole(value as RoleFilter)}>
          <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
            <SelectItem value="cuidador">Cuidadores</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No se encontraron usuarios"
          description="Ajusta los filtros o registra un nuevo usuario."
          action={<Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Nuevo usuario
          </Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((user, index) => <UserCard key={user.id} user={user} index={index}
            onEdit={(selected) => { setEditing(selected); setModalOpen(true); }}
            onDelete={setToDelete} />)}
        </div>
      )}
      <UserFormModal open={modalOpen} onOpenChange={setModalOpen} user={editing} onSave={save} />
      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              ¿Confirma que desea eliminar a <strong>{toDelete?.name}</strong>?
              {toDelete?.role === 'cuidador' && (toDelete.patientsCount ?? 0) > 0 &&
                ' Primero deberá reasignar sus pacientes.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={remove}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, icon, className }: {
  label: string; value: number; icon: React.ReactNode; className: string;
}) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border p-4 ${className}`}>
    <div className="flex items-center justify-between">
      <div><p className="text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p></div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-elevated">{icon}</div>
    </div>
  </motion.div>;
}
