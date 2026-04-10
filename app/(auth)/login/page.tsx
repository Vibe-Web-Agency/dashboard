"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            })

            if (error) {
                if (error.message === 'Invalid login credentials') {
                    throw new Error('Email ou mot de passe incorrect')
                }
                throw error
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: profile } = await (supabase as any)
                    .from("users")
                    .select("is_admin")
                    .eq("dashboard_user_id", user.id)
                    .single()
                if (profile?.is_admin) {
                    router.push("/admin")
                } else {
                    router.push("/")
                }
            } else {
                router.push("/")
            }
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Une erreur est survenue")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#001C1C' }}>
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute -top-40 -right-40 w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"
                    style={{ background: 'radial-gradient(circle, #FFC745, transparent)' }}
                />
                <div
                    className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"
                    style={{ background: 'radial-gradient(circle, #00ff91, transparent)', animationDelay: '2s' }}
                />
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse"
                    style={{ background: 'radial-gradient(circle, #FFC745, transparent)', animationDelay: '4s' }}
                />
            </div>

            <Card
                className="w-full max-w-md relative border shadow-2xl"
                style={{
                    background: 'rgba(0, 41, 40, 0.8)',
                    backdropFilter: 'blur(20px)',
                    borderColor: 'rgba(0, 255, 145, 0.1)',
                    boxShadow: '0 0 60px rgba(255, 199, 69, 0.1), 0 8px 32px rgba(0, 0, 0, 0.4)'
                }}
            >
                <CardHeader className="space-y-1 text-center">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                        <div className="relative w-20 h-20">
                            <Image
                                src="/assets/logo.png"
                                alt="Vibe Web Agency Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    <CardTitle
                        className="text-2xl font-bold"
                        style={{ color: '#FFC745' }}
                    >
                        Connexion
                    </CardTitle>
                    <CardDescription style={{ color: '#c3c3d4' }}>
                        Accédez à votre espace client
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {/* Error message */}
                        {error && (
                            <div
                                className="p-3 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#fca5a5'
                                }}
                            >
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" style={{ color: '#e4e4e7' }}>
                                Email
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="votre@email.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                disabled={isLoading}
                                className="transition-all duration-200"
                                style={{
                                    background: 'rgba(0, 255, 145, 0.05)',
                                    border: '1px solid rgba(0, 255, 145, 0.1)',
                                    color: '#ffffff'
                                }}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" style={{ color: '#e4e4e7' }}>
                                    Mot de passe
                                </Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs transition-colors hover:underline underline-offset-4"
                                    style={{ color: '#c3c3d4' }}
                                >
                                    Mot de passe oublié ?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                disabled={isLoading}
                                className="transition-all duration-200"
                                style={{
                                    background: 'rgba(0, 255, 145, 0.05)',
                                    border: '1px solid rgba(0, 255, 145, 0.1)',
                                    color: '#ffffff'
                                }}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full font-semibold py-2.5 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: '#FFC745',
                                color: '#001C1C',
                                boxShadow: '0 4px 20px rgba(255, 199, 69, 0.3)'
                            }}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <svg
                                        className="animate-spin h-4 w-4"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Connexion...
                                </div>
                            ) : (
                                "Se connecter"
                            )}
                        </Button>

                        {/* Divider */}
                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full" style={{ borderTop: '1px solid rgba(0, 255, 145, 0.1)' }} />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="px-2" style={{ background: 'rgba(0, 41, 40, 0.8)', color: '#71717a' }}>ou</span>
                            </div>
                        </div>

                        {/* Link to signup */}
                        <p className="text-center text-sm" style={{ color: '#c3c3d4' }}>
                            Première connexion ?
                            <Link
                                href="/signup"
                                className="ml-1 font-medium transition-colors underline-offset-4 hover:underline"
                                style={{ color: '#FFC745' }}
                            >
                                Activer mon compte
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
