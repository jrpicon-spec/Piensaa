import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { navItems, iconMap } from '@/data/navigation';
import { cn } from '@/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';

export function Sidebar() {
  const { user } = useAuth();
  const { isCollapsed, toggle, isMobileOpen, setMobileOpen } = useSidebar();
  const location = useLocation();

  if (!user) return null;

  const items = navItems.filter((item) => item.roles.includes(user.role));

  const content = (
    <div
      className={cn(
        'flex h-full flex-col border-r border-border bg-white transition-all duration-300',
        isCollapsed ? 'w-[78px]' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl gradient-medical text-white shadow-elevated">
          <Activity className="h-5 w-5" />
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col overflow-hidden"
          >
            <span className="text-base font-semibold tracking-tight text-foreground">ReacciónVital</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Monitoreo Médico
            </span>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={100}>
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const Icon = iconMap[item.icon] ?? Activity;
              const isActive =
                location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              const link = (
                <NavLink
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-sky-50 text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-foreground',
                    isCollapsed && 'justify-center px-2',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                    />
                  )}
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors',
                      isActive ? 'text-primary' : 'text-slate-500 group-hover:text-sky-600',
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
              return (
                <li key={item.href}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </TooltipProvider>

      {/* Footer */}
      <div className="border-t border-border p-3">
        {!isCollapsed && (
          <div className="rounded-xl bg-gradient-to-br from-sky-50 to-emerald-50 p-3 mb-2">
            <p className="text-xs font-semibold text-foreground">Estado del sistema</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs text-muted-foreground">Todos los servicios operativos</span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className={cn(
            'hidden lg:flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-slate-50 transition',
            isCollapsed && 'justify-center',
          )}
          aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {isCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block sticky top-0 h-screen flex-shrink-0">{content}</aside>

      {/* Mobile */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <div className="relative h-full">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-white hover:bg-white/10"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" />
                </button>
                {content}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
