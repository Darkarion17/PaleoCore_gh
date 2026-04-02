import React from 'react';
import { BarChart3, Database, Folder, Map as MapIcon, Microscope, PlusCircle, TrendingUp, Clock, Star, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { Core, Folder as FolderType, Section } from '../types';

interface HomeDashboardProps {
  cores: Core[];
  folders: FolderType[];
  sections: Section[];
  onNavigate: (view: any) => void;
  onSelectCore: (core: Core) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ cores, folders, sections, onNavigate, onSelectCore }) => {
  const recentCores = [...cores].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  }).slice(0, 4);

  const stats = [
    { label: 'Total Cores', value: cores.length, icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Folders', value: folders.length, icon: Folder, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Sections', value: sections.length, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Microfossils', value: sections.reduce((acc, s) => acc + (s.microfossilRecords?.length || 0), 0), icon: Microscope, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col gap-2">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-black tracking-tight text-content-primary"
        >
          Welcome back, <span className="text-accent-primary">Researcher</span>
        </motion.h1>
        <p className="text-content-muted font-medium">Manage your paleoceanographic data and age models with precision.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-3xl bg-background-secondary border border-border-primary/50 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <div className="text-3xl font-black text-content-primary mb-1">{stat.value}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-content-muted">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-widest text-content-primary flex items-center gap-2">
              <Clock size={20} className="text-accent-primary" />
              Recent Cores
            </h2>
            <button 
              onClick={() => onNavigate('explorer')}
              className="text-xs font-black uppercase tracking-tighter text-accent-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentCores.length > 0 ? (
              recentCores.map((core, i) => (
                <motion.button
                  key={core.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  onClick={() => onSelectCore(core)}
                  className="p-5 rounded-[2rem] bg-background-secondary border border-border-primary/50 hover:border-accent-primary/30 hover:shadow-lg transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Star size={16} className="text-accent-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-primary">{core.project}</span>
                    <h3 className="text-lg font-black text-content-primary truncate">{core.id}</h3>
                    <p className="text-xs text-content-muted truncate">{core.name}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-content-muted uppercase">
                    <MapIcon size={12} />
                    <span>{core.location.lat.toFixed(2)}°, {core.location.lon.toFixed(2)}°</span>
                  </div>
                </motion.button>
              ))
            ) : (
              <div className="col-span-2 p-12 rounded-[2rem] border-2 border-dashed border-border-primary/50 flex flex-col items-center justify-center text-center">
                <Database size={48} className="text-content-muted/20 mb-4" />
                <p className="text-content-muted font-bold uppercase tracking-widest text-xs">No cores found yet</p>
                <button 
                  onClick={() => onNavigate('explorer')}
                  className="mt-4 px-6 py-2 rounded-full bg-accent-primary text-white text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all"
                >
                  Create your first core
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-widest text-content-primary flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            Quick Actions
          </h2>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Explore All Cores', icon: Database, view: 'explorer', color: 'bg-blue-500' },
              { label: 'Global Map View', icon: MapIcon, view: 'map', color: 'bg-emerald-500' },
              { label: 'Image AI Analysis', icon: ImageIcon, view: 'imageAnalysis', color: 'bg-purple-500' },
              { label: 'Micropaleontology Wiki', icon: Microscope, view: 'wiki', color: 'bg-orange-500' },
            ].map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                onClick={() => onNavigate(action.view)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-background-secondary border border-border-primary/50 hover:bg-background-tertiary transition-all group"
              >
                <div className={`p-2 rounded-xl ${action.color} text-white group-hover:scale-110 transition-transform`}>
                  <action.icon size={18} />
                </div>
                <span className="text-sm font-bold text-content-primary">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
