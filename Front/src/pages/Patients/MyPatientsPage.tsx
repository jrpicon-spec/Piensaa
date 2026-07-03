import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartPulse, Plus, Search, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { PageHeader, EmptyState } from '@/components/ui/PageHeader';
import { PatientCard } from '@/components/patients/PatientCard';
import { PatientFormModal } from '@/components/patients/PatientFormModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { patientsService, type Patient } from '@/services/patients.service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { PatientStatus } from '@/types';

export function MyPatientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PatientStatus>('all');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [toDelete, setToDelete] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await patientsService.findAll();
        setPatients(data);
      } catch {
        setPatients([]);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchData();
  }, [user]);

  if (!user) return null;

  const myPatients = patients.filter((p) => p.caregiverId === user.id);

  const filtered = myPatients.filter((p) => {
    const matchesSearch = p.fullName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSave = async (patient: Patient) => {
    try {
      if (editing) {
        const [nombre, ...apellidoParts] = patient.fullName.split(' ');
        const apellido = apellidoParts.join(' ');
        const updated = await patientsService.update(patient.id, {
          nombre,
          apellido,
          telefono: patient.phone,
          direccion: patient.address,
          responsable: patient.guardianName,
          observaciones: patient.notes,
          estado: patient.status,
        });
        setPatients((current) => current.map((p) => (p.id === patient.id ? updated : p)));
      } else {
        const [nombre, ...apellidoParts] = patient.fullName.split(' ');
        const apellido = apellidoParts.join(' ');
        const created = await patientsService.create({
          nombre,
          apellido,
          fecha_nacimiento: patient.birthDate,
          sexo: patient.gender,
          telefono: patient.phone,
          direccion: patient.address,
          responsable: patient.guardianName,
          observaciones: patient.notes,
          cuidador_id: user.id,
        });
        setPatients((current) => [created, ...current]);
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await patientsService.remove(toDelete.id);
      setPatients((current) => current.filter((p) => p.id !== toDelete.id));
      success('Paciente eliminado', `${toDelete.fullName} fue removido del sistema`);
      setToDelete(null);
    } catch (err) {
      throw err;
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis pacientes"
        description="Lista de pacientes asignados a tu cuidado. Registra nuevos pacientes y da seguimiento a su evolución."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo paciente
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <Stethoscope className="h-5 w-5 text-sky-600 mb-2" />
          <p className="text-xs text-sky-700">Asignados</p>
          <p className="text-2xl font-semibold text-sky-900">{myPatients.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <HeartPulse className="h-5 w-5 text-emerald-600 mb-2" />
          <p className="text-xs text-emerald-700">Normales</p>
          <p className="text-2xl font-semibold text-emerald-900">{myPatients.filter((p) => p.status === 'normal').length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <HeartPulse className="h-5 w-5 text-amber-600 mb-2" />
          <p className="text-xs text-amber-700">Atención</p>
          <p className="text-2xl font-semibold text-amber-900">{myPatients.filter((p) => p.status === 'atencion').length}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <HeartPulse className="h-5 w-5 text-rose-600 mb-2" />
          <p className="text-xs text-rose-700">Riesgo</p>
          <p className="text-2xl font-semibold text-rose-900">{myPatients.filter((p) => p.status === 'riesgo').length}</p>
        </div>
      </motion.div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-border bg-white p-3 shadow-card">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar pacientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-transparent bg-slate-50 focus-visible:bg-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[160px]">
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

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="No tienes pacientes asignados"
          description="Registra un nuevo paciente para iniciar el seguimiento."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo paciente
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, idx) => (
            <PatientCard
              key={p.id}
              patient={p}
              index={idx}
              onEdit={(pat) => {
                setEditing(pat);
                setModalOpen(true);
              }}
              onDelete={(pat) => setToDelete(pat)}
              onView={(pat) => navigate(`/patients/${pat.id}`)}
            />
          ))}
        </div>
      )}

      <PatientFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        patient={editing}
        onSave={handleSave}
      />

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Eliminar paciente</DialogTitle>
            <DialogDescription>
              ¿Eliminar a <strong>{toDelete?.fullName}</strong>? Esta acción no se puede deshacer.
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
