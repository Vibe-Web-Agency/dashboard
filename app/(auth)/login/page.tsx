"use client"

import { useState } from "react"
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

export default function AuthPage() {
    const router = useRouter()
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        fullName: "",
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError(null)
        setSuccess(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccess(null)

        try {
            if (isLogin) {
                // Login
                const { error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                })

                if (error) throw error

                router.push("/")
                router.refresh()
            } else {
                // Sign up - validate passwords match
                if (formData.password !== formData.confirmPassword) {
                    throw new Error("Les mots de passe ne correspondent pas")
                }

                if (formData.password.length < 6) {
                    throw new Error("Le mot de passe doit contenir au moins 6 caractères")
                }

                const { error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.fullName,
                        },
                    },
                })

                if (error) throw error

                setSuccess("Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription.")
                setFormData({ email: "", password: "", confirmPassword: "", fullName: "" })
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Une erreur est survenue")
        } finally {
            setIsLoading(false)
        }
    }

    const toggleMode = () => {
        setIsLogin(!isLogin)
        setError(null)
        setSuccess(null)
        setFormData({ email: "", password: "", confirmPassword: "", fullName: "" })
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute -top-40 -right-40 w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                />
                <div
                    className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', animationDelay: '2s' }}
                />
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', animationDelay: '4s' }}
                />
            </div>

            <Card
                className="w-full max-w-md relative border shadow-2xl"
                style={{
                    background: 'rgba(18, 18, 26, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 0 60px rgba(99, 102, 241, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4)'
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
                        style={{ color: '#ffffff' }}
                    >
                        {isLogin ? "Connexion" : "Créer un compte"}
                    </CardTitle>
                    <CardDescription style={{ color: '#a1a1aa' }}>
                        {isLogin
                            ? "Connectez-vous à votre compte dashboard"
                            : "Inscrivez-vous pour accéder au dashboard"}
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

                        {/* Success message */}
                        {success && (
                            <div
                                className="p-3 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    color: '#86efac'
                                }}
                            >
                                {success}
                            </div>
                        )}

                        {/* Full Name - Only for signup */}
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="fullName" style={{ color: '#e4e4e7' }}>
                                    Nom complet
                                </Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    required={!isLogin}
                                    className="transition-all duration-200"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        color: '#ffffff'
                                    }}
                                />
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
                                placeholder="exemple@email.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                className="transition-all duration-200"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: '#ffffff'
                                }}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password" style={{ color: '#e4e4e7' }}>
                                Mot de passe
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                className="transition-all duration-200"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: '#ffffff'
                                }}
                            />
                        </div>

                        {/* Confirm Password - Only for signup */}
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" style={{ color: '#e4e4e7' }}>
                                    Confirmer le mot de passe
                                </Label>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    required={!isLogin}
                                    className="transition-all duration-200"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        color: '#ffffff'
                                    }}
                                />
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full font-semibold py-2.5 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
                                color: '#ffffff',
                                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
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
                                    Chargement...
                                </div>
                            ) : isLogin ? (
                                "Se connecter"
                            ) : (
                                "S'inscrire"
                            )}
                        </Button>

                        {/* Divider */}
                        <div className="relative w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }} />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="px-2" style={{ background: 'rgba(18, 18, 26, 0.7)', color: '#71717a' }}>ou</span>
                            </div>
                        </div>

                        {/* Toggle between login and signup */}
                        <p className="text-center text-sm" style={{ color: '#a1a1aa' }}>
                            {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="ml-1 font-medium transition-colors underline-offset-4 hover:underline"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}
                            >
                                {isLogin ? "S'inscrire" : "Se connecter"}
                            </button>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
