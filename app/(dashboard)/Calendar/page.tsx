"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Reservation {
    id: string;
    customer_name: string;
    date: string | null;
    customer_phone: string | null;
    customer_mail: string | null;
}

export default function CalendarPage() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.id) {
                fetchReservations();
            } else {
                setLoading(false);
            }
        }
    }, [profile?.id, profileLoading]);

    const fetchReservations = async () => {
        if (!profile?.id) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("reservations")
            .select("id, customer_name, date, customer_phone, customer_mail")
            .eq("user_id", profile.id) // Filtrer par utilisateur
            .order("date", { ascending: true });

        if (error) {
            console.error("Erreur:", error);
        } else {
            setReservations(data || []);
        }
        setLoading(false);
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const getReservationsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return reservations.filter(res => {
            if (!res.date) return false;
            const resDate = new Date(res.date).toISOString().split('T')[0];
            return resDate === dateStr;
        });
    };

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    // Create calendar grid
    const calendarDays: (Date | null)[] = [];

    // Add empty cells for days before month starts (Sunday = 0, Monday = 1, etc.)
    const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1; // Convert to Monday-start
    for (let i = 0; i < adjustedStartDay; i++) {
        calendarDays.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(new Date(year, month, day));
    }

    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1
                        className="text-3xl font-bold"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}
                    >
                        Calendrier
                    </h1>
                    <p className="mt-1" style={{ color: '#a1a1aa' }}>
                        Vue mensuelle de vos réservations
                    </p>
                </div>
            </div>

            {/* Calendar Controls */}
            <div
                className="flex items-center justify-between p-4 rounded-xl"
                style={{
                    background: 'rgba(18, 18, 26, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={previousMonth}
                    className="rounded-lg"
                    style={{ color: '#a1a1aa' }}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-4">
                    <h2
                        className="text-xl font-semibold capitalize"
                        style={{ color: '#ffffff' }}
                    >
                        {monthName}
                    </h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                        className="text-xs"
                        style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#818cf8'
                        }}
                    >
                        Aujourd'hui
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextMonth}
                    className="rounded-lg"
                    style={{ color: '#a1a1aa' }}
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {/* Calendar Grid */}
            {(loading || profileLoading) ? (
                <div
                    className="rounded-xl p-8 text-center"
                    style={{
                        background: 'rgba(18, 18, 26, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div
                        className="animate-spin w-8 h-8 border-2 rounded-full mx-auto"
                        style={{
                            borderColor: '#8b5cf6',
                            borderTopColor: 'transparent'
                        }}
                    />
                    <p className="mt-4" style={{ color: '#a1a1aa' }}>Chargement du calendrier...</p>
                </div>
            ) : (
                <div
                    className="rounded-xl p-4"
                    style={{
                        background: 'rgba(18, 18, 26, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    {/* Week days header */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {weekDays.map((day) => (
                            <div
                                key={day}
                                className="text-center p-2 text-sm font-semibold"
                                style={{ color: '#8b5cf6' }}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((date, index) => {
                            if (!date) {
                                return (
                                    <div
                                        key={`empty-${index}`}
                                        className="aspect-square rounded-lg"
                                        style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                                    />
                                );
                            }

                            const dayReservations = getReservationsForDate(date);
                            const isToday = date.toDateString() === today.toDateString();
                            const isPast = date < today;

                            return (
                                <div
                                    key={date.toISOString()}
                                    className="aspect-square rounded-lg p-2 flex flex-col transition-all duration-200"
                                    style={{
                                        background: isToday
                                            ? 'rgba(99, 102, 241, 0.15)'
                                            : isPast
                                                ? 'rgba(255, 255, 255, 0.02)'
                                                : 'rgba(255, 255, 255, 0.05)',
                                        border: isToday
                                            ? '2px solid rgba(99, 102, 241, 0.5)'
                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                        opacity: isPast ? 0.5 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isPast) {
                                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isPast) {
                                            e.currentTarget.style.background = isToday
                                                ? 'rgba(99, 102, 241, 0.15)'
                                                : 'rgba(255, 255, 255, 0.05)';
                                            e.currentTarget.style.borderColor = isToday
                                                ? 'rgba(99, 102, 241, 0.5)'
                                                : 'rgba(255, 255, 255, 0.08)';
                                        }
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div
                                            className="text-sm font-medium"
                                            style={{
                                                color: isToday ? '#818cf8' : '#ffffff'
                                            }}
                                        >
                                            {date.getDate()}
                                        </div>

                                        {dayReservations.length > 0 && (
                                            <div
                                                className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                                                style={{
                                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                    color: '#ffffff',
                                                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                                                }}
                                            >
                                                {dayReservations.length}
                                            </div>
                                        )}
                                    </div>

                                    {dayReservations.length > 0 && (
                                        <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                                            {dayReservations.slice(0, 2).map((res) => (
                                                <div
                                                    key={res.id}
                                                    className="text-xs p-1 rounded truncate"
                                                    style={{
                                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))',
                                                        color: '#c4b5fd'
                                                    }}
                                                    title={`${res.customer_name} - ${res.customer_mail || res.customer_phone || ''}`}
                                                >
                                                    {res.customer_name}
                                                </div>
                                            ))}
                                            {dayReservations.length > 2 && (
                                                <div
                                                    className="text-xs p-1 text-center font-medium"
                                                    style={{ color: '#a78bfa' }}
                                                >
                                                    +{dayReservations.length - 2}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div
                className="flex items-center gap-6 p-4 rounded-xl"
                style={{
                    background: 'rgba(18, 18, 26, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="w-4 h-4 rounded"
                        style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '2px solid rgba(99, 102, 241, 0.5)'
                        }}
                    />
                    <span className="text-sm" style={{ color: '#a1a1aa' }}>Aujourd'hui</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="w-4 h-4 rounded"
                        style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))'
                        }}
                    />
                    <span className="text-sm" style={{ color: '#a1a1aa' }}>Réservation</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#ffffff',
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        3
                    </div>
                    <span className="text-sm" style={{ color: '#a1a1aa' }}>Nombre de réservations</span>
                </div>
            </div>
        </div>
    );
}
