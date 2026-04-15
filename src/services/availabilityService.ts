/**
 * Utilidades para verificar la disponibilidad de unidades y sesiones basadas en fechas
 */

import { CourseUnit, Session } from './teacherCourses';

/**
 * Verifica si una unidad está disponible para acceso en este momento
 * @param unit La unidad a verificar
 * @param checkTime Fecha/hora a verificar (por defecto: ahora)
 * @returns true si está disponible, false si no
 */
export function isUnitAvailable(
    unit: CourseUnit,
    checkTime: Date = new Date()
): boolean {
    // Si no hay fechas configuradas, la unidad está disponible
    if (!unit.available_from && !unit.available_until) {
        return true;
    }

    // Verificar si ya comenzó (available_from)
    if (unit.available_from) {
        const startDate = new Date(unit.available_from);
        if (checkTime < startDate) {
            return false; // Aún no ha comenzado
        }
    }

    // Verificar si ya terminó (available_until)
    if (unit.available_until) {
        const endDate = new Date(unit.available_until);
        if (checkTime > endDate) {
            return false; // Ya terminó
        }
    }

    return true;
}

/**
 * Verifica si una sesión está disponible para acceso en este momento
 * @param session La sesión a verificar
 * @param parentUnit La unidad padre (opcional, para verificar su disponibilidad también)
 * @param checkTime Fecha/hora a verificar (por defecto: ahora)
 * @returns true si está disponible, false si no
 */
export function isSessionAvailable(
    session: Session,
    parentUnit?: CourseUnit,
    checkTime: Date = new Date()
): boolean {
    // Primero verificar disponibilidad de la unidad padre si existe
    if (parentUnit && !isUnitAvailable(parentUnit, checkTime)) {
        return false;
    }

    // Si no hay fechas configuradas en la sesión, heredar disponibilidad de la unidad
    if (!session.available_from && !session.available_until) {
        return true; // La unidad ya fue verificada arriba
    }

    // Verificar si ya comenzó (available_from)
    if (session.available_from) {
        const startDate = new Date(session.available_from);
        if (checkTime < startDate) {
            return false; // Aún no ha comenzado
        }
    }

    // Verificar si ya terminó (available_until)
    if (session.available_until) {
        const endDate = new Date(session.available_until);
        if (checkTime > endDate) {
            return false; // Ya terminó
        }
    }

    return true;
}

/**
 * Obtiene un mensaje descriptivo sobre la disponibilidad de una unidad
 * @param unit La unidad a verificar
 * @param checkTime Fecha/hora a verificar (por defecto: ahora)
 * @returns Mensaje descriptivo o null si está disponible
 */
export function getUnitAvailabilityMessage(
    unit: CourseUnit,
    checkTime: Date = new Date()
): string | null {
    if (isUnitAvailable(unit, checkTime)) {
        return null;
    }

    if (unit.available_from) {
        const startDate = new Date(unit.available_from);
        if (checkTime < startDate) {
            return `Esta unidad estará disponible desde ${startDate.toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short'
            })}`;
        }
    }

    if (unit.available_until) {
        const endDate = new Date(unit.available_until);
        if (checkTime > endDate) {
            return `Esta unidad ya no está disponible (finalizó el ${endDate.toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short'
            })})`;
        }
    }

    return 'Esta unidad no está disponible en este momento';
}

/**
 * Obtiene un mensaje descriptivo sobre la disponibilidad de una sesión
 * @param session La sesión a verificar
 * @param parentUnit La unidad padre (opcional)
 * @param checkTime Fecha/hora a verificar (por defecto: ahora)
 * @returns Mensaje descriptivo o null si está disponible
 */
export function getSessionAvailabilityMessage(
    session: Session,
    parentUnit?: CourseUnit,
    checkTime: Date = new Date()
): string | null {
    // Verificar disponibilidad de la unidad padre primero
    if (parentUnit) {
        const unitMessage = getUnitAvailabilityMessage(parentUnit, checkTime);
        if (unitMessage) {
            return unitMessage;
        }
    }

    if (isSessionAvailable(session, parentUnit, checkTime)) {
        return null;
    }

    if (session.available_from) {
        const startDate = new Date(session.available_from);
        if (checkTime < startDate) {
            return `Esta sesión estará disponible desde ${startDate.toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short'
            })}`;
        }
    }

    if (session.available_until) {
        const endDate = new Date(session.available_until);
        if (checkTime > endDate) {
            return `Esta sesión ya no está disponible (finalizó el ${endDate.toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short'
            })})`;
        }
    }

    return 'Esta sesión no está disponible en este momento';
}

/**
 * Filtra una lista de unidades para mostrar solo las disponibles
 * @param units Lista de unidades
 * @param checkTime Fecha/hora a verificar (por defecto: ahora)
 * @returns Lista de unidades disponibles
 */
export function filterAvailableUnits(
    units: CourseUnit[],
    checkTime: Date = new Date()
): CourseUnit[] {
    return units.filter(unit => isUnitAvailable(unit, checkTime));
}

/**
 * Filtra una lista de sesiones para mostrar solo las disponibles
 * @param sessions Lista de sesiones
 * @param unitMap Mapa de unidades por ID (opcional, para verificar unidades padre)
 * @param checkTime Fecha/hora a verificar (por defecto: ahora)
 * @returns Lista de sesiones disponibles
 */
export function filterAvailableSessions(
    sessions: Session[],
    unitMap?: Map<string, CourseUnit>,
    checkTime: Date = new Date()
): Session[] {
    return sessions.filter(session => {
        const parentUnit = session.unit_id && unitMap ? unitMap.get(session.unit_id) : undefined;
        return isSessionAvailable(session, parentUnit, checkTime);
    });
}
