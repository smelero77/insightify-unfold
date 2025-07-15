import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Database, Eye, EyeOff } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartConfig {
  chartType: 'bar' | 'pie' | 'line';
  xAxisColumn: string | string[];
  yAxisOperation: 'count' | 'sum';
  yAxisColumn: string | null;
}

interface ChartVisualizationProps {
  data: any[];
  headers: string[];
  selectedKPI: {
    titulo: string;
    descripcion: string;
    chartConfig: ChartConfig;
  };
}

interface ChartMetadata {
  type: string;
  columnsUsed: string[];
  processedData: any[];
  rawSample: any[];
}

export const ChartVisualization: React.FC<ChartVisualizationProps> = ({
  data,
  headers,
  selectedKPI
}) => {
  const chartRef = useRef<ChartJS<'bar'>>(null);
  const [showDataDetails, setShowDataDetails] = useState(false);
  const [chartInfo, setChartInfo] = useState<ChartMetadata | null>(null);

  // Memoize chart data generation to prevent unnecessary recalculations
  const { chartData, metadata } = useMemo(() => {
    console.log('Generating chart data for KPI:', selectedKPI.titulo);
    console.log('Available data:', data.slice(0, 5));
    console.log('Headers:', headers);
    
    let chartType = '';
    let columnsUsed: string[] = [];
    let processedData: any[] = [];
    let rawSample = data.slice(0, 10);
    
    // Find numeric columns - improved detection
    const numericColumns = headers.filter(header => {
      const values = data.slice(0, 50).map(row => row[header]);
      const numericValues = values.filter(val => {
        if (val === null || val === undefined || val === '') return false;
        const num = Number(val);
        return !isNaN(num) && isFinite(num);
      });
      return numericValues.length > values.length * 0.3; // At least 30% numeric
    });

    // Find categorical columns - improved detection
    const categoricalColumns = headers.filter(header => {
      const values = data.slice(0, 100).map(row => row[header]);
      const nonEmptyValues = values.filter(val => val !== null && val !== undefined && val !== '');
      const uniqueValues = [...new Set(nonEmptyValues)];
      return uniqueValues.length > 1 && uniqueValues.length <= 20 && uniqueValues.length < nonEmptyValues.length;
    });

    console.log('Numeric columns:', numericColumns);
    console.log('Categorical columns:', categoricalColumns);

    // Case 1: Multiple numeric columns - create comparison chart
    if (numericColumns.length >= 2) {
      console.log('Creating multi-column comparison chart');
      chartType = 'Comparación de múltiples columnas numéricas';
      columnsUsed = numericColumns.slice(0, 2);
      
      const comparisonData = data.slice(0, 10);
      const firstTwoNumericColumns = numericColumns.slice(0, 2);
      
      processedData = comparisonData.map((row, index) => ({
        label: `Registro ${index + 1}`,
        [firstTwoNumericColumns[0]]: Number(row[firstTwoNumericColumns[0]]) || 0,
        [firstTwoNumericColumns[1]]: Number(row[firstTwoNumericColumns[1]]) || 0,
      }));
      
      const chartData = {
        labels: comparisonData.map((_, index) => `Registro ${index + 1}`),
        datasets: firstTwoNumericColumns.map((column, index) => ({
          label: column,
          data: comparisonData.map(row => Number(row[column]) || 0),
          backgroundColor: index === 0 ? 'rgba(37, 99, 235, 0.8)' : 'rgba(59, 130, 246, 0.8)',
          borderColor: index === 0 ? 'rgba(37, 99, 235, 1)' : 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
        }))
      };
      
      return {
        chartData,
        metadata: {
          type: chartType,
          columnsUsed,
          processedData,
          rawSample
        }
      };
    }
    
    // Case 2: Category + Multiple numeric columns
    if (categoricalColumns.length > 0 && numericColumns.length >= 2) {
      console.log('Creating category with multiple metrics chart');
      chartType = 'Categorías con múltiples métricas';
      columnsUsed = [categoricalColumns[0], ...numericColumns.slice(0, 2)];
      
      const categoryColumn = categoricalColumns[0];
      const firstTwoNumericColumns = numericColumns.slice(0, 2);
      
      // Group by category
      const categoryGroups: { [key: string]: any } = {};
      data.forEach(row => {
        const category = String(row[categoryColumn] || 'Sin categoría');
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        categoryGroups[category].push(row);
      });
      
      // Get top 8 categories
      const topCategories = Object.keys(categoryGroups)
        .sort((a, b) => categoryGroups[b].length - categoryGroups[a].length)
        .slice(0, 8);
      
      processedData = topCategories.map(category => {
        const categoryData = categoryGroups[category];
        const result: any = { category };
        
        firstTwoNumericColumns.forEach(column => {
          const sum = categoryData.reduce((acc: number, row: any) => {
            return acc + (Number(row[column]) || 0);
          }, 0);
          result[column] = Math.round(sum / categoryData.length); // Average
        });
        
        return result;
      });
      
      const chartData = {
        labels: topCategories,
        datasets: firstTwoNumericColumns.map((column, index) => ({
          label: column,
          data: topCategories.map(category => {
            const categoryData = categoryGroups[category];
            const sum = categoryData.reduce((acc: number, row: any) => {
              return acc + (Number(row[column]) || 0);
            }, 0);
            return Math.round(sum / categoryData.length); // Average
          }),
          backgroundColor: index === 0 ? 'rgba(37, 99, 235, 0.8)' : 'rgba(59, 130, 246, 0.8)',
          borderColor: index === 0 ? 'rgba(37, 99, 235, 1)' : 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
        }))
      };
      
      return {
        chartData,
        metadata: {
          type: chartType,
          columnsUsed,
          processedData,
          rawSample
        }
      };
    }
    
    // Case 3: Category + Single numeric column
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      console.log('Creating category with single metric chart');
      chartType = 'Categorías con métrica única';
      columnsUsed = [categoricalColumns[0], numericColumns[0]];
      
      const categoryColumn = categoricalColumns[0];
      const valueColumn = numericColumns[0];
      
      // Group data by category and sum values
      const groupedData: { [key: string]: number } = {};
      
      data.forEach(row => {
        const category = String(row[categoryColumn] || 'Sin categoría');
        const value = Number(row[valueColumn]) || 0;
        
        if (groupedData[category]) {
          groupedData[category] += value;
        } else {
          groupedData[category] = value;
        }
      });

      // Take top 10 categories
      const sortedEntries = Object.entries(groupedData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      processedData = sortedEntries.map(([category, value]) => ({
        category,
        [valueColumn]: value
      }));

      const chartData = {
        labels: sortedEntries.map(([category]) => category),
        datasets: [{
          label: `${selectedKPI.titulo} (${valueColumn})`,
          data: sortedEntries.map(([, value]) => value),
          backgroundColor: 'rgba(37, 99, 235, 0.8)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 2,
        }]
      };
      
      return {
        chartData,
        metadata: {
          type: chartType,
          columnsUsed,
          processedData,
          rawSample
        }
      };
    }

    // Case 4: Only numeric columns - create distribution or comparison
    if (numericColumns.length > 0) {
      console.log('Creating numeric distribution chart');
      chartType = 'Distribución numérica';
      
      if (numericColumns.length === 1) {
        // Single numeric column - show distribution
        const valueColumn = numericColumns[0];
        columnsUsed = [valueColumn];
        const values = data.slice(0, 15).map(row => Number(row[valueColumn]) || 0);
        
        processedData = values.map((value, index) => ({
          label: `Registro ${index + 1}`,
          [valueColumn]: value
        }));

        const chartData = {
          labels: values.map((_, index) => `Registro ${index + 1}`),
          datasets: [{
            label: `${selectedKPI.titulo} (${valueColumn})`,
            data: values,
            backgroundColor: 'rgba(37, 99, 235, 0.8)',
            borderColor: 'rgba(37, 99, 235, 1)',
            borderWidth: 2,
          }]
        };
        
        return {
          chartData,
          metadata: {
            type: chartType,
            columnsUsed,
            processedData,
            rawSample
          }
        };
      } else {
        // Multiple numeric columns - show comparison
        const selectedColumns = numericColumns.slice(0, 3); // Max 3 columns
        columnsUsed = selectedColumns;
        const sampleData = data.slice(0, 8);
        
        processedData = sampleData.map((row, index) => {
          const result: any = { label: `Registro ${index + 1}` };
          selectedColumns.forEach(column => {
            result[column] = Number(row[column]) || 0;
          });
          return result;
        });
        
        const chartData = {
          labels: sampleData.map((_, index) => `Registro ${index + 1}`),
          datasets: selectedColumns.map((column, index) => ({
            label: column,
            data: sampleData.map(row => Number(row[column]) || 0),
            backgroundColor: [
              'rgba(37, 99, 235, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(96, 165, 250, 0.8)'
            ][index],
            borderColor: [
              'rgba(37, 99, 235, 1)',
              'rgba(59, 130, 246, 1)',
              'rgba(96, 165, 250, 1)'
            ][index],
            borderWidth: 2,
          }))
        };
        
        return {
          chartData,
          metadata: {
            type: chartType,
            columnsUsed,
            processedData,
            rawSample
          }
        };
      }
    }

    // Case 5: Only categorical columns - create count chart
    if (categoricalColumns.length > 0) {
      console.log('Creating categorical count chart');
      chartType = 'Conteo por categorías';
      columnsUsed = [categoricalColumns[0]];
      
      const categoryColumn = categoricalColumns[0];
      const counts: { [key: string]: number } = {};
      
      data.forEach(row => {
        const category = String(row[categoryColumn] || 'Sin categoría');
        counts[category] = (counts[category] || 0) + 1;
      });

      const sortedEntries = Object.entries(counts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      processedData = sortedEntries.map(([category, count]) => ({
        category,
        count
      }));

      const chartData = {
        labels: sortedEntries.map(([category]) => category),
        datasets: [{
          label: `Conteo por ${categoryColumn}`,
          data: sortedEntries.map(([, count]) => count),
          backgroundColor: 'rgba(37, 99, 235, 0.8)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 2,
        }]
      };
      
      return {
        chartData,
        metadata: {
          type: chartType,
          columnsUsed,
          processedData,
          rawSample
        }
      };
    }

    // Case 6: Fallback - create a demonstration chart with multiple series
    console.log('Using fallback chart with multiple series');
    chartType = 'Datos de demostración';
    columnsUsed = ['Serie 1', 'Serie 2'];
    
    const categories = ['Categoría A', 'Categoría B', 'Categoría C', 'Categoría D', 'Categoría E'];
    
    processedData = categories.map(category => ({
      category,
      'Serie 1': Math.floor(Math.random() * 100) + 20,
      'Serie 2': Math.floor(Math.random() * 80) + 10
    }));
    
    const chartData = {
      labels: categories,
      datasets: [
        {
          label: 'Serie 1',
          data: categories.map(() => Math.floor(Math.random() * 100) + 20),
          backgroundColor: 'rgba(37, 99, 235, 0.8)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 2,
        },
        {
          label: 'Serie 2',
          data: categories.map(() => Math.floor(Math.random() * 80) + 10),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
        }
      ]
    };
    
    return {
      chartData,
      metadata: {
        type: chartType,
        columnsUsed,
        processedData,
        rawSample
      }
    };
  }, [data, headers, selectedKPI]);

  // Update chart info when metadata changes
  useEffect(() => {
    if (metadata) {
      setChartInfo(metadata);
    }
  }, [metadata]);

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#f8fafc',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 14,
          }
        }
      },
      title: {
        display: true,
        text: selectedKPI.titulo,
        color: '#f8fafc',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 18,
          weight: 'bold',
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: '#2563eb',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
          },
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          color: '#374151',
          display: true
        },
        border: {
          color: '#4b5563'
        }
      },
      y: {
        ticks: {
          color: '#9ca3af',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
          },
          callback: function(value) {
            return typeof value === 'number' ? value.toLocaleString() : value;
          }
        },
        grid: {
          color: '#374151',
          display: true
        },
        border: {
          color: '#4b5563'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Chart */}
      <Card className="p-6 animate-slide-up">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              <div>
                <h3 className="text-xl font-bold">Visualización</h3>
                <p className="text-muted-foreground">{selectedKPI.descripcion}</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDataDetails(!showDataDetails)}
              className="flex items-center space-x-2"
            >
              {showDataDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showDataDetails ? 'Ocultar' : 'Ver'} Datos</span>
            </Button>
          </div>
          
          <div className="h-[400px] w-full bg-card/50 rounded-lg p-4">
            <Bar 
              ref={chartRef}
              data={chartData} 
              options={options}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>💡 Tip: Esta visualización se genera automáticamente basada en el análisis de tus datos.</p>
          </div>
        </div>
      </Card>

      {/* Data Details Panel */}
      {showDataDetails && chartInfo && (
        <Card className="p-6 animate-slide-up">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Database className="h-6 w-6 text-primary" />
              <div>
                <h3 className="text-xl font-bold">Datos de Visualización</h3>
                <p className="text-muted-foreground">Información detallada sobre cómo se generó el gráfico</p>
              </div>
            </div>

            {/* Chart Type */}
            <div className="space-y-2">
              <h4 className="font-semibold">Tipo de Gráfico:</h4>
              <Badge variant="secondary" className="text-sm">
                {chartInfo.type}
              </Badge>
            </div>

            {/* Columns Used */}
            <div className="space-y-2">
              <h4 className="font-semibold">Columnas Utilizadas:</h4>
              <div className="flex flex-wrap gap-2">
                {chartInfo.columnsUsed.map((column, index) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    {column}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Processed Data */}
            <div className="space-y-2">
              <h4 className="font-semibold">Datos Procesados para el Gráfico:</h4>
              <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(chartInfo.processedData, null, 2)}
                </pre>
              </div>
            </div>

            {/* Raw Sample */}
            <div className="space-y-2">
              <h4 className="font-semibold">Muestra de Datos Originales:</h4>
              <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {JSON.stringify(chartInfo.rawSample, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};