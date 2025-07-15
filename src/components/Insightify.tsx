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

// --- NUEVAS INTERFACES ---
// Definimos la estructura exacta de la configuración del gráfico que esperamos de la IA.
interface ChartConfig {
  chartType: 'bar' | 'pie' | 'line';
  xAxisColumn: string | string[];
  yAxisOperation: 'count' | 'sum';
  yAxisColumn: string | null;
}

// Actualizamos la interfaz KPI para que incluya la configuración del gráfico.
interface KPI {
  titulo: string;
  descripcion: string;
  chartConfig: ChartConfig; // Cada KPI ahora sabe cómo debe ser visualizado.
}

// La interfaz AIInsight se actualiza automáticamente al usar la nueva interfaz KPI.
interface AIInsight {
  contexto: string;
  kpis: KPI[];
}

export default function Insightify() {
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [selectedKPIIndex, setSelectedKPIIndex] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState(''); // Dejar vacío por defecto
  const [showApiKeyInput, setShowApiKeyInput] = useState(true); // Mostrar por defecto
  
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
      // --- PROMPT MEJORADO ---
      // Este es el nuevo prompt que le pide a la IA que devuelva la configuración del gráfico.
      // Es más explícito y le da a nuestro código las instrucciones que necesita.
      const prompt = `
        Eres un desarrollador y analista de negocio experto. Has recibido un fichero con las siguientes columnas: ${headers.join(', ')}.

        Tu tarea es doble:
        1. Identificar el contexto de negocio (ej: 'Datos de Ventas', 'Inventario de E-commerce').
        2. Sugerir 4 KPIs clave que se podrían calcular con estas columnas.

        Para cada KPI, formatea tu respuesta como un objeto JSON. Además del título y la descripción, DEBES incluir un objeto anidado llamado "chartConfig" que mi código usará para generar el gráfico. Este objeto debe contener:
        - chartType: El tipo de gráfico recomendado ('bar', 'pie', 'line').
        - xAxisColumn: La columna a usar para las etiquetas del eje X. Si las categorías son los propios nombres de las columnas, devuelve un array con esos nombres de columna.
        - yAxisOperation: La operación a realizar ('count' para contar filas, 'sum' para sumar valores de una columna).
        - yAxisColumn: La columna sobre la que se debe realizar la operación 'sum'. Si la operación es 'count', este campo puede ser null.

        El formato final del JSON debe ser estrictamente así:
        {
          "contexto": "Tu análisis del contexto aquí.",
          "kpis": [
            {
              "titulo": "Título del KPI 1",
              "descripcion": "Descripción del KPI 1.",
              "chartConfig": {
                "chartType": "bar",
                "xAxisColumn": "nombre_columna_eje_x",
                "yAxisOperation": "count",
                "yAxisColumn": null
              }
            },
            {
              "titulo": "Título del KPI 2",
              "descripcion": "Descripción del KPI 2.",
              "chartConfig": {
                "chartType": "pie",
                "xAxisColumn": ["columna1", "columna2", "columna3"],
                "yAxisOperation": "sum",
                "yAxisColumn": null
              }
            }
          ]
        }
      `;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
          // Añadimos una configuración para forzar la respuesta en JSON
          generationConfig: {
            responseMimeType: "application/json", 
            temperature: 0.7,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const generatedText = result.candidates[0]?.content?.parts[0]?.text;
      
      if (!generatedText) {
        throw new Error('No se recibió respuesta de la IA');
      }

      // La respuesta ya debería ser un JSON limpio gracias a `responseMimeType`.
      const analysisResult: AIInsight = JSON.parse(generatedText);
      setInsights(analysisResult);
      
      toast({
        title: "Análisis completado",
        description: "La IA ha analizado tus datos y generado recomendaciones de KPIs.",
      });
      
    } catch (error) {
      console.error('Error analyzing with Gemini:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast({
            title: "Tiempo de espera agotado",
            description: "La solicitud tardó demasiado en responder. Intenta de nuevo.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error en el análisis",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error en el análisis",
          description: "Ocurrió un error inesperado",
          variant: "destructive",
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKPISelect = (kpi: KPI, index: number) => {
    // Ahora, cuando seleccionamos un KPI, también tenemos su `chartConfig`.
    console.log('KPI selected:', kpi); 
    console.log('Chart config received:', kpi.chartConfig);
    
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
                      onClick={() => {
                          if(apiKey.trim()) setShowApiKeyInput(false);
                      }}
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
              selectedKPI={selectedKPI} // El KPI seleccionado ahora contiene el chartConfig
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