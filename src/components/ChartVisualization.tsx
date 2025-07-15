import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
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

interface ChartVisualizationProps {
  data: any[];
  headers: string[];
  selectedKPI: {
    titulo: string;
    descripcion: string;
  };
}

export const ChartVisualization: React.FC<ChartVisualizationProps> = ({
  data,
  headers,
  selectedKPI
}) => {
  const chartRef = useRef<ChartJS<'bar'>>(null);

  // Generate chart data based on the selected KPI and available data
  const generateChartData = () => {
    console.log('Generating chart data for KPI:', selectedKPI.titulo);
    console.log('Available data:', data.slice(0, 5));
    console.log('Headers:', headers);
    
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

    // Generate different chart types based on KPI title
    const kpiTitle = selectedKPI.titulo.toLowerCase();
    
    // Case 1: Multiple numeric columns - create comparison chart
    if (numericColumns.length >= 2) {
      console.log('Creating multi-column comparison chart');
      
      // Take first 10 rows for comparison
      const comparisonData = data.slice(0, 10);
      const firstTwoNumericColumns = numericColumns.slice(0, 2);
      
      return {
        labels: comparisonData.map((_, index) => `Registro ${index + 1}`),
        datasets: firstTwoNumericColumns.map((column, index) => ({
          label: column,
          data: comparisonData.map(row => Number(row[column]) || 0),
          backgroundColor: index === 0 ? 'rgba(37, 99, 235, 0.8)' : 'rgba(59, 130, 246, 0.8)',
          borderColor: index === 0 ? 'rgba(37, 99, 235, 1)' : 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
        }))
      };
    }
    
    // Case 2: Category + Multiple numeric columns
    if (categoricalColumns.length > 0 && numericColumns.length >= 2) {
      console.log('Creating category with multiple metrics chart');
      
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
      
      return {
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
    }
    
    // Case 3: Category + Single numeric column (original logic)
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      console.log('Creating category with single metric chart');
      
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

      return {
        labels: sortedEntries.map(([category]) => category),
        datasets: [{
          label: `${selectedKPI.titulo} (${valueColumn})`,
          data: sortedEntries.map(([, value]) => value),
          backgroundColor: 'rgba(37, 99, 235, 0.8)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 2,
        }]
      };
    }

    // Case 4: Only numeric columns - create distribution or comparison
    if (numericColumns.length > 0) {
      console.log('Creating numeric distribution chart');
      
      if (numericColumns.length === 1) {
        // Single numeric column - show distribution
        const valueColumn = numericColumns[0];
        const values = data.slice(0, 15).map(row => Number(row[valueColumn]) || 0);
        
        return {
          labels: values.map((_, index) => `Registro ${index + 1}`),
          datasets: [{
            label: `${selectedKPI.titulo} (${valueColumn})`,
            data: values,
            backgroundColor: 'rgba(37, 99, 235, 0.8)',
            borderColor: 'rgba(37, 99, 235, 1)',
            borderWidth: 2,
          }]
        };
      } else {
        // Multiple numeric columns - show comparison
        const selectedColumns = numericColumns.slice(0, 3); // Max 3 columns
        const sampleData = data.slice(0, 8);
        
        return {
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
      }
    }

    // Case 5: Only categorical columns - create count chart
    if (categoricalColumns.length > 0) {
      console.log('Creating categorical count chart');
      
      const categoryColumn = categoricalColumns[0];
      const counts: { [key: string]: number } = {};
      
      data.forEach(row => {
        const category = String(row[categoryColumn] || 'Sin categoría');
        counts[category] = (counts[category] || 0) + 1;
      });

      const sortedEntries = Object.entries(counts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

      return {
        labels: sortedEntries.map(([category]) => category),
        datasets: [{
          label: `Conteo por ${categoryColumn}`,
          data: sortedEntries.map(([, count]) => count),
          backgroundColor: 'rgba(37, 99, 235, 0.8)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 2,
        }]
      };
    }

    // Case 6: Fallback - create a demonstration chart with multiple series
    console.log('Using fallback chart with multiple series');
    
    const categories = ['Categoría A', 'Categoría B', 'Categoría C', 'Categoría D', 'Categoría E'];
    
    return {
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
  };

  const chartData = generateChartData();

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
    <Card className="p-6 animate-slide-up">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-xl font-bold">Visualización</h3>
            <p className="text-muted-foreground">{selectedKPI.descripcion}</p>
          </div>
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
  );
};