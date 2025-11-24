import React, { useState } from 'react';
import { IconSearch, IconFilter, IconX } from './Icons';
import Button from './Button';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  // Búsqueda
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filtros de dropdown
  filters?: Array<{
    key: string;
    label: string;
    options: FilterOption[];
    value?: string;
    onChange: (value: string) => void;
  }>;
  
  // Ordenamiento
  sortOptions?: FilterOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  
  // Limpiar filtros
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  
  className?: string;
}

/**
 * Componente FilterBar reutilizable para filtros y búsqueda
 */
const FilterBar: React.FC<FilterBarProps> = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters = [],
  sortOptions = [],
  sortValue,
  onSortChange,
  onClearFilters,
  hasActiveFilters = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasFilters = filters.length > 0 || sortOptions.length > 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex flex-col gap-4">
        {/* Fila principal: Búsqueda y botones */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Búsqueda */}
          {onSearchChange && (
            <div className="flex-1 min-w-[200px] relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconSearch className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition"
              />
            </div>
          )}

          {/* Botón de filtros (si hay filtros) */}
          {hasFilters && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                leftIcon={<IconFilter className="w-4 h-4" />}
              >
                Filtros {hasActiveFilters && <span className="ml-1 text-primary">•</span>}
              </Button>
              
              {hasActiveFilters && onClearFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  leftIcon={<IconX className="w-4 h-4" />}
                >
                  Limpiar
                </Button>
              )}
            </>
          )}
        </div>

        {/* Filtros expandibles */}
        {isExpanded && hasFilters && (
          <div className="border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtros de dropdown */}
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                <select
                  value={filter.value || ''}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition"
                >
                  <option value="">Todos</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* Ordenamiento */}
            {sortOptions.length > 0 && onSortChange && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordenar por
                </label>
                <select
                  value={sortValue || ''}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;

