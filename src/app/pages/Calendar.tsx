import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";

interface TripEvent {
  id: number;
  destination: string;
  dates: string;
  image: string;
  color: string;
}

export function Calendar() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [upcomingTrips, setUpcomingTrips] = useState<TripEvent[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' });

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOffset = (y: number, m: number) => {
    let day = new Date(y, m, 1).getDay();
    return day; // 0 for Sunday
  };

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const daysInMonth = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);
  const firstDayOffset = getFirstDayOffset(year, month);

  // Days with trips (for highlighting) - only for demonstration month
  const tripDays: number[] = [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/", { state: { openMenu: true } })}
            className="p-2 hover:bg-blue-100/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="font-semibold text-slate-900">{t('calendar.title')}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-6"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-blue-100/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <h2 className="font-semibold text-slate-900 capitalize">{monthName}</h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-blue-100/50 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {[
              t('calendar.days.sun'), t('calendar.days.mon'), t('calendar.days.tue'),
              t('calendar.days.wed'), t('calendar.days.thu'), t('calendar.days.fri'),
              t('calendar.days.sat')
            ].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days */}
            {daysInMonth.map((day) => {
              const hasTrip = tripDays.includes(day);
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${hasTrip
                    ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg"
                    : isToday
                      ? "bg-blue-100 text-blue-900 border-2 border-blue-500"
                      : "hover:bg-slate-100 text-slate-700"
                    }`}
                >
                  {day}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Upcoming Trips */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Próximos Viajes</h2>
          <div className="space-y-4">
            {upcomingTrips.map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg border border-white/20"
              >
                <div className="flex">
                  {/* Image */}
                  <div className="w-32 h-32 flex-shrink-0">
                    <img src={trip.image} alt={trip.destination} className="w-full h-full object-cover" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className={`w-4 h-4 text-${trip.color}-600`} />
                        <h3 className="font-semibold text-gray-900">{trip.destination}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{trip.dates}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow">
                        Ver detalles
                      </button>
                      <button className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
