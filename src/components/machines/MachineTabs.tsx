import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMachineContext } from '../../contexts/MachineContext';
import { useMachines } from '../../hooks/useMachines';
import { Machine } from '../../types';
import { X, Plus } from 'lucide-react';
import { MachineFormModal } from './MachineFormModal';
import Tooltip from '../common/Tooltip';

interface SortableTabProps {
  machine: Machine;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

function SortableTab({ machine, isActive, onSelect, onClose }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: machine.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer
        transition-all duration-200 relative group
        ${isActive
          ? 'bg-white dark:bg-gray-800 border-t-2 border-x border-gray-200 dark:border-gray-700 shadow-md'
          : 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 border-b'
        }
      `}
      {...attributes}
      {...listeners}
    >
      {/* Color indicator */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: machine.color }}
      />

      {/* Machine name */}
      <Tooltip content={`${machine.marca} ${machine.modelo}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 truncate max-w-[150px]"
        >
          {machine.nombre}
        </button>
      </Tooltip>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Cerrar pestaña"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function MachineTabs() {
  const {
    currentMachine,
    machines,
    openMachineTabs,
    tabsOrder,
    setCurrentMachine,
    removeMachineTab,
    reorderTabs,
  } = useMachineContext();

  const { getActiveMachines } = useMachines();
  const [showNewMachineModal, setShowNewMachineModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requiere arrastrar 8px para iniciar el drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Obtener máquinas ordenadas según tabsOrder
  const orderedMachines = tabsOrder
    .map(id => machines.find(m => m.id === id))
    .filter(Boolean) as Machine[];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabsOrder.indexOf(active.id as string);
      const newIndex = tabsOrder.indexOf(over.id as string);

      const newOrder = arrayMove(tabsOrder, oldIndex, newIndex);
      reorderTabs(newOrder);
    }
  };

  const handleCloseTab = (machineId: string) => {
    // No permitir cerrar la última tab
    if (openMachineTabs.length <= 1) {
      return;
    }
    removeMachineTab(machineId);
  };

  const handleNewMachine = () => {
    setShowNewMachineModal(true);
  };

  if (orderedMachines.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleNewMachine}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Nueva Máquina</span>
        </button>
        
        {showNewMachineModal && (
          <MachineFormModal
            isOpen={showNewMachineModal}
            onClose={() => setShowNewMachineModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-4 pt-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabsOrder}
          strategy={horizontalListSortingStrategy}
        >
          {orderedMachines.map((machine) => (
            <SortableTab
              key={machine.id}
              machine={machine}
              isActive={currentMachine?.id === machine.id}
              onSelect={() => setCurrentMachine(machine.id)}
              onClose={() => handleCloseTab(machine.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Botón para agregar nueva máquina */}
      <button
        onClick={handleNewMachine}
        className="flex items-center justify-center w-8 h-8 ml-2 mb-1 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-primary-100 dark:hover:bg-primary-900 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        title="Nueva máquina"
      >
        <Plus className="w-4 h-4" />
      </button>

      {showNewMachineModal && (
        <MachineFormModal
          isOpen={showNewMachineModal}
          onClose={() => setShowNewMachineModal(false)}
        />
      )}
    </div>
  );
}
