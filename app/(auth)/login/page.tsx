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
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full filter blur-3xl opacity-10"
                    style={{ background: 'radial-gradient(circle, #C9A876, transparent)' }}
                />
                <div
                    className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full filter blur-3xl opacity-6"
                    style={{ background: 'radial-gradient(circle, #C9A876, transparent)' }}
                />
            </div>

            <Card
                className="w-full max-w-sm relative border"
                style={{
                    background: 'var(--bg-elev)',
                    borderColor: 'var(--border-hi)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                }}
            >
                <CardHeader className="space-y-1 text-center pb-4">
                    <div className="flex justify-center mb-4">
                        <div className="relative w-14 h-14">
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
                        className="font-normal"
                        style={{ fontSize: '1.5rem', color: 'var(--text)', letterSpacing: '-0.02em' }}
                    >
                        Connexion
                    </CardTitle>
                    <CardDescription style={{ color: 'var(--muted)', fontSize: '12px' }}>
                        Accédez à votre espace client
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div
                                className="p-3 rounded-lg text-sm"
                                style={{
                                    background: 'oklch(62% 0.22 25 / 0.08)',
                                    border: '1px solid oklch(62% 0.22 25 / 0.2)',
                                    color: 'oklch(72% 0.18 25)',
                                    fontSize: '12px',
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="email" style={{ color: 'var(--text-2)', fontSize: '12px' }}>
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
                                style={{
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border-2)',
                                    color: 'var(--text)',
                                    fontSize: '13px',
                                }}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" style={{ color: 'var(--text-2)', fontSize: '12px' }}>
                                    Mot de passe
                                </Label>
                                <Link
                                    href="/forgot-password"
                                    className="transition-colors hover:underline underline-offset-4"
                                    style={{ fontSize: '11px', color: 'var(--muted)' }}
                                >
                                    Oublié ?
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
                                style={{
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border-2)',
                                    color: 'var(--text)',
                                    fontSize: '13px',
                                }}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4 pt-2">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full font-medium py-2.5 transition-all duration-200 disabled:opacity-50"
                            style={{
                                background: 'var(--accent)',
                                color: '#0E0D0B',
                                fontSize: '13px',
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

                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full" style={{ borderTop: '1px solid var(--border)' }} />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-2" style={{ background: 'var(--bg-elev)', color: 'var(--text-muted)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>ou</span>
                            </div>
                        </div>

                        <p className="text-center" style={{ color: 'var(--muted)', fontSize: '12px' }}>
                            Première connexion ?{' '}
                            <Link
                                href="/signup"
                                className="font-medium transition-colors underline-offset-4 hover:underline"
                                style={{ color: 'var(--accent)' }}
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
