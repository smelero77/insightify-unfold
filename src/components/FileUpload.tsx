import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

// Function to detect if a number is likely an Excel serial date
const isExcelSerialDate = (value: number): boolean => {
  // Excel serial dates are typically between 1 (1900-01-01) and 2958465 (9999-12-31)
  // Common range for modern dates: 25569 (1970-01-01) to 54787 (2050-01-01)
  return value > 1 && value < 2958465 && value % 1 !== 0; // Has decimal part for time
};

// Function to convert Excel serial date to JavaScript Date
const excelSerialDateToDate = (serial: number): Date => {
  // Excel's epoch starts at 1900-01-01, but JavaScript's Date starts at 1970-01-01
  // Excel incorrectly treats 1900 as a leap year, so we need to adjust
  const excelEpoch = new Date(1900, 0, 1);
  const jsEpoch = new Date(1970, 0, 1);
  
  // Convert Excel serial to milliseconds and create date
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date;
};

// Function to detect if a column contains dates based on header name
const isDateColumn = (header: string): boolean => {
  const dateKeywords = ['date', 'fecha', 'time', 'tiempo', 'created', 'updated', 'shipped', 'sale'];
  return dateKeywords.some(keyword => header.toLowerCase().includes(keyword));
};

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
    console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let workbook;
        
        if (file.name.endsWith('.csv')) {
          console.log('Processing CSV file');
          // For CSV files
          workbook = XLSX.read(data, { type: 'string' });
        } else {
          console.log('Processing Excel file');
          // For Excel files
          workbook = XLSX.read(data, { type: 'array' });
        }
        
        const sheetName = workbook.SheetNames[0];
        console.log('Sheet name:', sheetName);
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        
        console.log('Raw JSON data:', jsonData.slice(0, 5));
        
        if (jsonData.length > 0) {
          // Filter out empty rows
          const filteredData = jsonData.filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined));
          
          if (filteredData.length > 0) {
            const headers = filteredData[0].map(header => String(header || '').trim()).filter(h => h !== '');
            const rows = filteredData.slice(1);
            
            console.log('Processed headers:', headers);
            console.log('Sample rows:', rows.slice(0, 3));
            
            // Convert array data to objects
            const processedData = rows.map((row, index) => {
              const obj: any = {};
              headers.forEach((header, colIndex) => {
                const value = row[colIndex];
                // Handle different data types
                if (value === null || value === undefined) {
                  obj[header] = '';
                } else if (typeof value === 'number') {
                  // Check if this might be an Excel serial date
                  if (isDateColumn(header) && isExcelSerialDate(value)) {
                    try {
                      const date = excelSerialDateToDate(value);
                      obj[header] = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                      console.log(`Converted Excel date ${value} to ${obj[header]} for column ${header}`);
                    } catch (error) {
                      console.warn(`Failed to convert potential date ${value} in column ${header}:`, error);
                      obj[header] = value;
                    }
                  } else {
                    obj[header] = value;
                  }
                } else {
                  obj[header] = String(value).trim();
                }
              });
              return obj;
            }).filter(row => {
              // Filter out completely empty rows
              return Object.values(row).some(val => val !== '' && val !== null && val !== undefined);
            });
            
            console.log('Final processed data:', processedData.slice(0, 3));
            console.log('Data count:', processedData.length);
            
            if (processedData.length > 0 && headers.length > 0) {
              onFileProcessed(processedData, headers);
            } else {
              throw new Error('No se encontraron datos válidos en el archivo');
            }
          } else {
            throw new Error('El archivo parece estar vacío o no contener datos válidos');
          }
        } else {
          throw new Error('No se pudieron leer los datos del archivo');
        }
      } catch (error) {
        console.error('Error processing file:', error);
        // You might want to add a toast notification here
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      setIsLoading(false);
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