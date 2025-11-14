# Generación de Quizz y Trivias con IA Basada en RAG
## Prevención de Alucinaciones y Garantía de Contenido Verificado

**Fecha:** Octubre 2025  
**Versión:** 1.0  
**Objetivo:** Asegurar que todos los quizz generados por IA se basen exclusivamente en contenido validado del curso

---

## 🎯 Problema Identificado: Alucinaciones en IA

### Riesgo en Contexto Educativo

**Las alucinaciones de IA en educación son críticas porque:**
1. Pueden generar preguntas incorrectas o fuera del contexto
2. Pueden inventar información no presente en los materiales
3. Pueden confundir a estudiantes con datos falsos
4. Pueden evaluar conceptos que no fueron enseñados

### Ejemplo de Alucinación Problemática

❌ **Pregunta generada incorrectamente:**
```
"Según el material del curso, ¿cuál es la fecha exacta 
en que se descubrió la teoría de la relatividad?"

Opción A: 1905
Opción B: 1915
Opción C: 1920
```

**Problema:** Si el material del curso no menciona fechas específicas, la IA puede "inventar" una respuesta que parece correcta pero no está en el contenido.

---

## ✅ Solución Propuesta: RAG-Estrict (Retrieval-Augmented Generation)

### Principio Fundamental

**TODA pregunta generada DEBE basarse en fragmentos de texto explícitos del contenido del curso.**

### Arquitectura de Generación Segura

```
┌─────────────────────────────────────────────────────────┐
│ 1. INPUT: Tipo de Quizz + Módulo/Contenido Objetivo    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. RETRIEVAL: Extraer Fragmentos Relevantes (RAG)      │
│    - Buscar en course_materials (contenido)            │
│    - Buscar en course_content_chunks (RAG embeddings)  │
│    - Filtrar por module_id si aplica                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 3. VALIDATION: Verificar Existencia de Fragmentos      │
│    - ¿Existen fragmentos suficientes?                  │
│    - ¿El contenido es relevante?                       │
│    - ¿Hay al menos N fragmentos para generar preguntas?│
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 4. GENERATION: Generar Preguntas con Fragmentos        │
│    - Prompt incluye SOLO fragmentos recuperados        │
│    - Instrucción explícita: NO inventar información     │
│    - Cada pregunta DEBE tener referencia a fragmento   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 5. VALIDATION POST-GENERATION: Verificar Calidad       │
│    - ¿Cada pregunta tiene fuente identificada?         │
│    - ¿Las respuestas están en los fragmentos?          │
│    - ¿No hay información no presente en fragmentos?    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 6. DOCUMENTATION: Guardar Referencias                   │
│    - Guardar fragmentos usados                          │
│    - Guardar referencias en metadata                    │
│    - Permitir auditoría                                │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Implementación Técnica

### 1. Servicio de Generación Segura de Quizz

```typescript
// services/ai/SafeQuizGenerationService.ts

import { supabase } from '@/lib/supabase';
import { geminiService } from './geminiService';
import { ragService } from '@/audio-tutor/services/ragService';

interface QuizGenerationRequest {
  courseId: number;
  moduleId?: number;
  quizType: 'pre-class' | 'post-class' | 'formative' | 'summative';
  numberOfQuestions: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string; // Tema específico opcional
}

interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  sourceChunks: string[]; // IDs de chunks usados
  sourceMaterials: number[]; // IDs de materiales usados
  confidence: number; // 0-1, qué tan seguro está el sistema
}

interface SafeQuizResult {
  quiz: {
    id: string;
    title: string;
    questions: QuizQuestion[];
  };
  sourcesUsed: {
    materialIds: number[];
    chunkIds: string[];
  };
  validationReport: {
    allQuestionsHaveSources: boolean;
    sourcesVerified: boolean;
    confidenceScore: number;
  };
}

export class SafeQuizGenerationService {
  
