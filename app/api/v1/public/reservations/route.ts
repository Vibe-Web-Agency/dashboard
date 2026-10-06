import { getAdminClient } from '@/lib/v2/supabase-admin'
import {
    type FieldErrors,
    invalid,
    isActiveBusiness,
    isBookableService,
    isRecord,
    json,
    preflight,
    readCustomer,
    readDateTime,
    readInt,
    readJson,
    readText,
    readUuid,
    resolveCustomer,
    serverError,
} from '@/lib/v2/ingestion'

// POST /api/v1/public/reservations — prise de RDV depuis le site d'un commerce (CLAUDE.md, 2.1).

export function OPTIONS() {
    return preflight()
}

export async function POST(req: Request) {
    const body = await readJson(req)
    if (!isRecord(body)) return invalid({ body: 'objet JSON attendu' })

    const errors: FieldErrors = {}
    const businessId = readUuid(body.business_id, 'business_id', errors)
    const customer = readCustomer(body.customer, errors)

    const details = isRecord(body.booking_details) ? body.booking_details : null
    if (!details) errors.booking_details = 'objet requis'
    const serviceId = readUuid(details?.service_id, 'booking_details.service_id', errors, { optional: true })
    const startsAt = details ? readDateTime(details.starts_at, 'booking_details.starts_at', errors) : null
    const partySize = details ? readInt(details.party_size, 'booking_details.party_size', errors, 1, 500) : null
    const notes = readText(details?.notes, 'booking_details.notes', errors, { optional: true, max: 2000 })

    if (Object.keys(errors).length > 0 || !businessId || !customer || !startsAt || partySize === null) {
        return invalid(errors)
    }

    try {
        const admin = getAdminClient()

        if (!(await isActiveBusiness(admin, businessId))) {
            return json({ success: false, error: 'Commerce introuvable' }, 404)
        }

        // Vérifié avant de toucher à customers, pour ne pas créer de client sur une demande refusée.
        if (serviceId && !(await isBookableService(admin, businessId, serviceId))) {
            return invalid({ 'booking_details.service_id': 'service inconnu ou inactif pour ce commerce' })
        }

        const customerId = await resolveCustomer(admin, businessId, customer, 'reservation')

        const { data, error } = await admin
            .from('reservations')
            .insert({
                business_id: businessId,
                customer_id: customerId,
                guest_name: customer.full_name,
                service_id: serviceId,
                starts_at: startsAt,
                party_size: partySize,
                customer_message: notes,
                status: 'confirmed',
                source: 'website',
            })
            .select('id')
            .single()

        if (error) throw error

        return json({ success: true, reservation_id: data.id }, 201)
    } catch (error) {
        return serverError('reservations', error)
    }
}
