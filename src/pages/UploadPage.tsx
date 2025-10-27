import { useState, useRef } from 'react';
import { UploadCloud, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { API_BASE_URL } from '../config/api';

interface DataPreview {
  fileName: string;
  headers: string[];
  rows: (string | null)[][];
  allRows: (string | null)[][];
  totalRows: number;
  nullCount: number;
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const allRows = lines.slice(1).map(line =>
        line.split(',').map(cell => {
          const trimmed = cell.trim();
          return trimmed === '' || trimmed.toLowerCase() === 'null' ? null : trimmed;
        })
      );

      let nullCount = 0;
      allRows.forEach(row => {
        row.forEach(cell => {
          if (cell === null) nullCount++;
        });
      });

      setDataPreview({
        fileName: file.name,
        headers,
        rows: allRows.slice(0, rowsPerPage),
        allRows,
        totalRows: allRows.length,
        nullCount,
      });
      setCurrentPage(1);
      setSelectedFile(file);
      setShowPreview(true);
    };
    reader.readAsText(file);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !dataPreview) return;

    setUploading(true);
    setUploadError('');

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', dataPreview.fileName.replace('.csv', ''));
      formData.append('description', `Dataset subido el ${new Date().toLocaleDateString()}`);

      await axios.post(`${API_BASE_URL}/data/datasets/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setShowPreview(false);
      setDataPreview(null);
      setSelectedFile(null);
      alert('¡Dataset subido exitosamente!');
      
      // Disparar evento para actualizar dashboard
      window.dispatchEvent(new CustomEvent('dashboardUpdate', { 
        detail: { type: 'upload', fileName: dataPreview.fileName } 
      }));
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Error al subir el dataset');
    } finally {
      setUploading(false);
    }
  };

  const totalPages = dataPreview ? Math.ceil(dataPreview.totalRows / rowsPerPage) : 0;

  const handlePageChange = (page: number) => {
    if (!dataPreview) return;
    setCurrentPage(page);
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    setDataPreview({
      ...dataPreview,
      rows: dataPreview.allRows.slice(start, end),
    });
  };

  const handleRowsPerPageChange = (rows: number) => {
    if (!dataPreview) return;
    setRowsPerPage(rows);
    setCurrentPage(1);
    setDataPreview({
      ...dataPreview,
      rows: dataPreview.allRows.slice(0, rows),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cargar Nuevo Dataset</h1>
        <p className="text-muted-foreground mt-1">Sube archivos CSV o Excel para entrenar tus modelos</p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'bg-card p-12 rounded-xl border-2 border-dashed transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
        )}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className={cn(
            'p-4 rounded-full mb-4 transition-colors',
            isDragging ? 'bg-primary/20' : 'bg-primary/10'
          )}>
            <UploadCloud className={cn(
              'h-12 w-12 transition-colors',
              isDragging ? 'text-primary animate-bounce' : 'text-primary'
            )} />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {isDragging ? '¡Suelta el archivo aquí!' : 'Arrastra y suelta tu archivo'}
          </h2>
          <p className="text-muted-foreground mb-4">Soporta archivos CSV, Excel (.xlsx, .xls)</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Seleccionar archivo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground mt-4">Tamaño máximo: 50MB</p>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && dataPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-foreground">Vista Previa del Dataset</h2>
                <p className="text-sm text-muted-foreground mt-1">{dataPreview.fileName}</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="h-8 w-8 rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-6 border-b bg-accent/30">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Filas</p>
                <p className="text-2xl font-bold text-foreground">{dataPreview.totalRows}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Columnas</p>
                <p className="text-2xl font-bold text-foreground">{dataPreview.headers.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valores Nulos</p>
                <p className="text-2xl font-bold text-orange-500">{dataPreview.nullCount}</p>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      {dataPreview.headers.map((header, i) => (
                        <th key={i} className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataPreview.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-accent/50 transition-colors">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={cn(
                              'px-4 py-3 text-sm border-b',
                              cell === null
                                ? 'bg-orange-500/10 text-orange-500 font-medium'
                                : 'text-foreground'
                            )}
                          >
                            {cell === null ? 'NULL' : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filas por página:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-muted-foreground ml-4">
                    {((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, dataPreview.totalRows)} de {dataPreview.totalRows}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-lg border hover:bg-accent transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-lg border hover:bg-accent transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={cn(
                            'h-8 w-8 rounded-lg border transition-colors flex items-center justify-center text-sm font-medium',
                            currentPage === pageNum
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'hover:bg-accent'
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-lg border hover:bg-accent transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-lg border hover:bg-accent transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col gap-3 p-6 border-t bg-accent/30">
              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                  {uploadError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setUploadError('');
                  }}
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg border hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmUpload}
                  disabled={uploading}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Subiendo...' : 'Confirmar y Subir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
