import React, { useState, useMemo } from 'react';
import type { Section, Microfossil } from '../types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { Wand2, Loader2, SlidersHorizontal, AlertCircle } from 'lucide-react';

interface PcaAnalysisProps {
    section: Section;
    microfossils: Microfossil[];
}

const runPcaMath = (dataMatrix: { depth: number, [speciesId: string]: number }[]) => {
    // 1. Prepare matrix
    const speciesIds = Object.keys(dataMatrix[0]).filter(k => k !== 'depth');
    let X = dataMatrix.map(sample => speciesIds.map(id => sample[id]));
    const n = X.length; // samples
    const m = X[0].length; // species

    // 2. Standardize data (z-score)
    const means = Array(m).fill(0);
    for(let j=0; j<m; j++) {
        for(let i=0; i<n; i++) means[j] += X[i][j];
        means[j] /= n;
    }
    const stdDevs = Array(m).fill(0);
    for(let j=0; j<m; j++) {
        for(let i=0; i<n; i++) stdDevs[j] += (X[i][j] - means[j])**2;
        stdDevs[j] = Math.sqrt(stdDevs[j] / (n-1));
        if (stdDevs[j] === 0) stdDevs[j] = 1; // Avoid division by zero
    }
    for(let i=0; i<n; i++) {
        for(let j=0; j<m; j++) {
            X[i][j] = (X[i][j] - means[j]) / stdDevs[j];
        }
    }

    // 3. Covariance Matrix
    const Xt = Array(m).fill(0).map(() => Array(n).fill(0));
    for(let i=0; i<n; i++) for(let j=0; j<m; j++) Xt[j][i] = X[i][j];
    
    const cov = Array(m).fill(0).map(() => Array(m).fill(0));
    for(let i=0; i<m; i++) {
        for(let j=0; j<m; j++) {
            for(let k=0; k<n; k++) {
                cov[i][j] += Xt[i][k] * X[k][j];
            }
            cov[i][j] /= (n-1);
        }
    }
    
    // 4. Eigenvalue/Eigenvector (simplified for 2 components) using Power Iteration
    const powerIteration = (matrix: number[][], iterations = 100) => {
        let b_k = Array(matrix.length).fill(1).map(() => Math.random());
        for(let iter=0; iter<iterations; iter++) {
            let Ab_k = Array(matrix.length).fill(0);
            for(let i=0; i<matrix.length; i++) for(let j=0; j<matrix.length; j++) Ab_k[i] += matrix[i][j] * b_k[j];
            
            let norm = Math.sqrt(Ab_k.reduce((acc, val) => acc + val*val, 0));
            b_k = Ab_k.map(val => val / norm);
        }
        
        let lambda_num = 0, lambda_den = 0;
        let Ab_k = Array(matrix.length).fill(0);
        for(let i=0; i<matrix.length; i++) for(let j=0; j<matrix.length; j++) Ab_k[i] += matrix[i][j] * b_k[j];
        for(let i=0; i<matrix.length; i++) {
            lambda_num += Ab_k[i] * b_k[i];
            lambda_den += b_k[i] * b_k[i];
        }
        
        return { eigenvalue: lambda_num / lambda_den, eigenvector: b_k };
    };

    const { eigenvalue: lambda1, eigenvector: v1 } = powerIteration(cov);
    
    // Deflation to find second component
    const B = JSON.parse(JSON.stringify(cov));
    for(let i=0; i<m; i++) for(let j=0; j<m; j++) B[i][j] -= lambda1 * v1[i] * v1[j];
    
    const { eigenvector: v2 } = powerIteration(B);
    
    const eigenvectors = [v1, v2];

    // 5. Project data
    const scores = X.map(row => {
        return {
            PC1: row.reduce((acc, val, i) => acc + val * eigenvectors[0][i], 0),
            PC2: row.reduce((acc, val, i) => acc + val * eigenvectors[1][i], 0),
        };
    });

    // 6. Combine with depth and return
    return scores.map((score, i) => ({
        ...score,
        depth: dataMatrix[i].depth
    }));
};