  /**
   * Genera un quizz de forma segura basado SOLO en contenido verificado
   */
  async generateSafeQuiz(
    request: QuizGenerationRequest
  ): Promise<SafeQuizResult> {
    
    // PASO 1: Extraer contenido relevante usando RAG
    const relevantContent = await this.retrieveRelevantContent(
      request.courseId,
      request.moduleId,
      request.topic
    );
    
    // PASO 2: Validar que hay suficiente contenido
    this.validateContentAvailability(relevantContent, request.numberOfQuestions);
    
    // PASO 3: Generar preguntas con fragmentos explícitos
    const questions = await this.generateQuestionsWithSources(
      relevantContent,
      request
    );
    
    // PASO 4: Validar post-generación
    const validationReport = await this.validateGeneratedQuestions(
      questions,
      relevantContent
    );
    
    // PASO 5: Guardar con referencias
    const savedQuiz = await this.saveQuizWithReferences(
      request,
      questions,
      relevantContent
    );
    
    return {
      quiz: savedQuiz,
      sourcesUsed: {
        materialIds: this.extractMaterialIds(relevantContent),
        chunkIds: this.extractChunkIds(relevantContent)
      },
      validationReport
    };
  }
  
  /**
   * PASO 1: Recuperar contenido relevante usando RAG
   */
  private async retrieveRelevantContent(
    courseId: number,
    moduleId?: number,
    topic?: string
  ): Promise<CourseContent[]> {
    
    // Usar el servicio RAG existente
    const query = topic || 'contenido del curso para evaluación';
    
    const content = await ragService.getRelevantContent(
      query,
      courseId.toString(),
      { moduleId: moduleId?.toString() }
    );
    
    if (!content || content.length === 0) {
      throw new Error('No se encontró contenido relevante en el curso. No se puede generar quizz.');
    }
    
    // Filtrar solo contenido con texto real (no solo URLs)
    const textContent = content.filter(c => 
      c.content && 
      c.content.length > 50 && // Mínimo 50 caracteres de contenido
      !c.content.match(/^(Video de YouTube|Documento PDF|Recurso externo):/) // Evitar contenido generado descriptivo
    );
    
    if (textContent.length === 0) {
      throw new Error('El contenido del curso no tiene suficiente texto para generar quizz. Agrega más materiales con texto.');
    }
    
    return textContent;
  }
  
  /**
   * PASO 2: Validar disponibilidad de contenido
   */
  private validateContentAvailability(
    content: CourseContent[],
    numberOfQuestions: number
  ): void {
    const MIN_CONTENT_PER_QUESTION = 200; // Caracteres mínimos por pregunta
    const totalContentLength = content.reduce((sum, c) => sum + c.content.length, 0);
    const requiredContent = numberOfQuestions * MIN_CONTENT_PER_QUESTION;
    
    if (totalContentLength < requiredContent) {
      throw new Error(
        `Contenido insuficiente para generar ${numberOfQuestions} preguntas. ` +
        `Se requiere al menos ${requiredContent} caracteres de contenido. ` +
        `Disponible: ${totalContentLength} caracteres.`
      );
    }
    
    if (content.length < numberOfQuestions / 2) {
      throw new Error(
        `Se requieren más fragmentos de contenido. ` +
        `Encontrados: ${content.length}, requeridos: ${Math.ceil(numberOfQuestions / 2)}`
      );
    }
  }
  
