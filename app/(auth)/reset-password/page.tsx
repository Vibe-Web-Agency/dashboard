"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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

export default function ResetPasswordPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    })

    useEffect(() => {
        const checkSession = async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (!user || error) {
                setError("Lien de réinitialisation invalide ou expiré. Veuillez faire une nouvelle demande.")
            }
        }
        checkSession()
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccess(null)

        if (formData.password !== formData.confirmPassword) {
            setError("Les mots de passe ne correspondent pas")
            setIsLoading(false)
            return
        }

        if (formData.password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères")
            setIsLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: formData.password
            })

            if (error) throw error

            setSuccess("Mot de passe mis à jour avec succès ! Redirection...")

            setTimeout(() => {
                router.push('/login')
            }, 2000)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Une erreur est survenue")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-40 -right-40 w-96 h-96 rounded-full filter blur-3xl opacity-10"
                    style={{ background: 'radial-gradient(circle, var(--accent), transparent)' }}
                />
                <div
                    className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full filter blur-3xl opacity-6"
                    style={{ background: 'radial-gradient(circle, var(--accent-deep), transparent)' }}
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
                        Nouveau mot de passe
                    </CardTitle>
                    <CardDescription style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        Choisissez un nouveau mot de passe sécurisé
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div
                                className="p-3 rounded-[6px] text-sm"
                                style={{
                                    background: 'var(--danger-bg)',
                                    border: '1px solid var(--danger)',
                                    color: 'var(--danger)',
                                    fontSize: '12px',
                                }}
                            >
                                {error}
                            </div>
                        )}

                        {success && (
                            <div
                                className="p-3 rounded-[6px] text-sm"
                                style={{
                                    background: 'var(--success-bg)',
                                    border: '1px solid var(--success)',
                                    color: 'var(--success)',
                                    fontSize: '12px',
                                }}
                            >
                                ✅ {success}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="password" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                Nouveau mot de passe
                            </Label>
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
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text)',
                                    fontSize: '13px',
                                }}
                            />
                            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                                Minimum 6 caractères
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirmPassword" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                Confirmer le mot de passe
                            </Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required
                                disabled={isLoading}
                                style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
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
                            className="w-full font-medium py-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'var(--accent)',
                                color: '#0E0D0B',
                                fontSize: '13px',
                            }}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Mise à jour...
                                </div>
                            ) : (
                                "Réinitialiser le mot de passe"
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
