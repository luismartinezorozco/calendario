import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Trash2, 
  Edit2, 
  X,
  AlignLeft,
  MousePointerClick
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- UTILIDADES DE FECHA ---
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Lunes = 0, Domingo = 6
};
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};
const formatDateKey = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function App() {
  // Estados Principales
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Estado del Editor de Notas
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  
  // Estado para la Vista Previa
  const [previewNote, setPreviewNote] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error de autenticación:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const notesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'notes');
    
    const unsubscribe = onSnapshot(
      notesRef, 
      (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotes(notesData);
      },
      (error) => {
        console.error("Error obteniendo notas:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !user || !selectedDate) return;

    const dateKey = formatDateKey(selectedDate);
    const notesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'notes');

    try {
      if (editingNote) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', editingNote.id), {
          content: noteContent,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(notesRef, {
          dateKey: dateKey,
          content: noteContent,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      closeEditor();
    } catch (error) {
      console.error("Error guardando la nota:", error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!user) return;
    if(window.confirm("¿Eliminar esta nota permanentemente?")) {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', noteId));
        } catch (error) {
          console.error("Error eliminando la nota:", error);
        }
    }
  };

  const openEditor = (note = null) => {
    setEditingNote(note);
    setNoteContent(note ? note.content : '');
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingNote(null);
    setNoteContent('');
  };

  const changeMonthBy = (months) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + months);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Agrupando notas por fecha
  const notesByDate = useMemo(() => {
    const grouped = {};
    notes.forEach(note => {
      if (!grouped[note.dateKey]) grouped[note.dateKey] = [];
      grouped[note.dateKey].push(note);
    });
    return grouped;
  }, [notes]);

  const selectedDayNotes = selectedDate ? (notesByDate[formatDateKey(selectedDate)] || []) : [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  
  const calendarCells = [];
  // Días vacíos previos
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="border-r border-b border-gray-200 bg-gray-50/50 aspect-[5/4] sm:aspect-square"></div>);
  }
  
  // Días del mes
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const isToday = isSameDay(date, new Date());
    const isSelected = isSameDay(date, selectedDate);
    const dateKey = formatDateKey(date);
    const dayNotes = notesByDate[dateKey] || [];
    const hasNotes = dayNotes.length > 0;
    
    // Fines de semana en azul según la imagen (Sábado = 5, Domingo = 6)
    const dayOfWeek = (firstDayIndex + i - 1) % 7;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

    calendarCells.push(
      <div 
        key={i} 
        onClick={() => { setSelectedDate(date); setCurrentDate(date); }}
        className={`border-r border-b border-gray-200 aspect-[5/4] sm:aspect-square flex flex-col items-center justify-center relative cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-100 border-2 border-blue-500 z-10' : 
            hasNotes ? 'bg-amber-100 hover:bg-amber-200' : 'bg-white hover:bg-gray-50'}`}
      >
        <span className={`text-lg sm:text-xl font-medium z-10
          ${isToday && !isSelected ? 'text-red-600 font-bold' : ''}
          ${isWeekend && !isSelected && !isToday ? 'text-blue-700' : ''}
          ${!isWeekend && !isSelected && !isToday ? 'text-black font-bold' : ''}
          ${isSelected ? 'text-blue-900 font-bold' : ''}`}>
          {i}
        </span>
        {hasNotes && (
          <div className="absolute bottom-1.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full shadow-sm"></div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-gray-200 flex justify-center overflow-hidden font-sans">
      <div className="w-full max-w-md h-full bg-white flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* Header del Calendario */}
        <div className="flex items-center justify-between p-2 sm:p-3 bg-white border-b border-gray-200">
          <button onClick={() => changeMonthBy(-1)} className="p-2 text-blue-900 hover:bg-blue-50 rounded-full transition-colors">
            <ChevronLeft className="w-8 h-8 font-black" />
          </button>
          
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900 capitalize tracking-tight">
            {MONTH_NAMES[currentDate.getMonth()]}, {currentDate.getFullYear()}
          </h2>
          
          <button onClick={() => changeMonthBy(1)} className="p-2 text-blue-900 hover:bg-blue-50 rounded-full transition-colors">
            <ChevronRight className="w-8 h-8 font-black" />
          </button>
        </div>

        {/* Días de la semana header */}
        <div className="grid grid-cols-7 bg-[#1c3c88]">
          {DAY_NAMES_SHORT.map((day, idx) => (
            <div key={idx} className="text-center py-1.5 text-[13px] sm:text-sm font-bold text-white tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Grid del calendario */}
        <div className="grid grid-cols-7 border-l border-t border-gray-200 bg-white">
          {calendarCells}
        </div>

        {/* Separador negro de fecha actual */}
        <div className="bg-black text-white text-center py-2 sm:py-3 text-[17px] sm:text-lg font-bold z-10 flex items-center justify-center shadow-md">
          {DAY_NAMES[selectedDate.getDay()]}, {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()].toLowerCase()} {selectedDate.getFullYear()}
        </div>

        {/* Lista de Notas */}
        <div className="flex-1 overflow-y-auto bg-white">
          {selectedDayNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
               <p className="text-lg">No hay eventos guardados.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 border-b border-gray-200">
              {selectedDayNotes.map(note => (
                <div 
                  key={note.id} 
                  onClick={() => setPreviewNote(note)}
                  className="p-3 sm:p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100"
                >
                   <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-800 border-2 border-purple-100">
                      <AlignLeft className="w-6 h-6" />
                   </div>
                   <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-gray-900 text-[15px] sm:text-base whitespace-pre-wrap font-medium leading-tight line-clamp-3">
                        {note.content}
                      </p>
                      <p className="text-blue-600 text-xs mt-1.5 font-bold opacity-80 flex items-center">
                        <MousePointerClick className="w-3.5 h-3.5 mr-1" /> Tocar para ver completo
                      </p>
                   </div>
                   <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openEditor(note); }} className="p-2 text-blue-900 bg-blue-50 border border-blue-200 shadow-sm hover:bg-blue-100 rounded-lg transition-colors">
                         <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} className="p-2 text-blue-900 bg-blue-50 border border-blue-200 shadow-sm hover:bg-blue-100 rounded-lg transition-colors">
                         <Trash2 className="w-5 h-5" />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Botones */}
        <div className="bg-white p-3 sm:p-4 flex justify-between gap-3 shadow-[0_-5px_15px_rgba(0,0,0,0.08)] z-20">
           <button onClick={goToToday} className="px-5 py-3 font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-100 transition-colors text-lg flex items-center justify-center">
              HOY
           </button>
           <button onClick={() => openEditor()} className="flex-1 bg-white text-gray-800 font-bold py-3 rounded-xl border-2 border-red-600 hover:bg-red-50 transition-colors flex justify-center items-center gap-2 text-lg">
             <CalendarIcon className="w-6 h-6 text-red-600" /> Agregar Evento
           </button>
        </div>

        {/* --- EDITOR DE NOTAS (FULL SCREEN) --- */}
        {isEditorOpen && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between px-4 h-16 bg-[#1c3c88] text-white shadow-md">
              <button onClick={closeEditor} className="p-2 hover:bg-blue-800 rounded-full transition-colors text-white">
                <X className="w-7 h-7" />
              </button>
              <div className="text-center font-bold text-xl">
                {editingNote ? 'Editar Evento' : 'Pegar WhatsApp'}
              </div>
              <button 
                onClick={handleSaveNote}
                disabled={!noteContent.trim()}
                className="font-bold px-3 py-2 bg-blue-700 rounded-lg disabled:opacity-50 text-white hover:bg-blue-600 transition-colors"
              >
                Guardar
              </button>
            </div>

            <div className="flex-1 relative bg-gray-100 p-4">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Pega la nota directamente aquí..."
                className="w-full h-full p-5 bg-white border border-gray-300 rounded-2xl shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg sm:text-xl text-gray-800 placeholder-gray-400 font-medium leading-relaxed"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* --- VISTA PREVIA DE NOTA AL TOCAR (MODAL) --- */}
        {previewNote && !isEditorOpen && (
          <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewNote(null)}>
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
               <div className="bg-[#1c3c88] text-white p-3 sm:p-4 flex justify-between items-center">
                  <h3 className="font-bold text-lg">Detalle del Evento</h3>
                  <button onClick={() => setPreviewNote(null)} className="p-1 hover:bg-blue-800 rounded-full transition-colors text-white">
                    <X className="w-6 h-6" />
                  </button>
               </div>
               <div className="p-5 max-h-[60vh] overflow-y-auto bg-gray-50 border-b border-gray-200">
                  <p className="text-gray-800 text-base sm:text-lg whitespace-pre-wrap font-medium leading-relaxed">
                    {previewNote.content}
                  </p>
               </div>
               <div className="bg-white p-3 flex justify-end gap-3">
                  <button 
                    onClick={() => { const id = previewNote.id; setPreviewNote(null); handleDeleteNote(id); }} 
                    className="px-4 py-2 text-red-600 font-bold bg-red-50 border border-red-100 hover:bg-red-100 rounded-xl transition-colors"
                  >
                    Eliminar
                  </button>
                  <button 
                    onClick={() => { const n = previewNote; setPreviewNote(null); openEditor(n); }} 
                    className="px-6 py-2 text-white font-bold bg-blue-700 hover:bg-blue-600 rounded-xl shadow-md transition-colors"
                  >
                    Editar
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}