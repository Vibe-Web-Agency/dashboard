// Planning de l'équipe : calculs, écritures sous RLS, PDF et envoi à l'équipe (CLAUDE.md 9.12).
import { BASE, FIFI, OWNER, VIEWER, admin, anon, mark, serverUp, signIn } from './helpers'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { addDays, buildSchedule, formatHours, shiftMinutes, shiftTimes, weekLabel, weekRange, weekStart } from '../lib/v2/schedule'
import { copyWeek, createShift, deleteShift, loadSchedule, publishWeek, updateShift } from '../lib/v2/data/shifts'
import { createEmployee, listEmployees } from '../lib/v2/data/employees'
import { renderSchedulePdf } from '../lib/v2/schedule-pdf'
import { sendScheduleEmails } from '../lib/v2/notifications'

const TZ = 'Europe/Paris'

describe('planning : calculs', () => {
    it('ramène un jour au lundi de sa semaine et nomme la semaine', () => {
        assert.equal(weekStart('2026-10-13'), '2026-10-12')
        assert.equal(weekStart('2026-10-18'), '2026-10-12')
        assert.equal(weekStart('2026-10-12'), '2026-10-12')
        assert.equal(addDays('2026-12-28', 7), '2027-01-04')
        assert.equal(weekLabel('2026-10-12'), 'du 12 au 18 octobre 2026')
        assert.equal(weekLabel('2026-09-28'), 'du 28 septembre au 4 octobre 2026')
    })
    it('convertit jour et heures, y compris après minuit et au changement d\'heure', () => {
        assert.deepEqual(shiftTimes('2026-10-13', '09:00', '17:30', TZ), { starts_at: '2026-10-13T07:00:00.000Z', ends_at: '2026-10-13T15:30:00.000Z' })
        // Fin avant le début : le lendemain.
        assert.deepEqual(shiftTimes('2026-10-13', '19:00', '01:00', TZ), { starts_at: '2026-10-13T17:00:00.000Z', ends_at: '2026-10-13T23:00:00.000Z' })
        // Nuit du 24 au 25 octobre 2026 : l'heure d'hiver ajoute une heure réelle au service.
        const night = shiftTimes('2026-10-24', '22:00', '06:00', TZ)
        assert.equal(shiftMinutes({ ...night, break_minutes: 0 }), 9 * 60)
        // La semaine du changement d'heure dure 169 heures.
        const range = weekRange('2026-10-19', TZ)
        assert.equal((Date.parse(range.to) - Date.parse(range.from)) / 36e5, 169)
        assert.throws(() => shiftTimes('2026-13-45', '09:00', '10:00', TZ))
        assert.throws(() => shiftTimes('2026-10-13', '9h', '10:00', TZ))
    })
    it('compte les heures, pauses déduites', () => {
        assert.equal(shiftMinutes({ starts_at: '2026-10-13T07:00:00Z', ends_at: '2026-10-13T15:30:00Z', break_minutes: 45 }), 465)
        assert.equal(formatHours(465), '7 h 45')
        assert.equal(formatHours(2100), '35 h')
    })
    it('range les créneaux par personne et par jour', () => {
        const employees = [
            { id: 'a', first_name: 'Ana', last_name: null, job_title: 'Salle', email: 'ana@x.fr', is_active: true },
            { id: 'b', first_name: 'Bob', last_name: null, job_title: null, email: null, is_active: false },
            { id: 'c', first_name: 'Cy', last_name: null, job_title: null, email: null, is_active: false },
        ]
        const shift = (id: string, employee_id: string, day: string, start: string, end: string, status = 'draft') => ({ id, employee_id, ...shiftTimes(day, start, end, TZ), break_minutes: 30, role_label: null, note: null, status })
        const s = buildSchedule(employees, [shift('2', 'a', '2026-10-12', '18:00', '23:00'), shift('1', 'a', '2026-10-12', '09:00', '14:00', 'published'), shift('3', 'a', '2026-10-18', '22:00', '02:00'), shift('4', 'b', '2026-10-14', '10:00', '12:00')], '2026-10-12', TZ)
        // Une personne inactive n'apparaît que si elle a des créneaux.
        assert.deepEqual(s.rows.map((r) => r.name), ['Ana', 'Bob'])
        assert.deepEqual(s.rows[0].cells[0].map((c) => [c.start, c.end]), [['09:00', '14:00'], ['18:00', '23:00']])
        // Un créneau qui finit après minuit reste sur le jour où il commence.
        assert.deepEqual(s.rows[0].cells[6].map((c) => [c.start, c.end]), [['22:00', '02:00']])
        assert.equal(s.rows[0].minutes, 270 + 270 + 210)
        assert.deepEqual([s.count, s.drafts, s.minutes], [4, 3, 750 + 90])
    })
})

