import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  ChevronDown,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { getInitials } from '@/utils';
import { mockAlerts } from '@/data/mock';
import type { UserRole } from '@/types';

export function Topbar() {
  const { user, logout, switchRole } = useAuth();
  const { setMobileOpen } = useSidebar();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  if (!user) return null;

  const unreadAlerts = mockAlerts.filter((a) => !a.resolved).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar pacientes, dispositivos..."
              className="pl-9 bg-slate-50 border-transparent focus-visible:bg-white"
            />
          </div>
        </div>

        {/* Mobile search toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden ml-auto"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {/* Role badge */}
          <Badge variant={user.role === 'admin' ? 'info' : 'success'} className="hidden sm:flex">
            {user.role === 'admin' ? (
              <>
                <ShieldCheck className="h-3 w-3" /> Administrador
              </>
            ) : (
              <>
                <Stethoscope className="h-3 w-3" /> Cuidador
              </>
            )}
          </Badge>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
                <Bell className="h-5 w-5" />
                {unreadAlerts > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                    {unreadAlerts}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificaciones recientes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {mockAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <div
                      className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
                        alert.type === 'critical'
                          ? 'bg-rose-500'
                          : alert.type === 'warning'
                          ? 'bg-amber-500'
                          : alert.type === 'success'
                          ? 'bg-emerald-500'
                          : 'bg-sky-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 rounded-full border border-border bg-white p-1 pr-3 text-sm hover:bg-slate-50 transition"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[120px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{user.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Cambiar rol (demo)
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => switchRole('admin' satisfies UserRole)}>
                <ShieldCheck className="h-4 w-4 text-sky-600" /> Administrador
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchRole('caregiver' satisfies UserRole)}>
                <Stethoscope className="h-4 w-4 text-emerald-600" /> Cuidador
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserCog className="h-4 w-4" /> Mi perfil
              </DropdownMenuItem>
              {user.role === 'admin' && (
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4" /> Configuración
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
