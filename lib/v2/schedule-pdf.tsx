import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'
import { type Schedule, formatHours } from './schedule'

// Planning hebdomadaire de l'équipe en PDF, au format paysage (CLAUDE.md 9.12). Rendu côté serveur uniquement.

const INK = '#1a1a1a'
const MUTED = '#6b6b6b'
const LINE = '#d9d4c8'
const ACCENT = '#8a6d3b'
const SOFT = '#f5f2ec'

const s = StyleSheet.create({
    page: { padding: 28, paddingBottom: 44, fontFamily: 'Helvetica', fontSize: 9, color: INK, lineHeight: 1.35 },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
    business: { fontFamily: 'Helvetica-Bold', fontSize: 14, lineHeight: 1.2, marginBottom: 3 },
    title: { fontFamily: 'Helvetica-Bold', fontSize: 14, lineHeight: 1.2, color: ACCENT },
    muted: { color: MUTED },
    bold: { fontFamily: 'Helvetica-Bold' },
    headRow: { flexDirection: 'row', backgroundColor: SOFT, borderWidth: 1, borderColor: LINE },
    row: { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: LINE },
    cName: { width: '17%', padding: 5 },
    cDay: { width: '10.5%', padding: 5, borderLeftWidth: 1, borderLeftColor: LINE },
    cTotal: { width: '9.5%', padding: 5, borderLeftWidth: 1, borderLeftColor: LINE, textAlign: 'right' },
    shift: { marginBottom: 3 },
    small: { fontSize: 7.5, color: MUTED },
    footer: { position: 'absolute', left: 28, right: 28, bottom: 18, fontSize: 7.5, color: MUTED, flexDirection: 'row', justifyContent: 'space-between' },
})

export type SchedulePdfInput = { businessName: string; schedule: Schedule; generatedOn: string }

export function SchedulePdf({ businessName, schedule, generatedOn }: SchedulePdfInput) {
    return (
        <Document title={`Planning ${schedule.label}`} author={businessName}>
            <Page size="A4" orientation="landscape" style={s.page}>
                <View style={s.head}>
                    <View>
                        <Text style={s.business}>{businessName}</Text>
                        <Text style={s.muted}>Planning de l&apos;équipe</Text>
                    </View>
                    <Text style={s.title}>Semaine {schedule.label}</Text>
                </View>

                <View style={s.headRow} fixed>
                    <Text style={[s.cName, s.bold]}>Équipe</Text>
                    {schedule.days.map((d) => (
                        <View key={d.key} style={s.cDay}>
                            <Text style={s.bold}>{d.label}</Text>
                            <Text style={s.small}>{d.short}</Text>
                        </View>
                    ))}
                    <Text style={[s.cTotal, s.bold]}>Total</Text>
                </View>

                {schedule.rows.length === 0 && <View style={s.row}><Text style={{ padding: 8, color: MUTED }}>Personne dans l&apos;équipe.</Text></View>}
                {schedule.rows.map((row) => (
                    <View key={row.employee.id} style={s.row} wrap={false}>
                        <View style={s.cName}>
                            <Text style={s.bold}>{row.name}</Text>
                            {row.employee.job_title ? <Text style={s.small}>{row.employee.job_title}</Text> : null}
                        </View>
                        {row.cells.map((cell, i) => (
                            <View key={schedule.days[i].key} style={s.cDay}>
                                {cell.length === 0 ? <Text style={s.muted}>—</Text> : cell.map((c) => (
                                    <View key={c.id} style={s.shift}>
                                        <Text>{c.start} - {c.end}</Text>
                                        {c.role_label ? <Text style={s.small}>{c.role_label}</Text> : null}
                                        {c.break_minutes > 0 ? <Text style={s.small}>Pause {c.break_minutes} min</Text> : null}
                                        {c.note ? <Text style={s.small}>{c.note}</Text> : null}
                                    </View>
                                ))}
                            </View>
                        ))}
                        <Text style={[s.cTotal, s.bold]}>{row.minutes ? formatHours(row.minutes) : '—'}</Text>
                    </View>
                ))}

                <View style={s.footer} fixed>
                    <Text>Édité le {generatedOn} · heures travaillées, pauses déduites</Text>
                    <Text>Total de la semaine : {formatHours(schedule.minutes)}</Text>
                </View>
            </Page>
        </Document>
    )
}

export function renderSchedulePdf(input: SchedulePdfInput): Promise<Buffer> {
    return renderToBuffer(<SchedulePdf {...input} />)
}

export const schedulePdfFilename = (weekStart: string) => `planning-${weekStart}.pdf`
