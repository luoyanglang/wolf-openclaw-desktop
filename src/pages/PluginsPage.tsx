// ═══════════════════════════════════════════════════════════
// PluginsPage — Plugin System for AEGIS Desktop
// Displays hidden/extra pages as interactive cards in a grid.
// Selecting a plugin renders it inline (no route navigation),
// with a back header and localStorage persistence.
// ═══════════════════════════════════════════════════════════

import { lazy, Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Gamepad2, Users, ScrollText, Radio,
  FolderOpen, Code2, Wrench,
  ArrowRight, ArrowLeft, Puzzle, Brain,
  LucideIcon,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { getDirection } from '@/i18n';
import clsx from 'clsx';

// ── Lazy-loaded plugin components ──────────────────────────
// Each entry maps a plugin id to its lazy-imported page component.
const pluginComponents: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  'pixel-agents': lazy(() =>
    import('@/pages/PixelAgents').then((m) => ({ default: m.PixelAgentsPage }))
  ),
  'sessions': lazy(() =>
    import('@/pages/SessionManager').then((m) => ({ default: m.SessionManagerPage }))
  ),
  'logs': lazy(() =>
    import('@/pages/LogsViewer').then((m) => ({ default: m.LogsViewerPage }))
  ),
  'multi-agent': lazy(() =>
    import('@/pages/MultiAgentView').then((m) => ({ default: m.MultiAgentViewPage }))
  ),
  'files': lazy(() =>
    import('@/pages/FileManager').then((m) => ({ default: m.FileManagerPage }))
  ),
  'sandbox': lazy(() =>
    import('@/pages/CodeInterpreter').then((m) => ({ default: m.CodeInterpreterPage }))
  ),
  'tools': lazy(() =>
    import('@/pages/McpTools').then((m) => ({ default: m.McpToolsPage }))
  ),

  'skills': lazy(() =>
    import('@/pages/SkillsPage').then((m) => ({ default: m.SkillsPage }))
  ),
  'memory': lazy(() =>
    import('@/pages/MemoryExplorer').then((m) => ({ default: m.MemoryExplorerPage }))
  ),
};

// ── Plugin definition ──────────────────────────────────────
interface Plugin {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

const plugins: Plugin[] = [
  {
    id: 'pixel-agents',
    name: 'Pixel Agents',
    icon: Gamepad2,
    description: 'Your virtual pixel art office',
  },
  {
    id: 'sessions',
    name: 'Session Manager',
    icon: Users,
    description: 'Manage active sessions',
  },
  {
    id: 'logs',
    name: 'Logs Viewer',
    icon: ScrollText,
    description: 'View system logs',
  },
  {
    id: 'multi-agent',
    name: 'Multi-Agent',
    icon: Radio,
    description: 'Live multi-agent view',
  },
  {
    id: 'files',
    name: 'File Manager',
    icon: FolderOpen,
    description: 'Browse and manage files',
  },
  {
    id: 'sandbox',
    name: 'Code Interpreter',
    icon: Code2,
    description: 'Code execution sandbox',
  },
  {
    id: 'tools',
    name: 'MCP Tools',
    icon: Wrench,
    description: 'Available MCP tools',
  },

  {
    id: 'skills',
    name: 'Skills',
    icon: Puzzle,
    description: 'Available skills and tools',
  },
  {
    id: 'memory',
    name: 'Memory Explorer',
    icon: Brain,
    description: 'Explore memory entries',
  },
];

// ── Animation variants ─────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

// ── PluginCard component ───────────────────────────────────
interface PluginCardProps {
  plugin: Plugin;
  onOpen: (id: string) => void;
}

function PluginCard({ plugin, onOpen }: PluginCardProps) {
  const Icon = plugin.icon;

  return (
    <motion.div
      variants={cardVariants}
      className={clsx(
        'group relative flex flex-col gap-4 p-5 rounded-2xl',
        'bg-aegis-elevated-solid border border-aegis-border',
        'transition-all duration-200',
        'hover:border-aegis-primary/40 hover:shadow-[0_0_20px_rgb(var(--aegis-primary)/0.08)]',
        'hover:-translate-y-0.5',
      )}
    >
      {/* Icon area */}
      <div
        className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          'bg-[rgb(var(--aegis-primary)/0.1)] border border-[rgb(var(--aegis-primary)/0.15)]',
          'transition-colors duration-200',
          'group-hover:bg-[rgb(var(--aegis-primary)/0.15)]',
        )}
      >
        <Icon size={22} className="text-aegis-primary" />
      </div>

