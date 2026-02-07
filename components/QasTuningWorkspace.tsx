
import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';
import { MousePointer2, Anchor, Trash2, Save, RefreshCw, TrendingUp, Info, Globe, Activity, Wand2, Loader2, Settings2 } from 'lucide-react';
import type { Section, TiePoint } from '../types';
import { LR04_DATA } from '../data/lr04';
import { applyAgeModel, calculateSedRates, performDtwAlignment } from '../services/chronologyService';

interface QasTuningWorkspaceProps {
    section: Section;
    proxyLabels: Record<string, string>;
    onSaveModel: (calibratedSection: Section) => void;
    setToast: (toast: any) => void;
}

const QasTuningWorkspace: React.FC<QasTuningWorkspaceProps> = ({ section, proxyLabels, onSaveModel, setToast }) => {
    const [pickingMode, setPickingMode] = useState<'none' | 'depth' | 'age'>('none');
    const [tempTiePoint, setTempTiePoint] = useState<{ depth: number | null, age: number | null }>({ depth: null, age: null });
    const [tiePoints, setTiePoints] = useState<TiePoint[]>(section.ageModel?.tiePoints || []);
    const [activeProxy, setActiveProxy] = useState('delta18O');
    const [viewMode, setViewMode] = useState<'depth' | 'age'>('depth');
    const [isSedRateExpanded, setIsSedRateExpanded] = useState(false);
    const [isAutoTuning, setIsAutoTuning] = useState(false);
    
    // Configuración del algoritmo
    const [maxAgeSearch, setMaxAgeSearch] = useState('150'); // Límite por defecto razonable (150 ka)

    useEffect(() => {
        setTiePoints(section.ageModel?.tiePoints || []);
    }, [section.id]);

    const availableProxies = useMemo(() => {
        const proxies = new Set<string>();
        section.dataPoints.forEach(dp => {
            Object.keys(dp).forEach(k => { if(typeof dp[k] === 'number' && k !== 'depth' && k !== 'age') proxies.add(k); });
        });
        return Array.from(proxies).sort();
    }, [section]);

    const calibratedData = useMemo(() => applyAgeModel(section.dataPoints, tiePoints), [section.dataPoints, tiePoints]);
    const sedRates = useMemo(() => calculateSedRates(tiePoints), [tiePoints]);

    const filteredLR04 = useMemo(() => {
        const limit = parseFloat(maxAgeSearch) || 5000;
        return LR04_DATA.filter(d => d.age <= limit);
    }, [maxAgeSearch]);

    const handleAutoTune = async () => {
        setIsAutoTuning(true);
        setToast({ message: "Sincronizando con LR04 (Sub-sequence DTW)...", type: 'info', show: true });
        
        await new Promise(resolve => setTimeout(resolve, 600));

        try {
            const targetSeries = section.dataPoints
                .filter(dp => dp.depth != null && typeof dp[activeProxy] === 'number')
                .map(dp => ({ depth: dp.depth!, value: dp[activeProxy] as number }));

            if (targetSeries.length < 5) throw new Error("Necesitas más datos en el núcleo para correlacionar.");

            const alignment = performDtwAlignment(targetSeries, filteredLR04.map(r => ({ age: r.age, value: r.d18O })));
            
            const newTiePoints: TiePoint[] = alignment.map((a, idx) => ({
                id: `dtw-${Date.now()}-${idx}`,
                sectionId: section.id,
                depth: a.depth,
                age: a.age
            }));

            setTiePoints(newTiePoints);
            setToast({ message: `Ajuste completado: ${newTiePoints.length} puntos encontrados.`, type: 'success', show: true });
            setViewMode('age');
        } catch (e: any) {
            setToast({ message: e.message, type: 'error', show: true });
        } finally {
            setIsAutoTuning(false);
        }
    };

    const handleChartClick = (data: any, type: 'depth' | 'age') => {
        if (pickingMode === 'none' || !data) return;
        const val = data.activeLabel;

        if (type === 'depth' && pickingMode === 'depth') {
            setTempTiePoint({ depth: val, age: null });
            setPickingMode('age');
            setToast({ message: `Profundidad ${val}m fijada. Ahora selecciona la edad en la curva superior.`, type: 'info', show: true });
        } else if (type === 'age' && pickingMode === 'age') {
            if (tempTiePoint.depth === null) return;
            const newPoint: TiePoint = {
                id: `tp-${Date.now()}`,
                sectionId: section.id,
                depth: tempTiePoint.depth,
                age: val
            };
            setTiePoints(prev => [...prev, newPoint].sort((a,b) => a.depth - b.depth));
            setTempTiePoint({ depth: null, age: null });
            setPickingMode('depth'); 
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full animate-fade-in text-slate-200">
            {/* Header Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 flex items-center justify-between bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                            <Anchor size={24} className="text-cyan-400" />
                        </div>
                        <div className="hidden sm:block">
                            <h3 className="text-lg font-black tracking-tighter text-white uppercase leading-none">Orbital Tuning Lab</h3>
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">DTW Engine v2.0 (Subsequence)</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                             <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Edad Máx. Búsqueda (ka)</label>
                             <input 
                                type="number" 
                                value={maxAgeSearch} 
                                onChange={e => setMaxAgeSearch(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs font-bold text-cyan-400 w-20 outline-none focus:ring-1 focus:ring-cyan-500"
                             />
                        </div>

                        <select 
                            value={activeProxy} 
                            onChange={e => setActiveProxy(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-xs font-bold text-orange-400 outline-none"
                        >
                            {availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                        </select>
                        
                        <button 
                            onClick={handleAutoTune}
                            disabled={isAutoTuning}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-500 transition-all disabled:opacity-50"
                            title="Auto-ajuste inteligente"
                        >
                            {isAutoTuning ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} />}
                            <span className="hidden md:inline">AUTO-TUNE</span>
                        </button>

                        <button 
                            onClick={() => {
                                const newMode = pickingMode === 'none' ? 'depth' : 'none';
                                setPickingMode(newMode);
                                if (newMode === 'none') setTempTiePoint({ depth: null, age: null });
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all ${pickingMode !== 'none' ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                        >
                            <MousePointer2 size={16} />
                            <span className="hidden md:inline">{pickingMode === 'none' ? 'MANUAL' : 'PARAR'}</span>
                        </button>
                        
                        <button 
                            onClick={() => onSaveModel({ ...section, dataPoints: calibratedData, ageModel: { tiePoints } })}
                            className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
                            title="Guardar modelo de edad"
                        >
                            <Save size={20} />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700 flex items-center justify-around shadow-xl">
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Tie-Points</p>
                        <p className="text-2xl font-black text-cyan-400">{tiePoints.length}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-700" />
                    <button onClick={() => setViewMode(viewMode === 'depth' ? 'age' : 'depth')} className="flex flex-col items-center group">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Eje X</p>
                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1 group-hover:scale-110 transition-transform"><RefreshCw size={12} /> {viewMode.toUpperCase()}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow overflow-hidden">
                <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto">
                    
                    {/* REFERENCIA */}
                    <div className={`bg-slate-950 p-6 rounded-3xl border-2 transition-all relative h-[280px] flex-shrink-0 ${pickingMode === 'age' ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-slate-800'}`}>
                        <div className="absolute top-4 left-6 z-10 flex items-center gap-2 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700">
                            <Globe size={12} className="text-cyan-400" />
                            <span className="text-[10px] font-black uppercase text-slate-300">LR04 Benthic Stack ({maxAgeSearch} ka)</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={filteredLR04} onClick={(d) => handleChartClick(d, 'age')} style={{ cursor: pickingMode === 'age' ? 'crosshair' : 'default' }}>
                                <CartesianGrid strokeDasharray="1 4" vertical={false} stroke="#334155" />
                                <XAxis dataKey="age" hide reversed />
                                <YAxis hide domain={['auto', 'auto']} reversed />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px'}} 
                                    labelFormatter={(v)=>`Edad: ${v} ka`} 
                                    itemStyle={{color: '#22d3ee'}}
                                />
                                <Line type="monotone" dataKey="d18O" stroke="#22d3ee" strokeWidth={3} dot={false} isAnimationActive={false} />
                                {tiePoints.map(tp => (
                                    <ReferenceLine key={tp.id} x={tp.age} stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* NÚCLEO */}
                    <div className={`bg-slate-950 p-6 rounded-3xl border-2 transition-all relative h-[400px] flex-shrink-0 ${pickingMode === 'depth' ? 'border-cyan-500 ring-4 ring-cyan-500/20' : 'border-slate-800'}`}>
                        <div className="absolute top-4 left-6 z-10 flex gap-2">
                             <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700">
                                <Activity size={12} className="text-orange-400" />
                                <span className="text-[10px] font-black uppercase text-slate-300">
                                    {isSedRateExpanded ? 'Diagnóstico: Sedimentation Rate' : `Núcleo: ${section.name}`}
                                </span>
                            </div>
                        </div>
                        
                        <ResponsiveContainer width="100%" height="100%">
                            {isSedRateExpanded ? (
                                <AreaChart data={sedRates}>
                                    <CartesianGrid strokeDasharray="1 4" stroke="#334155" />
                                    <XAxis dataKey="age" tick={{fill: '#94a3b8', fontSize: 10}} reversed />
                                    <YAxis tick={{fill: '#94a3b8', fontSize: 10}} />
                                    <Area type="stepAfter" dataKey="rate" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={3} />
                                    <Tooltip />
                                </AreaChart>
                            ) : (
                                <LineChart data={calibratedData} onClick={(d) => handleChartClick(d, 'depth')} style={{ cursor: pickingMode === 'depth' ? 'crosshair' : 'default' }}>
                                    <CartesianGrid strokeDasharray="1 4" stroke="#334155" />
                                    <XAxis dataKey={viewMode === 'depth' ? 'depth' : 'age'} reversed={viewMode === 'age'} tick={{fill: '#94a3b8', fontSize: 11}} label={{value: viewMode === 'depth' ? 'mbsf' : 'ka', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10}} />
                                    <YAxis tick={{fill: '#94a3b8', fontSize: 11}} domain={['auto', 'auto']} reversed={activeProxy.includes('delta18O')} />
                                    <Tooltip contentStyle={{backgroundColor: '#020617', border: 'none'}} />
                                    <Line type="monotone" dataKey={activeProxy} stroke="#fb923c" strokeWidth={3} dot={{ r: 3, fill: '#fb923c' }} isAnimationActive={false} />
                                    {tiePoints.map(tp => (
                                        <ReferenceLine key={tp.id} x={viewMode === 'depth' ? tp.depth : tp.age} stroke="#f43f5e" strokeWidth={2} />
                                    ))}
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sidebar Controles */}
                <div className="flex flex-col gap-4">
                    <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-700 flex flex-col h-[320px] shadow-xl">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                            <TrendingUp size={14} className="text-cyan-400"/> TIE-POINTS ({tiePoints.length})
                        </h4>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                            {tiePoints.length > 0 ? tiePoints.map((tp) => (
                                <div key={tp.id} className="group flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-700 hover:border-cyan-500/50 transition-all">
                                    <div className="font-mono text-[10px] space-y-0.5">
                                        <div className="text-cyan-400 font-bold">Prof: {tp.depth.toFixed(2)}m</div>
                                        <div className="text-emerald-400 font-bold">Edad: {tp.age.toFixed(1)}ka</div>
                                    </div>
                                    <button onClick={() => setTiePoints(prev => prev.filter(p => p.id !== tp.id))} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-slate-600 text-xs italic">Usa Auto-Tune o haz clic en los gráficos para añadir puntos.</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-700 shadow-xl flex flex-col">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2"><Settings2 size={12}/> Diagnóstico</h4>
                        <div className="text-3xl font-black text-emerald-400 leading-tight">
                            {sedRates.length > 0 ? (sedRates.reduce((a,b)=>a+b.rate, 0)/sedRates.length).toFixed(1) : '0'}
                            <span className="text-xs ml-1 text-slate-500">cm/ka</span>
                        </div>
                        <p className="text-[9px] text-slate-500 mb-4 uppercase">Tasa de Sedimentación Media</p>
                        <button onClick={()=>setIsSedRateExpanded(!isSedRateExpanded)} className={`w-full py-2 rounded-xl text-[10px] font-black transition-colors uppercase ${isSedRateExpanded ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                            {isSedRateExpanded ? 'Cerrar Diagnóstico' : 'Ver Gráfico de Tasas'}
                        </button>
                    </div>

                    <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                        <div className="flex gap-3">
                            <Info size={16} className="text-indigo-400 flex-shrink-0" />
                            <p className="text-[9px] text-slate-400 leading-normal">
                                <strong>Nota científica:</strong> El algoritmo de sub-secuencia ahora busca el mejor tramo de LR04 limitado por tu edad máxima, ignorando el resto de la base de datos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QasTuningWorkspace;
