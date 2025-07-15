import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Database } from 'lucide-react';

interface DataPreviewProps {
  data: any[];
  headers: string[];
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export const DataPreview: React.FC<DataPreviewProps> = ({
  data,
  headers,
  onAnalyze,
  isAnalyzing
}) => {
  // Show only first 20 rows for preview
  const previewData = data.slice(0, 20);

  return (
    <Card className="p-6 animate-slide-up">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h3 className="text-xl font-bold">Vista Previa de Datos</h3>
              <p className="text-muted-foreground">
                Mostrando {previewData.length} de {data.length} filas
              </p>
            </div>
          </div>
          
          <Button 
            onClick={onAnalyze}
            disabled={isAnalyzing}
            size="lg"
            className="hover-glow"
          >
            {isAnalyzing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Analizando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                ✨ Analizar y Sugerir KPIs
              </>
            )}
          </Button>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {headers.map((header, index) => (
                  <TableHead 
                    key={index} 
                    className="font-semibold text-foreground whitespace-nowrap px-4 py-3"
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((row, rowIndex) => (
                <TableRow 
                  key={rowIndex}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {headers.map((header, colIndex) => (
                    <TableCell 
                      key={colIndex} 
                      className="px-4 py-3 whitespace-nowrap"
                    >
                      <div className="max-w-[200px] truncate" title={String(row[header] || '')}>
                        {String(row[header] || '')}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data.length > 20 && (
          <div className="text-center text-muted-foreground">
            ... y {data.length - 20} filas más
          </div>
        )}
      </div>
    </Card>
  );
};