      {/* Text content */}
      <div className="flex-1 flex flex-col gap-1">
        <h3 className="text-aegis-text font-semibold text-[14px] leading-snug">
          {plugin.name}
        </h3>
        <p className="text-aegis-text-muted text-[12px] leading-relaxed">
          {plugin.description}
        </p>
      </div>

      {/* Open button — passes plugin id, not route */}
      <button
        onClick={() => onOpen(plugin.id)}
        className={clsx(
          'mt-auto w-full py-2 rounded-xl text-[12px] font-medium',
          'border border-aegis-primary/30 text-aegis-primary',
          'transition-all duration-200',
          'hover:bg-aegis-primary hover:text-white hover:border-aegis-primary',
          'active:scale-[0.98]',
        )}
      >
        Open
      </button>
    </motion.div>
  );
}

// ── Loading fallback ───────────────────────────────────────
function PluginLoader() {
  return (
    <div className="flex items-center justify-center h-full gap-2 text-aegis-text-muted text-[13px]">
      {/* Spinning ring */}
      <span
        className="inline-block w-4 h-4 rounded-full border-2 border-aegis-primary/30 border-t-aegis-primary animate-spin"
        aria-hidden="true"
      />
      Loading…
    </div>
  );
}

// ── Main page export ───────────────────────────────────────
export function PluginsPage() {
  const { language } = useSettingsStore();
  const isRTL = getDirection(language) === 'rtl';
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Restore last active plugin from localStorage on mount
  const [activePlugin, setActivePlugin] = useState<string | null>(() =>
    localStorage.getItem('aegis-active-plugin')
  );

  // Persist active plugin to localStorage whenever it changes
  useEffect(() => {
    if (activePlugin) {
      localStorage.setItem('aegis-active-plugin', activePlugin);
    } else {
      localStorage.removeItem('aegis-active-plugin');
    }
  }, [activePlugin]);

  const handleOpen = (id: string) => {
    setActivePlugin(id);
  };

  const handleBack = () => {
    setActivePlugin(null);
  };

  // ── Active plugin view ─────────────────────────────────
  if (activePlugin) {
    const PluginComponent = pluginComponents[activePlugin];
    const pluginInfo = plugins.find((p) => p.id === activePlugin);
    const Icon = pluginInfo?.icon;

    return (
      <div className="flex flex-col h-full chrome-bg">
        {/* Back header */}
        <div className="shrink-0 px-4 py-2.5 border-b border-aegis-border flex items-center gap-3">
          {/* Back button — direction-aware arrow */}
          <button
            onClick={handleBack}
            className={clsx(
              'flex items-center justify-center w-7 h-7 rounded-lg',
              'text-aegis-text-muted transition-all duration-150',
              'hover:bg-aegis-elevated hover:text-aegis-text',
              'active:scale-95',
            )}
            aria-label="Back to Plugins"
          >
            <BackArrow size={16} />
          </button>

          {/* Plugin icon */}
          {Icon && <Icon size={16} className="text-aegis-primary shrink-0" />}

          {/* Plugin name */}
          <span className="text-aegis-text font-medium text-[13px] truncate">
            {pluginInfo?.name ?? activePlugin}
          </span>
        </div>

        {/* Plugin content fills remaining space */}
        <div className="flex-1 overflow-y-auto">
          {PluginComponent ? (
            <Suspense fallback={<PluginLoader />}>
              <PluginComponent />
            </Suspense>
          ) : (
            <div className="flex items-center justify-center h-full text-aegis-text-muted text-[13px]">
              Plugin component not found
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Plugin grid (default view) ─────────────────────────
  return (
    <div className="flex flex-col h-full chrome-bg">
      {/* Page header */}
      <div className="shrink-0 px-6 py-5 border-b border-aegis-border">
        <h1 className="text-aegis-text text-[18px] font-semibold">
          🧩 Plugins
        </h1>
        <p className="text-aegis-text-muted text-[13px] mt-0.5">
          Extra pages and tools available in AEGIS Desktop
        </p>
      </div>

      {/* Grid of plugin cards */}
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div
          className={clsx(
            'grid gap-4',
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
          )}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {plugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onOpen={handleOpen}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
