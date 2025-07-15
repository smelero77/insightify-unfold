import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileUploadProps {
  onFileProcessed: (data: any[], headers: string[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileProcessed,
  isLoading,
  setIsLoading
}) => {
  const processFile = useCallback((file: File) => {
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let workbook;
        
        if (file.name.endsWith('.csv')) {
          // For CSV files
          workbook = XLSX.read(data, { type: 'binary' });
        } else {
          // For Excel files
          workbook = XLSX.read(data, { type: 'array' });
        }
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1);
          
          // Convert array data to objects
          const processedData = rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
          
          onFileProcessed(processedData, headers);
        }
      } catch (error) {
        console.error('Error processing file:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [onFileProcessed, setIsLoading]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false,
    disabled: isLoading
  });

  return (
    <Card className="p-8 animate-fade-in">
      <div
        {...getRootProps()}
        className={`
          drop-zone p-12 cursor-pointer text-center min-h-[300px] flex flex-col items-center justify-center
          ${isDragActive ? 'drop-zone-active' : ''}
          ${isLoading ? 'cursor-not-allowed opacity-50' : 'hover-glow interactive-scale'}
        `}
      >
        <input {...getInputProps()} />
        
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <p className="text-lg font-medium">Procesando archivo...</p>
            <p className="text-muted-foreground">Esto puede tomar unos segundos</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <Upload className="h-20 w-20 text-primary animate-pulse-primary" />
              <FileText className="h-8 w-8 text-muted-foreground absolute -bottom-2 -right-2" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">
                {isDragActive ? 'Suelta tu archivo aquí' : 'Arrastra tu archivo Excel o CSV'}
              </h3>
              <p className="text-muted-foreground text-lg">
                O haz clic para seleccionar un archivo
              </p>
            </div>
            
            <Button 
              variant="outline" 
              size="lg"
              className="mt-4 hover-glow"
            >
              <Upload className="mr-2 h-5 w-5" />
              Seleccionar Archivo
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Formatos soportados: .xlsx, .xls, .csv (máximo 10MB)
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};