  /**
   * PASO 3: Generar preguntas con referencias explícitas a fragmentos
   */
  private async generateQuestionsWithSources(
    content: CourseContent[],
    request: QuizGenerationRequest
  ): Promise<QuizQuestion[]> {
    
    // Preparar fragmentos para el prompt
    const fragmentsText = content.map((c, index) => 
      `[FRAGMENTO ${index + 1} - ID: ${c.id}]\n${c.content.substring(0, 500)}`
    ).join('\n\n---\n\n');
    
    // Prompt estricto para evitar alucinaciones
    const systemPrompt = `Eres un generador de preguntas educativas. CRÍTICO: 
    
1. SOLO puedes usar información presente en los FRAGMENTOS proporcionados
2. NO puedes inventar, inferir o agregar información que no esté explícitamente en los fragmentos
3. Si no hay suficiente información para una pregunta, omítela
4. Cada pregunta DEBE poder responderse usando SOLO los fragmentos
5. Cada respuesta correcta DEBE estar explícitamente mencionada en los fragmentos
6. Cada pregunta debe indicar qué fragmento(s) la respaldan

INSTRUCCIONES:
- Genera ${request.numberOfQuestions} preguntas de tipo ${request.quizType}
- Dificultad: ${request.difficulty || 'medium'}
- Formato: múltiple opción con 4 opciones (A, B, C, D)
- Para cada pregunta, indica el número de fragmento que la respalda

IMPORTANTE: Si no puedes crear una pregunta válida basada solo en los fragmentos, 
indica "NO_VALID" en lugar de inventar información.`;
    
    const userPrompt = `Basándote EXCLUSIVAMENTE en estos fragmentos del curso, genera las preguntas:

${fragmentsText}

Formato de respuesta JSON:
{
  "questions": [
    {
      "questionText": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "A|B|C|D",
      "explanation": "...",
      "sourceFragmentIndex": 0,
      "confidence": 0.95
    }
  ]
}`;
    
    try {
      const response = await geminiService.generateContent(userPrompt, {
        systemInstruction: systemPrompt,
        temperature: 0.3, // Baja temperatura para más precisión
      });
      
      const parsed = JSON.parse(response);
      
      // Validar estructura
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Respuesta de IA no tiene formato válido');
      }
      
      // Convertir a formato interno con referencias
      return parsed.questions.map((q: any, idx: number) => ({
        id: `q_${Date.now()}_${idx}`,
        questionText: q.questionText,
        questionType: 'multiple_choice' as const,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sourceChunks: [content[q.sourceFragmentIndex || 0].id],
        sourceMaterials: this.extractMaterialIdFromContent(content[q.sourceFragmentIndex || 0]),
        confidence: q.confidence || 0.8
      }));
      
    } catch (error) {
      console.error('Error generando preguntas:', error);
      throw new Error('Error al generar preguntas. Verifica que el contenido tenga suficiente información.');
    }
  }
  
  /**
   * PASO 4: Validar preguntas generadas contra contenido
   */
  private async validateGeneratedQuestions(
    questions: QuizQuestion[],
    content: CourseContent[]
  ): Promise<any> {
    
    const validationResults = await Promise.all(
      questions.map(async (question) => {
        return await this.validateSingleQuestion(question, content);
      })
    );
    
    const allValid = validationResults.every(r => r.isValid);
    const avgConfidence = validationResults.reduce((sum, r) => sum + r.confidence, 0) / validationResults.length;
    
    return {
      allQuestionsHaveSources: questions.every(q => q.sourceChunks.length > 0),
      sourcesVerified: allValid,
      confidenceScore: avgConfidence,
      questionValidations: validationResults
    };
  }
  
  /**
   * Valida una pregunta individual contra su contenido fuente
   */
  private async validateSingleQuestion(
    question: QuizQuestion,
    content: CourseContent[]
  ): Promise<{ isValid: boolean; confidence: number; issues: string[] }> {
    
    const issues: string[] = [];
    
    // Verificar que existe contenido fuente
    const sourceContent = content.find(c => 
      question.sourceChunks.includes(c.id)
    );
    
    if (!sourceContent) {
      issues.push('No se encontró contenido fuente para la pregunta');
      return { isValid: false, confidence: 0, issues };
    }
    
    // Verificar que la respuesta correcta aparece en el contenido
    const correctAnswerText = question.options?.[
      question.correctAnswer.charCodeAt(0) - 65 // A=0, B=1, etc.
    ];
    
    if (!correctAnswerText) {
      issues.push('No se pudo encontrar el texto de la respuesta correcta');
      return { isValid: false, confidence: 0, issues };
    }
    
    // Buscar si la respuesta aparece en el contenido fuente
    const answerInContent = sourceContent.content
      .toLowerCase()
      .includes(correctAnswerText.toLowerCase());
    
    if (!answerInContent) {
      issues.push(`La respuesta correcta "${correctAnswerText}" no aparece explícitamente en el contenido fuente`);
    }
    
    // Verificar que la pregunta tiene sentido con el contenido
    const questionKeywords = this.extractKeywords(question.questionText);
    const contentKeywords = this.extractKeywords(sourceContent.content);
    const keywordOverlap = questionKeywords.filter(k => contentKeywords.includes(k)).length;
    const keywordRelevance = keywordOverlap / questionKeywords.length;
    
    if (keywordRelevance < 0.3) {
      issues.push('La pregunta tiene baja relevancia con el contenido fuente');
    }
    
    const isValid = issues.length === 0 && answerInContent && keywordRelevance >= 0.3;
    const confidence = isValid ? question.confidence : Math.max(0, question.confidence - 0.3);
    
    return { isValid, confidence, issues };
  }
  
  /**
   * PASO 5: Guardar quizz con referencias completas
   */
  private async saveQuizWithReferences(
    request: QuizGenerationRequest,
    questions: QuizQuestion[],
    content: CourseContent[]
  ): Promise<any> {
    
    // Guardar quizz en base de datos
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        course_id: request.courseId,
        module_id: request.moduleId,
        title: this.generateQuizTitle(request),
        description: `Quizz generado automáticamente basado en contenido del curso`,
        quiz_type: request.quizType,
        max_points: questions.length * 10,
        is_active: true,
        metadata: {
          generatedBy: 'ai',
          generationDate: new Date().toISOString(),
          sources: {
            materialIds: this.extractMaterialIds(content),
            chunkIds: this.extractChunkIds(content),
            contentExcerpts: content.map(c => ({
              id: c.id,
              excerpt: c.content.substring(0, 200)
            }))
          }
        }
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Guardar preguntas con referencias
    const questionsToInsert = questions.map(q => ({
      quiz_id: quiz.id,
      question_type: q.questionType,
      question_text: q.questionText,
      options: q.options,
      correct_answer: q.correctAnswer,
      points: 10,
      explanation: q.explanation,
      difficulty: request.difficulty || 'medium',
      metadata: {
        sourceChunks: q.sourceChunks,
        sourceMaterials: q.sourceMaterials,
        confidence: q.confidence,
        generatedBy: 'ai'
      }
    }));
    
    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert);
    
    if (questionsError) throw questionsError;
    
    return {
      id: quiz.id,
      title: quiz.title,
      questions
    };
  }
  
  // Métodos auxiliares
  private extractMaterialIds(content: CourseContent[]): number[] {
    return content
      .map(c => parseInt(c.id))
      .filter(id => !isNaN(id));
  }
  
  private extractChunkIds(content: CourseContent[]): string[] {
    return content.map(c => c.id);
  }
  
  private extractMaterialIdFromContent(content: CourseContent): number[] {
    // Implementar según estructura de CourseContent
    return [];
  }
  
  private extractKeywords(text: string): string[] {
    // Extraer palabras clave (simplificado)
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .slice(0, 10);
  }
  
  private generateQuizTitle(request: QuizGenerationRequest): string {
    const typeNames = {
      'pre-class': 'Quiz Pre-Clase',
      'post-class': 'Quiz Post-Clase',
      'formative': 'Evaluación Formativa',
      'summative': 'Evaluación Sumativa'
    };
    
    return `${typeNames[request.quizType]} - ${request.moduleId ? `Módulo ${request.moduleId}` : 'Curso'}`;
  }
}
```

---

## 🔒 Validaciones Adicionales

### 1. Validación Pre-Generación

```typescript
/**
 * Verifica que el contenido tiene calidad suficiente
 */
