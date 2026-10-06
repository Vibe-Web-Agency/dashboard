'use client'

import { useCallback, useMemo } from 'react'
import {
    type ItemInput,
    type MenuItem,
    type MenuSection,
    type SectionInput,
    createItem,
    createSection,
    deleteItem,
    deleteSection,
    getMenu,
    setItemAvailability,
    swapPositions,
    updateItem,
    updateSection,
} from '../data/menu'
import { useBusinessQuery } from './useBusinessQuery'

// Carte du commerce courant (module `menu`). Les tables de la carte ne sont pas publiées en Realtime :
// la carte se recharge après chaque modification faite ici.
export function useMenu() {
    const { data, loading, error, refresh, supabase, businessId } = useBusinessQuery(getMenu)

    // Exécute une modification puis recharge la carte, même en cas d'erreur (l'état affiché reste fidèle).
    const run = useCallback(
        async <T,>(action: () => Promise<T>) => {
            try {
                return await action()
            } finally {
                refresh()
            }
        },
        [refresh],
    )

    const sections = useMemo(() => data ?? [], [data])

    const moveSection = useCallback(
        (section: MenuSection, direction: -1 | 1) => {
            const index = sections.findIndex((s) => s.id === section.id)
            const other = sections[index + direction]
            if (!other) return Promise.resolve()
            return run(() => swapPositions(supabase, businessId, 'menu_sections', section, other))
        },
        [sections, run, supabase, businessId],
    )

    const moveItem = useCallback(
        (item: MenuItem, direction: -1 | 1) => {
            const items = sections.find((s) => s.id === item.menu_section_id)?.items ?? []
            const index = items.findIndex((i) => i.id === item.id)
            const other = items[index + direction]
            if (!other) return Promise.resolve()
            return run(() => swapPositions(supabase, businessId, 'menu_items', item, other))
        },
        [sections, run, supabase, businessId],
    )

    return {
        sections,
        loading,
        error,
        refresh,
        createSection: (input: SectionInput) => run(() => createSection(supabase, businessId, input)),
        updateSection: (id: string, input: SectionInput) => run(() => updateSection(supabase, businessId, id, input)),
        deleteSection: (id: string) => run(() => deleteSection(supabase, businessId, id)),
        moveSection,
        createItem: (input: ItemInput) => run(() => createItem(supabase, businessId, input)),
        updateItem: (id: string, input: ItemInput) => run(() => updateItem(supabase, businessId, id, input)),
        setItemAvailability: (id: string, available: boolean) => run(() => setItemAvailability(supabase, businessId, id, available)),
        deleteItem: (id: string) => run(() => deleteItem(supabase, businessId, id)),
        moveItem,
    }
}