const PcaAnalysis: React.FC<PcaAnalysisProps> = ({ section, microfossils }) => {
    const [results, setResults] = useState<{ PC1: number; PC2: number; depth: number }[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tickFormatter = (value: any) => typeof value === 'number' ? parseFloat(value.toFixed(3)) : value;

    const { countingDataAvailable, minSamples, minSpecies } = useMemo(() => {
        const minSamplesRequired = 3;
        const minSpeciesRequired = 2;

        if (!section.dataPoints || section.dataPoints.length < minSamplesRequired) {
            return { countingDataAvailable: false, minSamples: minSamplesRequired, minSpecies: minSpeciesRequired };
        }

        const speciesWithData = new Set<string>();
        let samplesWithDataCount = 0;

        section.dataPoints.forEach(dp => {
            let sampleHasData = false;
            Object.entries(dp).forEach(([key, value]) => {
                if (key.endsWith('_count') && typeof value === 'number' && value > 0) {
                    speciesWithData.add(key.replace('_count', ''));
                    sampleHasData = true;
                }
            });
            if (sampleHasData) {
                samplesWithDataCount++;
            }
        });

        return {
            countingDataAvailable: samplesWithDataCount >= minSamplesRequired && speciesWithData.size >= minSpeciesRequired,
            minSamples: minSamplesRequired,
            minSpecies: minSpeciesRequired,
        };
    }, [section.dataPoints]);

    const handleRunAnalysis = async () => {
        setIsLoading(true);
        setResults(null);
        setError(null);

        // Use a timeout to allow the UI to update to the loading state
        setTimeout(() => {
            try {
                // 1. Extract data matrix
                const speciesWithData = new Set<string>();
                const dataMatrix = section.dataPoints
                    .map(dp => {
                        const sample: { depth: number; [speciesId: string]: number } = { depth: dp.depth! };
                        let hasData = false;
                        
                        Object.keys(dp).forEach(key => {
                            if (key.endsWith('_count')) {
                                const speciesId = key.replace('_count', '');
                                const count = dp[key] as number;
                                sample[speciesId] = count || 0;
                                if (count > 0) {
                                    hasData = true;
                                    speciesWithData.add(speciesId);
                                }
                            }
                        });

                        return hasData ? sample : null;
                    })
                    .filter(Boolean) as { depth: number; [speciesId: string]: number }[];

                // Ensure all samples have all species columns, even if zero
                const finalMatrix = dataMatrix.map(sample => {
                    const completeSample = { ...sample };
                    speciesWithData.forEach(speciesId => {
                        if (!(speciesId in completeSample)) {
                            completeSample[speciesId] = 0;
                        }
                    });
                    return completeSample;
                });
                
                if (finalMatrix.length < 3 || speciesWithData.size < 2) {
                    throw new Error('PCA requires at least 3 samples and 2 species with counting data.');
                }

                const pcaResults = runPcaMath(finalMatrix);
                setResults(pcaResults);

            } catch (err: any) {
                setError(err.message || "An unknown error occurred during PCA analysis.");
            } finally {
                setIsLoading(false);
            }
        }, 50); // Small delay for UI update
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2">
                <SlidersHorizontal size={20} className="text-accent-primary" /> Principal Component Analysis (PCA)
            </h3>
            <p className="text-sm text-content-muted">Analyze microfossil assemblage data to identify the main patterns of variation between samples. This requires numerical counts for at least 2 species across at least 3 samples.</p>
            <button
                onClick={handleRunAnalysis}
                disabled={isLoading || !countingDataAvailable}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50"
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <SlidersHorizontal size={16} />}
                Run PCA
            </button>
             {!countingDataAvailable && (
                <p className="text-xs text-content-muted flex items-center gap-1.5"><AlertCircle size={14}/> Please add numerical counts for at least {minSpecies} species across {minSamples} samples in the 'Counting Sheet' view to enable PCA.</p>
             )}
             {error && (
                 <div className="p-3 rounded-lg flex items-center gap-2 text-sm bg-danger-primary/20 text-danger-primary">
                    <AlertCircle size={18}/> {error}
                </div>
             )}
            <div className="h-96 w-full pt-4">
                {results ? (
                    <ResponsiveContainer>
                        <ScatterChart margin={{ top: 5, right: 20, bottom: 40, left: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="PC1" name="PC1" tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} stroke="var(--recharts-axis-stroke)" tickFormatter={tickFormatter}>
                                <Label value="Principal Component 1" offset={-25} position="insideBottom" fill="var(--recharts-axis-stroke)" />
                            </XAxis>
                            <YAxis type="number" dataKey="PC2" name="PC2" tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} stroke="var(--recharts-axis-stroke)" tickFormatter={tickFormatter}>
                                <Label value="Principal Component 2" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} dx={-10} />
                            </YAxis>
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{ backgroundColor: 'var(--recharts-tooltip-bg)', border: '1px solid var(--recharts-tooltip-border)' }}
                                formatter={(value: number, name, props) => [`${value.toFixed(3)} (Depth: ${props.payload.depth}m)`, name]}
                            />
                            <Scatter name="Samples" data={results} fill="var(--accent-secondary)" />
                        </ScatterChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-content-muted border-2 border-dashed border-border-primary rounded-lg">
                        <p>PCA results will be displayed here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PcaAnalysis;