import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, BarChart3, TrendingUp } from 'lucide-react';

interface ChartConfig {
  chartType: 'bar' | 'pie' | 'line';
  xAxisColumn: string | string[];
  yAxisOperation: 'count' | 'sum';
  yAxisColumn: string | null;
}

interface KPI {
  titulo: string;
  descripcion: string;
  chartConfig: ChartConfig;
}

interface AIInsight {
  contexto: string;
  kpis: KPI[];
}

interface AIInsightsProps {
  insights: AIInsight | null;
  onKPISelect: (kpi: KPI, index: number) => void;
  selectedKPIIndex: number | null;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  insights,
  onKPISelect,
  selectedKPIIndex
}) => {
  if (!insights) return null;

  return (
    <Card className="p-6 animate-slide-up">
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Brain className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-bold">Análisis de IA</h3>
        </div>

        {/* Context Section */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <TrendingUp className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-primary mb-2">Contexto del Negocio</h4>
              <p className="text-foreground leading-relaxed">{insights.contexto}</p>
            </div>
          </div>
        </div>

        {/* KPIs Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">KPIs Recomendados</h4>
          </div>
          
          <div className="grid gap-3">
            {insights.kpis.map((kpi, index) => (
              <Button
                key={index}
                variant={selectedKPIIndex === index ? "default" : "outline"}
                className={`
                  p-4 h-auto text-left justify-start hover-glow interactive-scale
                  ${selectedKPIIndex === index ? 'shadow-glow' : ''}
                `}
                onClick={() => onKPISelect(kpi, index)}
              >
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between w-full">
                    <h5 className="font-semibold">{kpi.titulo}</h5>
                    {selectedKPIIndex === index && (
                      <Badge variant="secondary" className="ml-2">
                        Activo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm opacity-90 text-left">
                    {kpi.descripcion}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};