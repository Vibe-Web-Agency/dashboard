export default function UnsubscribeSuccess() {
    return (
        <div style={{ background: "#001C1C", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ maxWidth: "400px", width: "100%", background: "rgba(0,41,40,0.9)", border: "1px solid rgba(0,255,145,0.12)", borderRadius: "16px", padding: "40px 32px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>✅</div>
                <h1 style={{ color: "#FFC745", fontSize: "20px", fontWeight: 700, margin: "0 0 12px" }}>
                    Désinscription confirmée
                </h1>
                <p style={{ color: "#a1a1aa", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                    Vous ne recevrez plus d&apos;emails de la part de ce professionnel.
                </p>
            </div>
        </div>
    );
}
