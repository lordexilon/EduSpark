import { SESSIONS_DATA, MODULE_INFO, updateMockSessions as updateGlobalMockSessions } from '../constants.ts';
import { CourseSession, ModuleInfo } from '../types.ts';

export const getModuleInfo = async (): Promise<ModuleInfo> => {
  // Simulate API call
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(MODULE_INFO);
    }, 100);
  });
};

export const getAllSessions = async (): Promise<CourseSession[]> => {
  // Simulate API call
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(SESSIONS_DATA);
    }, 300);
  });
};

export const getSessionById = async (sessionId: string): Promise<CourseSession | undefined> => {
  // Simulate API call
  return new Promise(resolve => {
    setTimeout(() => {
      const session = SESSIONS_DATA.find(s => s.id === sessionId);
      resolve(session);
    }, 200);
  });
};

// Adjusted to accept Omit<CourseSession, 'id'> to include blocks and other details
export const createSession = async (sessionData: Omit<CourseSession, 'id'>): Promise<CourseSession> => {
  // Simulate API call for creating a session
  return new Promise(resolve => {
    setTimeout(() => {
      const newSession: CourseSession = {
        ...sessionData, // Spread all provided data, including blocks
        id: `clase-${SESSIONS_DATA.length + 1}-${Date.now()}`, // Simple unique ID
      };
      
      const updatedSessions = [...SESSIONS_DATA, newSession];
      updateGlobalMockSessions(updatedSessions); 

      console.log("Mock Service: Sesión creada con contenido", newSession);
      alert("Sesión creada con contenido (simulado). Es posible que necesite refrescar la página para ver todos los cambios debido a la naturaleza del mock (temporal).");
      resolve(newSession);
    }, 500);
  });
};

// updateSession already accepts Partial<CourseSession>, which can include blocks.
export const updateSession = async (sessionId: string, sessionData: Partial<CourseSession>): Promise<CourseSession | undefined> => {
  // Simulate API call for updating a session
  return new Promise(resolve => {
    setTimeout(() => {
      let updatedSession: CourseSession | undefined = undefined;
      const updatedSessions = SESSIONS_DATA.map(s => {
        if (s.id === sessionId) {
          // Deep merge for blocks if provided, otherwise keep existing blocks.
          // This simple merge might not be perfect for deep array updates without more sophisticated logic.
          updatedSession = { 
            ...s, 
            ...sessionData,
            blocks: sessionData.blocks !== undefined ? sessionData.blocks : s.blocks, // Ensure blocks are explicitly updated or kept
           };
          return updatedSession;
        }
        return s;
      });
      
      if (updatedSession) {
         updateGlobalMockSessions(updatedSessions); 
         console.log("Mock Service: Sesión actualizada con contenido", updatedSession);
         alert("Sesión actualizada con contenido (simulado). Es posible que necesite refrescar la página para ver todos los cambios debido a la naturaleza del mock (temporal).");
      } else {
        console.error("Mock Service: Sesión no encontrada para actualizar", sessionId);
        alert("Error: Sesión no encontrada para actualizar (simulado).");
      }
      resolve(updatedSession);
    }, 500);
  });
};


// Add more mock service functions as needed for assignments, grades, etc.
// e.g., submitAssignment, getGrades, postToForum