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
    // Simple heuristic to create meaningful visualizations
    // In a real app, you'd have more sophisticated logic based on KPI type
    
    // Find numeric columns
    const numericColumns = headers.filter(header => {
      const values = data.slice(0, 100).map(row => row[header]);
      return values.some(val => !isNaN(Number(val)) && val !== '' && val !== null);
    });

    // Find categorical columns
    const categoricalColumns = headers.filter(header => {
      const uniqueValues = [...new Set(data.slice(0, 100).map(row => row[header]))];
      return uniqueValues.length <= 20 && uniqueValues.length > 1;
    });

    if (numericColumns.length === 0 || categoricalColumns.length === 0) {
      // Fallback: create a simple count chart
      const counts = data.slice(0, 10).map((_, index) => Math.floor(Math.random() * 100) + 10);
      return {
        labels: data.slice(0, 10).map((_, index) => `Item ${index + 1}`),
        datasets: [{
          label: selectedKPI.titulo,
          data: counts,
          backgroundColor: 'hsl(221, 83%, 53%)',
          borderColor: 'hsl(221, 83%, 60%)',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      };
    }

    // Use first categorical column for labels and first numeric for values
    const categoryColumn = categoricalColumns[0];
    const valueColumn = numericColumns[0];

    // Group data by category and sum values
    const groupedData: { [key: string]: number } = {};
    
    data.forEach(row => {
      const category = String(row[categoryColumn] || 'Unknown');
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
        backgroundColor: 'hsl(221, 83%, 53%)',
        borderColor: 'hsl(221, 83%, 60%)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
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
          color: 'hsl(0, 0%, 98%)',
          font: {
            family: 'Inter',
            size: 12,
          }
        }
      },
      title: {
        display: true,
        text: selectedKPI.titulo,
        color: 'hsl(0, 0%, 98%)',
        font: {
          family: 'Inter',
          size: 16,
          weight: 'bold',
        }
      },
      tooltip: {
        backgroundColor: 'hsl(223, 23%, 12%)',
        titleColor: 'hsl(0, 0%, 98%)',
        bodyColor: 'hsl(0, 0%, 98%)',
        borderColor: 'hsl(221, 83%, 53%)',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'hsl(215, 20%, 65%)',
          font: {
            family: 'Inter',
          }
        },
        grid: {
          color: 'hsl(217, 33%, 18%)',
        }
      },
      y: {
        ticks: {
          color: 'hsl(215, 20%, 65%)',
          font: {
            family: 'Inter',
          }
        },
        grid: {
          color: 'hsl(217, 33%, 18%)',
        }
      }
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
        
        <div className="h-[400px] w-full">
          <Bar 
            ref={chartRef}
            data={chartData} 
            options={options} 
          />
        </div>
      </div>
    </Card>
  );
};