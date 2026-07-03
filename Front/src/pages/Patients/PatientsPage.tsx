import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, Plus, Search, Users } from 'lucide-react';
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
import { usersService, type Caregiver } from '@/services/users.service';
import { useToast } from '@/contexts/ToastContext';
import type { PatientStatus } from '@/types';

export function PatientsPage() {
  const navigate = useNavigate();
  const { success } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PatientStatus>('all');
  const [caregiverFilter, setCaregiverFilter] = useState<'all' | string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [patientsData, caregiversData] = await Promise.all([
          patientsService.findAll(),
          usersService.findAll(),
        ]);
        setPatients(patientsData);
        setCaregivers(caregiversData.filter((c) => c.role === 'cuidador'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.guardianName.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesCaregiver = caregiverFilter === 'all' || p.caregiverId === caregiverFilter;
    return matchesSearch && matchesStatus && matchesCaregiver;
  });

  const counts = {
    total: patients.length,
    normal: patients.filter((p) => p.status === 'normal').length,
    atencion: patients.filter((p) => p.status === 'atencion').length,
    riesgo: patients.filter((p) => p.status === 'riesgo').length,
  };

  const handleSave = async (patient: Patient) => {
    try {
      if (editingPatient) {
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
        });
        setPatients((current) => [created, ...current]);
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!patientToDelete) return;
    try {
      await patientsService.remove(patientToDelete.id);
      setPatients((current) => current.filter((p) => p.id !== patientToDelete.id));
      success('Paciente eliminado', `${patientToDelete.fullName} fue removido del sistema`);
      setPatientToDelete(null);
    } catch (err) {
      throw err;
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description="Gestiona el registro de adultos mayores bajo cuidado. Los cuidadores son quienes registran a los pacientes."
        actions={
          <Button
            onClick={() => {
              setEditingPatient(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo paciente
          </Button>
        }
      />

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'bg-sky-50 text-sky-700 border-sky-200' },
          { label: 'Normal', value: counts.normal, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Atención', value: counts.atencion, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Riesgo', value: counts.riesgo, color: 'bg-rose-50 text-rose-700 border-rose-200' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`rounded-xl border p-3 ${stat.color}`}
          >
            <p className="text-xs font-medium opacity-80">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-border bg-white p-3 shadow-card">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, familiar o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-transparent bg-slate-50 focus-visible:bg-white"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[140px]">
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
          <Select value={caregiverFilter} onValueChange={setCaregiverFilter}>
            <SelectTrigger className="w-[180px]">
              <Users className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Cuidador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los cuidadores</SelectItem>
              {caregivers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Patients grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No se encontraron pacientes"
          description="Intenta ajustar los filtros o registra un nuevo paciente."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo paciente
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((patient, idx) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              index={idx}
              onEdit={(p) => {
                setEditingPatient(p);
                setModalOpen(true);
              }}
              onDelete={(p) => setPatientToDelete(p)}
              onView={(p) => navigate(`/patients/${p.id}`)}
            />
          ))}
        </div>
      )}

      <PatientFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        patient={editingPatient}
        onSave={handleSave}
      />

      <Dialog open={!!patientToDelete} onOpenChange={(open) => !open && setPatientToDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Eliminar paciente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a{' '}
              <strong>{patientToDelete?.fullName}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPatientToDelete(null)}>
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
