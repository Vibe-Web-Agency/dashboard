"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    Home,
    Calendar,
    CalendarDays,
    FileText,
    BarChart3,
    Clock,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";

const navItems = [
    {
        title: "Accueil",
        href: "/",
        icon: Home,
    },
    {
        title: "Calendrier",
        href: "/Calendar",
        icon: Calendar,
    },
    {
        title: "Réservations",
        href: "/Reservations",
        icon: CalendarDays,
    },
    {
        title: "Historique",
        href: "/History",
        icon: Clock,
    },
    {
        title: "Devis",
        href: "/Quotes",
        icon: FileText,
    },
    {
        title: "Analytics",
        href: "/Analytics",
        icon: BarChart3,
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userProfile, setUserProfile] = useState<{
        email: string;
        business_name: string | null;
    } | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Récupérer le profil utilisateur
    useEffect(() => {
        const fetchUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('email, business_name')
                    .eq('dashboard_user_id', user.id)
                    .single();

                if (profile) {
                    setUserProfile(profile);
                }
            }
        };
        fetchUserProfile();
    }, []);

    // Gérer la déconnexion
    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await supabase.auth.signOut();
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    "relative flex h-screen flex-col transition-all duration-300 sticky top-0",
                    isCollapsed ? "w-[70px]" : "w-[260px]"
                )}
                style={{
                    background: '#12121a',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                {/* Logo / Brand */}
                <div className="flex h-16 items-center justify-between px-4">
                    {!isCollapsed && (
                        <Link href="/" className="flex items-center gap-3">
                            <div className="relative w-10 h-10">
                                <Image
                                    src="/assets/logo.png"
                                    alt="VWA Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <span
                                className="text-lg font-semibold"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}
                            >
                                VWA Dashboard
                            </span>
                        </Link>
                    )}
                    {isCollapsed && (
                        <div className="relative w-10 h-10 mx-auto">
                            <Image
                                src="/assets/logo.png"
                                alt="VWA Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    )}
                </div>

                <Separator style={{ background: 'rgba(255, 255, 255, 0.08)' }} />

                {/* Navigation */}
                <nav className="flex-1 space-y-1 p-3">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return isCollapsed ? (
                            <Tooltip key={item.href}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 mx-auto",
                                            isActive
                                                ? "text-white"
                                                : "hover:text-white"
                                        )}
                                        style={isActive ? {
                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
                                            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
                                        } : {
                                            color: '#a1a1aa'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'transparent';
                                            }
                                        }}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="right"
                                    style={{
                                        background: '#1a1a25',
                                        color: '#ffffff',
                                        border: '1px solid rgba(255, 255, 255, 0.08)'
                                    }}
                                >
                                    {item.title}
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive ? "text-white" : "hover:text-white"
                                )}
                                style={isActive ? {
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
                                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
                                } : {
                                    color: '#a1a1aa'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <Icon className="h-5 w-5" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                <Separator style={{ background: 'rgba(255, 255, 255, 0.08)' }} />

                {/* User Profile Section */}
                {userProfile && !isCollapsed && (
                    <div className="p-3">
                        <div
                            className="flex items-center gap-3 rounded-lg p-3"
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                        >
                            <div
                                className="flex h-9 w-9 items-center justify-center rounded-full"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                }}
                            >
                                <User className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-sm font-medium truncate"
                                    style={{ color: '#ffffff' }}
                                >
                                    {userProfile.business_name || 'Mon entreprise'}
                                </p>
                                <p
                                    className="text-xs truncate"
                                    style={{ color: '#71717a' }}
                                >
                                    {userProfile.email}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {userProfile && isCollapsed && (
                    <div className="p-3">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-full mx-auto cursor-default"
                                    style={{
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                    }}
                                >
                                    <User className="h-4 w-4 text-white" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent
                                side="right"
                                style={{
                                    background: '#1a1a25',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}
                            >
                                <p className="font-medium">{userProfile.business_name || 'Mon entreprise'}</p>
                                <p className="text-xs" style={{ color: '#a1a1aa' }}>{userProfile.email}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                )}

                <Separator style={{ background: 'rgba(255, 255, 255, 0.08)' }} />

                {/* Footer Actions */}
                <div className="p-3 space-y-1">
                    {isCollapsed ? (
                        <>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href="/Settings"
                                        className="flex h-10 w-10 items-center justify-center rounded-lg transition-all mx-auto"
                                        style={{ color: '#a1a1aa' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                            e.currentTarget.style.color = '#ffffff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = '#a1a1aa';
                                        }}
                                    >
                                        <Settings className="h-5 w-5" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="right"
                                    style={{
                                        background: '#1a1a25',
                                        color: '#ffffff',
                                        border: '1px solid rgba(255, 255, 255, 0.08)'
                                    }}
                                >
                                    Paramètres
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className="flex h-10 w-10 items-center justify-center rounded-lg mx-auto p-0"
                                        style={{ color: '#f87171' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="right"
                                    style={{
                                        background: '#1a1a25',
                                        color: '#ffffff',
                                        border: '1px solid rgba(255, 255, 255, 0.08)'
                                    }}
                                >
                                    Déconnexion
                                </TooltipContent>
                            </Tooltip>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/Settings"
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
                                style={{ color: '#a1a1aa' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#a1a1aa';
                                }}
                            >
                                <Settings className="h-5 w-5" />
                                Paramètres
                            </Link>
                            <Button
                                variant="ghost"
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                                style={{ color: '#f87171' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <LogOut className="h-5 w-5" />
                                {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
                            </Button>
                        </>
                    )}
                </div>

                {/* Collapse Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-20 h-6 w-6 rounded-full"
                    style={{
                        background: '#1a1a25',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#a1a1aa'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#252530';
                        e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#1a1a25';
                        e.currentTarget.style.color = '#a1a1aa';
                    }}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-3 w-3" />
                    ) : (
                        <ChevronLeft className="h-3 w-3" />
                    )}
                </Button>
            </aside>
        </TooltipProvider>
    );
}
