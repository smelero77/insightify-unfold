import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { DataPreview } from './DataPreview';
import { AIInsights } from './AIInsights';
import { ChartVisualization } from './ChartVisualization';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Sparkles, AlertCircle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-data-analytics.jpg';

interface KPI {
  titulo: string;
  descripcion: string;
}

interface AIInsight {
  contexto: string;
  kpis: KPI[];
}

export const Insightify: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [selectedKPIIndex, setSelectedKPIIndex] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState('AIzaSyBK1YAlGtt0PuapytL1R-mwckPc41T4V2k');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  
  const { toast } = useToast();

  const handleFileProcessed = (processedData: any[], fileHeaders: string[]) => {
    console.log('File processed:', { 
      rowCount: processedData.length, 
      headers: fileHeaders,
      sampleData: processedData.slice(0, 3)
    });
    
    setData(processedData);
    setHeaders(fileHeaders);
    setInsights(null);
    setSelectedKPIIndex(null);
    
    toast({
      title: "Archivo procesado exitosamente",
      description: `Se cargaron ${processedData.length} filas con ${fileHeaders.length} columnas.`,
    });
  };

  const analyzeWithGemini = async () => {
    if (!apiKey.trim()) {
      setShowApiKeyInput(true);
      toast({
        title: "API Key requerida",
        description: "Por favor ingresa tu API Key de Google Gemini para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const prompt = `Eres un analista de negocio experto. Has recibido un fichero con las siguientes columnas: ${headers.join(', ')}. Tu tarea es: 1. Identificar el contexto de negocio (ej: 'Datos de Ventas', 'Inventario de E-commerce', 'Resultados de Campaña de Marketing'). 2. Sugerir 4 KPIs clave que se podrían calcular con estas columnas. Para cada KPI, dame un título corto y una descripción de una línea. Formatea tu respuesta como un objeto JSON así: {"contexto": "tu análisis del contexto", "kpis": [{"titulo": "KPI 1", "descripcion": "Desc 1"}, {"titulo": "KPI 2", "descripcion": "Desc 2"}]}.`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const generatedText = result.candidates[0]?.content?.parts[0]?.text;
      
      if (!generatedText) {
        throw new Error('No se recibió respuesta de la IA');
      }

      // Extract JSON from the response
      const jsonMatch = generatedText.match(/\{.*\}/s);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta');
      }

      const analysisResult: AIInsight = JSON.parse(jsonMatch[0]);
      setInsights(analysisResult);
      
      toast({
        title: "Análisis completado",
        description: "La IA ha analizado tus datos y generado recomendaciones de KPIs.",
      });
      
    } catch (error) {
      console.error('Error analyzing with Gemini:', error);
      toast({
        title: "Error en el análisis",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKPISelect = (kpi: KPI, index: number) => {
    console.log('KPI selected:', kpi, 'Index:', index);
    console.log('Current data for visualization:', {
      dataCount: data.length,
      headers: headers,
      sampleData: data.slice(0, 2)
    });
    
    setSelectedKPIIndex(index);
    toast({
      title: "KPI seleccionado",
      description: `Generando visualización para: ${kpi.titulo}`,
    });
  };

  const selectedKPI = insights && selectedKPIIndex !== null 
    ? insights.kpis[selectedKPIIndex] 
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="relative text-center space-y-6 animate-fade-in overflow-hidden">
            {/* Background Hero Image */}
            <div className="absolute inset-0 -z-10">
              <img 
                src={heroImage} 
                alt="Data Analytics Hero" 
                className="w-full h-full object-cover opacity-20 blur-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background"></div>
            </div>
            
            <div className="relative z-10 pt-12 pb-8">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <Brain className="h-16 w-16 text-primary animate-pulse-primary" />
                <h1 className="text-6xl md:text-7xl font-black bg-gradient-primary bg-clip-text text-transparent">
                  Insightify
                </h1>
              </div>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Transforma tus datos en decisiones inteligentes. 
                <br className="hidden md:block" />
                Sube tu fichero Excel o CSV y deja que la IA haga el análisis por ti.
              </p>
              
              {/* Decorative elements */}
              <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
            </div>
          </div>

          {/* API Key Configuration */}
          {showApiKeyInput && (
            <Card className="p-6 animate-slide-up">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Configuración de API</h3>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Para usar el análisis de IA, necesitas una API Key de Google Gemini. 
                    Puedes obtenerla en <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">Google Gemini API Key</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Ingresa tu API Key aquí..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => setShowApiKeyInput(false)}
                      disabled={!apiKey.trim()}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* File Upload */}
          <FileUpload 
            onFileProcessed={handleFileProcessed}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />

          {/* Data Preview */}
          {data.length > 0 && (
            <DataPreview 
              data={data}
              headers={headers}
              onAnalyze={analyzeWithGemini}
              isAnalyzing={isAnalyzing}
            />
          )}

          {/* AI Insights */}
          {insights && (
            <AIInsights 
              insights={insights}
              onKPISelect={handleKPISelect}
              selectedKPIIndex={selectedKPIIndex}
            />
          )}

          {/* Chart Visualization */}
          {selectedKPI && data.length > 0 && (
            <ChartVisualization 
              data={data}
              headers={headers}
              selectedKPI={selectedKPI}
            />
          )}

          {/* Footer */}
          <div className="text-center text-muted-foreground text-sm">
            <p>Desarrollado con ❤️ usando React, TypeScript y Gemini AI</p>
          </div>
        </div>
      </div>
    </div>
  );
};