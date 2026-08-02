import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Stethoscope, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader, EmptyState } from '@/components/ui/PageHeader';
import { CaregiverCard } from '@/components/caregivers/CaregiverCard';
import { CaregiverFormModal } from '@/components/caregivers/CaregiverFormModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { usersService, type Caregiver } from '@/services/users.service';
import { useToast } from '@/contexts/ToastContext';

export function CaregiversPage() {
  const { success } = useToast();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Caregiver | null>(null);
  const [toDelete, setToDelete] = useState<Caregiver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await usersService.findAll();
        setCaregivers(data.filter((u) => u.role === 'cuidador'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = caregivers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()),
  );

  const totalActive = caregivers.filter((c) => c.status === 'activo').length;
  const totalPatients = caregivers.reduce((sum, c) => sum + (c.patientsCount ?? 0), 0);

  const handleSave = async (cg: Caregiver & { password?: string }) => {
    if (editing) {
        const updated = await usersService.update(cg.id, {
          nombre: cg.name,
          email: cg.email,
          telefono: cg.phone ?? '',
          estado: cg.status,
        });
        setCaregivers((current) => current.map((c) => (c.id === cg.id ? { ...c, ...updated } : c)));
      } else {
        const created = await usersService.create({
          email: cg.email,
          password: cg.password ?? '',
          nombre: cg.name,
          telefono: cg.phone ?? '',
          estado: cg.status,
          rol: 'cuidador',
        });
        setCaregivers((current) => [created, ...current]);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await usersService.remove(toDelete.id);
    setCaregivers((current) => current.filter((c) => c.id !== toDelete.id));
    success('Cuidador eliminado', `${toDelete.name} fue removido del sistema`);
    setToDelete(null);
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuidadores"
        description="Gestiona el equipo de cuidadores que registran y dan seguimiento a los pacientes."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo cuidador
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-white p-4 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total cuidadores</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{caregivers.length}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-primary">
              <Stethoscope className="h-5 w-5" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-lg border border-border bg-white p-4 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Activos</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{totalActive}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-border bg-white p-4 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pacientes asignados</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{totalPatients}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cuidadores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="No se encontraron cuidadores"
          description="Registra un nuevo cuidador para comenzar."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo cuidador
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((cg, idx) => (
            <CaregiverCard
              key={cg.id}
              caregiver={cg}
              index={idx}
              onEdit={(c) => {
                setEditing(c);
                setModalOpen(true);
              }}
              onDelete={(c) => setToDelete(c)}
            />
          ))}
        </div>
      )}

      <CaregiverFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        caregiver={editing}
        onSave={handleSave}
      />

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Eliminar cuidador</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a <strong>{toDelete?.name}</strong>? Los pacientes asignados quedarán sin cuidador.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
