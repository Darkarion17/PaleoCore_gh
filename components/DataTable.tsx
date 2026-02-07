

import React, { useMemo } from 'react';
import type { DataPoint, Section } from '../types';
import { Table, Trash2 } from 'lucide-react';

interface DataTableProps {
  section: Section;
  data: DataPoint[];
  proxyLabels: Record<string, string>;
  onUpdateDataPoints?: (updatedDataPoints: DataPoint[]) => void;
  focusedProxy?: string;
  onDeleteRow?: (rowIndex: number) => void;
}

const QC_FLAG_STYLES: Record<number, { color: string; title: string }> = {
    0: { color: 'transparent', title: 'OK' },
    1: { color: '#f97316', title: 'Suspect' }, // orange-500
    2: { color: '#ef4444', title: 'Exclude' }, // red-500
};

const DataTable: React.FC<DataTableProps> = ({ section, data, proxyLabels, onUpdateDataPoints, focusedProxy, onDeleteRow }) => {
  const isEditable = !!onUpdateDataPoints;
  const isDeletable = !!onDeleteRow;

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-background-tertiary/20 rounded-lg text-content-muted border-2 border-dashed border-border-primary">
        <Table size={40} className="mb-2" />
        <p className="font-semibold">No data series to display.</p>
        <p className="text-sm">Upload a CSV or add points manually in the 'Data Entry' tab.</p>
      </div>
    );
  }

  const allHeaders = useMemo(() => {
      const headers = new Set<string>();
      data.forEach(dp => Object.keys(dp).forEach(key => headers.add(key)));
      return headers;
  }, [data]);

  const headers = useMemo(() => {
      const priorityOrder: string[] = ['subsection', 'depth', 'age', 'qcFlag'];
      
      if (focusedProxy && focusedProxy !== 'all') {
          const requiredHeaders = priorityOrder.filter((h: string) => allHeaders.has(h));
          // Use a Set to ensure the focused proxy isn't duplicated if it's in priorityOrder
          const combinedHeaders = [...new Set([...requiredHeaders, focusedProxy])];
          return combinedHeaders.filter((h: string) => allHeaders.has(h));
      }

      const baseHeaders = [
          ...priorityOrder.filter((h: string) => allHeaders.has(h)),
          ...Array.from(allHeaders).filter((h: string) => !priorityOrder.includes(h)).sort()
      ];
      return baseHeaders;
  }, [allHeaders, focusedProxy]);

  const handleValueChange = (rowIndex: number, columnKey: string, newValue: string) => {
    if (!onUpdateDataPoints) return;

    const newDataPoints = [...data];
    const pointToUpdate = { ...newDataPoints[rowIndex] };

    if (columnKey === 'subsection') {
        pointToUpdate[columnKey] = newValue;
    } else {
        const numValue = parseFloat(newValue);
        pointToUpdate[columnKey] = isNaN(numValue) ? undefined : numValue;
    }
    newDataPoints[rowIndex] = pointToUpdate;
    onUpdateDataPoints(newDataPoints);
  };

  return (
    <div className="max-h-[70vh] overflow-auto pr-2 relative">
      <table className="w-full text-sm text-left text-content-secondary table-auto">
        <thead className="text-xs text-content-muted uppercase bg-background-tertiary sticky top-0 z-10">
          <tr>
            {headers.map(key => (
              <th key={key} scope="col" className="px-4 py-3 font-semibold">{proxyLabels[key] || key}</th>
            ))}
            {isDeletable && <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-primary">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`hover:bg-background-secondary transition-colors`}
              style={{
                backgroundColor: row.qcFlag ? `${QC_FLAG_STYLES[row.qcFlag as number].color}1A` : undefined, // Apply background with alpha
              }}
              title={row.qcFlag ? `QC: ${QC_FLAG_STYLES[row.qcFlag as number].title}` : undefined}
            >
              {headers.map(key => (
                <td key={key} className={`px-4 py-2 font-mono whitespace-nowrap`}>
                  {isEditable && (key !== 'qcFlag' && key !== 'subsection') ? (
                    <input
                      type="number"
                      // FIX: Handle boolean values for number inputs and ensure value is a string.
                      value={row[key] == null || typeof row[key] === 'boolean' ? '' : String(row[key])}
                      onChange={(e) => handleValueChange(rowIndex, key, e.target.value)}
                      className="w-24 bg-transparent outline-none focus:bg-background-interactive focus:ring-1 focus:ring-accent-primary rounded px-1 py-0.5"
                    />
                  ) : key === 'subsection' && isEditable ? (
                    <input
                      type="text"
                      // FIX: Explicitly convert potential null/undefined/boolean values to a string.
                      value={row[key] == null ? '' : String(row[key])}
                      onChange={(e) => handleValueChange(rowIndex, key, e.target.value)}
                      className="w-32 bg-transparent outline-none focus:bg-background-interactive focus:ring-1 focus:ring-accent-primary rounded px-1 py-0.5"
                    />
                  ) : (
                    // FIX: Explicitly convert value to a string for display.
                    row[key] == null ? '-' : String(row[key])
                  )}
                </td>
              ))}
              {isDeletable && (
                <td className="px-4 py-2">
                    <button
                        onClick={() => onDeleteRow(rowIndex)}
                        className="p-1 text-content-muted hover:text-danger-primary transition-colors rounded-md"
                        title="Delete this entry"
                    >
                        <Trash2 size={16} />
                    </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;