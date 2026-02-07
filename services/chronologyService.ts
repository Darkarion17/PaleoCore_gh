
import type { DataPoint, TiePoint } from '../types';

/**
 * Calcula el modelo de edad basado en tie-points usando interpolación lineal por tramos
 */
export const applyAgeModel = (dataPoints: DataPoint[], tiePoints: TiePoint[]): DataPoint[] => {
    if (tiePoints.length < 2) return dataPoints;

    const sortedTiePoints = [...tiePoints].sort((a, b) => a.depth - b.depth);

    return dataPoints.map(dp => {
        if (dp.depth === undefined || dp.depth === null) return dp;
        
        const z = dp.depth;
        let age: number | undefined;

        let p1: TiePoint | null = null;
        let p2: TiePoint | null = null;

        for (let i = 0; i < sortedTiePoints.length; i++) {
            if (sortedTiePoints[i].depth <= z) p1 = sortedTiePoints[i];
            if (sortedTiePoints[i].depth > z) {
                p2 = sortedTiePoints[i];
                break;
            }
        }

        if (p1 && p2) {
            const fraction = (z - p1.depth) / (p2.depth - p1.depth);
            age = p1.age + fraction * (p2.age - p1.age);
        } else if (!p1 && p2) {
            const first = sortedTiePoints[0];
            const second = sortedTiePoints[1];
            const slope = (second.age - first.age) / (second.depth - first.depth);
            age = first.age - (first.depth - z) * slope;
        } else if (p1 && !p2) {
            const last = sortedTiePoints[sortedTiePoints.length - 1];
            const secondLast = sortedTiePoints[sortedTiePoints.length - 2];
            const slope = (last.age - secondLast.age) / (last.depth - secondLast.depth);
            age = last.age + (z - last.depth) * slope;
        }

        return {
            ...dp,
            age: age !== undefined ? parseFloat(age.toFixed(4)) : undefined
        };
    });
};

/**
 * Algoritmo DTW optimizado para Paleoceanografía (Sub-sequence matching)
 */
export const performDtwAlignment = (
    targetSeries: { depth: number; value: number }[],
    refSeries: { age: number; value: number }[]
): { depth: number; age: number }[] => {
    const n = refSeries.length; // Filas (Tiempo)
    const m = targetSeries.length; // Columnas (Profundidad)
    
    const normalize = (vals: number[]) => {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const std = Math.sqrt(vals.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / vals.length);
        return vals.map(v => std < 0.0001 ? 0 : (v - avg) / std);
    };

    const s = normalize(refSeries.map(r => r.value));
    const t = normalize(targetSeries.map(tr => tr.value));

    // Matriz de coste
    const DTW = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    
    // Inicialización para Sub-sequence DTW: 
    // El núcleo puede empezar en cualquier punto de la referencia (primeras filas a 0)
    for (let i = 0; i <= n; i++) DTW[i][0] = 0;

    // Cálculo con penalización por estancamiento (Slope Constraint)
    const gapPenalty = 0.5; 

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = Math.abs(s[i - 1] - t[j - 1]);
            // Preferimos diagonal (i-1, j-1) que significa avance proporcional
            DTW[i][j] = cost + Math.min(
                DTW[i - 1][j - 1],           // Diagonal (Match)
                DTW[i - 1][j] + gapPenalty,  // Vertical (Salto en tiempo)
                DTW[i][j - 1] + gapPenalty   // Horizontal (Salto en profundidad - PELIGROSO)
            );
        }
    }

    // Buscamos el mejor final en cualquier punto de la referencia (Open-End)
    let minFinalCost = Infinity;
    let bestI = n;
    for (let i = 1; i <= n; i++) {
        if (DTW[i][m] < minFinalCost) {
            minFinalCost = DTW[i][m];
            bestI = i;
        }
    }

    // Backtracking
    let i = bestI, j = m;
    const path: { depth: number; age: number }[] = [];
    
    while (i > 0 && j > 0) {
        // Solo guardamos puntos del path que representen cambios significativos o extremos locales
        // para evitar saturar de tie-points
        if (j % Math.max(1, Math.floor(m/8)) === 0 || (j === m) || (j === 1)) {
            path.push({ depth: targetSeries[j-1].depth, age: refSeries[i-1].age });
        }

        const diag = DTW[i-1][j-1];
        const vert = DTW[i-1][j];
        const horiz = DTW[i][j-1];

        if (diag <= vert && diag <= horiz) { i--; j--; }
        else if (vert < horiz) { i--; }
        else { j--; }
    }
    
    // Asegurar que no hay duplicados de profundidad y orden ascendente
    const uniquePath = Array.from(new Map(path.map(p => [p.depth, p])).values());
    return uniquePath.sort((a, b) => a.depth - b.depth);
};

export const calculateSedRates = (tiePoints: TiePoint[]) => {
    const sorted = [...tiePoints].sort((a, b) => a.depth - b.depth);
    const rates = [];

    for (let i = 0; i < sorted.length - 1; i++) {
        const p1 = sorted[i];
        const p2 = sorted[i + 1];
        const dAge = p2.age - p1.age;
        const dDepth = p2.depth - p1.depth;
        
        if (dAge <= 0 || dDepth <= 0) continue;

        const rate = (dDepth * 100) / dAge; // cm/ka
        rates.push({
            age: (p1.age + p2.age) / 2,
            rate: parseFloat(rate.toFixed(2))
        });
    }
    return rates;
};