describe('planning : base, PDF et envoi', () => {
    const tag = mark('planning')
    // Semaines lointaines : aucun autre créneau ne peut s'y trouver.
    const WEEK = '2032-05-10', NEXT = '2032-05-17'
    let owner: Awaited<ReturnType<typeof signIn>>, viewer: Awaited<ReturnType<typeof signIn>>
    let ana: string, bob: string
    const input = (employee_id: string, day: string, start: string, end: string) => ({ employee_id, day, start, end, break_minutes: 30, role_label: 'Salle', note: '' })

    before(async () => {
        owner = await signIn(OWNER)
        viewer = await signIn(VIEWER)
        await createEmployee(owner.client, FIFI.id, { first_name: tag, last_name: 'Ana', job_title: 'Salle', bio: '', avatar_url: '', email: `  ${tag}-ANA@vwa.local ` })
        await createEmployee(owner.client, FIFI.id, { first_name: tag, last_name: 'Bob', job_title: '', bio: '', avatar_url: '', email: '' })
        const people = (await listEmployees(owner.client, FIFI.id)).filter((e) => e.first_name === tag)
        ana = people.find((e) => e.last_name === 'Ana')!.id
        bob = people.find((e) => e.last_name === 'Bob')!.id
    })
    after(async () => {
        await admin.from('outbound_messages').delete().eq('template', 'team_schedule').like('to_address', `${tag}%`)
        await admin.from('employees').delete().eq('first_name', tag)
        await owner.close()
        await viewer.close()
    })

    it('enregistre l\'email en minuscules et le cache aux visiteurs', async () => {
        const { data } = await admin.from('employees').select('email').eq('id', ana).single()
        assert.equal(data?.email, `${tag}-ana@vwa.local`)
        await assert.rejects(createEmployee(owner.client, FIFI.id, { first_name: tag, last_name: 'X', job_title: '', bio: '', avatar_url: '', email: 'pas-une-adresse' }), /email/)
        await admin.from('employees').update({ show_on_site: true }).eq('id', ana)
        const shown = await anon().from('employees').select('id, first_name').eq('id', ana)
        assert.equal(shown.data?.length, 1)
        // La colonne email, et donc `select *`, sont refusés à un visiteur.
        assert.equal((await anon().from('employees').select('email').eq('id', ana)).error?.code, '42501')
        assert.equal((await anon().from('employees').select('*').eq('id', ana)).error?.code, '42501')
    })

    it('crée, modifie et supprime un créneau ; refuse le chevauchement et le lecteur', async () => {
        await createShift(owner.client, FIFI.id, input(ana, WEEK, '09:00', '14:00'), TZ, owner.userId)
        await createShift(owner.client, FIFI.id, input(ana, WEEK, '19:00', '01:00'), TZ, owner.userId)
        await createShift(owner.client, FIFI.id, input(bob, addDays(WEEK, 2), '10:00', '18:00'), TZ, owner.userId)
        await assert.rejects(createShift(owner.client, FIFI.id, input(ana, WEEK, '13:00', '15:00'), TZ, owner.userId), /déjà un créneau/)
        await assert.rejects(createShift(owner.client, FIFI.id, { ...input(ana, addDays(WEEK, 1), '09:00', '09:30'), break_minutes: 45 }, TZ, owner.userId), /pause/)
        await assert.rejects(createShift(viewer.client, FIFI.id, input(ana, addDays(WEEK, 3), '09:00', '14:00'), TZ, viewer.userId), /Droits insuffisants/)

        let s = await loadSchedule(viewer.client, FIFI.id, WEEK, TZ)
        const row = s.rows.find((r) => r.employee.id === ana)!
        assert.deepEqual(row.cells[0].map((c) => [c.start, c.end]), [['09:00', '14:00'], ['19:00', '01:00']])
        assert.equal(row.minutes, 270 + 330)

        const first = row.cells[0][0].id
        await updateShift(owner.client, FIFI.id, first, input(ana, WEEK, '08:00', '14:00'), TZ)
        await assert.rejects(updateShift(viewer.client, FIFI.id, first, input(ana, WEEK, '07:00', '14:00'), TZ))
        await deleteShift(owner.client, FIFI.id, row.cells[0][1].id)
        s = await loadSchedule(owner.client, FIFI.id, WEEK, TZ)
        assert.deepEqual(s.rows.find((r) => r.employee.id === ana)!.cells[0].map((c) => [c.start, c.end]), [['08:00', '14:00']])
    })

    it('recopie une semaine sans doubler les créneaux déjà posés', async () => {
        await createShift(owner.client, FIFI.id, input(ana, NEXT, '08:30', '12:00'), TZ, owner.userId)
        // Celui d'Ana chevauche le créneau déjà posé ; celui de Bob est recopié.
        assert.deepEqual(await copyWeek(owner.client, FIFI.id, WEEK, NEXT, TZ, owner.userId), { copied: 1, skipped: 1 })
        const s = await loadSchedule(owner.client, FIFI.id, NEXT, TZ)
        assert.deepEqual(s.rows.find((r) => r.employee.id === bob)!.cells[2].map((c) => [c.start, c.end, c.role_label, c.status]), [['10:00', '18:00', 'Salle', 'draft']])
        assert.equal(s.count, 2)
    })

    it('produit le PDF, journalise l\'envoi sans rien envoyer, et marque la semaine envoyée', async () => {
        const schedule = await loadSchedule(owner.client, FIFI.id, WEEK, TZ)
        const pdf = await renderSchedulePdf({ businessName: 'FiFi', schedule, generatedOn: '13 octobre 2026' })
        assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
        assert.ok(pdf.length > 1500)

        // Clé Resend retirée par helpers.ts : chaque envoi échoue, mais il est tenté et journalisé pour les seules adresses connues.
        const outcome = await sendScheduleEmails(admin, { id: FIFI.id, agency_id: FIFI.agency_id, name: 'FiFi', email: null }, schedule, { filename: 'planning.pdf', content: pdf })
        const mine = schedule.rows.filter((r) => r.employee.first_name === tag)
        assert.deepEqual(mine.map((r) => [r.employee.last_name, !!r.employee.email]), [['Ana', true], ['Bob', false]])
        assert.ok(outcome.withoutEmail.some((n) => n.endsWith('Bob')))
        assert.equal(outcome.sent, 0)
        const { data: log } = await admin.from('outbound_messages').select('status, subject').eq('template', 'team_schedule').eq('to_address', `${tag}-ana@vwa.local`)
        assert.deepEqual(log, [{ status: 'failed', subject: 'Planning de la semaine du 10 au 16 mai 2032' }])

        assert.equal(schedule.drafts, schedule.count)
        await publishWeek(owner.client, FIFI.id, WEEK, TZ)
        assert.equal((await loadSchedule(owner.client, FIFI.id, WEEK, TZ)).drafts, 0)
        // Un créneau modifié après l'envoi redevient « à envoyer ».
        const id = (await loadSchedule(owner.client, FIFI.id, WEEK, TZ)).rows.find((r) => r.employee.id === bob)!.cells[2][0].id
        await updateShift(owner.client, FIFI.id, id, input(bob, addDays(WEEK, 2), '11:00', '18:00'), TZ)
        assert.equal((await loadSchedule(owner.client, FIFI.id, WEEK, TZ)).drafts, 1)
    })

    it('sert le PDF à une session seulement (serveur local requis)', async (t) => {
        if (!(await serverUp())) return t.skip('aucun serveur local')
        assert.equal((await fetch(`${BASE}/api/schedule/pdf?week=${WEEK}`)).status, 401)
        const res = await fetch(`${BASE}/api/schedule/pdf?week=${addDays(WEEK, 3)}`, { headers: { cookie: owner.cookie(FIFI.id) } })
        assert.equal(res.status, 200)
        assert.equal(res.headers.get('content-type'), 'application/pdf')
        assert.match(res.headers.get('content-disposition') ?? '', new RegExp(`planning-${WEEK}\\.pdf`))
    })
})
