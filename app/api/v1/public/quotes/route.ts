import { getAdminClient } from '@/lib/v2/supabase-admin'
import {
    type FieldErrors,
    invalid,
    isActiveBusiness,
    isRecord,
    json,
    preflight,
    readCustomer,
    readDate,
    readInt,
    readJson,
    readText,
    readUuid,
    resolveCustomer,
    serverError,
} from '@/lib/v2/ingestion'

// POST /api/v1/public/quotes — demande de devis / privatisation depuis le site d'un commerce (CLAUDE.md, 2.2).

export function OPTIONS() {
    return preflight()
}

export async function POST(req: Request) {
    const body = await readJson(req)
    if (!isRecord(body)) return invalid({ body: 'objet JSON attendu' })

    const errors: FieldErrors = {}
    const businessId = readUuid(body.business_id, 'business_id', errors)
    const customer = readCustomer(body.customer, errors)

    const details = isRecord(body.request_details) ? body.request_details : null
    if (!details) errors.request_details = 'objet requis'
    const eventType = details ? readText(details.event_type, 'request_details.event_type', errors, { max: 200 }) : null
    const preferredDate = details ? readDate(details.preferred_date, 'request_details.preferred_date', errors) : null
    const estimatedGuests = details
        ? readInt(details.estimated_guests, 'request_details.estimated_guests', errors, 1, 100000)
        : null
    const message = details ? readText(details.message, 'request_details.message', errors, { max: 5000 }) : null

    if (
        Object.keys(errors).length > 0 ||
        !businessId ||
        !customer ||
        !eventType ||
        !preferredDate ||
        estimatedGuests === null ||
        !message
    ) {
        return invalid(errors)
    }

    try {
        const admin = getAdminClient()

        if (!(await isActiveBusiness(admin, businessId))) {
            return json({ success: false, error: 'Commerce introuvable' }, 404)
        }

        const customerId = await resolveCustomer(admin, businessId, customer, 'quote')

        const { data, error } = await admin
            .from('quotes')
            .insert({
                business_id: businessId,
                customer_id: customerId,
                status: 'request',
                request_message: message,
                request_details: {
                    event_type: eventType,
                    preferred_date: preferredDate,
                    estimated_guests: estimatedGuests,
                },
            })
            .select('id')
            .single()

        if (error) throw error

        return json({ success: true, quote_id: data.id }, 201)
    } catch (error) {
        return serverError('quotes', error)
    }
}
