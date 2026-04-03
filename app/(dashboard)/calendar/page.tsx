"use client";

import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/lib/useUserProfile";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, Calendar, Mail, Phone, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!profileLoading) {
            if (profile?.business_id) {
                fetchReservations();
            } else {
                setLoading(false);
            }
        }
    }, [profile?.business_id, profileLoading]);

    const fetchReservations = async () => {
        if (!profile?.business_id) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("reservations")
            .select("id, customer_name, date, customer_phone, customer_mail")
            .eq("business_id", profile.business_id)
            .order("date", { ascending: true });

        if (error) {
            console.error("Erreur:", error);
        } else {
            setReservations((data as unknown as Reservation[]) || []);
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

    const getLocalDateString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getReservationsForDate = (date: Date) => {
        const dateStr = getLocalDateString(date);
        return reservations.filter(res => {
            if (!res.date) return false;
            const resDate = new Date(res.date);
            const resDateStr = getLocalDateString(resDate);
            return resDateStr === dateStr;
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

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedDate(null);
    };

    const selectedDateReservations = selectedDate ? getReservationsForDate(selectedDate) : [];

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const calendarDays: (Date | null)[] = [];
    const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    for (let i = 0; i < adjustedStartDay; i++) {
        calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(new Date(year, month, day));
    }

    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1
                        className="text-2xl sm:text-3xl font-bold"
                        style={{ color: '#FFC745' }}
                    >
                        Calendrier
                    </h1>
                    <p className="mt-1" style={{ color: '#c3c3d4' }}>
                        Vue mensuelle de vos réservations
                    </p>
                </div>
            </div>

            {/* Calendar Controls */}
            <div
                className="flex items-center justify-between p-4 rounded-xl"
                style={{
                    background: '#002928',
                    border: '1px solid rgba(0, 255, 145, 0.1)'
                }}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={previousMonth}
                    className="rounded-lg"
                    style={{ color: '#c3c3d4' }}
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
                            background: 'rgba(255, 199, 69, 0.1)',
                            border: '1px solid rgba(255, 199, 69, 0.3)',
                            color: '#FFC745'
                        }}
                    >
                        Aujourd&apos;hui
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextMonth}
                    className="rounded-lg"
                    style={{ color: '#c3c3d4' }}
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {/* Calendar Grid */}
            {(loading || profileLoading) ? (
                <div
                    className="rounded-xl p-4"
                    style={{ background: '#002928', border: '1px solid rgba(0, 255, 145, 0.1)' }}
                >
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {[...Array(7)].map((_, i) => (
                            <Skeleton key={i} className="h-8 rounded-md" />
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {[...Array(35)].map((_, i) => (
                            <Skeleton key={i} className="aspect-square rounded-lg" />
                        ))}
                    </div>
                </div>
            ) : (
                <div
                    className="rounded-xl p-4"
                    style={{
                        background: '#002928',
                        border: '1px solid rgba(0, 255, 145, 0.1)'
                    }}
                >
                    {/* Week days header */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {weekDays.map((day) => (
                            <div
                                key={day}
                                className="text-center p-2 text-sm font-semibold"
                                style={{ color: '#FFC745' }}
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
                                        style={{ background: 'rgba(0, 255, 145, 0.02)' }}
                                    />
                                );
                            }

                            const dayReservations = getReservationsForDate(date);
                            const isToday = date.toDateString() === today.toDateString();
                            const isPast = date < today;

                            return (
                                <div
                                    key={date.toISOString()}
                                    className="aspect-square rounded-lg p-2 flex flex-col transition-all duration-200 cursor-pointer"
                                    onClick={() => handleDayClick(date)}
                                    style={{
                                        background: isToday
                                            ? 'rgba(255, 199, 69, 0.12)'
                                            : isPast
                                                ? 'rgba(0, 255, 145, 0.02)'
                                                : 'rgba(0, 255, 145, 0.05)',
                                        border: isToday
                                            ? '2px solid rgba(255, 199, 69, 0.5)'
                                            : '1px solid rgba(0, 255, 145, 0.08)',
                                        opacity: isPast ? 0.5 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 199, 69, 0.12)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 199, 69, 0.4)';
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = isToday
                                            ? 'rgba(255, 199, 69, 0.12)'
                                            : isPast
                                                ? 'rgba(0, 255, 145, 0.02)'
                                                : 'rgba(0, 255, 145, 0.05)';
                                        e.currentTarget.style.borderColor = isToday
                                            ? 'rgba(255, 199, 69, 0.5)'
                                            : 'rgba(0, 255, 145, 0.08)';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div
                                            className="text-sm font-medium"
                                            style={{
                                                color: isToday ? '#FFC745' : '#ffffff'
                                            }}
                                        >
                                            {date.getDate()}
                                        </div>

                                        {dayReservations.length > 0 && (
                                            <div
                                                className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                                                style={{
                                                    background: '#FFC745',
                                                    color: '#001C1C',
                                                    boxShadow: '0 2px 8px rgba(255, 199, 69, 0.3)'
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
                                                    className="text-xs p-1 rounded truncate hidden sm:block"
                                                    style={{
                                                        background: 'rgba(255, 199, 69, 0.15)',
                                                        color: '#FFC745'
                                                    }}
                                                    title={`${res.customer_name} - ${res.customer_mail || res.customer_phone || ''}`}
                                                >
                                                    {res.customer_name}
                                                </div>
                                            ))}
                                            {dayReservations.length > 2 && (
                                                <div
                                                    className="text-xs p-1 text-center font-medium hidden sm:block"
                                                    style={{ color: '#FFC745' }}
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
                className="flex items-center flex-wrap gap-4 p-4 rounded-xl"
                style={{
                    background: '#002928',
                    border: '1px solid rgba(0, 255, 145, 0.1)'
                }}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="w-4 h-4 rounded"
                        style={{
                            background: 'rgba(255, 199, 69, 0.12)',
                            border: '2px solid rgba(255, 199, 69, 0.5)'
                        }}
                    />
                    <span className="text-sm" style={{ color: '#c3c3d4' }}>Aujourd&apos;hui</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="w-4 h-4 rounded"
                        style={{
                            background: 'rgba(255, 199, 69, 0.15)'
                        }}
                    />
                    <span className="text-sm" style={{ color: '#c3c3d4' }}>Réservation</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                        style={{
                            background: '#FFC745',
                            color: '#001C1C',
                            boxShadow: '0 2px 8px rgba(255, 199, 69, 0.3)'
                        }}
                    >
                        3
                    </div>
                    <span className="text-sm" style={{ color: '#c3c3d4' }}>Nombre de réservations</span>
                </div>
            </div>

            {/* Modal pour afficher les réservations du jour */}
            {isModalOpen && selectedDate && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={closeModal}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
                        style={{
                            background: '#002928',
                            border: '1px solid rgba(255, 199, 69, 0.3)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 199, 69, 0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: 'rgba(255, 199, 69, 0.15)',
                                        border: '1px solid rgba(255, 199, 69, 0.3)'
                                    }}
                                >
                                    <Calendar className="w-5 h-5" style={{ color: '#FFC745' }} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                                        {selectedDate.toLocaleDateString('fr-FR', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </h3>
                                    <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                        {selectedDateReservations.length} réservation{selectedDateReservations.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={closeModal}
                                className="rounded-full"
                                style={{ color: '#c3c3d4' }}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Reservations List */}
                        {selectedDateReservations.length === 0 ? (
                            <div
                                className="text-center py-12 rounded-xl"
                                style={{
                                    background: 'rgba(0, 255, 145, 0.03)',
                                    border: '1px solid rgba(0, 255, 145, 0.08)'
                                }}
                            >
                                <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: '#14524F' }} />
                                <p className="text-sm" style={{ color: '#c3c3d4' }}>
                                    Aucune réservation pour ce jour
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedDateReservations.map((res) => (
                                    <Link
                                        key={res.id}
                                        href={`/reservations/${res.id}`}
                                        className="card-hover block rounded-xl p-4"
                                        style={{
                                            background: 'rgba(255, 199, 69, 0.05)',
                                            border: '1px solid rgba(255, 199, 69, 0.15)'
                                        }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-medium mb-2" style={{ color: '#ffffff' }}>
                                                    {res.customer_name}
                                                </h4>
                                                <div className="space-y-1">
                                                    {res.customer_mail && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: '#c3c3d4' }}>
                                                            <Mail className="w-4 h-4" style={{ color: '#FFC745' }} />
                                                            {res.customer_mail}
                                                        </div>
                                                    )}
                                                    {res.customer_phone && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: '#c3c3d4' }}>
                                                            <Phone className="w-4 h-4" style={{ color: '#FFC745' }} />
                                                            {res.customer_phone}
                                                        </div>
                                                    )}
                                                    {res.date && (
                                                        <div className="flex items-center gap-2 text-sm" style={{ color: '#c3c3d4' }}>
                                                            <Clock className="w-4 h-4" style={{ color: '#FFC745' }} />
                                                            {new Date(res.date).toLocaleTimeString('fr-FR', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 mt-1" style={{ color: '#FFC745' }} />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
