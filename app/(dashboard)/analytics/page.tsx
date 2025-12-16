export default function AnalyticsPage() {
    return (
        <div className="flex flex-col gap-6 p-6">
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
                    Analytics
                </h1>
                <p className="mt-1" style={{ color: '#a1a1aa' }}>
                    Statistiques et performances de votre activité
                </p>
            </div>

            {/* Placeholder content */}
            <div
                className="rounded-xl p-8 text-center"
                style={{
                    background: 'rgba(18, 18, 26, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(236, 72, 153, 0.2))'
                    }}
                >
                    <svg className="w-8 h-8" style={{ color: '#8b5cf6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <p style={{ color: '#71717a' }}>
                    Les données analytics seront affichées ici.
                </p>
            </div>
        </div>
    );
}