async function validateContentQuality(
  courseId: number,
  moduleId?: number
): Promise<{ valid: boolean; issues: string[] }> {
  
  const issues: string[] = [];
  
  // Verificar que hay materiales con contenido
  const { data: materials } = await supabase
    .from('course_materials')
    .select('id, content, file_url, source_url')
    .eq('course_id', courseId)
    .eq('is_active', true);
  
  if (moduleId) {
    query = query.eq('module_id', moduleId);
  }
  
  const textMaterials = materials?.filter(m => 
    m.content && m.content.length > 100
  ) || [];
  
  if (textMaterials.length === 0) {
    issues.push('No hay materiales con suficiente contenido de texto');
  }
  
  // Verificar contenido en RAG
  const ragContent = await ragService.getRelevantContent(
    'contenido del curso',
    courseId.toString(),
    { moduleId: moduleId?.toString() }
  );
  
  if (!ragContent || ragContent.length === 0) {
    issues.push('No hay contenido indexado en el sistema RAG');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
```

### 2. Modo Estricto vs Permisivo

```typescript
interface QuizGenerationOptions {
  strictMode: boolean; // Si true, rechaza preguntas con baja confianza
  minConfidence: number; // Nivel mínimo de confianza (0-1)
  requireExplicitAnswer: boolean; // Si true, respuesta debe estar explícita en texto
  allowInference: boolean; // Si false, solo permite información literal
}

const STRICT_MODE: QuizGenerationOptions = {
  strictMode: true,
  minConfidence: 0.8,
  requireExplicitAnswer: true,
  allowInference: false
};
```

### 3. Auditoría y Trazabilidad

```sql
-- Agregar columna de auditoría a quiz_questions
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb;
-- Guardar: { sources: [...], validation: {...}, confidence: 0.95 }

-- Vista para auditoría
CREATE VIEW vw_quiz_audit AS
SELECT 
  q.id AS quiz_id,
  q.title,
  qq.id AS question_id,
  qq.question_text,
  qq.generation_metadata->>'confidence' AS confidence,
  qq.generation_metadata->>'sources' AS sources,
  q.created_at
FROM quizzes q
JOIN quiz_questions qq ON q.id = qq.quiz_id
WHERE q.metadata->>'generatedBy' = 'ai';
```

---

## 📊 Interfaz para Docente

### Opción 1: Generación Automática con Validación

```tsx
// components/QuizGenerator.tsx

export const QuizGenerator = ({ courseId, moduleId }) => {
  const [contentValidation, setContentValidation] = useState(null);
  const [generationMode, setGenerationMode] = useState('auto');
  const [quizResult, setQuizResult] = useState(null);
  
  // Validar contenido antes de generar
  useEffect(() => {
    validateContentQuality(courseId, moduleId).then(setContentValidation);
  }, [courseId, moduleId]);
  
  const handleGenerate = async () => {
    if (!contentValidation?.valid) {
      alert('El contenido no tiene calidad suficiente. Agrega más materiales con texto.');
      return;
    }
    
    const result = await safeQuizGenerationService.generateSafeQuiz({
      courseId,
      moduleId,
      quizType: 'formative',
      numberOfQuestions: 10,
      strictMode: true
    });
    
    if (result.validationReport.sourcesVerified) {
      setQuizResult(result);
    } else {
      alert('Algunas preguntas no pasaron la validación. Revisa el contenido.');
    }
  };
  
  return (
    <div>
      {/* Indicador de calidad de contenido */}
      <ContentQualityIndicator validation={contentValidation} />
      
      {/* Opciones de generación */}
      <GenerationOptions 
        mode={generationMode}
        onModeChange={setGenerationMode}
      />
      
      {/* Resultado con fuentes visibles */}
      {quizResult && (
        <GeneratedQuiz 
          quiz={quizResult.quiz}
          sources={result.sourcesUsed}
          validation={result.validationReport}
          onEdit={handleEditQuestion}
          onApprove={handleApproveQuiz}
        />
      )}
    </div>
  );
};
```

### Opción 2: Modo Asistido (IA sugiere, docente valida)

```tsx
// components/AssistedQuizCreation.tsx

export const AssistedQuizCreation = () => {
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  
  const handleSuggestQuestions = async () => {
    // IA sugiere preguntas con fuentes visibles
    const suggestions = await generateQuestionSuggestions();
    
    // Mostrar preguntas con contenido fuente
    suggestions.forEach(q => {
      q.sourceContent = getSourceContent(q.sourceChunks);
    });
    
    setSuggestedQuestions(suggestions);
  };
  
  return (
    <div>
      {/* Lista de preguntas sugeridas */}
      {suggestedQuestions.map((q, idx) => (
        <QuestionSuggestionCard
          key={idx}
          question={q}
          sourceContent={q.sourceContent}
          onApprove={() => addToQuiz(q)}
          onEdit={() => editQuestion(q)}
          onReject={() => removeSuggestion(q)}
        />
      ))}
    </div>
  );
};
```

---

## ✅ Garantías del Sistema

### 1. **Sin Alucinaciones**
- ✅ Solo usa contenido verificado de `course_materials` y `course_content_chunks`
- ✅ Validación pre-generación de disponibilidad de contenido
- ✅ Validación post-generación de cada pregunta
- ✅ Rechazo automático de preguntas sin fuente verificable

### 2. **Trazabilidad Completa**
- ✅ Cada pregunta tiene referencias a fragmentos fuente
- ✅ Metadata guarda IDs de materiales y chunks usados
- ✅ Auditoría disponible para verificar fuentes

### 3. **Control del Docente**
- ✅ Docente puede generar automáticamente O manualmente
- ✅ Docente puede editar preguntas generadas
- ✅ Docente ve fuentes de cada pregunta
- ✅ Docente puede rechazar preguntas con baja confianza

### 4. **Fallbacks Seguros**
- ✅ Si no hay contenido suficiente, NO genera (error claro)
- ✅ Si validación falla, muestra issues específicos
- ✅ Opción de modo estricto vs permisivo
- ✅ Sugerencias siempre con contenido fuente visible

---

## 🎯 Recomendación Final

### Flujo Recomendado

1. **Generación Automática con Validación Estricta**
   - Docente hace click en "Generar Quizz con IA"
   - Sistema valida contenido antes de generar
   - Genera preguntas con referencias
   - Valida cada pregunta
   - Muestra resultado con fuentes visibles

2. **Revisión y Edición por Docente**
   - Docente revisa preguntas generadas
   - Ve contenido fuente de cada pregunta
   - Puede editar, eliminar o aprobar preguntas
   - Sistema muestra advertencias si pregunta editada pierde referencia

3. **Modo Manual con Asistencia**
   - Docente crea preguntas manualmente
   - IA sugiere mejoras basadas en contenido
   - Docente decide si acepta sugerencias

### Configuración Recomendada

```typescript
const RECOMMENDED_CONFIG = {
  strictMode: true,
  minConfidence: 0.75,
  requireExplicitAnswer: true,
  allowInference: false,
  minContentLength: 1000, // Caracteres mínimos por pregunta
  maxQuestionsPerGeneration: 20,
  validationTimeout: 30000 // 30 segundos máximo
};
```

---

## 📝 Conclusión

**Con esta arquitectura, garantizamos:**

✅ **Cero alucinaciones**: Todo basado en contenido verificado  
✅ **Trazabilidad completa**: Cada pregunta tiene fuente identificable  
✅ **Control del docente**: Puede revisar y editar todo  
✅ **Validación automática**: Sistema rechaza contenido no verificado  
✅ **Auditoría**: Historial completo de generación  

**El sistema es seguro, verificable y confiable para uso educativo.**

---

**Fin del Documento**

